DROP TRIGGER IF EXISTS people_set_updated_at;
DROP INDEX IF EXISTS people_linkedin_profile_url_idx;
DROP INDEX IF EXISTS people_quickmail_lead_id_idx;

CREATE TABLE people_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_key TEXT NOT NULL UNIQUE,
  linkedin_profile_url TEXT,
  quickmail_lead_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Contacted', 'Replied', 'Converted')),
  qualified INTEGER NOT NULL DEFAULT 0 CHECK (qualified IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO people_new (
  id,
  profile_key,
  linkedin_profile_url,
  quickmail_lead_id,
  name,
  email,
  status,
  qualified,
  notes,
  created_at,
  updated_at
)
SELECT
  id,
  profile_key,
  linkedin_profile_url,
  quickmail_lead_id,
  name,
  email,
  status,
  qualified,
  notes,
  created_at,
  updated_at
FROM people;

DROP TABLE people;
ALTER TABLE people_new RENAME TO people;

CREATE UNIQUE INDEX people_linkedin_profile_url_idx
ON people(linkedin_profile_url)
WHERE linkedin_profile_url IS NOT NULL;

CREATE UNIQUE INDEX people_quickmail_lead_id_idx
ON people(quickmail_lead_id)
WHERE quickmail_lead_id IS NOT NULL;

CREATE TRIGGER people_set_updated_at
AFTER UPDATE ON people
FOR EACH ROW
WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE people
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
