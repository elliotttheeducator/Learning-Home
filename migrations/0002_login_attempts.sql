-- Wrong password tries per address, for the sign-in lockout. The Worker also
-- creates this table on first use.
CREATE TABLE IF NOT EXISTS login_attempts (
  ip    TEXT PRIMARY KEY,
  fails INTEGER NOT NULL,
  since INTEGER NOT NULL
);
