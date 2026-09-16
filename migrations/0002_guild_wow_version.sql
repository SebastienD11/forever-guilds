ALTER TABLE guilds ADD COLUMN wow_version TEXT NOT NULL DEFAULT 'Vanilla'
  CHECK (wow_version IN ('Retail', 'Vanilla', 'Classic'));

DROP INDEX guild_identity;
CREATE UNIQUE INDEX guild_identity
  ON guilds(lower(name), lower(old_realm), region, wow_version);
