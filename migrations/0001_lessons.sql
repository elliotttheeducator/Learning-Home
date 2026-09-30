-- One row per planned lesson. `data` is the lesson as JSON (topic, objectives,
-- resources, teacher notes and so on). The Worker also creates this table on
-- first use, so running this migration by hand is optional.
CREATE TABLE IF NOT EXISTS lessons (
  class_id   TEXT NOT NULL,
  date       TEXT NOT NULL,
  slot       TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (class_id, date, slot)
);
