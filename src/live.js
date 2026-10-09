// Live rooms for Deck Kit 2.
// One Durable Object per class. The teacher's deck, the phone remote and every
// student page for that class connect here by WebSocket at /live/<class-id>.
// The Worker decides who is who before the socket reaches the room:
//   teacher: signed in (session cookie)       students: the class code
// Students cannot see each other's messages: anything a student sends goes to
// the teacher sockets only. The teacher's messages go to everyone, or to one
// student when they carry "to". The latest teacher "state" is kept so a student
// who joins late lands on the right frame.
// A lesson counts as live (for the "Live lesson" popup on students' home pages) from the
// teacher's first state until the timetabled lesson ends plus 5 minutes, or until the
// teacher ends it. /live/<class-id>/status reports it.

const MAX = 64 * 1024;

export class LiveRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.state = null;
    this.session = null;
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get("state")) || null;
      this.session = (await ctx.storage.get("session")) || null;
    });
  }

  liveNow() {
    const s = this.session;
    return s && Date.now() < s.endsAt ? s : null;
  }

  async fetch(request) {
    if (request.headers.get("X-Live-Status")) {
      const s = this.liveNow();
      return Response.json(s ? { live: true, title: s.title, url: s.url, startedAt: s.startedAt, endsAt: s.endsAt } : { live: false });
    }
    const role = request.headers.get("X-Live-Role") === "teacher" ? "teacher" : "student";
    const id = clean(request.headers.get("X-Live-Id"), 40) || crypto.randomUUID();
    const name = clean(request.headers.get("X-Live-Name"), 30) || (role === "teacher" ? "Teacher" : "Student");
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);
    const until = +request.headers.get("X-Live-Until") || 0;
    server.serializeAttachment({ role, id, name, until });
    if (role === "student") {
      if (this.state) server.send(this.state);
      this.toTeachers({ t: "join", from: { role, id, name } });
    } else {
      server.send(JSON.stringify({ t: "roster", list: this.students() }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  students() {
    return this.ctx.getWebSockets("student").map(ws => ws.deserializeAttachment() || {})
      .map(a => ({ id: a.id, name: a.name }));
  }

  toTeachers(msg) {
    const out = typeof msg === "string" ? msg : JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets("teacher")) {
      try { ws.send(out); } catch { /* closed */ }
    }
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== "string" || data.length > MAX) return;
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m !== "object" || m.t === "ping") return;
    const a = ws.deserializeAttachment() || {};
    m.from = { role: a.role, id: a.id, name: a.name }; // never trust the sender's own label
    const out = JSON.stringify(m);
    if (a.role !== "teacher") {
      this.toTeachers(out);
      return;
    }
    // Students never get the teacher notes that ride along in the state for the remote.
    let forStudents = out;
    if (m.t === "state" && m.frame && m.frame.script) {
      forStudents = JSON.stringify({ ...m, frame: { ...m.frame, script: "" } });
    }
    if (m.t === "state") {
      this.state = forStudents;
      await this.ctx.storage.put("state", forStudents);
      const cur = this.liveNow();
      if (!cur || cur.deck !== m.deck) {
        const mins = Math.min(Math.max(+m.mins || 80, 10), 240);
        const now = Date.now();
        this.session = {
          deck: clean(m.deck, 80), title: clean(m.title, 120), url: safePath(m.url), startedAt: now,
          endsAt: a.until > now ? a.until : now + (mins + 5) * 60000,
        };
        await this.ctx.storage.put("session", this.session);
      } else if (m.title && cur.title !== m.title) {
        cur.title = clean(m.title, 120);
        await this.ctx.storage.put("session", cur);
      }
    }
    if (m.t === "end") {
      this.state = null;
      this.session = null;
      await this.ctx.storage.delete("state");
      await this.ctx.storage.delete("session");
    }
    for (const s of this.ctx.getWebSockets()) {
      if (s === ws) continue;
      const b = s.deserializeAttachment() || {};
      if (m.to && b.role === "student" && b.id !== m.to) continue;
      try { s.send(b.role === "student" ? forStudents : out); } catch { /* closed */ }
    }
  }

  async webSocketClose(ws) { await this.gone(ws); }
  async webSocketError(ws) { await this.gone(ws); }

  async gone(ws) {
    const a = ws.deserializeAttachment() || {};
    if (a.role === "student") this.toTeachers({ t: "leave", from: { role: a.role, id: a.id, name: a.name } });
    // When the last teacher socket goes, the lesson is no longer live.
    if (a.role === "teacher" && !this.ctx.getWebSockets("teacher").some(s => s !== ws)) {
      this.state = null;
      await this.ctx.storage.delete("state");
    }
    try { ws.close(1000, "bye"); } catch { /* already closed */ }
  }
}

function safePath(u) {
  const s = String(u || "");
  return /^\/(?!\/)[A-Za-z0-9._~\/-]{0,300}$/.test(s) ? s : "";
}

function clean(v, max) {
  return String(v || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

// Called by the Worker for /live/<class-id>. isTeacher and classForCode come from index.js.
export async function liveRoute(request, env, classId, url, { isTeacher, classForCode, classes, studentName, until }) {
  if (url.pathname.endsWith("/status")) {
    if (!env.LIVE || !classes.some(c => c.id === classId)) return Response.json({ live: false });
    if (!isTeacher && (await classForCode(request.headers.get("X-Class-Code"))) !== classId) return Response.json({ live: false }, { status: 403 });
    const stub = env.LIVE.get(env.LIVE.idFromName(classId));
    const res = await stub.fetch(new Request("https://live/status", { headers: { "X-Live-Status": "1" } }));
    return new Response(res.body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return new Response("Live rooms need a WebSocket.", { status: 426 });
  }
  if (!env.LIVE) return new Response("Live rooms are not set up on this deployment.", { status: 503 });
  if (!classes.some(c => c.id === classId)) return new Response("No such class.", { status: 404 });
  let role = "student", name = url.searchParams.get("name") || "";
  if (isTeacher) role = "teacher";
  else {
    let ok = (await classForCode(url.searchParams.get("code"))) === classId;
    // Students go by the name on the class list, which only the teacher can change.
    // The phone remote signs in as the teacher, so it never gets here.
    if (ok && studentName) { name = await studentName(url.searchParams.get("id")); if (!name) ok = false; }
    if (!ok) {
      // Accept, then close with 4403, so the page can tell "wrong code" from "offline".
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      server.close(4403, "Class code needed");
      return new Response(null, { status: 101, webSocket: client });
    }
  }
  const h = new Headers(request.headers);
  h.set("X-Live-Role", role);
  h.set("X-Live-Id", url.searchParams.get("id") || "");
  h.set("X-Live-Name", name);
  if (role === "teacher" && until) h.set("X-Live-Until", String(until));
  const stub = env.LIVE.get(env.LIVE.idFromName(classId));
  return stub.fetch(new Request(request.url, { headers: h }));
}
