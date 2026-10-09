// Live rooms for Deck Kit 2.
// One Durable Object per class. The teacher's deck, the phone remote and every
// student page for that class connect here by WebSocket at /live/<class-id>.
// The Worker decides who is who before the socket reaches the room:
//   teacher: signed in (session cookie)       students: the class code
// Students cannot see each other's messages: anything a student sends goes to
// the teacher sockets only. The teacher's messages go to everyone, or to one
// student when they carry "to". The latest teacher "state" is kept so a student
// who joins late lands on the right frame.

const MAX = 64 * 1024;

export class LiveRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.state = null;
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get("state")) || null;
    });
  }

  async fetch(request) {
    const role = request.headers.get("X-Live-Role") === "teacher" ? "teacher" : "student";
    const id = clean(request.headers.get("X-Live-Id"), 40) || crypto.randomUUID();
    const name = clean(request.headers.get("X-Live-Name"), 30) || (role === "teacher" ? "Teacher" : "Student");
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment({ role, id, name });
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
    }
    if (m.t === "end") {
      this.state = null;
      await this.ctx.storage.delete("state");
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

function clean(v, max) {
  return String(v || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

// Called by the Worker for /live/<class-id>. isTeacher and classForCode come from index.js.
export async function liveRoute(request, env, classId, url, { isTeacher, classForCode, classes }) {
  if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return new Response("Live rooms need a WebSocket.", { status: 426 });
  }
  if (!env.LIVE) return new Response("Live rooms are not set up on this deployment.", { status: 503 });
  if (!classes.some(c => c.id === classId)) return new Response("No such class.", { status: 404 });
  let role = "student";
  if (isTeacher) role = "teacher";
  else {
    const ok = (await classForCode(url.searchParams.get("code"))) === classId;
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
  h.set("X-Live-Name", url.searchParams.get("name") || "");
  const stub = env.LIVE.get(env.LIVE.idFromName(classId));
  return stub.fetch(new Request(request.url, { headers: h }));
}
