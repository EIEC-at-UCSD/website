-- Points, the points board, scheduled check-in windows and admin corrections.
-- Builds on 202611180001_attendance.sql. Run once, after it, as the project operator.
begin;

alter table public.attendance_events
  add column points integer not null default 1 check (points between 0 and 1000),
  add column archived_at timestamptz;

-- points are copied onto each record, so editing an event later never rewrites history
alter table public.event_attendance
  add column points integer not null default 1 check (points between 0 and 1000),
  add column source text not null default 'self' check (source in ('self', 'admin')),
  add column added_by uuid references auth.users(id) on delete set null,
  add column note text not null default '' check (char_length(note) <= 200);

alter table public.member_profiles
  add column show_on_leaderboard boolean not null default true,
  -- a board admin sets this to take an abusive name off the points board. the member can't undo it
  add column hidden_by_admin boolean not null default false;

-- the board only counts events on or after this date. moving it forward starts
-- a new school year without deleting anything. null counts everything
alter table private.attendance_settings add column season_start timestamptz;

-- raw code kept beside its hash so an admin can show the qr again after a
-- reload. only an admin function returns it, and it's short-lived and useless
-- without a verified account
alter table private.event_codes add column code text check (code is null or code ~ '^[A-HJ-NP-Z2-9]{10}$');

-- google sign-in sends full_name or name, password sign-up sends display_name.
-- names keep letters, spaces, apostrophes, hyphens and full stops, so the
-- points board can't carry an email address, digits or markup
create function private.clean_member_name(p_name text) returns text
language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(regexp_replace(
    case when coalesce(p_name, '') ~ '^[^,]+,[^,]+$' then btrim(split_part(p_name, ',', 2)) || ' ' || btrim(split_part(p_name, ',', 1)) else coalesce(p_name, '') end,
    '[^[:alpha:][:space:].''-]', '', 'g'), '[[:space:]]+', ' ', 'g')), 80);
$$;

create or replace function private.sync_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- a plus alias would let one student hold several accounts
  if new.email is null or char_length(new.email) > 254 or lower(new.email) !~ '^[^@[:space:]+]+@ucsd[.]edu$' then
    raise exception 'Use your own UCSD email address to create an EIEC account.' using errcode = '22023';
  end if;
  insert into public.member_profiles(id, email, display_name)
    values (new.id, lower(new.email), private.clean_member_name(coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''), '')))
    on conflict (id) do update set email = excluded.email;
  insert into private.member_roles(member_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace function public.update_member_name(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
begin
  if p_name is null or char_length(btrim(p_name)) not between 2 and 80 or btrim(p_name) !~ '^[[:alpha:]][[:alpha:] .''-]*$' then
    raise exception 'Use your name: letters, spaces, apostrophes and hyphens, 2 to 80 characters.' using errcode = '22023';
  end if;
  update public.member_profiles set display_name = regexp_replace(btrim(p_name), ' +', ' ', 'g') where id = member;
end;
$$;

-- "Jane Q. Public" becomes "Jane P." so the board never has a full name or email
create function private.public_name(p_name text) returns text
language sql immutable set search_path = '' as $$
  with parts as (
    select array_remove(regexp_split_to_array(regexp_replace(coalesce(p_name, ''), '[^[:alpha:][:space:]''-]', '', 'g'), '[[:space:]]+'), '') as words
  )
  select case
    when coalesce(array_length(words, 1), 0) = 0 or left(words[1], 20) !~ '[[:alpha:]]' then 'Member'
    when array_length(words, 1) = 1 or words[array_length(words, 1)] !~ '^[[:alpha:]]' then left(words[1], 20)
    else left(words[1], 20) || ' ' || upper(left(words[array_length(words, 1)], 1)) || '.'
  end from parts;
$$;

create function private.season_totals() returns table(member_id uuid, points bigint, events bigint)
language sql stable security definer set search_path = '' as $$
  select a.member_id, sum(a.points)::bigint, count(*)::bigint
  from public.event_attendance a join public.attendance_events e on e.id = a.event_id
  where e.archived_at is null and e.starts_at >= coalesce((select s.season_start from private.attendance_settings s where s.singleton), '-infinity'::timestamptz)
  group by a.member_id;
$$;

-- signed-in members only. first name, last initial and totals, never emails
create function public.points_leaderboard(p_limit integer default 100)
returns table(rank bigint, name text, points bigint, events bigint, total_members bigint, total_check_ins bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform private.require_member();
  return query
  with totals as (select * from private.season_totals()),
  visible as (
    select t.member_id, t.points, t.events, rank() over (order by t.points desc) as position
    from totals t join public.member_profiles p on p.id = t.member_id where p.show_on_leaderboard and not p.hidden_by_admin
  )
  select v.position, private.public_name(p.display_name), v.points, v.events,
    (select count(*) from totals), (select coalesce(sum(t.events), 0)::bigint from totals t)
  from visible v join public.member_profiles p on p.id = v.member_id
  order by v.position, v.events desc, private.public_name(p.display_name), v.member_id
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;

create function public.member_points_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
  mine record;
  shown boolean;
begin
  select t.points, t.events into mine from private.season_totals() t where t.member_id = member;
  select p.show_on_leaderboard and not p.hidden_by_admin into shown from public.member_profiles p where p.id = member;
  return jsonb_build_object(
    'points', coalesce(mine.points, 0),
    'events', coalesce(mine.events, 0),
    -- same ranking the points board shows. null for a member who isn't on it
    'rank', case when mine.points is null or not shown then null else
      (select count(*) + 1 from private.season_totals() t join public.member_profiles p on p.id = t.member_id
        where p.show_on_leaderboard and not p.hidden_by_admin and t.points > mine.points) end,
    'show_on_leaderboard', (select p.show_on_leaderboard from public.member_profiles p where p.id = member),
    'hidden_by_admin', (select p.hidden_by_admin from public.member_profiles p where p.id = member)
  );
end;
$$;

create function public.set_leaderboard_visibility(p_visible boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
begin
  if p_visible is null then raise exception 'Choose whether to appear on the board.' using errcode = '22023'; end if;
  update public.member_profiles set show_on_leaderboard = p_visible where id = member;
end;
$$;

drop function public.create_attendance_event(text, timestamptz, text);
create function public.create_attendance_event(p_title text, p_starts_at timestamptz, p_location text default '', p_points integer default 1) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  event uuid;
begin
  if p_title is null or char_length(btrim(p_title)) not between 2 and 120 or p_title ~ '[[:cntrl:]]'
    or p_starts_at is null or not isfinite(p_starts_at)
    or p_location is null or char_length(p_location) > 160 or p_location ~ '[[:cntrl:]]'
    or p_points is null or p_points not between 0 and 1000 then
    raise exception 'Check the event name, date, location and points.' using errcode = '22023';
  end if;
  insert into public.attendance_events(title, starts_at, location, points, created_by)
    values (btrim(p_title), p_starts_at, btrim(p_location), p_points, actor) returning id into event;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'event_created', event);
  return event;
end;
$$;

create function public.update_attendance_event(p_event_id uuid, p_title text, p_starts_at timestamptz, p_location text, p_points integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
begin
  if p_title is null or char_length(btrim(p_title)) not between 2 and 120 or p_title ~ '[[:cntrl:]]'
    or p_starts_at is null or not isfinite(p_starts_at)
    or p_location is null or char_length(p_location) > 160 or p_location ~ '[[:cntrl:]]'
    or p_points is null or p_points not between 0 and 1000 then
    raise exception 'Check the event name, date, location and points.' using errcode = '22023';
  end if;
  update public.attendance_events set title = btrim(p_title), starts_at = p_starts_at, location = btrim(p_location), points = p_points
    where id = p_event_id;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'event_updated', p_event_id);
end;
$$;

-- archiving closes check-in and hides the event from it. records stay
create function public.set_event_archived(p_event_id uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
begin
  if p_archived is null then raise exception 'Choose archive or restore.' using errcode = '22023'; end if;
  perform 1 from public.attendance_events where id = p_event_id for update;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  if p_archived then
    delete from private.event_codes where event_id = p_event_id;
    update public.attendance_events set archived_at = clock_timestamp(),
      check_in_closes_at = least(check_in_closes_at, clock_timestamp()) where id = p_event_id;
  else
    update public.attendance_events set archived_at = null where id = p_event_id;
  end if;
  insert into private.attendance_audit(actor_id, action, event_id)
    values (actor, case when p_archived then 'event_archived' else 'event_restored' end, p_event_id);
end;
$$;

-- the server generates the code. an opening time lets the board prepare the
-- qr before the meeting, a blank one opens check-in right away
drop function public.open_event_check_in(uuid, text, timestamptz);
create function public.open_event_check_in(p_event_id uuid, p_code text, p_closes_at timestamptz, p_opens_at timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  opens timestamptz := coalesce(p_opens_at, clock_timestamp());
  archived timestamptz;
begin
  select e.archived_at into archived from public.attendance_events e where e.id = p_event_id for update;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  if archived is not null then raise exception 'Restore this event before opening check-in.' using errcode = '22023'; end if;
  if p_code is null or p_code !~ '^[A-HJ-NP-Z2-9]{10}$' then raise exception 'The event code could not be generated. Try again.' using errcode = '22023'; end if;
  if not isfinite(opens) or opens > clock_timestamp() + interval '60 days' then
    raise exception 'Choose an opening time within the next 60 days.' using errcode = '22023';
  end if;
  if p_closes_at is null or not isfinite(p_closes_at) or p_closes_at <= clock_timestamp() or p_closes_at <= opens
    or p_closes_at > opens + interval '7 days' then
    raise exception 'Choose a closing time after the opening time, within a week of it.' using errcode = '22023';
  end if;
  insert into private.event_codes(event_id, code_hash, code, opens_at, closes_at)
    values (p_event_id, encode(sha256(convert_to(p_code, 'UTF8')), 'hex'), p_code, opens, p_closes_at)
    on conflict (event_id) do update set code_hash = excluded.code_hash, code = excluded.code, opens_at = excluded.opens_at, closes_at = excluded.closes_at;
  update public.attendance_events set check_in_opens_at = opens, check_in_closes_at = p_closes_at where id = p_event_id;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'check_in_opened_or_rotated', p_event_id);
end;
$$;

create or replace function public.close_event_check_in(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  moment timestamptz := clock_timestamp();
begin
  perform 1 from public.attendance_events where id = p_event_id for update;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  -- a window that already started is kept, closed, so late scans get a clear
  -- "closed" answer. one that never opened is removed
  delete from private.event_codes where event_id = p_event_id and opens_at >= moment;
  update private.event_codes set closes_at = moment where event_id = p_event_id and closes_at > moment;
  update public.attendance_events set check_in_closes_at = least(coalesce(check_in_closes_at, moment), moment),
    check_in_opens_at = case when check_in_opens_at >= moment then null else check_in_opens_at end where id = p_event_id;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'check_in_closed', p_event_id);
end;
$$;

create function public.admin_event_code(p_event_id uuid) returns table(code text, opens_at timestamptz, closes_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_attendance_admin();
  return query select c.code, c.opens_at, c.closes_at from private.event_codes c
    where c.event_id = p_event_id and c.closes_at > clock_timestamp();
end;
$$;

create or replace function public.check_in_to_event(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  member uuid := private.require_member();
  moment timestamptz := clock_timestamp();
  code text;
  digest text;
  event uuid;
  found_event record;
  window_row record;
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
  -- Open/close/rotation/archive take an exclusive event lock. Recheck the code
  -- and the clock after this shared lock, before recording attendance.
  select e.title, e.points, e.archived_at into found_event from public.attendance_events e where e.id = event for share;
  select c.opens_at, c.closes_at into window_row from private.event_codes c where c.event_id = event and c.code_hash = digest;
  if not found or found_event.archived_at is not null then return jsonb_build_object('status', 'invalid_code'); end if;
  -- only someone holding the current code learns whether its window is early or over
  if clock_timestamp() < window_row.opens_at then
    return jsonb_build_object('status', 'not_open', 'event_title', found_event.title, 'opens_at', window_row.opens_at);
  end if;
  if clock_timestamp() >= window_row.closes_at then
    return jsonb_build_object('status', 'closed', 'event_title', found_event.title);
  end if;
  insert into public.event_attendance(event_id, member_id, points, source)
    values (event, member, found_event.points, 'self') on conflict do nothing;
  get diagnostics inserted = row_count;
  return jsonb_build_object('status', case when inserted = 1 then 'recorded' else 'already_checked_in' end,
    'event_title', found_event.title, 'points', found_event.points);
end;
$$;

-- for someone who forgot to check in, or bonus points with a custom value
create function public.admin_add_attendance(p_event_id uuid, p_email text, p_points integer default null, p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  target uuid;
  event_points integer;
  inserted integer;
begin
  if p_email is null or char_length(p_email) > 254 or p_note is null or char_length(p_note) > 200 or p_note ~ '[[:cntrl:]]'
    or (p_points is not null and p_points not between 0 and 1000) then
    raise exception 'Check the email, points and note.' using errcode = '22023';
  end if;
  select e.points into event_points from public.attendance_events e where e.id = p_event_id for share;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  select p.id into target from public.member_profiles p join auth.users u on u.id = p.id
    where p.email = lower(btrim(p_email)) and u.email_confirmed_at is not null;
  if target is null then
    raise exception 'No verified account uses that email. Ask them to create an EIEC account first.' using errcode = '22023';
  end if;
  insert into public.event_attendance(event_id, member_id, points, source, added_by, note)
    values (p_event_id, target, coalesce(p_points, event_points), 'admin', actor, btrim(p_note)) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then raise exception 'That member is already recorded for this event.' using errcode = '22023'; end if;
  insert into private.attendance_audit(actor_id, action, target_member_id, event_id) values (actor, 'attendance_added', target, p_event_id);
  return target;
end;
$$;

create function public.admin_remove_attendance(p_event_id uuid, p_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
begin
  delete from public.event_attendance where event_id = p_event_id and member_id = p_member_id;
  if not found then raise exception 'That attendance record no longer exists.' using errcode = '22023'; end if;
  insert into private.attendance_audit(actor_id, action, target_member_id, event_id) values (actor, 'attendance_removed', p_member_id, p_event_id);
end;
$$;

drop function public.admin_event_attendees(uuid, integer);
create function public.admin_event_attendees(p_event_id uuid, p_offset integer default 0, p_limit integer default 25)
returns table(member_id uuid, display_name text, email text, checked_in_at timestamptz, points integer, source text, note text, total_rows bigint)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_attendance_admin();
  if p_offset is null or p_offset < 0 or p_offset > 100000 or p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'Invalid page.' using errcode = '22023';
  end if;
  return query select p.id, p.display_name, p.email, a.checked_in_at, a.points, a.source, a.note, count(*) over()
    from public.event_attendance a join public.member_profiles p on p.id = a.member_id
    where a.event_id = p_event_id order by a.checked_in_at, p.id limit p_limit offset p_offset;
end;
$$;

drop function public.admin_member_attendance(text, integer);
create function public.admin_member_attendance(p_search text default '', p_offset integer default 0)
returns table(id uuid, display_name text, email text, role text, created_at timestamptz, attendance_count bigint, total_points bigint, verified boolean, hidden_by_admin boolean, total_rows bigint)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_attendance_admin();
  if p_search is null or char_length(p_search) > 120 or p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception 'Invalid search or page.' using errcode = '22023';
  end if;
  return query select p.id, p.display_name, p.email, r.role, p.created_at, count(a.event_id), coalesce(sum(a.points), 0)::bigint,
      (select u.email_confirmed_at is not null from auth.users u where u.id = p.id), p.hidden_by_admin, count(*) over()
    from public.member_profiles p join private.member_roles r on r.member_id = p.id
    left join public.event_attendance a on a.member_id = p.id
    where position(lower(p_search) in lower(p.email || ' ' || p.display_name)) > 0
    group by p.id, r.role order by p.display_name, p.id limit 25 offset p_offset;
end;
$$;

-- moves the closing time without touching the code, so a qr already on a slide keeps working
create function public.extend_event_check_in(p_event_id uuid, p_closes_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
  opens timestamptz;
begin
  perform 1 from public.attendance_events where id = p_event_id and archived_at is null for update;
  if not found then raise exception 'Event not found.' using errcode = '22023'; end if;
  select c.opens_at into opens from private.event_codes c where c.event_id = p_event_id and c.closes_at > clock_timestamp();
  if not found then raise exception 'Check-in is not open. Generate a code first.' using errcode = '22023'; end if;
  if p_closes_at is null or not isfinite(p_closes_at) or p_closes_at <= clock_timestamp() or p_closes_at <= opens
    or p_closes_at > opens + interval '7 days' then
    raise exception 'Choose a closing time in the future, within a week of opening.' using errcode = '22023';
  end if;
  update private.event_codes set closes_at = p_closes_at where event_id = p_event_id;
  update public.attendance_events set check_in_closes_at = p_closes_at where id = p_event_id;
  insert into private.attendance_audit(actor_id, action, event_id) values (actor, 'check_in_extended', p_event_id);
end;
$$;

create function public.admin_set_board_hidden(p_member_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
begin
  if p_hidden is null then raise exception 'Choose hide or show.' using errcode = '22023'; end if;
  update public.member_profiles set hidden_by_admin = p_hidden where id = p_member_id;
  if not found then raise exception 'Member not found.' using errcode = '22023'; end if;
  insert into private.attendance_audit(actor_id, action, target_member_id)
    values (actor, case when p_hidden then 'board_hidden' else 'board_shown' end, p_member_id);
end;
$$;

create function public.admin_season() returns timestamptz
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_attendance_admin();
  return (select s.season_start from private.attendance_settings s where s.singleton);
end;
$$;

create function public.admin_set_season_start(p_start timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_attendance_admin();
begin
  if p_start is not null and not isfinite(p_start) then raise exception 'Choose a valid date.' using errcode = '22023'; end if;
  update private.attendance_settings set season_start = p_start where singleton;
  insert into private.attendance_audit(actor_id, action) values (actor, 'season_start_changed');
end;
$$;

-- members read only the columns the pages show. board notes, who added a record
-- and who created an event stay behind the admin functions
revoke select on public.member_profiles, public.attendance_events, public.event_attendance from authenticated;
grant select (id, display_name, email, created_at, show_on_leaderboard) on public.member_profiles to authenticated;
grant select (id, title, starts_at, location, points, check_in_opens_at, check_in_closes_at, archived_at, created_at) on public.attendance_events to authenticated;
grant select (event_id, member_id, checked_in_at, points) on public.event_attendance to authenticated;

revoke all on all tables in schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_verified_member(), private.is_attendance_admin() to authenticated;

revoke execute on function public.points_leaderboard(integer), public.member_points_summary(), public.set_leaderboard_visibility(boolean),
  public.create_attendance_event(text,timestamptz,text,integer), public.update_attendance_event(uuid,text,timestamptz,text,integer),
  public.set_event_archived(uuid,boolean), public.open_event_check_in(uuid,text,timestamptz,timestamptz), public.admin_event_code(uuid),
  public.admin_add_attendance(uuid,text,integer,text), public.admin_remove_attendance(uuid,uuid),
  public.admin_event_attendees(uuid,integer,integer), public.admin_member_attendance(text,integer),
  public.admin_season(), public.admin_set_season_start(timestamptz), public.extend_event_check_in(uuid,timestamptz),
  public.admin_set_board_hidden(uuid,boolean) from public, anon;
grant execute on function public.member_points_summary(), public.set_leaderboard_visibility(boolean),
  public.create_attendance_event(text,timestamptz,text,integer), public.update_attendance_event(uuid,text,timestamptz,text,integer),
  public.set_event_archived(uuid,boolean), public.open_event_check_in(uuid,text,timestamptz,timestamptz), public.admin_event_code(uuid),
  public.admin_add_attendance(uuid,text,integer,text), public.admin_remove_attendance(uuid,uuid),
  public.admin_event_attendees(uuid,integer,integer), public.admin_member_attendance(text,integer),
  public.admin_season(), public.admin_set_season_start(timestamptz), public.extend_event_check_in(uuid,timestamptz),
  public.admin_set_board_hidden(uuid,boolean) to authenticated;
-- signed-out visitors can call nothing
grant execute on function public.points_leaderboard(integer) to authenticated;

commit;
