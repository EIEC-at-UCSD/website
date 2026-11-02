# Recruitment page archive

The open-roles page is paused because the Spring 2026 roles are stale. The page
and its component are kept here unchanged so recruitment can reopen quickly.
Nothing in `_archive/` is built or routed; `/recruitment` currently redirects home.

Since this was archived the site stopped reading the Google Sheet for anything
but the board and events, so the page needs two more things back. Its copy used
the `<Content>` component, kept here as `content.tsx` (it needs the
`sanitize-html` package, which was removed). Its role data came from the
Sheet's **Projects** tab, which `lib/sheets.ts` no longer fetches; add a
`projects` tab back there or move the roles into a local file. `groupProjects`
and `recruitmentStats` still live in `lib/data.ts`.

## To reopen recruitment

1. `git mv _archive/recruitment/page.tsx "app/(club)/recruitment/page.tsx"`
2. `git mv _archive/recruitment/recruitment.tsx components/recruitment.tsx`
3. In `components/navigation.tsx` add `["/recruitment", "Recruitment"]` back to
   the `links` array (between Projects and Events).
4. In `next.config.ts` remove the two `/recruitment` redirects and add
   `"recruitment"` back to the `.html` redirect list.
5. Point the "Join the Discord →" calls to action on the home, projects and
   events pages back at `/recruitment` ("View Open Roles →"), and restore the
   home CTA fallback: "We're currently recruiting. Check out our open projects
   and apply." Also update the Sheet's `cta_desc` and
   `recruitment_hero_eyebrow` keys.
6. Update the role rows in the Sheet's Projects tab and the application links.

The pre-archive state is commit `396ad42` (the Next.js migration).
