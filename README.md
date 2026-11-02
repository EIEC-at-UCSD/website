# EIEC at UC San Diego

The club website, migrated from [eiecucsd/eiecucsd.github.io](https://github.com/eiecucsd/eiecucsd.github.io) to Next.js App Router, React and TypeScript. The design and photos carried over. Page copy and the project list now live in the repo, and the Google Sheet is only read for the board and the events calendar. The 2025–26 EIEC × SoPE hackathon page is archived under `_archive/` (see below).

## Development

Install a current Node.js LTS release (Next.js needs at least Node 20.9), then from the repository root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

## Deploy to Vercel

Import `EIEC-at-UCSD/website` into the EIEC Vercel account with **Next.js** as the framework, the repository root (`./`) as Root Directory and `main` as Production Branch. The normal Next.js build and output defaults are fine. The app is at the repository root, not in a `site` subdirectory.

Try `eiecucsd` as the project name if that subdomain is free. Once the Git integration is connected, merges to `main` go to production and other branches get preview deployments. Account or plan limits are settled in Vercel itself; nothing in this repository changes account settings.

The existing content needs no environment variables. Optional settings are listed in `.env.example`. Local overrides go in `.env.local`, production ones in Vercel's environment settings.

## Updating the website

The board roster and the events calendar come from the Board and Events tabs of the [club Google Sheet](https://docs.google.com/spreadsheets/d/1hQcvoETLxi5fWYwFjWPgPUP5AqDinASjGMc-LNfB2Lo/edit) (2026-27). It has to stay published to the web as CSV, with the existing column names. To move to a new sheet (a new school year, say), publish it the same way and set `GOOGLE_SHEET_PUBLISHED_URL`, `GOOGLE_SHEET_BOARD_GID` and `GOOGLE_SHEET_EVENTS_GID` in Vercel, then `npm run snapshot` to refresh the fallback file; `.env.example` explains each one. The site re-reads it about five minutes after the last visit, and Google's own publishing can add a few more minutes. Only put things in the Sheet that are meant to be public, since the site reads the public CSV and has no Google credentials. The other tabs are no longer read.

If the Sheet is down or returns something unexpected, the site falls back to the board and events saved in `data/sheets-snapshot.json` (captured October 26, 2026). When the roster changes a lot, replace that snapshot with a fresh export. It is a fallback, not a second place to edit.

Everything else is in the repo. Page copy is written directly in `app/(club)/page.tsx`, `app/(club)/events/page.tsx` and `app/(club)/projects/page.tsx`. The project list is `data/projects.json`; add or retire a venture team there. Edit, push to `main`, and Vercel redeploys.

The contact email defaults to `eiec.at.ucsd@gmail.com` in `lib/settings.ts`; set `NEXT_PUBLIC_CONTACT_EMAIL` and redeploy to change it. Gallery photos go in `public/photos/`, with their filenames listed in `data/photos.json`.

Club pages live in `app/(club)/` and shared React components in `components/`. The original club styles are in `app/globals.css`, and accessibility and migration fixes in `app/migration.css`.

Retired pages live in `_archive/`, which is neither built nor routed. Each one has a `RESTORE.md`. Right now that is the 2026 hackathon page and the recruitment page, paused until the next round of roles opens.

## Migration details

- Migrated from old repository commit `9aee60e682fec7f1c5e6cc59fadc5daeb9401b7a`.
- Live pages are `/`, `/projects` and `/events`; `/recruitment` redirects home while recruitment is paused.
- Old `index.html`, `projects.html` and `events.html` links redirect to the new routes on this host. `/hackathon` and `/recruitment` redirect home while those pages are archived.
- The old GitHub Pages address is controlled by the old repository. This project cannot redirect requests arriving at that hostname.
- Content is rendered on the server; interactive menus, filters, profiles and the carousel use React state.
- Published Sheet text is escaped, and photo URLs allow only HTTP(S).
- Canvas artwork is loaded separately, cleaned up on navigation, and disabled for reduced-motion preferences.

## Content to review before promoting the new address

The migration kept last year's content as it was. The Spring 2026 labels, the hackathon promo and the Sheet-driven page copy are gone from the code. Two things remain in the Sheet: the Events tab still lists the May 2026 pre-hackathon social, so replace it with this year's events, and the Board tab has a duplicate Roxanne Wang row to remove if it is a mistake. The Projects tab is no longer read; its role rows and application links only matter if recruitment reopens (see `_archive/recruitment/RESTORE.md`).

Keep the old site up until the new deployment has been reviewed, then update the club's social profiles and directories. If an officer can still edit the old site, add a notice there.
