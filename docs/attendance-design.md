# Attendance system: implementation brief

## Confirmed scope

Members register and authenticate, check in by QR or manual event code, and see their own attendance count and history. A member can receive one attendance record per event. There is no public leaderboard or public member directory.

Board admins create attendance events, open or close check-in, issue or replace codes, view member attendance and promote registered users. The first admin is the account belonging to the tech lead, with its verified email explicitly confirmed before bootstrap.

The current public website and its new 2026–27 Google Sheet remain the sources of public page content. Private identity, attendance, event secrets and admin roles must never be placed in that Sheet or a repository snapshot.

## Confirmed design decisions

- Managed authentication and database: the club has created a Supabase Free project. Private attendance uses PostgreSQL row-level security.
- Initial email sender: the existing club Gmail, configured as custom SMTP with a Google app password stored only in Supabase.
- Accounts use verified `@ucsd.edu` email and one-time email sign-in codes. Passwords and UCSD SSO are not part of this implementation.
- The initial admin is the tech lead's UCSD account, confirmed privately during setup and promoted by a project operator only after email verification.
- Admins may promote and remove other admins. The portal prevents removing the final admin.
- Admins use the same verified email sign-in as members. The club declined an extra authenticator-app step. The database policy is explicitly set to false; no MFA enrollment is required or shown.
- An admin chooses a closing time each time they issue a check-in code. There is no assumed 30-minute default; admins can also close check-in early.

The reference ACM member login uses email and password. The user confirmed that their regular member login did not ask for MFA. This observation does not establish ACM's private admin policies.

## Common security and privacy requirements

- Identity is checked on the server for every protected read and mutation. Browser-supplied member IDs and roles are never trusted.
- Members can read only their own private records. Admin permissions are checked against authoritative database roles, not editable profile metadata or a cached browser flag.
- A database unique constraint on `(event_id, member_id)` enforces one check-in even when requests race or are retried.
- Event codes use cryptographic randomness. The database stores a hash, not the raw code. Codes expire, can be closed or replaced, and are compared only on the server.
- QR links point to the website's check-in page with the code in the URL fragment, which is not sent in HTTP requests. The user must authenticate and explicitly submit check-in; opening a URL never records attendance.
- Brute-force protection must use shared durable storage rather than an in-memory counter, so it works across Vercel instances.
- Private pages and authentication responses must not be cached in a public CDN. Admin changes and event code changes are auditable without recording raw codes.
- Store only the member's verified email, name, account timestamps, role, and event attendance. Do not collect student IDs, phone numbers, location or device fingerprints.
- Present members with a short privacy notice covering what is stored, which board members can access it, and how to request correction or deletion.
- Bootstrap must be a documented operator action against an already verified account. Do not ship a public first-user-wins admin endpoint or permanent automatic email-based promotion.

## Intended screens

1. Sign-in / registration, with the eligibility rule clearly stated.
2. Member account: attendance count, history, profile name, check-in entry point and sign-out.
3. Check-in: QR-filled or manually entered code, clear success / already checked-in / invalid-or-expired states.
4. Admin overview: event list and member attendance, searchable and paginated.
5. Admin event detail: open/close, code rotation, QR display and attendee list.
6. Admin member access: promote or remove registered members after explicit confirmation, with last-admin protection.

## Verification before launch

Test verified and unverified identities, duplicate and concurrent check-ins, expired/closed/replaced codes, invalid-code throttling, member isolation, direct API requests, admin promotion and revocation, last-admin protection, sign-out, QR-to-login-to-check-in on mobile, and public-site regressions. Use a separate test database and test accounts. Review the final implementation before enabling production member sign-ups.

## References

- Existing campus example: https://members.acmucsd.com/login
- Next.js auth guidance: https://nextjs.org/docs/app/guides/authentication
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
