# Learning Home

Class resources for Mr Hall's classes at Woodcroft College, served by a Cloudflare Worker.

- `public/` : everything students see. `catalog.json` lists the classes, their timetable, bell times and term dates.
- `public/class.html` : the student calendar. Served at `/<class-id>`, for example `/y7-enrichment`.
- `public/teacher/` : the teacher planner. Only opens after the teacher password.
- `src/index.js` : the Worker: password sign-in, the teacher gate, and the lesson API.
- `src/plans/<class-id>.json` : starting lesson outlines written in the repo, keyed by `date|first period`.
  Edits made in the planner are saved in the D1 database `learning-home` and replace the outline for that lesson.
- `CLAUDE.md` : the build rules Claude follows when working in this repo.

Deploys automatically from `main` via Cloudflare Workers Builds.

## How lessons reach students

1. The timetable in `catalog.json` plus the term dates make the list of lessons for each class.
2. Each lesson takes its plan from D1 if it has been edited in the planner, otherwise from `src/plans/`.
3. Nothing about a lesson reaches students until it is published in the planner (Publish on a
   lesson, or Publish week in a class list). Until then students see only the time and room.
4. `/api/calendar/<class-id>` sends students only the student fields of published lessons (topic,
   unit, objectives, bring, note, assessment tag, resources). Teacher notes and prep stay on the server.
5. The class page works on Adelaide time, shows the lesson on now or next, and refreshes itself.
   Add `?now=2026-10-13T13:50` to any class page to preview it at another moment.

New term: add it to `terms` in `catalog.json` (start is the Monday of week 1). Days with no lessons
(pupil free days, public holidays) go in its `noLessons` list as dates.

## Teacher sign-in

The teacher area uses one password until Microsoft sign-in is set up. It needs two Worker secrets
(Cloudflare dashboard, Workers & Pages, learning-home, Settings, Variables and Secrets, type Secret):

- `TEACHER_PASSWORD`: the password you type at `/teacher/`. Changing it signs every device out.
- `SESSION_SECRET`: a long random string the site uses to sign its sign-in cookie. You never type it.

There is no lockout after wrong passwords (students share the school's connection and could lock
the teacher out on purpose), so use a long password: four or more random words. A sign-in lasts 30 days.
Branch previews do not share these secrets. To sign in on a preview, add the same two secrets to
Previews (`npx wrangler preview secret`, or the Previews settings in the dashboard).
