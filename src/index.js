// Learning Home Worker.
// Files in /public are served straight from Cloudflare's asset store.
// This script only runs for paths that are not a file, so it is the place
// for the API (ink sync, student sign-in) once those are added.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, site: "learning-home" });
    }

    // Anything else falls through to the asset store (which serves 404.html).
    return env.ASSETS.fetch(request);
  },
};
