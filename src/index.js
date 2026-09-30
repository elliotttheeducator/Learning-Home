// Learning Home Worker.
// Files in /public are served straight from Cloudflare's asset store.
// This script runs for paths that are not a file, plus /teacher (see
// run_worker_first in wrangler.jsonc) so the teacher area can check sign-in.

import catalog from "../public/catalog.json";
import y7Enrichment from "./plans/y7-enrichment.json";

// Starting plans written in the repo. Anything saved from the teacher planner
// is stored in D1 and replaces the starting plan for that lesson.
const SEED_PLANS = { "y7-enrichment": y7Enrichment };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SESSION_COOKIE = "lh_session";
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/health") return Response.json({ ok: true, site: "learning-home" });

      // Sign-in
      if (path === "/auth/login") return login(request, env, url);
      if (path === "/auth/logout") return logout(url);
      if (path === "/api/me") {
        return json({ teacher: await teacher(request, env) });
      }

      // Teacher area: static files, but only for a signed-in teacher.
      if (path === "/teacher" || path.startsWith("/teacher/")) {
        if (!(await teacher(request, env))) return redirect("/auth/login?next=" + encodeURIComponent(path + url.search));
        const res = await env.ASSETS.fetch(request);
        const out = new Response(res.body, res);
        out.headers.set("Cache-Control", "private, no-store");
        return out;
      }

      if (path === "/api/teacher/plan") {
        if (!(await teacher(request, env))) return json({ error: "Sign in first." }, 401);
        return json({ ...calendarBase(), lessons: await allLessons(env, catalog.classes.map(c => c.id), true) });
      }

      if (path === "/api/teacher/lesson") {
        if (!(await teacher(request, env))) return json({ error: "Sign in first." }, 401);
        return saveLesson(request, env);
      }

      // Student calendar data for one class. Teacher-only fields are removed.
      const cal = path.match(/^\/api\/calendar\/([a-z0-9-]+)$/);
      if (cal) {
        const cls = catalog.classes.find(c => c.id === cal[1]);
        if (!cls) return json({ error: "No such class." }, 404);
        const lessons = await allLessons(env, [cls.id], false);
        return json({ ...calendarBase(), class: publicClass(cls), lessons }, 200, { "Cache-Control": "no-store" });
      }

      // Class calendar pages: /y7-enrichment and /y7-enrichment/
      const page = path.match(/^\/([a-z0-9-]+)\/?$/);
      if (page && catalog.classes.some(c => c.id === page[1])) {
        return env.ASSETS.fetch(new Request(new URL("/class", url), request));
      }
    } catch (err) {
      console.error(err);
      if (path.startsWith("/api/")) return json({ error: "Something went wrong on the server." }, 500);
      throw err;
    }

    // Anything else: not a file and not a route.
    const missing = await env.ASSETS.fetch(new Request(new URL("/404", url), request));
    return new Response(missing.body, { status: 404, headers: missing.headers });
  },
};

// ---------- Calendar ----------

function calendarBase() {
  return { school: catalog.school, teacher: catalog.teacher, bells: catalog.bells, terms: catalog.terms };
}

function publicClass(c) {
  return { id: c.id, name: c.name, code: c.code, colour: c.colour, timetable: c.timetable, resources: c.resources || [] };
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Every timetabled lesson for the given classes across every term in the catalog.
function scheduledLessons(classIds) {
  const bell = Object.fromEntries(catalog.bells.map(b => [b.id, b]));
  const out = [];
  for (const term of catalog.terms) {
    const skip = new Set(term.noLessons || []);
    for (let w = 0; w < term.weeks; w++) {
      DAYS.forEach((day, di) => {
        const date = addDays(term.start, w * 7 + di);
        if (skip.has(date)) return;
        for (const id of classIds) {
          const cls = catalog.classes.find(c => c.id === id);
          for (const s of cls.timetable || []) {
            if (s.day !== day) continue;
            const first = bell[s.periods[0]], last = bell[s.periods[s.periods.length - 1]];
            out.push({
              classId: id, date, day, slot: s.periods[0], periods: s.periods, room: s.room || "",
              start: first.start, end: last.end, term: term.name, year: term.year, week: w + 1,
            });
          }
        }
      });
    }
  }
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

let tableReady = false;
async function db(env) {
  if (!env.DB) return null;
  if (!tableReady) {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS lessons (class_id TEXT NOT NULL, date TEXT NOT NULL, slot TEXT NOT NULL, " +
      "data TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (class_id, date, slot))"
    ).run();
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL, since INTEGER NOT NULL)"
    ).run();
    tableReady = true;
  }
  return env.DB;
}

async function storedLessons(env, classIds) {
  const d = await db(env);
  if (!d || classIds.length === 0) return new Map();
  const marks = classIds.map(() => "?").join(",");
  const { results } = await d.prepare(
    `SELECT class_id, date, slot, data, updated_at FROM lessons WHERE class_id IN (${marks})`
  ).bind(...classIds).all();
  const map = new Map();
  for (const r of results) {
    try { map.set(`${r.class_id}|${r.date}|${r.slot}`, { ...JSON.parse(r.data), updatedAt: r.updated_at }); }
    catch { /* a damaged row is ignored rather than breaking the calendar */ }
  }
  return map;
}

async function allLessons(env, classIds, forTeacher) {
  const stored = await storedLessons(env, classIds);
  return scheduledLessons(classIds).map(l => {
    const key = `${l.classId}|${l.date}|${l.slot}`;
    const seed = (SEED_PLANS[l.classId] || {})[`${l.date}|${l.slot}`];
    const plan = stored.get(key) || seed || {};
    const source = stored.has(key) ? "saved" : seed ? "outline" : "empty";
    return forTeacher ? { ...l, plan: clean(plan), source, hasOutline: !!seed } : { ...l, plan: forStudents(plan) };
  });
}

function safeUrl(u) {
  u = String(u || "").trim();
  return /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) ? u : "";
}

const str = (v, max = 4000) => String(v == null ? "" : v).slice(0, max);
const strList = (v, max = 400) => (Array.isArray(v) ? v : []).map(x => str(x, max).trim()).filter(Boolean).slice(0, 40);

// Normalise a lesson plan to the fields the site knows about.
function clean(p) {
  p = p && typeof p === "object" ? p : {};
  return {
    unit: str(p.unit, 200),
    topic: str(p.topic, 300),
    objectives: strList(p.objectives),
    bring: strList(p.bring, 100),
    resources: (Array.isArray(p.resources) ? p.resources : []).slice(0, 30).map(r => ({
      title: str(r && r.title, 200), url: str(r && r.url, 1000), type: str(r && r.type, 20),
    })).filter(r => r.title || r.url),
    studentNote: str(p.studentNote, 2000),
    assess: str(p.assess, 100),
    notes: str(p.notes, 20000),
    prep: (Array.isArray(p.prep) ? p.prep : []).slice(0, 40).map(x => ({ t: str(x && x.t, 300), d: !!(x && x.d) })),
    published: !!p.published,
    updatedAt: p.updatedAt || "",
  };
}

// What a student may see. Nothing but the time shows until the teacher
// publishes the lesson, and teacher notes and prep never leave the server.
function forStudents(p) {
  const c = clean(p);
  if (!c.published) return { published: false };
  return {
    published: true, unit: c.unit, topic: c.topic, objectives: c.objectives, bring: c.bring, studentNote: c.studentNote,
    assess: c.assess,
    resources: c.resources.map(r => ({ ...r, url: safeUrl(r.url) })).filter(r => r.url),
  };
}

async function saveLesson(request, env) {
  if (request.method !== "PUT" && request.method !== "DELETE") return json({ error: "Use PUT or DELETE." }, 405);
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return json({ error: "Send JSON." }, 415);
  const d = await db(env);
  if (!d) return json({ error: "The lesson database is not connected." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "That was not valid JSON." }, 400); }
  const { classId, date, slot } = body || {};
  const exists = scheduledLessons([classId].filter(id => catalog.classes.some(c => c.id === id)))
    .some(l => l.date === date && l.slot === slot);
  if (!exists) return json({ error: "That lesson is not on the timetable." }, 400);

  if (request.method === "DELETE") {
    // Forget the saved version, so the lesson goes back to the repo outline.
    await d.prepare("DELETE FROM lessons WHERE class_id = ? AND date = ? AND slot = ?").bind(classId, date, slot).run();
    const seed = (SEED_PLANS[classId] || {})[`${date}|${slot}`];
    return json({ ok: true, plan: clean(seed), source: seed ? "outline" : "empty" });
  }

  const plan = clean(body.plan);
  delete plan.updatedAt;
  const now = new Date().toISOString();
  await d.prepare(
    "INSERT INTO lessons (class_id, date, slot, data, updated_at) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT (class_id, date, slot) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
  ).bind(classId, date, slot, JSON.stringify(plan), now).run();
  return json({ ok: true, plan: { ...plan, updatedAt: now }, source: "saved" });
}

// ---------- Password sign-in ----------
// One teacher password, kept as the TEACHER_PASSWORD secret. Five wrong tries
// from one address locks that address out for 15 minutes.

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

function signinReady(env) {
  return !!(env.TEACHER_PASSWORD && env.SESSION_SECRET);
}

// Sessions are signed with both secrets, so changing the password signs
// every device out.
function sessionKey(env) {
  return env.SESSION_SECRET + "\n" + env.TEACHER_PASSWORD;
}

async function login(request, env, url) {
  if (!signinReady(env)) {
    return page("Teacher sign-in is not set up yet",
      "<p>The site needs two Worker secrets: TEACHER_PASSWORD and SESSION_SECRET. The steps are in the README.</p>", 503);
  }
  if (request.method === "GET") {
    if (await teacher(request, env)) return redirect(safeNext(url.searchParams.get("next")));
    return loginPage(safeNext(url.searchParams.get("next")), "");
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const form = await request.formData();
  const next = safeNext(form.get("next"));
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const d = await db(env);

  let fails = 0;
  if (d) {
    const row = await d.prepare("SELECT fails, since FROM login_attempts WHERE ip = ?").bind(ip).first();
    if (row && Date.now() - row.since < LOCK_MINUTES * 60000) fails = row.fails;
  }
  if (fails >= MAX_TRIES) {
    return loginPage(next, `Too many wrong tries. Wait ${LOCK_MINUTES} minutes, then try again.`, 429);
  }

  if (!(await samePassword(String(form.get("password") || ""), env.TEACHER_PASSWORD))) {
    fails += 1;
    if (d) {
      await d.prepare(
        "INSERT INTO login_attempts (ip, fails, since) VALUES (?, ?, ?) " +
        "ON CONFLICT (ip) DO UPDATE SET fails = excluded.fails, since = CASE WHEN excluded.fails = 1 THEN excluded.since ELSE since END"
      ).bind(ip, fails, Date.now()).run();
    }
    const left = MAX_TRIES - fails;
    return loginPage(next, left > 0
      ? `That password is not right. ${left === 1 ? "1 try" : left + " tries"} left.`
      : `Too many wrong tries. Wait ${LOCK_MINUTES} minutes, then try again.`, 401);
  }

  if (d) await d.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const value = b64url(new TextEncoder().encode(JSON.stringify({ t: 1, x: exp })));
  const token = value + "." + (await sign(value, sessionKey(env)));
  const res = redirect(next);
  res.headers.append("Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
  return res;
}

// Compares two strings in constant time by comparing their hashes.
async function samePassword(given, real) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(real)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function loginPage(next, message, status = 200) {
  return page("Teacher sign in", `
<form method="post" action="/auth/login" style="display:grid;gap:14px;margin:18px auto 0;max-width:420px;text-align:left">
  <input type="hidden" name="next" value="${esc(next)}">
  <label for="pw" style="font-weight:700">Password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus
    style="font:inherit;padding:12px 14px;border:2px solid #D9E1EE;border-radius:12px">
  ${message ? `<p role="alert" style="margin:0;color:#B42318;font-weight:700">${esc(message)}</p>` : ""}
  <button style="font:inherit;font-weight:700;padding:12px;border:0;border-radius:12px;background:#3474F5;color:#fff;cursor:pointer">Sign in</button>
</form>`, status);
}

function logout() {
  const res = redirect("/");
  res.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return res;
}

// True when the request carries a valid, unexpired teacher session.
async function teacher(request, env) {
  if (!signinReady(env)) return false;
  const token = cookie(request, SESSION_COOKIE);
  if (!token) return false;
  const [value, mac] = token.split(".");
  if (!value || !mac || !(await verify(value, mac, sessionKey(env)))) return false;
  try {
    const s = JSON.parse(new TextDecoder().decode(unb64url(value)));
    return !!(s.t && s.x && s.x > Date.now());
  } catch { return false; }
}

function safeNext(n) {
  return typeof n === "string" && /^\/(?!\/)/.test(n) ? n : "/teacher/";
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function sign(value, secret) {
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(value))));
}
async function verify(value, mac, secret) {
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(secret), unb64url(mac), new TextEncoder().encode(value));
  } catch { return false; }
}

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function cookie(request, name) {
  const all = request.headers.get("Cookie") || "";
  for (const part of all.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

// ---------- Responses ----------

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function redirect(to) {
  return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store" } });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function page(title, body, status = 200) {
  return new Response(`<!doctype html><html lang="en-AU"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | Learning Home</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F7FC;color:#17233D;
font:22px/1.5 "Lexend","Segoe UI",Arial,sans-serif;text-align:center;padding:24px}h1{font-size:40px;margin:0 0 8px}
a{color:#3474F5;font-weight:700}div{max-width:720px}</style></head>
<body><div><h1>${esc(title)}</h1>${body}<p><a href="/">Back to Learning Home</a></p></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
