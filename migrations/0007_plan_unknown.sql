PRAGMA defer_foreign_keys = ON;

CREATE TABLE plans_new (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(id),
  name TEXT NOT NULL,
  ruleset TEXT NOT NULL CHECK (ruleset IN ('Normal','PvP','Roleplaying','Hardcore')),
  faction TEXT NOT NULL CHECK (faction IN ('Alliance','Horde','Unknown')),
  language TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','US','Oceania','KR','TW','Unknown')),
  contact_url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  username TEXT NOT NULL DEFAULT ''
);

INSERT INTO plans_new
  (id, guild_id, name, ruleset, faction, language, region, contact_url, note, created_at, username)
SELECT
  id, guild_id, name, ruleset, faction, language, region, contact_url, note, created_at, username
FROM plans;

DROP TABLE plans;
ALTER TABLE plans_new RENAME TO plans;

CREATE INDEX plan_guild ON plans(guild_id, created_at DESC);

PRAGMA defer_foreign_keys = OFF;