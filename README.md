# Learning Home

Class resources for Mr Hall's classes at Woodcroft College, served by a Cloudflare Worker.

- `public/` : everything students see. `catalog.json` lists the classes, their timetable, bell times and term dates.
- `public/class.html` : the student calendar. Served at `/<class-id>`, for example `/y7-enrichment`.
- `public/teacher/` : the teacher planner. Only opens for a signed-in teacher (Google sign-in).
- `src/index.js` : the Worker: sign-in, the teacher gate, and the lesson API.
- `src/plans/<class-id>.json` : starting lesson outlines written in the repo, keyed by `date|first period`.
  Edits made in the planner are saved in the D1 database `learning-home` and replace the outline for that lesson.
- `CLAUDE.md` : the build rules Claude follows when working in this repo.

Deploys automatically from `main` via Cloudflare Workers Builds.

## How lessons reach students

1. The timetable in `catalog.json` plus the term dates make the list of lessons for each class.
2. Each lesson takes its plan from D1 if it has been edited in the planner, otherwise from `src/plans/`.
3. `/api/calendar/<class-id>` sends students only the student fields (topic, unit, objectives, bring,
   note, assessment tag, resources). Teacher notes and prep stay on the server.
4. The class page works on Adelaide time, shows the lesson on now or next, and refreshes itself.
   Add `?now=2026-10-13T13:50` to any class page to preview it at another moment.

New term: add it to `terms` in `catalog.json` (start is the Monday of week 1). Days with no lessons
(pupil free days, public holidays) go in its `noLessons` list as dates.

## Setting up teacher sign-in (once)

1. In Google Cloud Console, create an OAuth client ID of type "Web application".
2. Add the authorised redirect URI `https://<your site>/auth/callback`. Preview URLs are different
   sites, so add a preview's `/auth/callback` too if you want to sign in there.
3. Set three Worker secrets (Cloudflare dashboard, Worker, Settings, Variables and Secrets, or
   `npx wrangler secret put NAME`):
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from step 1
   - `SESSION_SECRET`: any long random string
4. Allowed teacher accounts are `TEACHER_EMAILS` in `wrangler.jsonc`.
