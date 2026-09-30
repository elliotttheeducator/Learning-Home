# Learning Home

Class resources for Mr Hall's classes at Woodcroft College, served by a Cloudflare Worker.

- `public/` : everything students see. `catalog.json` lists what appears on the home page.
- `src/index.js` : the Worker, for API routes.
- `CLAUDE.md` : the build rules Claude follows when working in this repo.

Deploys automatically from `main` via Cloudflare Workers Builds.
