ALTER TABLE plans ADD COLUMN username TEXT NOT NULL DEFAULT '';

CREATE TABLE plan_comments (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  username TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  attending INTEGER NOT NULL DEFAULT 0 CHECK (attending IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX plan_comment ON plan_comments(plan_id, created_at DESC);