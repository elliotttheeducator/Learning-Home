# Learning Home: instructions for Claude

This repo is Elliott's class website at Woodcroft College (South Australia). It holds every
lesson deck, practice app, simulation and booklet for his classes. Students open it in a
browser on school PCs (mouse and keyboard, no stylus). Elliott teaches from it with a stylus.

## How the site works
- Cloudflare Worker `learning-home`, connected to this repo with Workers Builds.
- Anything in `public/` is served as a static file. `src/index.js` only runs for paths that
  are not files, so all API routes (ink sync, sign-in) go there.
- `public/catalog.json` holds the classes, their timetable, bell times, term dates and each
  class's resource library. Lesson plans live in `src/plans/` (outlines) and D1 (planner edits).
- A push to `main` deploys the site. Any other branch gets its own preview URL.
- Students add a class by typing its class code (default format year + EH + subject + year, for
  example 07EHMATH26) on the home page, or by opening `/join/<code>`. The browser keeps the list
  in localStorage (`lh-classes`) and the class calendar API needs the code (`X-Class-Code` header)
  unless the teacher is signed in. Codes live in D1 (`class_codes`, `src/codes.js`); Elliott can
  change one in the planner's class panel. Files in `public/` are still open to anyone with the URL.
- Students only see what Elliott publishes. Lessons are unpublished until he presses Publish in the
  teacher planner (`/teacher/`); until then students see only the time and room. So new files and
  outlines can go live on the site without students seeing them.

- Unit objectives: a class in `catalog.json` can have `units: [{ id, name, objectives: [...] }]`. Lessons
  tick the ones they teach (`covers: ["genetics-3"]` in the plan, ticked in the planner or set by an
  Import pack). Students see every unit objective on their class's Learning objectives view
  (`/<class-id>#objectives`), each linked to the published lessons that cover it.

## Workflow (always)
1. Work on a new branch, never directly on `main`.
2. Push the branch and open a pull request. Cloudflare posts the preview URL on the PR.
3. When the Workers Builds check on the PR passes, merge it yourself (Elliott asked for merges to
   be automatic). If the build fails, fix it first. Then tell Elliott what went live.
4. Never set `published` to true in a lesson outline or in D1. Publishing is Elliott's call.
5. Never force-push, never rewrite history on `main`, never delete a resource without asking.

## Adding a resource
1. Put the file in the class folder: `public/<class-id>/<short-name>.html`
   Class ids: y7-science, y7-enrichment, y9-maths, y10-science, y10-ess-maths
2. Add an entry to that class's `resources` in `public/catalog.json`, so it shows in the planner's
   "Add from the class library" list:
   `{ "title": "Net force to acceleration", "type": "deck", "unit": "Newton's laws", "path": "/y10-science/net-force.html", "added": "2026-10-12" }`
   Types: deck, app, sim, booklet, link.
3. If you know which lesson it is for, attach it in `src/plans/<class-id>.json` under that
   lesson's `resources`, tagged with who it is for:
   `{ "title": "...", "url": "/y7-enrichment/angles.html", "type": "app", "for": "students" }`
   `for` is `students` (on the student calendar once published), `teacher` (decks, answer keys,
   teacher versions: never sent to students) or `print` (opens in the print helper). Teacher-only
   files that must not be public go under `public/teacher/`, which needs the teacher password.
   Types: deck, app, sim, booklet, sheet, key, link.
   If the lesson has already been edited in the planner, its saved copy in the D1 database
   `learning-home` wins: add to the `resources` inside that row's `data` and leave every other
   field (including `published`) alone.
4. Updating an existing resource: edit the file in place and keep its path, so links in
   Elliott's planner and OneNote keep working.

## Uploaded files (from any chat)
Files Elliott uploads in the planner (drop zone in a lesson, or the Files button) are stored in
D1 (tables `files`, `file_versions`, `file_chunks`, max 20 MB, last 10 versions kept) and served
at `/files/<class-id>/<name>`. Files tagged `students` are public; `teacher` and `print` uploads
need the teacher password. A new version keeps the same link. Prefer the repo for anything that
needs code changes; uploads are for finished standalone pages and PDFs.

The planner's **Import pack** takes a zip or several files and puts each in its lesson. Label files
made for it: in an HTML `<head>`,
`<meta name="learning-home" content="class=y7-enrichment; lesson=2026-10-20 P6; for=students; type=app; title=Angle hunt">`,
or a `learning-home.json` in the zip: `{ "class": "...", "lesson": "...", "files": [ { "file": "x.pdf", "for": "print", "type": "sheet", "title": "..." } ] }`.
The json can also carry the lesson plan (topic, unit, objectives, bring, studentNote, assess, notes, prep,
or a `lessons` array for several) and `copies`/`paper` on print files, which become prep items.
Pictures, CSS and JS next to a page in the zip are folded into it. Same class and title as an
existing upload means a new version. The planner's "Copy instructions for other chats" button gives the full text.
The same rules live in the Claude skill `skills/learning-home-pack/SKILL.md`, which Elliott adds to his
claude.ai account so every chat follows them. When classes, timetables, term dates or the label
format change, update that skill (and tell Elliott to re-upload it) as well as the planner's copy text.

## Porting resources built on claude.ai
Decks built on the Woodcroft Deck Kit and apps published as claude.ai artifacts use artifact
runtime features (window.claude, the `db` and `downloads` capabilities, window.storage) that
do not exist on this site. When bringing one across:
- Replace cloud ink sync with calls to this Worker's API (D1-backed, once it exists). Until
  then, fall back to localStorage only.
- Keep every ink-loss guard from the Deck Kit: no local write before the stored state has
  been read, no cloud write before the cloud has been read, an empty deck never overwrites a
  stored one unless Clear was just pressed, the rolling `-prev` backup and the Recover button.
- Strip the doctype/html/head/body wrapper claude.ai adds if it is duplicated.

## Elliott's rules for every resource
- Never use em-dashes, anywhere: code comments, copy, commit messages included.
- Australian spelling.
- Student-facing text readable from the back of a long room: slide body about 30px, tables
  about 26px, equations about 33px at 1440 wide. Teacher-only notes may be smaller.
- Colourful, bright and legible. Not dark or industrial.
- Equations as LaTeX in Cambria Math, large and centred. Every division is a stacked
  fraction, never a division sign.
- Decks: comprehensive stylus system (at minimum ink, eraser, save), a clock, timers on
  activity slides, and it must be unmistakable when students should start writing. Leave
  empty room to write on. Never fill in worked solutions: question, step labels, blank space.
- Walkthroughs reveal one step at a time behind a button, not automatically.
- Lessons run 80 usable minutes. Plan well under that and cut rather than overrun.
- Apps should be genuinely fun and game-like, and work with typed input.
- Bronze / Silver / Gold tiers for extension.

## Content and privacy
- Until student sign-in is in place, everything in `public/` is on the open internet, published
  or not: anyone with the exact URL can open a file.
  Do not put textbook pages, scanned faculty booklets or anything identifying a student here.
- Never commit secrets, tokens or passwords. Use Wrangler secrets.

## Before handing over
- Check every new page at 1920x1080, 1440x900 and 1366x768 for clipped or overflowing text.
- Make sure the page works when opened directly from its URL, not only from the home page.
