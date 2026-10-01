// Uploaded files: resources made in any chat, uploaded from the teacher planner.
//
// They live in the D1 database, split into chunks because a D1 row holds at most
// 2 MB. Every upload to the same address is a new version; the last few versions
// are kept so a bad upload can be undone. Files are served at
//   /files/<class-id>/<name>
// Files for students are public, like anything in public/. Teacher-only and print
// files need the teacher sign-in.

const CHUNK = 900 * 1024;          // safely under D1's 2 MB row limit
const MAX_BYTES = 20 * 1024 * 1024; // per file
const KEEP_VERSIONS = 10;
const AUDIENCES = ["students", "teacher", "print"];

const MIME = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
  css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json", txt: "text/plain; charset=utf-8",
  mp4: "video/mp4", mp3: "audio/mpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

let ready = false;
async function tables(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, class_id TEXT NOT NULL, title TEXT NOT NULL, " +
      "aud TEXT NOT NULL, type TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS file_versions (path TEXT NOT NULL, version INTEGER NOT NULL, mime TEXT NOT NULL, " +
      "size INTEGER NOT NULL, chunks INTEGER NOT NULL, name TEXT NOT NULL, uploaded_at TEXT NOT NULL, PRIMARY KEY (path, version))"),
    db.prepare("CREATE TABLE IF NOT EXISTS file_chunks (path TEXT NOT NULL, version INTEGER NOT NULL, idx INTEGER NOT NULL, " +
      "data BLOB NOT NULL, PRIMARY KEY (path, version, idx))"),
  ]);
  ready = true;
}

function ext(name) { const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ""; }

function slug(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
}

// A sensible kind for the planner from the file type.
function guessType(e) {
  if (e === "pdf") return "booklet";
  if (e === "html" || e === "htm") return "app";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(e)) return "link";
  return "link";
}

// Quick checks on text files. They warn, they never block.
function checks(text, e, size) {
  const out = [];
  if (size > 5 * 1024 * 1024) out.push("Large file (" + (size / 1048576).toFixed(1) + " MB). It may be slow to open on school PCs.");
  if (!["html", "htm", "txt", "css", "js", "json", "svg"].includes(e)) return out;
  const dashes = (text.match(/\u2014/g) || []).length;
  if (dashes) out.push(dashes + (dashes === 1 ? " em-dash" : " em-dashes") + " in the file.");
  if (e === "html" || e === "htm") {
    if (!/<title>[^<]+<\/title>/i.test(text)) out.push("No page title, so the browser tab will be blank.");
    if ((text.match(/<!doctype/gi) || []).length > 1) out.push("Two <!doctype> lines: probably a claude.ai wrapper that should be stripped.");
    if (/window\.claude|claude\.use\(/.test(text)) out.push("It uses claude.ai features (window.claude). Cloud saving and downloads that rely on them will not work here; it falls back to this computer if the page allows.");
    if (/window\.storage/.test(text)) out.push("It uses window.storage, which only exists on claude.ai.");
  }
  return out;
}

async function readBytes(db, path, version) {
  const { results } = await db.prepare("SELECT data FROM file_chunks WHERE path = ? AND version = ? ORDER BY idx")
    .bind(path, version).all();
  const parts = results.map(r => new Uint8Array(r.data));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

// GET /files/<class>/<name>
export async function serveFile(db, path, isTeacher) {
  await tables(db);
  const f = await db.prepare("SELECT f.path, f.aud, f.version, v.mime, v.size FROM files f JOIN file_versions v ON v.path = f.path AND v.version = f.version WHERE f.path = ?")
    .bind(path).first();
  if (!f) return null;
  if (f.aud !== "students" && !isTeacher) return "signin";
  const bytes = await readBytes(db, f.path, f.version);
  return new Response(bytes, {
    headers: {
      "Content-Type": f.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": f.aud === "students" ? "public, max-age=60" : "private, no-store",
      "ETag": '"' + f.version + '"',
      "X-Robots-Tag": "noindex",
    },
  });
}

// GET /api/teacher/files?class=<id>
export async function listFiles(db, classId) {
  await tables(db);
  const q = "SELECT f.path, f.class_id, f.title, f.aud, f.type, f.version, f.updated_at, v.size, v.name, " +
    "(SELECT COUNT(*) FROM file_versions x WHERE x.path = f.path) AS versions " +
    "FROM files f JOIN file_versions v ON v.path = f.path AND v.version = f.version" +
    (classId ? " WHERE f.class_id = ?" : "") + " ORDER BY f.updated_at DESC";
  const st = db.prepare(q);
  const { results } = classId ? await st.bind(classId).all() : await st.all();
  return results.map(r => ({ url: "/files/" + r.path, path: r.path, classId: r.class_id, title: r.title, for: r.aud, type: r.type,
    version: r.version, versions: r.versions, size: r.size, name: r.name, updatedAt: r.updated_at }));
}

// POST /api/teacher/files (multipart form): file, classId, title, for, type, replace (an existing path)
export async function uploadFile(db, request, classIds) {
  await tables(db);
  let form;
  try { form = await request.formData(); } catch { return { status: 400, body: { error: "Send the file as a form upload." } }; }
  const file = form.get("file");
  if (!file || typeof file === "string") return { status: 400, body: { error: "No file came through." } };
  if (file.size > MAX_BYTES) return { status: 413, body: { error: "That file is over 20 MB." } };
  if (file.size === 0) return { status: 400, body: { error: "That file is empty." } };

  const e = ext(file.name);
  const replace = String(form.get("replace") || "").replace(/^\/files\//, "");
  const now = new Date().toISOString();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = ["html", "htm", "txt", "css", "js", "json", "svg"].includes(e) ? new TextDecoder().decode(bytes) : "";
  const mime = MIME[e] || file.type || "application/octet-stream";

  let path, title, aud, type, version;
  if (replace) {
    const cur = await db.prepare("SELECT path, title, aud, type, version FROM files WHERE path = ?").bind(replace).first();
    if (!cur) return { status: 404, body: { error: "The file to replace is not there any more." } };
    if (ext(cur.path) !== e) return { status: 400, body: { error: "A new version has to be the same kind of file (." + ext(cur.path) + ")." } };
    ({ path, title, aud, type } = cur);
    version = cur.version + 1;
  } else {
    const classId = String(form.get("classId") || "");
    if (!classIds.includes(classId)) return { status: 400, body: { error: "Pick a class for the file." } };
    title = String(form.get("title") || "").trim().slice(0, 200) || file.name.replace(/\.[^.]+$/, "");
    aud = AUDIENCES.includes(form.get("for")) ? form.get("for") : "students";
    type = String(form.get("type") || "").slice(0, 20) || guessType(e);
    // A new address, never on top of someone else's file.
    const base = classId + "/" + slug(title);
    path = base + (e ? "." + e : "");
    for (let n = 2; await db.prepare("SELECT 1 FROM files WHERE path = ?").bind(path).first(); n++) path = base + "-" + n + (e ? "." + e : "");
    version = 1;
  }

  // Chunks go in small groups so no single database request gets too big. The
  // version only counts once the row below is written, after every chunk has landed,
  // so a failed upload never replaces the live file.
  const chunks = Math.max(1, Math.ceil(bytes.length / CHUNK));
  await db.prepare("DELETE FROM file_chunks WHERE path = ? AND version = ?").bind(path, version).run();
  for (let i = 0; i < chunks; i += 3) {
    const group = [];
    for (let j = i; j < Math.min(chunks, i + 3); j++) {
      group.push(db.prepare("INSERT INTO file_chunks (path, version, idx, data) VALUES (?, ?, ?, ?)")
        .bind(path, version, j, bytes.subarray(j * CHUNK, (j + 1) * CHUNK)));
    }
    await db.batch(group);
  }
  const stmts = [];
  stmts.push(db.prepare("INSERT INTO file_versions (path, version, mime, size, chunks, name, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(path, version, mime, bytes.length, chunks, file.name.slice(0, 200), now));
  stmts.push(version === 1
    ? db.prepare("INSERT INTO files (path, class_id, title, aud, type, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(path, path.split("/")[0], title, aud, type, version, now, now)
    : db.prepare("UPDATE files SET version = ?, updated_at = ? WHERE path = ?").bind(version, now, path));
  await db.batch(stmts);
  await prune(db, path);

  return { status: 200, body: { ok: true, url: "/files/" + path, path, title, for: aud, type, version, size: bytes.length, warnings: checks(text, e, bytes.length) } };
}

// Keep only the newest versions (and always the one in use).
async function prune(db, path) {
  const { results } = await db.prepare("SELECT version FROM file_versions WHERE path = ? ORDER BY version DESC").bind(path).all();
  const cur = await db.prepare("SELECT version FROM files WHERE path = ?").bind(path).first();
  const old = results.slice(KEEP_VERSIONS).map(r => r.version).filter(v => !cur || v !== cur.version);
  if (!old.length) return;
  await db.batch(old.flatMap(v => [
    db.prepare("DELETE FROM file_chunks WHERE path = ? AND version = ?").bind(path, v),
    db.prepare("DELETE FROM file_versions WHERE path = ? AND version = ?").bind(path, v),
  ]));
}

// GET /api/teacher/files/versions?path=
export async function fileVersions(db, path) {
  await tables(db);
  const cur = await db.prepare("SELECT version FROM files WHERE path = ?").bind(path).first();
  if (!cur) return null;
  const { results } = await db.prepare("SELECT version, size, name, uploaded_at FROM file_versions WHERE path = ? ORDER BY version DESC").bind(path).all();
  return { current: cur.version, versions: results.map(r => ({ version: r.version, size: r.size, name: r.name, uploadedAt: r.uploaded_at })) };
}

// POST /api/teacher/files/restore { path, version }: make an older version the live one.
export async function restoreVersion(db, path, version) {
  await tables(db);
  const v = await db.prepare("SELECT 1 FROM file_versions WHERE path = ? AND version = ?").bind(path, version).first();
  if (!v) return false;
  await db.prepare("UPDATE files SET version = ?, updated_at = ? WHERE path = ?").bind(version, new Date().toISOString(), path).run();
  return true;
}

// POST /api/teacher/files/update { path, title, for }: rename, or change who it is for.
export async function updateFile(db, path, title, aud) {
  await tables(db);
  const f = await db.prepare("SELECT title, aud FROM files WHERE path = ?").bind(path).first();
  if (!f) return false;
  await db.prepare("UPDATE files SET title = ?, aud = ? WHERE path = ?")
    .bind(String(title || f.title).trim().slice(0, 200) || f.title, AUDIENCES.includes(aud) ? aud : f.aud, path).run();
  return true;
}
