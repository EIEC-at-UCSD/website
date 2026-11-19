# Attendance setup and operation

The public club pages continue to use the published content Sheet. Accounts, roles and attendance are stored separately in a club-owned Supabase project. Do not copy private attendance to the published Sheet.

## 1. Database

Use an empty Supabase project dedicated to EIEC accounts. Keep the Data API enabled, automatic grants to new tables disabled, and automatic RLS enabled. The migration also explicitly enables RLS and grants only the access the website needs.

In the project's SQL Editor, create a query, paste the complete contents of `supabase/migrations/202611180001_attendance.sql`, and run it once as the project operator. It is a single transaction. Do not rerun a successful initial migration or remove its objects to fix an error; investigate the error first. Future changes should be new migrations.

The migration creates the profiles, events, attendance, private role/code/rate-limit/audit tables, RLS policies and narrowly scoped database functions. It enforces verified UCSD accounts, one attendance entry per event/member, server-side admin authorization and last-admin protection. The website uses verified UCSD email and password sign-in; no authenticator enrollment is required. Changing from email-code sign-in to password sign-in requires no attendance schema change. Do not rerun an already applied migration.

Do this before creating the first member account, since a database trigger creates its profile. An unrelated pre-existing account in this project needs an operator-reviewed backfill before it can use attendance.

## 2. Website environment

Copy `.env.example` to `.env.local` for development and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_SITE_URL=https://eiecatucsd.vercel.app
```

Use the same variable names in the Vercel project settings. These URL and publishable key values are designed to be used by the browser; database access is protected by authentication, grants and RLS. Never add a Supabase secret/service-role key or database password to the browser, repository, Vercel public variables or chat. This implementation does not need a service-role key.

Restart development after changing environment values. Redeploy Vercel after changing its values, since public variables are included during the build. Keep attendance on a feature/preview deployment until hosted authentication and the launch checks below pass.

For a local end-to-end test, set `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` in `.env.local` so locally generated QR links and callbacks return to the development server. Keep the production URL in Vercel.

For previews, QR links use Vercel's deployment hostname. Avoid giving untrusted preview branches access to a production database with real member information. Prefer a separate staging project as development expands.

## 3. Supabase email authentication

In Authentication → Sign In / Providers, enable Email and keep **Confirm email enabled**. Set the minimum password length to **12** in Supabase as well as in the website, so direct API requests cannot bypass the length requirement. Passwords support passphrases without mandatory character categories. The website rejects inputs longer than bcrypt's 72-byte UTF-8 limit without trimming them. Enable **Require reauthentication when changing password**; recovery creates a fresh verified session. An older session can use Forgot password to obtain fresh verification before updating a password. Keep authentication and email rate limits enabled. Do not enable anonymous sign-ins. The database also rejects account creation outside `@ucsd.edu`, even if someone bypasses the website form.

In Authentication → URL Configuration, set the Site URL to `https://eiecatucsd.vercel.app`. Add exact redirect URLs for the environments you will actually use:

```text
https://eiecatucsd.vercel.app/auth/callback
http://127.0.0.1:3000/auth/callback
http://localhost:3000/auth/callback
```

Add an exact preview deployment's `/auth/callback` URL when testing that preview. Do not allow arbitrary external destinations. New members create a password, then enter an email verification code once to finish registration. Returning members use email and password. The callback also supports Supabase confirmation links.

Under Authentication → Email Templates, put the following body in **Confirm signup**:

The source templates are also saved as `supabase/templates/confirm-signup.html` and `supabase/templates/reset-password.html`. Saving these files in Git does not configure the hosted project; paste their contents into the matching Supabase templates and save them there.

```html
<h2>Verify your EIEC account</h2>
<p>Enter this code on the EIEC website to verify your UCSD email:</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
<p>If you did not request this code, you can ignore this email. Do not share it.</p>
```

Put this body in **Reset Password**:

```html
<h2>Reset your EIEC password</h2>
<p>Enter this password reset code on the EIEC website:</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
<p>If you did not request this reset, ignore this email. Do not share the code.</p>
```

The website does not use Magic Link for returning sign-ins. Keep OTP expiry short enough for verification/recovery and retain resend/verification rate limits. Event code closing times are a separate setting selected by event admins, not the email OTP lifetime. Supabase password storage, sign-up, verification and reset are handled through its Auth SDK; do not add password columns to attendance tables or log request passwords.

Use **Forgot password?** to request a reset code. The UI gives the same response for existing and unknown addresses. After successful recovery-code verification, `/account/password` requires a verified authenticated account before allowing a new password to be saved. A failed password update can be retried without redeeming the already consumed recovery code again. Existing accounts created during email-code testing can set their initial password through this same recovery flow.

### Email delivery is a launch dependency

Configure a club-owned SMTP sender in Authentication → Email / SMTP Settings. Supabase's built-in sender is for testing only, normally delivers only to project-team addresses, and currently allows two messages per hour. It cannot support normal club sign-ups.

Use the sender provider's documented host, port, username, password and verified From address. Enter the sender password directly in Supabase, never in this repository or chat. Choose the service with the board before creating a paid subscription or purchasing a domain. Test delivery to an actual UCSD inbox, including junk folders, and set sending limits appropriate for a meeting with many members signing in at once.

The club chose its existing Gmail for the initial rollout. A club account owner must enable Google 2-Step Verification, then create an app password named `EIEC Supabase` at [Google App passwords](https://myaccount.google.com/apppasswords). This protects the sender account and does not add MFA to the EIEC website. Enter the app password directly into Supabase's SMTP password field; do not use the normal Gmail password.

| SMTP setting | Value |
| --- | --- |
| Sender email | `eiec.at.ucsd@gmail.com` |
| Sender name | `EIEC at UCSD` |
| Host | `smtp.gmail.com` |
| Port | `465` (implicit SSL/TLS) |
| Username | `eiec.at.ucsd@gmail.com` |
| Password | The Google app password, entered privately by the club account owner |

Google documents a limit of up to 500 outgoing messages per day for personal Gmail accounts, shared with regular club email; delivery may be limited earlier by anti-abuse protections. Supabase initially limits custom SMTP to 30 messages per hour. Review its Auth rate limit before a full-club rollout, while retaining abuse protection and staying within Gmail's capacity. Changing the Gmail account password revokes its app passwords, so update Supabase after that change. If club volume outgrows Gmail, move to a dedicated transactional sender.

Sender references: [Google app passwords](https://support.google.com/accounts/answer/185833), [Gmail SMTP settings and limits](https://developers.google.com/workspace/gmail/imap/imap-smtp).

References: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [password authentication](https://supabase.com/docs/guides/auth/passwords), [password security](https://supabase.com/docs/guides/auth/password-security), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Initial admin

After the website is configured and email delivery works, the designated tech lead must create an account and enter the code sent to their UCSD inbox. Then the project operator runs this in Supabase's SQL Editor, replacing the example address with that person's verified address:

```sql
select private.bootstrap_attendance_admin('your-verified-ucsd-email@ucsd.edu');
```

Refresh the account page and use **Open admin portal**. This owner-only function refuses to run if an admin already exists and is not accessible through the public API. Never add a public bootstrap endpoint or promote users using editable profile metadata.

Once the first admin exists, promote other verified board members through Admin → Members. Removing an admin takes effect against database authorization immediately. Requests already authorized and in progress can finish before the removal commits. At least one admin must remain; keep a second verified board admin for continuity.

If all admins lose access, an authorized project owner must review the recovery request and repair the role using the private database tables. Do not bypass email verification or share session tokens. Project ownership and administrative website roles are separate.

## 5. Running a meeting

1. Create an event with its name, date/time and optional location. This private attendance event does not automatically add an item to the public Google Sheet calendar.
2. Choose a closing time, then select **Generate code and QR**. Check-in opens immediately. Share the QR or the displayed ten-character code at the event.
3. Members sign in with their verified UCSD email and EIEC password, then explicitly select **Check in**. Merely opening or previewing a QR link never records attendance.
4. Duplicate submissions count once. Close check-in early when needed. Generating a replacement code invalidates the old one.
5. Review attendees on the event page or individual member totals/history under Members.

Codes are stored as SHA-256 hashes; the raw code/QR is shown only when generated. If the page is reloaded or the code is lost, generate a replacement. QR codes are generated locally without sending event secrets to a third-party image service. Anyone with a valid code and an eligible account can check in during its open window; this system does not prove physical presence or prevent members sharing a code.

## 6. Privacy and maintenance

The privacy notice is at `/privacy`. Members see their own attendance; authorized admins can see member profiles and attendance. There is no public leaderboard. Ask the board to review the notice, account eligibility and retention expectations before launch.

For a verified correction, export or deletion request, use authorized project tools and confirm the requester's identity first. Deleting an Auth user removes their profile, attendance, rate counters and role through foreign keys. Audit references to that user are cleared rather than retaining their identifier. A deleted admin requires another admin or an owner recovery action. Do not delete an event to handle a member request.

Keep exports and backups private and apply the same retention decisions to them. The Free plan has storage/sending limits and can pause after inactivity; check project health and email delivery before an event. Review project owners and website admins when board membership changes. Review dependency updates and Auth/security logs without logging OTPs, tokens or raw event codes.

## 7. Verification

Run `npm test`, `npm run typecheck`, and `npm run build`. Real PostgreSQL authorization tests are available with `npm run test:db`; they do not replace hosted Supabase Auth checks.

The DB suite resets schemas and must only run against an isolated disposable local database named `eiec_attendance_test`. It refuses a remote hostname or another database name. Never supply the production database URL. Set `ATTENDANCE_TEST_DATABASE_URL` explicitly for that isolated database, then run `npm run test:db`. With no URL, the DB suite is skipped and must not be reported as passed.

Before launch, verify on the hosted setup with two separate eligible member accounts and a board admin:

- New account email verification, returning password sign-in, wrong password, unverified-account rejection/resend, expired/wrong verification and recovery codes, password reset/save/retry, old/new password behavior, sign-out and signed-out route protection. Test unknown-account reset responses without exposing account existence.
- QR → sign-in → check-in on a phone, manual code entry, count/history update and duplicate check-in.
- Invalid, expired, closed and replaced event codes; opening a QR without submitting must not record attendance.
- A member cannot read someone else's profile/history, create attendance directly or self-promote through the API.
- Admin event creation, attendee/member reports, promotion, immediate revocation and last-admin protection.
- Public home/projects/events pages still load, private responses are not publicly cached, and no codes/tokens appear in request URLs or logs.

Do not announce attendance as live until these checks and the board's review are complete.
