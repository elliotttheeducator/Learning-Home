// Students in each class. A student joins once with the class code and their name.
// The name is kept here, against the random id their browser keeps (kit2-id), and only
// the teacher can change it. Decks and the live room use this name, not one typed in a deck.

let ready = false;
async function table(db) {
  if (ready) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS students (class_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, " +
    "joined_at TEXT NOT NULL, seen_at TEXT NOT NULL, PRIMARY KEY (class_id, id))").run();
  ready = true;
}

export function cleanName(v) {
  return String(v || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
}
export function cleanId(v) {
  const s = String(v || "");
  return /^[A-Za-z0-9-]{6,60}$/.test(s) ? s : "";
}

// The name on file, or "".
export async function nameOf(db, classId, id) {
  await table(db);
  if (!cleanId(id)) return "";
  const r = await db.prepare("SELECT name FROM students WHERE class_id = ? AND id = ?").bind(classId, id).first();
  return r ? r.name : "";
}

// Add a student. Someone already on the list keeps the name they have: only the teacher renames.
export async function register(db, classId, id, name) {
  await table(db);
  const now = new Date().toISOString();
  const have = await nameOf(db, classId, id);
  if (have) {
    await db.prepare("UPDATE students SET seen_at = ? WHERE class_id = ? AND id = ?").bind(now, classId, id).run();
    return have;
  }
  const n = cleanName(name);
  if (!n || !cleanId(id)) return "";
  await db.prepare("INSERT INTO students (class_id, id, name, joined_at, seen_at) VALUES (?, ?, ?, ?, ?)").bind(classId, id, n, now, now).run();
  return n;
}

export async function listStudents(db, classId) {
  await table(db);
  const { results } = await db.prepare("SELECT id, name, joined_at, seen_at FROM students WHERE class_id = ? ORDER BY name COLLATE NOCASE").bind(classId).all();
  return results.map(r => ({ id: r.id, name: r.name, joinedAt: r.joined_at, seenAt: r.seen_at }));
}

export async function renameStudent(db, classId, id, name) {
  await table(db);
  const n = cleanName(name);
  if (!n) return false;
  const r = await db.prepare("UPDATE students SET name = ? WHERE class_id = ? AND id = ?").bind(n, classId, id).run();
  return r.meta.changes > 0;
}

export async function removeStudent(db, classId, id) {
  await table(db);
  const r = await db.prepare("DELETE FROM students WHERE class_id = ? AND id = ?").bind(classId, id).run();
  return r.meta.changes > 0;
}
