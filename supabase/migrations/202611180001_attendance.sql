begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table private.attendance_settings (
  singleton boolean primary key default true check (singleton),
  -- The club chose verified email sign-in without a second authenticator step.
  -- A null policy still fails closed if an operator clears this setting.
  admin_mfa_required boolean
);
insert into private.attendance_settings(singleton, admin_mfa_required) values (true, false);

create table public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  email text not null unique check (email ~ '^[^@[:space:]]+@ucsd[.]edu$'),
  created_at timestamptz not null default now()
);

create table private.member_roles (
  member_id uuid primary key references public.member_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin'))
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  starts_at timestamptz not null check (isfinite(starts_at)),
  location text not null default '' check (char_length(location) <= 160),
  check_in_opens_at timestamptz,
  check_in_closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.event_attendance (
  event_id uuid not null references public.attendance_events(id) on delete restrict,
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (event_id, member_id)
);
create index event_attendance_member_idx on public.event_attendance(member_id, checked_in_at desc);
create index attendance_events_date_idx on public.attendance_events(starts_at desc);

create table private.event_codes (
  event_id uuid primary key references public.attendance_events(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  opens_at timestamptz not null,
  closes_at timestamptz not null check (isfinite(closes_at) and closes_at > opens_at)
);

create table private.check_in_limits (
  member_id uuid primary key references public.member_profiles(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null,
  hour_start timestamptz not null,
  hour_count integer not null
);

create table private.attendance_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_member_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.attendance_events(id) on delete set null,
  created_at timestamptz not null default now()
);

-- User-editable metadata is never used as an authorization source.
create function private.is_verified_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@ucsd[.]edu$'
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

create function private.has_admin_role() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_verified_member() and exists (
    select 1 from private.member_roles r where r.member_id = auth.uid() and r.role = 'admin'
  );
$$;

create function private.is_attendance_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_admin_role() and exists (
    select 1 from private.attendance_settings s where s.singleton
      and (s.admin_mfa_required = false or (s.admin_mfa_required = true and auth.jwt()->>'aal' = 'aal2'))
  );
$$;

create function private.require_member() returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_verified_member() then
    raise exception 'A verified UCSD account is required.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function private.require_attendance_admin() returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  -- Role revocation waits for authorized mutations already in progress.
  perform pg_advisory_xact_lock_shared(hashtextextended('eiec-admin-role-changes', 0));
  if not private.is_attendance_admin() then
    raise exception 'Admin access and the configured authentication level are required.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- Domain eligibility is enforced here as well as in the sign-in interface.
create function private.sync_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  clean_name text;
begin
  if new.email is null or char_length(new.email) > 254 or lower(new.email) !~ '^[^@[:space:]]+@ucsd[.]edu$' then
    raise exception 'Use a UCSD email address to create an EIEC account.' using errcode = '22023';
  end if;
  clean_name := left(btrim(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', ''), '[[:cntrl:]]', '', 'g')), 80);
  insert into public.member_profiles(id, email, display_name)
    values (new.id, lower(new.email), clean_name)
    on conflict (id) do update set email = excluded.email;
  insert into private.member_roles(member_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger eiec_sync_member_profile after insert or update of email on auth.users
  for each row execute function private.sync_member_profile();

alter table public.member_profiles enable row level security;
alter table public.attendance_events enable row level security;
alter table public.event_attendance enable row level security;
alter table private.member_roles enable row level security;
alter table private.event_codes enable row level security;
alter table private.check_in_limits enable row level security;
alter table private.attendance_audit enable row level security;
alter table private.attendance_settings enable row level security;

revoke all on public.member_profiles, public.attendance_events, public.event_attendance from public, anon, authenticated;
grant select on public.member_profiles, public.attendance_events, public.event_attendance to authenticated;

create policy member_profile_read on public.member_profiles for select to authenticated
  using (private.is_verified_member() and (id = auth.uid() or private.is_attendance_admin()));
create policy member_attendance_read on public.event_attendance for select to authenticated
  using (private.is_verified_member() and (member_id = auth.uid() or private.is_attendance_admin()));
create policy member_event_read on public.attendance_events for select to authenticated
  using (private.is_attendance_admin() or (private.is_verified_member() and exists (
    select 1 from public.event_attendance a where a.event_id = attendance_events.id and a.member_id = auth.uid()
  )));

create function public.get_member_access() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
begin
  return jsonb_build_object(
    'role', coalesce((select r.role from private.member_roles r where r.member_id = member), 'member'),
    'admin_mfa_required', (select s.admin_mfa_required from private.attendance_settings s where s.singleton),
    'admin_access', private.is_attendance_admin()
  );
end;
$$;

create function public.update_member_name(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
begin
  if p_name is null or char_length(btrim(p_name)) not between 2 and 80 or p_name ~ '[[:cntrl:]]' then
    raise exception 'Use a name between 2 and 80 characters.' using errcode = '22023';
  end if;
  update public.member_profiles set display_name = btrim(p_name) where id = member;
end;
$$;

create function public.create_attendance_event(p_title text, p_starts_at timestamptz, p_location text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  event uuid;
begin
  if p_title is null or char_length(btrim(p_title)) not between 2 and 120 or p_title ~ '[[:cntrl:]]'
    or p_starts_at is null or not isfinite(p_starts_at)
    or p_location is null or char_length(p_location) > 160 or p_location ~ '[[:cntrl:]]' then
    raise exception 'Check the event name, date and location.' using errcode = '22023';
  end if;
  insert into public.attendance_events(title, starts_at, location, created_by)
    values (btrim(p_title), p_starts_at, btrim(p_location), actor) returning id into event;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'event_created', event);
  return event;
end;
$$;

create function public.open_event_check_in(p_event_id uuid, p_code_hash text, p_closes_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  opens timestamptz := clock_timestamp();
begin
  perform 1 from public.attendance_events where id = p_event_id for update;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  if p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$' or p_closes_at is null
    or not isfinite(p_closes_at) or p_closes_at <= opens then
    raise exception 'Choose a closing time in the future.' using errcode = '22023';
  end if;
  insert into private.event_codes(event_id, code_hash, opens_at, closes_at)
    values (p_event_id, p_code_hash, opens, p_closes_at)
    on conflict (event_id) do update set code_hash = excluded.code_hash, opens_at = excluded.opens_at, closes_at = excluded.closes_at;
  update public.attendance_events set check_in_opens_at = opens, check_in_closes_at = p_closes_at where id = p_event_id;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'check_in_opened_or_rotated', p_event_id);
end;
$$;

create function public.close_event_check_in(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
begin
  perform 1 from public.attendance_events where id = p_event_id for update;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  delete from private.event_codes where event_id = p_event_id;
  update public.attendance_events set check_in_closes_at = clock_timestamp() where id = p_event_id;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'check_in_closed', p_event_id);
end;
$$;

create function public.check_in_to_event(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
  moment timestamptz := clock_timestamp();
  code text;
  digest text;
  event uuid;
  title text;
  attempts private.check_in_limits;
  inserted integer;
begin
  -- Serialize this member's attempts across instances. Failed attempts return
  -- normally so their durable rate-limit counters are not rolled back.
  perform pg_advisory_xact_lock(hashtextextended('eiec-check-in-' || member::text, 0));
  insert into private.check_in_limits(member_id, minute_start, minute_count, hour_start, hour_count)
    values (member, moment, 1, moment, 1)
    on conflict (member_id) do update set
      minute_count = case when check_in_limits.minute_start <= moment - interval '1 minute' then 1 else check_in_limits.minute_count + 1 end,
      minute_start = case when check_in_limits.minute_start <= moment - interval '1 minute' then moment else check_in_limits.minute_start end,
      hour_count = case when check_in_limits.hour_start <= moment - interval '1 hour' then 1 else check_in_limits.hour_count + 1 end,
      hour_start = case when check_in_limits.hour_start <= moment - interval '1 hour' then moment else check_in_limits.hour_start end
    returning * into attempts;
  if attempts.minute_count > 10 or attempts.hour_count > 60 then return jsonb_build_object('status', 'rate_limited'); end if;
  if p_code is null or char_length(p_code) > 40 then return jsonb_build_object('status', 'invalid_code'); end if;
  code := upper(regexp_replace(p_code, '[[:space:]-]', '', 'g'));
  if code !~ '^[A-HJ-NP-Z2-9]{10}$' then return jsonb_build_object('status', 'invalid_code'); end if;
  digest := encode(sha256(convert_to(code, 'UTF8')), 'hex');
  select c.event_id into event from private.event_codes c where c.code_hash = digest;
  if event is null then return jsonb_build_object('status', 'invalid_code'); end if;
  -- Open/close/rotation takes an exclusive event lock. Recheck the code and
  -- current time after this shared lock, before recording attendance.
  select e.title into title from public.attendance_events e where e.id = event for share;
  if not exists (select 1 from private.event_codes c where c.event_id = event and c.code_hash = digest
    and c.opens_at <= clock_timestamp() and c.closes_at > clock_timestamp()) then
    return jsonb_build_object('status', 'invalid_code');
  end if;
  insert into public.event_attendance(event_id, member_id) values (event, member) on conflict do nothing;
  get diagnostics inserted = row_count;
  return jsonb_build_object('status', case when inserted = 1 then 'recorded' else 'already_checked_in' end, 'event_title', title);
end;
$$;

create function public.set_member_admin(p_member_id uuid, p_make_admin boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  target_role text;
begin
  perform pg_advisory_xact_lock(hashtextextended('eiec-admin-role-changes', 0));
  actor := private.require_attendance_admin();
  if p_make_admin is null then raise exception 'Choose an access level.' using errcode = '22023'; end if;
  select r.role into target_role from private.member_roles r join auth.users u on u.id = r.member_id
    where r.member_id = p_member_id and u.email_confirmed_at is not null;
  if target_role is null then raise exception 'Verified member not found.' using errcode = '22023'; end if;
  if not p_make_admin and target_role = 'admin' and (select count(*) from private.member_roles where role = 'admin') <= 1 then
    raise exception 'Keep at least one admin. Promote another member first.' using errcode = '22023';
  end if;
  update private.member_roles set role = case when p_make_admin then 'admin' else 'member' end where member_id = p_member_id;
  insert into private.attendance_audit(actor_id, action, target_member_id)
    values (actor, case when p_make_admin then 'admin_promoted' else 'admin_removed' end, p_member_id);
end;
$$;

create function public.admin_member_attendance(p_search text default '', p_offset integer default 0)
returns table(id uuid, display_name text, email text, role text, created_at timestamptz, attendance_count bigint, total_rows bigint)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_attendance_admin();
  if p_search is null or char_length(p_search) > 120 or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid search or page.' using errcode = '22023';
  end if;
  return query select p.id, p.display_name, p.email, r.role, p.created_at, count(a.event_id), count(*) over()
    from public.member_profiles p join private.member_roles r on r.member_id = p.id
    left join public.event_attendance a on a.member_id = p.id
    where position(lower(p_search) in lower(p.email || ' ' || p.display_name)) > 0
    group by p.id, r.role order by p.display_name, p.id limit 25 offset p_offset;
end;
$$;

create function public.admin_event_attendees(p_event_id uuid, p_offset integer default 0)
returns table(member_id uuid, display_name text, email text, checked_in_at timestamptz, total_rows bigint)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_attendance_admin();
  if p_offset is null or p_offset < 0 or p_offset > 100000 then raise exception 'Invalid page.' using errcode = '22023'; end if;
  return query select p.id, p.display_name, p.email, a.checked_in_at, count(*) over()
    from public.event_attendance a join public.member_profiles p on p.id = a.member_id
    where a.event_id = p_event_id order by a.checked_in_at, p.id limit 25 offset p_offset;
end;
$$;

-- An operator runs this from the SQL editor after the tech lead has verified
-- their account. It is not executable by website users or the public API.
create function private.bootstrap_attendance_admin(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  member uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('eiec-admin-role-changes', 0));
  if exists (select 1 from private.member_roles where role = 'admin') then
    raise exception 'An admin already exists. Use the admin portal.' using errcode = '22023';
  end if;
  select u.id into member from auth.users u join public.member_profiles p on p.id = u.id
    where lower(u.email) = lower(p_email) and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@ucsd[.]edu$';
  if member is null then raise exception 'Create and verify this UCSD account first.' using errcode = '22023'; end if;
  update private.member_roles set role = 'admin' where member_id = member;
  insert into private.attendance_audit(action, target_member_id) values ('initial_admin_bootstrapped', member);
  return member;
end;
$$;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_verified_member(), private.is_attendance_admin() to authenticated;

revoke execute on function public.get_member_access(), public.update_member_name(text),
  public.create_attendance_event(text,timestamptz,text), public.open_event_check_in(uuid,text,timestamptz),
  public.close_event_check_in(uuid), public.check_in_to_event(text), public.set_member_admin(uuid,boolean),
  public.admin_member_attendance(text,integer), public.admin_event_attendees(uuid,integer) from public, anon;
grant execute on function public.get_member_access(), public.update_member_name(text),
  public.create_attendance_event(text,timestamptz,text), public.open_event_check_in(uuid,text,timestamptz),
  public.close_event_check_in(uuid), public.check_in_to_event(text), public.set_member_admin(uuid,boolean),
  public.admin_member_attendance(text,integer), public.admin_event_attendees(uuid,integer) to authenticated;

commit;
