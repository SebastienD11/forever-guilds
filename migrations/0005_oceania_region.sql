PRAGMA defer_foreign_keys = ON;

CREATE TABLE guilds_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  old_realm TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','US','Oceania','KR','TW')),
  old_faction TEXT NOT NULL CHECK (old_faction IN ('Alliance','Horde','Unknown')),
  years TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  wow_version TEXT NOT NULL DEFAULT 'Vanilla'
    CHECK (wow_version IN ('Retail', 'Vanilla', 'Classic', 'Private')),
  slug TEXT
);

INSERT INTO guilds_new
  (id, name, old_realm, region, old_faction, years, story, created_at, wow_version, slug)
SELECT
  id, name, old_realm, region, old_faction, years, story, created_at, wow_version, slug
FROM guilds;

DROP TABLE guilds;
ALTER TABLE guilds_new RENAME TO guilds;

CREATE UNIQUE INDEX guild_identity
  ON guilds(lower(name), lower(old_realm), region, wow_version);
CREATE INDEX guild_recent ON guilds(created_at DESC);
CREATE UNIQUE INDEX guild_slug ON guilds(slug);

CREATE TABLE plans_new (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(id),
  name TEXT NOT NULL,
  ruleset TEXT NOT NULL CHECK (ruleset IN ('Normal','PvP','Roleplaying','Hardcore')),
  faction TEXT NOT NULL CHECK (faction IN ('Alliance','Horde')),
  language TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','US','Oceania','KR','TW')),
  contact_url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO plans_new
  (id, guild_id, name, ruleset, faction, language, region, contact_url, note, created_at)
SELECT
  id, guild_id, name, ruleset, faction, language, region, contact_url, note, created_at
FROM plans;

DROP TABLE plans;
ALTER TABLE plans_new RENAME TO plans;

CREATE INDEX plan_guild ON plans(guild_id, created_at DESC);

PRAGMA defer_foreign_keys = OFF;