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
  for (const file of ["202611180001_attendance.sql", "202611190001_points_and_corrections.sql"]) {
    await owner.query(await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }

  const ids = { admin: randomUUID(), otherAdmin: randomUUID(), alice: randomUUID(), bob: randomUUID(), concurrent: randomUUID(), throttled: randomUUID(), late: randomUUID(), unverified: randomUUID() };
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
    await assert.rejects(asUser(null, (client) => client.query("select id from public.member_profiles")), /permission denied/);
    await assert.rejects(asUser(null, (client) => client.query("select public.check_in_to_event($1)", [originalCode])), /permission denied/);
    assert.equal((await rpc(ids.unverified, "select id from public.member_profiles")).length, 0);
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
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, originalCode, new Date(Date.now() + 60 * 60 * 1000).toISOString()]);
    assert.equal((await owner.query("select code_hash from private.event_codes where event_id=$1", [eventId])).rows[0].code_hash, hashEventCode(originalCode));
    await assert.rejects(rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, "not-a-code", new Date(Date.now() + 3600e3).toISOString()]), /could not be generated/);
    await assert.rejects(rpc(ids.alice, "select * from public.admin_event_code($1)", [eventId]), /Admin access/);
    assert.equal((await rpc(ids.admin, "select * from public.admin_event_code($1)", [eventId]))[0].code, originalCode);
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
    assert.equal((await rpc(ids.alice, "select id, display_name, email from public.member_profiles")).length, 1);
    const attendance = await rpc(ids.alice, "select event_id, member_id, points, checked_in_at from public.event_attendance");
    // board notes and who added a record are not readable by members
    await assert.rejects(rpc(ids.alice, "select note from public.event_attendance"), /permission denied/);
    await assert.rejects(rpc(ids.alice, "select added_by, source from public.event_attendance"), /permission denied/);
    await assert.rejects(rpc(ids.alice, "select created_by from public.attendance_events"), /permission denied/);
    await assert.rejects(rpc(ids.alice, "select hidden_by_admin from public.member_profiles"), /permission denied/);
    assert.equal(attendance.length, 1);
    assert.equal(attendance[0].member_id, ids.alice);
    assert.equal((await rpc(ids.alice, "select id, title from public.attendance_events")).length, 1);
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
    const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, replacementCode, inAnHour()]);
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", [originalCode]))[0].result.status, "invalid_code");
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", [replacementCode]))[0].result.status, "already_checked_in");
    await rpc(ids.admin, "select public.close_event_check_in($1)", [eventId]);
    const closed = (await rpc(ids.late, "select public.check_in_to_event($1) as result", [replacementCode]))[0].result;
    assert.equal(closed.status, "closed");
    assert.equal(closed.event_title, "General Body Meeting");
    assert.equal((await rpc(ids.admin, "select * from public.admin_event_code($1)", [eventId])).length, 0, "a closed code is no longer shown");
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [eventId, replacementCode, inAnHour()]);
    await owner.query("update private.event_codes set opens_at=now()-interval '2 hours',closes_at=now()-interval '1 hour' where event_id=$1", [eventId]);
    assert.equal((await rpc(ids.late, "select public.check_in_to_event($1) as result", [replacementCode]))[0].result.status, "closed");
    assert.equal((await owner.query("select count(*) from public.event_attendance where member_id=$1", [ids.late])).rows[0].count, "0");
  });

  await t.test("scheduled windows: early scans are told when, and nothing is recorded", async () => {
    const scheduled = (await rpc(ids.admin, "select public.create_attendance_event($1,$2,$3,$4) as id", ["Pitch Workshop", new Date(Date.now() + 86400e3).toISOString(), "DIB", 3]))[0].id;
    const opens = new Date(Date.now() + 3600e3), closes = new Date(Date.now() + 2 * 3600e3);
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3,$4)", [scheduled, "PQRST23456", closes.toISOString(), opens.toISOString()]);
    const early = (await rpc(ids.alice, "select public.check_in_to_event($1) as result", ["PQRST23456"]))[0].result;
    assert.equal(early.status, "not_open");
    assert.equal(new Date(early.opens_at).getTime(), opens.getTime());
    assert.equal((await owner.query("select count(*) from public.event_attendance where event_id=$1", [scheduled])).rows[0].count, "0");
    await assert.rejects(rpc(ids.admin, "select public.open_event_check_in($1,$2,$3,$4)", [scheduled, "PQRST23456", opens.toISOString(), closes.toISOString()]), /closing time after/);
    // closing a window that never opened removes it entirely
    await rpc(ids.admin, "select public.close_event_check_in($1)", [scheduled]);
    assert.equal((await rpc(ids.alice, "select public.check_in_to_event($1) as result", ["PQRST23456"]))[0].result.status, "invalid_code");
    // open now, 3 points copied onto the record
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [scheduled, "PQRST23456", closes.toISOString()]);
    const ok = (await rpc(ids.alice, "select public.check_in_to_event($1) as result", ["PQRST23456"]))[0].result;
    assert.deepEqual([ok.status, ok.points], ["recorded", 3]);
    // editing the event later does not rewrite what Alice earned
    await rpc(ids.admin, "select public.update_attendance_event($1,$2,$3,$4,$5)", [scheduled, "Pitch Workshop", new Date(Date.now() + 86400e3).toISOString(), "DIB", 9]);
    assert.equal((await owner.query("select points from public.event_attendance where event_id=$1 and member_id=$2", [scheduled, ids.alice])).rows[0].points, 3);
    await assert.rejects(rpc(ids.alice, "select public.update_attendance_event($1,'x y',now(),'',5)", [scheduled]), /Admin access/);
    await assert.rejects(rpc(ids.admin, "select public.update_attendance_event($1,'x y',now(),'',5000)", [scheduled]), /points/);
    // archive: hidden from check-in, history kept
    await rpc(ids.admin, "select public.set_event_archived($1,true)", [scheduled]);
    assert.equal((await rpc(ids.concurrent, "select public.check_in_to_event($1) as result", ["PQRST23456"]))[0].result.status, "invalid_code");
    await assert.rejects(rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [scheduled, "PQRST23456", closes.toISOString()]), /Restore/);
    assert.equal((await owner.query("select count(*) from public.event_attendance where event_id=$1", [scheduled])).rows[0].count, "1");
    await assert.rejects(rpc(ids.alice, "select public.set_event_archived($1,false)", [scheduled]), /Admin access/);
  });

  await t.test("admin corrections: add by hand with custom points, duplicates refused, remove", async () => {
    await assert.rejects(rpc(ids.alice, "select public.admin_add_attendance($1,$2)", [eventId, "late@ucsd.edu"]), /Admin access/);
    await assert.rejects(rpc(ids.alice, "select public.admin_remove_attendance($1,$2)", [eventId, ids.bob]), /Admin access/);
    await rpc(ids.admin, "select public.admin_add_attendance($1,$2,$3,$4)", [eventId, " Late@UCSD.edu ", 10, "volunteered"]);
    const row = (await owner.query("select points, source, note, added_by from public.event_attendance where event_id=$1 and member_id=$2", [eventId, ids.late])).rows[0];
    assert.deepEqual([row.points, row.source, row.note, row.added_by], [10, "admin", "volunteered", ids.admin]);
    await assert.rejects(rpc(ids.admin, "select public.admin_add_attendance($1,$2)", [eventId, "late@ucsd.edu"]), /already recorded/);
    await assert.rejects(rpc(ids.admin, "select public.admin_add_attendance($1,$2)", [eventId, "nobody@ucsd.edu"]), /No verified account/);
    await assert.rejects(rpc(ids.admin, "select public.admin_add_attendance($1,$2)", [eventId, "unverified@ucsd.edu"]), /No verified account/);
    await assert.rejects(rpc(ids.admin, "select public.admin_add_attendance($1,$2,$3)", [eventId, "throttled@ucsd.edu", -1]), /points/);
    const attendees = await rpc(ids.admin, "select * from public.admin_event_attendees($1,0,5000)", [eventId]);
    assert.ok(attendees.some((a) => a.email === "late@ucsd.edu" && a.points === 10 && a.source === "admin"));
    await rpc(ids.admin, "select public.admin_remove_attendance($1,$2)", [eventId, ids.concurrent]);
    await assert.rejects(rpc(ids.admin, "select public.admin_remove_attendance($1,$2)", [eventId, ids.concurrent]), /no longer exists/);
    const audit = await owner.query("select action from private.attendance_audit where action in ('attendance_added','attendance_removed') order by id");
    assert.deepEqual(audit.rows.map((r) => r.action), ["attendance_added", "attendance_removed"]);
    // members still cannot write attendance rows directly
    await assert.rejects(rpc(ids.late, "update public.event_attendance set points=999 where member_id=$1", [ids.late]), /permission denied/);
    await assert.rejects(rpc(ids.late, "delete from public.event_attendance where member_id=$1", [ids.late]), /permission denied/);
  });

  await t.test("points board: members only, no emails or full names, ties, opt-out, season", async () => {
    await owner.query("update public.member_profiles set display_name='Alice Q. Liddell' where id=$1", [ids.alice]);
    const signedOut = (sql: string, args: unknown[] = []) => asUser(null, async (client) => (await client.query(sql, args)).rows);
    // the board is read as a signed-in member. signed-out and unverified callers get nothing
    const anon = (sql: string, args: unknown[] = []) => rpc(ids.throttled, sql, args);
    await assert.rejects(signedOut("select * from public.points_leaderboard()"), /permission denied/);
    await assert.rejects(rpc(ids.unverified, "select * from public.points_leaderboard()"), /verified UCSD/);
    let board = await anon("select * from public.points_leaderboard()");
    // late 10 (bonus), alice 1 + 3 = 4, bob 1
    assert.deepEqual(board.map((r) => [Number(r.rank), r.name, Number(r.points), Number(r.events)]), [[1, "late", 10, 1], [2, "Alice L.", 1, 1], [2, "bob", 1, 1]]);
    assert.equal(JSON.stringify(board).includes("@"), false);
    assert.equal(JSON.stringify(board).includes("Liddell"), false);
    assert.equal(Number(board[0].total_members), 3);
    // signed-out callers get nothing at all
    await assert.rejects(signedOut("select event_id from public.event_attendance"), /permission denied/);
    await assert.rejects(signedOut("select public.member_points_summary()"), /permission denied/);
    await assert.rejects(signedOut("select * from public.admin_event_attendees($1)", [eventId]), /permission denied/);
    await assert.rejects(signedOut("select private.public_name('x')"), /permission denied/);
    // ties share a rank
    await owner.query("update public.event_attendance set points=4 where member_id=$1", [ids.bob]);
    board = await anon("select * from public.points_leaderboard()");
    assert.deepEqual(board.map((r) => [r.name, Number(r.rank)]), [["late", 1], ["bob", 2], ["Alice L.", 3]]);
    // a member's own summary, and opting out of the public board
    const mine = (await rpc(ids.alice, "select public.member_points_summary() as s"))[0].s;
    assert.deepEqual([mine.points, mine.events, mine.rank, mine.show_on_leaderboard], [1, 1, 3, true]);
    await rpc(ids.alice, "select public.set_leaderboard_visibility(false)");
    board = await anon("select * from public.points_leaderboard()");
    assert.deepEqual(board.map((r) => r.name), ["late", "bob"]);
    assert.equal((await rpc(ids.alice, "select public.member_points_summary() as s"))[0].s.points, 1, "opting out hides, it does not erase");
    await rpc(ids.alice, "select public.set_leaderboard_visibility(true)");
    assert.equal((await anon("select * from public.points_leaderboard(1)")).length, 1);
    assert.equal((await anon("select * from public.points_leaderboard(100000)")).length, 3);
    // the account page ranks the same way the board does
    await rpc(ids.late, "select public.set_leaderboard_visibility(false)");
    assert.equal((await rpc(ids.alice, "select public.member_points_summary() as s"))[0].s.rank, 2, "a hidden top scorer does not push others down: bob is above alice, late is not counted");
    assert.equal((await rpc(ids.late, "select public.member_points_summary() as s"))[0].s.rank, null);
    await rpc(ids.late, "select public.set_leaderboard_visibility(true)");
    // an admin can take a name off the board, and the member cannot put it back
    await assert.rejects(rpc(ids.alice, "select public.admin_set_board_hidden($1,true)", [ids.bob]), /Admin access/);
    await rpc(ids.admin, "select public.admin_set_board_hidden($1,true)", [ids.bob]);
    await rpc(ids.bob, "select public.set_leaderboard_visibility(true)");
    assert.equal((await anon("select * from public.points_leaderboard()")).some((r) => r.name === "bob"), false);
    assert.equal((await rpc(ids.bob, "select public.member_points_summary() as s"))[0].s.hidden_by_admin, true);
    await rpc(ids.admin, "select public.admin_set_board_hidden($1,false)", [ids.bob]);
    // an archived event's points leave the board
    const archivedTotal = Number((await anon("select * from public.points_leaderboard()")).find((r) => r.name === "Alice L.").points);
    assert.equal(archivedTotal, 1, "the archived Pitch Workshop no longer counts");
    // a new season hides older events from the board without deleting them
    await assert.rejects(rpc(ids.alice, "select public.admin_set_season_start(now())"), /Admin access/);
    await rpc(ids.admin, "select public.admin_set_season_start($1)", [new Date(Date.now() + 3600e3).toISOString()]);
    board = await anon("select * from public.points_leaderboard()");
    assert.deepEqual(board, [], "no events on or after the new season start yet");
    assert.equal((await owner.query("select count(*) from public.event_attendance")).rows[0].count, "4");
    await rpc(ids.admin, "select public.admin_set_season_start(null)");
  });

  await t.test("the public name can never carry an email, digits, markup or a full surname", async () => {
    const shown = async (name: string) => (await owner.query("select private.public_name($1) as n", [name])).rows[0].n;
    assert.equal(await shown("Jane Q. Public"), "Jane P.");
    assert.equal(await shown("janedoe@ucsd.edu"), "janedoeucsdedu".slice(0, 20));
    assert.equal((await shown("jane.doe@ucsd.edu x")).includes("@"), false);
    assert.equal(await shown("Jane Doe (she/her)"), "Jane S.");
    assert.equal(await shown("<script>alert(1)</script>"), "scriptalertscript");
    assert.equal(await shown("12345"), "Member");
    assert.equal(await shown(""), "Member");
    assert.equal((await shown("A".repeat(80))).length, 20);
    const clean = async (name: string) => (await owner.query("select private.clean_member_name($1) as n", [name])).rows[0].n;
    assert.equal(await clean("Doe, Jane"), "Jane Doe");
    assert.equal(await clean("jane@ucsd.edu 123"), "janeucsd.edu");
    assert.equal(await clean("Mary-Jane O'Neil"), "Mary-Jane O'Neil");
    await assert.rejects(rpc(ids.alice, "select public.update_member_name($1)", ["alice@ucsd.edu"]), /Use your name/);
    await assert.rejects(rpc(ids.alice, "select public.update_member_name($1)", ["Alice 123"]), /Use your name/);
    await rpc(ids.alice, "select public.update_member_name($1)", ["Alice  Liddell"]);
    assert.equal((await owner.query("select display_name from public.member_profiles where id=$1", [ids.alice])).rows[0].display_name, "Alice Liddell");
    // plus-aliases cannot create extra accounts
    await assert.rejects(owner.query("insert into auth.users(id,email) values ($1,$2)", [randomUUID(), "alice+2@ucsd.edu"]), /UCSD email/);
  });

  await t.test("the closing time can move without replacing the code", async () => {
    const id = (await rpc(ids.admin, "select public.create_attendance_event($1,$2,$3,$4) as id", ["Long Meeting", new Date().toISOString(), "", 1]))[0].id;
    await assert.rejects(rpc(ids.admin, "select public.extend_event_check_in($1,$2)", [id, new Date(Date.now() + 3600e3).toISOString()]), /not open/);
    await rpc(ids.admin, "select public.open_event_check_in($1,$2,$3)", [id, "LMNPQ23456", new Date(Date.now() + 600e3).toISOString()]);
    await assert.rejects(rpc(ids.alice, "select public.extend_event_check_in($1,$2)", [id, new Date(Date.now() + 3600e3).toISOString()]), /Admin access/);
    await assert.rejects(rpc(ids.admin, "select public.extend_event_check_in($1,$2)", [id, new Date(Date.now() - 1000).toISOString()]), /future/);
    const later = new Date(Date.now() + 2 * 3600e3);
    await rpc(ids.admin, "select public.extend_event_check_in($1,$2)", [id, later.toISOString()]);
    const stored = (await rpc(ids.admin, "select * from public.admin_event_code($1)", [id]))[0];
    assert.deepEqual([stored.code, new Date(stored.closes_at).getTime()], ["LMNPQ23456", later.getTime()]);
    assert.equal((await rpc(ids.throttled, "select 1 as ok"))[0].ok, 1);
    await rpc(ids.admin, "select public.set_event_archived($1,true)", [id]);
  });

  await t.test("Google-style metadata supplies the display name", async () => {
    const id = randomUUID();
    await owner.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,$2,now(),$3)", [id, "gina@ucsd.edu", { full_name: "Google, Gina" }]);
    assert.equal((await owner.query("select display_name from public.member_profiles where id=$1", [id])).rows[0].display_name, "Gina Google");
    await owner.query("delete from auth.users where id=$1", [id]);
  });

  await t.test("admin authentication policy cannot be bypassed through direct SQL API access", async () => {
    await owner.query("update private.attendance_settings set admin_mfa_required=true");
    await assert.rejects(rpc(ids.admin, "select * from public.admin_member_attendance()"), /Admin access/);
    assert.equal((await rpc(ids.admin, "select * from public.admin_member_attendance()", [], "aal2")).length, 8);
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
