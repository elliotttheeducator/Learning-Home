// Class codes. Elliott gives each class a short code; a student types it once and
// their browser keeps it, so the home page only shows the classes they belong to.
// The class calendar only answers with the right code (or for the signed-in teacher).
//
// Codes are easy to remember: year level, Elliott's initials, subject, year.
// Year 7 Enrichment Maths in 2026 is 07EHMATH26. Elliott can change any code in the planner.

const INITIALS = "EH";

let ready = false;
async function table(db) {
  if (ready) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS class_codes (class_id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, updated_at TEXT NOT NULL)").run();
  ready = true;
}

export function normalise(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function subject(cls) {
  const n = cls.name.toLowerCase();
  if (/math/.test(n)) return "MATH";
  if (/science/.test(n)) return "SCI";
  return n.replace(/^year\s*\d+\s*/, "").replace(/[^a-z]/g, "").slice(0, 4).toUpperCase() || "CLASS";
}

export function defaultCode(cls, year) {
  const yr = (cls.name.match(/\d+/) || cls.id.match(/\d+/) || ["0"])[0].padStart(2, "0");
  return yr + INITIALS + subject(cls) + String(year % 100).padStart(2, "0");
}

async function save(db, classId, code) {
  await db.prepare("INSERT INTO class_codes (class_id, code, updated_at) VALUES (?, ?, ?) " +
    "ON CONFLICT (class_id) DO UPDATE SET code = excluded.code, updated_at = excluded.updated_at")
    .bind(classId, code, new Date().toISOString()).run();
}

// Every class's code, giving any class without one its default.
export async function allCodes(db, classes, year) {
  await table(db);
  const { results } = await db.prepare("SELECT class_id, code FROM class_codes").all();
  const map = Object.fromEntries(results.map(r => [r.class_id, r.code]));
  const used = new Set(Object.values(map));
  for (const c of classes) {
    if (map[c.id]) continue;
    let code = defaultCode(c, year), n = 2;
    while (used.has(code)) code = defaultCode(c, year) + String.fromCharCode(64 + n++); // two of the same kind: ...26B
    await save(db, c.id, code);
    map[c.id] = code; used.add(code);
  }
  return map;
}

// Set a class's code. Returns an error message, or "" when it worked.
export async function setCode(db, classId, code) {
  await table(db);
  const c = normalise(code);
  if (c.length < 4) return "A code needs at least 4 letters or numbers.";
  const other = await db.prepare("SELECT class_id FROM class_codes WHERE code = ?").bind(c).first();
  if (other && other.class_id !== classId) return "Another class already uses that code.";
  await save(db, classId, c);
  return "";
}

// Which class a code belongs to, or "".
export async function classForCode(db, code) {
  await table(db);
  const c = normalise(code);
  if (c.length < 4) return "";
  const r = await db.prepare("SELECT class_id FROM class_codes WHERE code = ?").bind(c).first();
  return r ? r.class_id : "";
}
