CREATE TABLE guilds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  old_realm TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','US','KR','TW')),
  old_faction TEXT NOT NULL CHECK (old_faction IN ('Alliance','Horde','Unknown')),
  years TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX guild_identity ON guilds(lower(name), lower(old_realm), region);
CREATE INDEX guild_recent ON guilds(created_at DESC);

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(id),
  name TEXT NOT NULL,
  ruleset TEXT NOT NULL CHECK (ruleset IN ('Normal','PvP','Roleplaying','Hardcore')),
  faction TEXT NOT NULL CHECK (faction IN ('Alliance','Horde')),
  language TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','US','KR','TW')),
  contact_url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX plan_guild ON plans(guild_id, created_at DESC);

CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES guilds(id),
  character_name TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  contact_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX memory_guild ON memories(guild_id, created_at DESC);
