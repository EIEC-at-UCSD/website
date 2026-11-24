-- Sample data for LOCAL development only (`npm run db:start` / `npm run db:reset`).
-- Never run this against the hosted project. Every account's password is "eiec-local-dev".
-- The admin is dev-admin@ucsd.edu. Members are ada@, grace@, linus@ and so on.

-- refuse to run anywhere that already has accounts. a fresh local database has none
do $$ begin
  if exists (select 1 from auth.users) then
    raise exception 'seed.sql is for an empty local database only; this one already has accounts.';
  end if;
end $$;

do $$
declare
  people text[][] := array[
    ['dev-admin', 'Dev Admin'], ['ada', 'Ada Lovelace'], ['grace', 'Grace Hopper'], ['linus', 'Linus Torvalds'],
    ['margaret', 'Margaret Hamilton'], ['alan', 'Alan Turing'], ['katherine', 'Katherine Johnson'],
    ['dennis', 'Dennis Ritchie'], ['barbara', 'Barbara Liskov'], ['ken', 'Ken Thompson'],
    ['radia', 'Radia Perlman'], ['tim', 'Tim Berners-Lee'], ['hedy', 'Hedy Lamarr']];
  person text[];
  uid uuid;
begin
  foreach person slice 1 in array people loop
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', person[1] || '@ucsd.edu',
      extensions.crypt('eiec-local-dev', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', person[2]), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', person[1] || '@ucsd.edu', 'email_verified', true),
      'email', now(), now(), now());
  end loop;
end $$;

select private.bootstrap_attendance_admin('dev-admin@ucsd.edu');

insert into public.attendance_events (id, title, starts_at, location, points, check_in_opens_at, check_in_closes_at) values
  ('00000000-0000-4000-8000-000000000001', 'Fall Kickoff GBM', now() - interval '21 days', 'DIB 208', 2, now() - interval '21 days', now() - interval '21 days' + interval '2 hours'),
  ('00000000-0000-4000-8000-000000000002', 'Pitch Deck Workshop', now() - interval '14 days', 'Price Center', 3, now() - interval '14 days', now() - interval '14 days' + interval '2 hours'),
  ('00000000-0000-4000-8000-000000000003', 'Founder Speaker Night', now() - interval '7 days', 'Jacobs Hall', 2, now() - interval '7 days', now() - interval '7 days' + interval '2 hours'),
  ('00000000-0000-4000-8000-000000000004', 'Winter GBM', now(), 'DIB 208', 2, now() - interval '10 minutes', now() + interval '3 hours'),
  ('00000000-0000-4000-8000-000000000005', 'Demo Day', now() + interval '10 days', 'Design and Innovation Building', 5, null, null);

-- the open event's code is ABCDE-23456
insert into private.event_codes (event_id, code_hash, code, opens_at, closes_at) values
  ('00000000-0000-4000-8000-000000000004', encode(sha256(convert_to('ABCDE23456', 'UTF8')), 'hex'), 'ABCDE23456', now() - interval '10 minutes', now() + interval '3 hours');

-- earlier attendance, tapering so the board has a spread and a tie
insert into public.event_attendance (event_id, member_id, points, checked_in_at)
select e.id, p.id, e.points, e.starts_at + interval '5 minutes'
from public.attendance_events e
join (select id, row_number() over (order by email) as n from public.member_profiles where email <> 'dev-admin@ucsd.edu') p
  on (e.title = 'Fall Kickoff GBM' and p.n <= 12) or (e.title = 'Pitch Deck Workshop' and p.n <= 7) or (e.title = 'Founder Speaker Night' and p.n <= 4);
