# Learning Home: instructions for Claude

This repo is Elliott's class website at Woodcroft College (South Australia). It holds every
lesson deck, practice app, simulation and booklet for his classes. Students open it in a
browser on school PCs (mouse and keyboard, no stylus). Elliott teaches from it with a stylus.

## How the site works
- Cloudflare Worker `learning-home`, connected to this repo with Workers Builds.
- Anything in `public/` is served as a static file. `src/index.js` only runs for paths that
  are not files, so all API routes (ink sync, sign-in) go there.
- `public/catalog.json` drives the home page. A resource that is not listed there does not
  appear on the site, even if the file exists.
- A push to `main` deploys to students. Any other branch gets its own preview URL.

## Workflow (always)
1. Work on a new branch, never directly on `main`.
2. Push the branch and open a pull request. Cloudflare posts the preview URL on the PR.
3. Give Elliott the preview URL and wait. He merges to go live.
4. Never force-push, never rewrite history on `main`, never delete a resource without asking.

## Adding a resource
1. Put the file in the class folder: `public/<class-id>/<short-name>.html`
   Class ids: y7-science, y7-enrichment, y9-maths, y10-science, y10-ess-maths
2. Add an entry to that class in `public/catalog.json`:
   `{ "title": "Net force to acceleration", "type": "deck", "unit": "Newton's laws", "path": "/y10-science/net-force.html", "added": "2026-10-12" }`
   Types: deck, app, sim, booklet, link.
3. Updating an existing resource: edit the file in place and keep its path, so links in
   Elliott's planner and OneNote keep working.

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
- Until student sign-in is in place, everything in `public/` is on the open internet.
  Do not put textbook pages, scanned faculty booklets or anything identifying a student here.
- Never commit secrets, tokens or passwords. Use Wrangler secrets.

## Before handing over
- Check every new page at 1920x1080, 1440x900 and 1366x768 for clipped or overflowing text.
- Make sure the page works when opened directly from its URL, not only from the home page.
