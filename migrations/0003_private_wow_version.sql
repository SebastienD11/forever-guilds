PRAGMA defer_foreign_keys = ON;

CREATE TABLE guilds_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  old_realm TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','US','KR','TW')),
  old_faction TEXT NOT NULL CHECK (old_faction IN ('Alliance','Horde','Unknown')),
  years TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  wow_version TEXT NOT NULL DEFAULT 'Vanilla'
    CHECK (wow_version IN ('Retail', 'Vanilla', 'Classic', 'Private'))
);

INSERT INTO guilds_new
  (id, name, old_realm, region, old_faction, years, story, created_at, wow_version)
SELECT
  id, name, old_realm, region, old_faction, years, story, created_at, wow_version
FROM guilds;

DROP TABLE guilds;
ALTER TABLE guilds_new RENAME TO guilds;

CREATE UNIQUE INDEX guild_identity
  ON guilds(lower(name), lower(old_realm), region, wow_version);
CREATE INDEX guild_recent ON guilds(created_at DESC);

PRAGMA defer_foreign_keys = OFF;
