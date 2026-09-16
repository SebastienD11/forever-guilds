ALTER TABLE guilds ADD COLUMN slug TEXT;

UPDATE guilds
SET slug = lower(
  replace(replace(replace(replace(replace(name, ' ', '-'), "'", ''), '.', ''), '--', '-'), '--', '-')
);

UPDATE guilds SET slug = 'guild' WHERE slug = '' OR slug IS NULL;
UPDATE guilds SET slug = trim(slug, '-');

WITH ranked AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM guilds
)
UPDATE guilds
SET slug = slug || CASE
  WHEN (SELECT rn FROM ranked WHERE ranked.id = guilds.id) > 1
    THEN '-' || ((SELECT rn FROM ranked WHERE ranked.id = guilds.id) - 1)
  ELSE ''
  END
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX guild_slug ON guilds(slug);
