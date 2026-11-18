import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { hashEventCode } from "../../lib/attendance/codes";

const databaseURL = process.env.ATTENDANCE_TEST_DATABASE_URL;

test("attendance PostgreSQL authorization and lifecycle", { skip: !databaseURL }, async (t) => {
  const url = new URL(databaseURL!);
  // This suite resets schemas. Refuse production or remotely hosted databases.
  assert.equal(url.pathname, "/eiec_attendance_test", "Use the isolated eiec_attendance_test database.");
  assert.ok(["localhost", "127.0.0.1", ""].includes(url.hostname));
  const socket = url.searchParams.get("host");
  if (socket) assert.equal(socket, "/private/tmp/eiec-attendance-test-socket");
  const owner = new Client({ connectionString: databaseURL });
  await owner.connect();
  t.after(async () => owner.end());
  await owner.query(`
    drop schema if exists private cascade;
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    create schema public;
    create schema auth;
    do $$ begin
      if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    end $$;
    grant usage on schema public, auth to anon, authenticated;
    create table auth.users (
      id uuid primary key, email text unique, email_confirmed_at timestamptz,
      banned_until timestamptz, raw_user_meta_data jsonb default '{}'
    );
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select (auth.jwt()->>'sub')::uuid;
    $$;
  `);
  await owner.query(await readFile(new URL("../../supabase/migrations/202611180001_attendance.sql", import.meta.url), "utf8"));

  const ids = { admin: randomUUID(), otherAdmin: randomUUID(), alice: randomUUID(), bob: randomUUID(), concurrent: randomUUID(), throttled: randomUUID(), unverified: randomUUID() };
  for (const [name, id] of Object.entries(ids)) {
    await owner.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,$2,$3,$4)", [id, `${name.toLowerCase()}@ucsd.edu`, name === "unverified" ? null : new Date(), { display_name: name, role: "admin" }]);
  }

  async function asUser<T>(id: string | null, callback: (client: Client) => Promise<T>, aal = "aal1") {
    const client = new Client({ connectionString: databaseURL });
    await client.connect();
    try {
      await client.query("begin");
      await client.query(`set local role ${id ? "authenticated" : "anon"}`);
      await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, aal, user_metadata: { role: "admin" } })]);
      const value = await callback(client);
      await client.query("commit");
      return value;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { await client.end(); }
  }
  const rpc = (id: string, sql: string, args: unknown[] = [], aal = "aal1") => asUser(id, async (client) => (await client.query(sql, args)).rows, aal);
  let eventId = "";
  const originalCode = "ABCDE23456";
  const replacementCode = "FGHJK67892";

  await t.test("UCSD eligibility, explicit bootstrap, and fail-closed configuration", async () => {
    await assert.rejects(owner.query("insert into auth.users(id,email) values ($1,$2)", [randomUUID(), "visitor@example.com"]), /UCSD email/);
    await assert.rejects(owner.query("select private.bootstrap_attendance_admin($1)", ["unverified@ucsd.edu"]), /verify/);
    await owner.query("select private.bootstrap_attendance_admin($1)", ["admin@ucsd.edu"]);
    await assert.rejects(owner.query("select private.bootstrap_attendance_admin($1)", ["alice@ucsd.edu"]), /already exists/);
    assert.equal((await owner.query("select admin_mfa_required from private.attendance_settings")).rows[0].admin_mfa_required, false);
    await owner.query("update private.attendance_settings set admin_mfa_required=null");
    await assert.rejects(rpc(ids.admin, "select public.create_attendance_event('Meeting',now(),'')"), /Admin access/);
    await owner.query("update private.attendance_settings set admin_mfa_required=false");
  });

  await t.test("anonymous and unverified users cannot read or check in", async () => {
    await assert.rejects(asUser(null, (client) => client.query("select * from public.member_profiles")), /permission denied/);
    await assert.rejects(asUser(null, (client) => client.query("select public.check_in_to_event($1)", [originalCode])), /permission denied/);
    assert.equal((await rpc(ids.unverified, "select * from public.member_profiles")).length, 0);
    await assert.rejects(rpc(ids.unverified, "select public.check_in_to_event($1)", [originalCode]), /verified UCSD/);
  });

  await t.test("members cannot read secrets, forge attendance, or promote themselves", async () => {
    assert.equal((await rpc(ids.alice, "select public.get_member_access() as access"))[0].access.role, "member");
    await assert.rejects(rpc(ids.alice, "select * from private.event_codes"), /permission denied/);
    await assert.rejects(rpc(ids.alice, "select * from private.member_roles"), /permission denied/);
    await assert.rejects(rpc(ids.alice, "select public.set_member_admin($1,true)", [ids.alice]), /Admin access/);
    await assert.rejects(rpc(ids.alice, "select public.admin_member_attendance()"), /Admin access/);
    await assert.rejects(rpc(ids.alice, "update public.member_profiles set email='another@ucsd.edu'"), /permission denied/);
  });

  await t.test("admin event creation and code issuance", async () => {
    const rows = await rpc(ids.admin, "select public.create_attendance_event($1,$2,$3) as id", ["General Body Meeting", new Date().toISOString(), "UCSD"]);
    eventId = rows[0].id;
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, hashEventCode(originalCode), new Date(Date.now() + 60 * 60 * 1000).toISOString()]);
    assert.equal((await owner.query("select code_hash from private.event_codes where event_id=$1", [eventId])).rows[0].code_hash, hashEventCode(originalCode));
    await assert.rejects(rpc(ids.alice, "insert into public.event_attendance(event_id,member_id) values ($1,$2)", [eventId, ids.bob]), /permission denied/);
  });

  await t.test("one check-in per member and event, including concurrent requests", async () => {
    const first = (await rpc(ids.alice, "select public.check_in_to_event($1) as result", [originalCode]))[0].result;
    assert.equal(first.status, "recorded");
    assert.equal(first.event_title, "General Body Meeting");
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", [originalCode]))[0].result.status, "already_checked_in");
    assert.equal((await rpc(ids.bob, "select public.check_in_to_event($1) as result", [originalCode]))[0].result.status, "recorded");
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => rpc(ids.concurrent, "select public.check_in_to_event($1) as result", [originalCode])));
    assert.equal(concurrent.filter((rows) => rows[0].result.status === "recorded").length, 1);
    assert.equal(concurrent.filter((rows) => rows[0].result.status === "already_checked_in").length, 7);
    assert.equal((await owner.query("select count(*) from public.event_attendance where event_id=$1 and member_id=$2", [eventId, ids.concurrent])).rows[0].count, "1");
  });

  await t.test("member isolation and private admin reports", async () => {
    assert.equal((await rpc(ids.alice, "select * from public.member_profiles")).length, 1);
    const attendance = await rpc(ids.alice, "select * from public.event_attendance");
    assert.equal(attendance.length, 1);
    assert.equal(attendance[0].member_id, ids.alice);
    assert.equal((await rpc(ids.alice, "select * from public.attendance_events")).length, 1);
    assert.equal((await rpc(ids.admin, "select * from public.admin_event_attendees($1)", [eventId])).length, 3);
    const members = await rpc(ids.admin, "select * from public.admin_member_attendance('alice',0)");
    assert.equal(members.length, 1);
    assert.equal(members[0].attendance_count, "1");
  });

  await t.test("bad attempts remain throttled across separate requests", async () => {
    for (let i = 0; i < 10; i++) assert.equal((await rpc(ids.throttled, "select public.check_in_to_event($1) as result", ["ZZZZZ99999"]))[0].result.status, "invalid_code");
    assert.equal((await rpc(ids.throttled, "select public.check_in_to_event($1) as result", [originalCode]))[0].result.status, "rate_limited");
    assert.equal((await owner.query("select minute_count from private.check_in_limits where member_id=$1", [ids.throttled])).rows[0].minute_count, 11);
  });

  await t.test("rotation, closing and expiry invalidate old codes", async () => {
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, hashEventCode(replacementCode), new Date(Date.now() + 60 * 60 * 1000).toISOString()]);
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", [originalCode]))[0].result.status, "invalid_code");
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", [replacementCode]))[0].result.status, "already_checked_in");
    await rpc(ids.admin, "select public.close_event_check_in($1)", [eventId]);
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", [replacementCode]))[0].result.status, "invalid_code");
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, hashEventCode(replacementCode), new Date(Date.now() + 60 * 60 * 1000).toISOString()]);
    await owner.query("update private.event_codes set opens_at=now()-interval '2 hours',closes_at=now()-interval '1 hour' where event_id=$1", [eventId]);
    assert.equal((await rpc(ids.bob, "select public.check_in_to_event($1) as result", [replacementCode]))[0].result.status, "invalid_code");
  });

  await t.test("admin authentication policy cannot be bypassed through direct SQL API access", async () => {
    await owner.query("update private.attendance_settings set admin_mfa_required=true");
    await assert.rejects(rpc(ids.admin, "select * from public.admin_member_attendance()"), /Admin access/);
    assert.equal((await rpc(ids.admin, "select * from public.admin_member_attendance()", [], "aal2")).length, 7);
    await owner.query("update private.attendance_settings set admin_mfa_required=false");
  });

  await t.test("admin promotion, immediate revocation, audit and last-admin protection", async () => {
    await rpc(ids.admin, "select public.set_member_admin($1,true)", [ids.otherAdmin]);
    await rpc(ids.otherAdmin, "select public.set_member_admin($1,false)", [ids.admin]);
    await assert.rejects(rpc(ids.admin, "select * from public.admin_member_attendance()"), /Admin access/);
    await assert.rejects(rpc(ids.otherAdmin, "select public.set_member_admin($1,false)", [ids.otherAdmin]), /at least one admin/);
    const audit = await owner.query("select action from private.attendance_audit where action in ('admin_promoted','admin_removed')");
    assert.equal(audit.rows.length, 2);
  });

  await t.test("deleting an account removes private profile and attendance records", async () => {
    await owner.query("delete from auth.users where id=$1", [ids.bob]);
    assert.equal((await owner.query("select * from public.member_profiles where id=$1", [ids.bob])).rowCount, 0);
    assert.equal((await owner.query("select * from public.event_attendance where member_id=$1", [ids.bob])).rowCount, 0);
  });
});
