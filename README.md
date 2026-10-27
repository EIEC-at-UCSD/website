# EIEC at UC San Diego

The club website, migrated from [eiecucsd/eiecucsd.github.io](https://github.com/eiecucsd/eiecucsd.github.io) to Next.js App Router, React and TypeScript. The existing design, Google Sheets editor, photos, project applications and EIEC × SoPE hackathon page are retained.

## Development

Install a current Node.js LTS release (Next.js requires at least Node 20.9), then run from this repository's root:

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

Import `EIEC-at-UCSD/website` into the EIEC Vercel account. Select **Next.js** as the framework, **the repository root (`./`)** as Root Directory, and `main` as Production Branch. Keep the normal Next.js build and output defaults. The application is at the repository root; there is no `site` subdirectory.

Try `eiecucsd` as the project name if that subdomain is available. Once the Git integration is connected, changes merged to `main` deploy to production and other branches can receive previews. A Vercel account or plan restriction must be resolved in Vercel; the repository does not change account settings.

No environment variables are required for the existing content. Optional settings are documented in `.env.example`; put local overrides in `.env.local` and production overrides in Vercel's environment settings.

## Updating the website

- **Board, events, projects, open roles and page copy:** use the existing [club Google Sheet](https://docs.google.com/spreadsheets/d/1MOtvGQrUJ3LNtDDZRsVYv6MD0Q5ewT6-ocCidmCmAUY/edit). It must remain published to the web as CSV. Keep the existing tab IDs and column names. The site refreshes cached content after approximately five minutes when visitors request a page; publication by Google may add delay.
- **Contact email:** defaults to `eiec.at.ucsd@gmail.com` in `lib/settings.ts`. Optionally override `NEXT_PUBLIC_CONTACT_EMAIL` and redeploy.
- **Gallery:** put photos in `public/photos/` and update `data/photos.json` with their filenames.
- **Hackathon:** edit `app/hackathon/page.tsx`. This retains the original May 30, 2026 event information and form.
- **Page structure:** club pages live in `app/(club)/`; reusable React components live in `components/`.
- **Styling:** the original club styles are in `app/globals.css`; hackathon styles are scoped to `.hackathon-site` in `app/hackathon.css`. Accessibility and migration fixes are in `app/migration.css`.

Only publish information intended for the public website in the Google Sheet. The website reads the existing public CSV and needs no Google credentials.

If Sheets is unavailable or returns an invalid response, the site displays the saved public content in `data/sheets-snapshot.json` (captured October 26, 2026). Replace that snapshot with an approved fresh export when making major content updates; it is a fallback, not an additional live editor.

## Migration details

- Source: old repository commit `9aee60e682fec7f1c5e6cc59fadc5daeb9401b7a`.
- Pages: `/`, `/projects`, `/recruitment`, `/events`, `/hackathon`.
- Existing `index.html`, `projects.html`, `recruitment.html`, `events.html` and `hackathon/index.html` links redirect to their new routes on this host.
- The old GitHub Pages address is controlled by the old repository. This project cannot redirect requests arriving at that hostname.
- Content is rendered on the server; interactive menus, filters, profiles and the carousel use React state.
- Published Sheet text is escaped; limited rich headings are sanitized. Application and photo URLs allow only HTTP(S).
- Canvas artwork is loaded separately, cleaned up on navigation, and disabled for reduced-motion preferences.

## Content to review before promoting the new address

The migration preserves source content rather than inventing a new quarter's information. Review the Spring 2026 labels, recruitment status, May 30 hackathon registration, board roster and all applications. The current Sheet has a duplicate Roxanne Wang board row and a Backend Software Engineer application URL ending in `viewformm`; correct these in the Sheet if unintended.

Keep the old site available until the new deployment has been reviewed. Then update club social profiles and directories; add a notice at the old site if an officer can still edit it.
