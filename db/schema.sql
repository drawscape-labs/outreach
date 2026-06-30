/*
  Table: companies
  Fields:
    - id
    - name
    - domain
    - linkedin_company_url
    - website_url
    - description
    - industry
    - location
    - employee_count
    - employee_count_range
    - date_enriched
    - notes
    - created_at
    - updated_at
*/
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  linkedin_company_url TEXT NOT NULL UNIQUE,
  website_url TEXT,
  description TEXT,
  industry TEXT,
  location TEXT,
  employee_count INTEGER CHECK (employee_count IS NULL OR employee_count >= 0),
  employee_count_range TEXT,
  date_enriched TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/*
  Table: schema_migrations
  Tracks SQL migration files that have been applied to this SQLite database.
*/
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_type TEXT NOT NULL DEFAULT 'applied'
    CHECK (execution_type IN ('applied', 'baseline'))
);

CREATE TRIGGER IF NOT EXISTS companies_set_updated_at
AFTER UPDATE ON companies
FOR EACH ROW
WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE companies
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

/*
  Table: people
  Fields:
    - id
    - profile_key
    - linkedin_profile_url
    - quickmail_lead_id
    - name
    - email
    - phone_number
    - status
    - qualified
    - notes
    - created_at
    - updated_at
*/
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_key TEXT NOT NULL UNIQUE,
  linkedin_profile_url TEXT,
  quickmail_lead_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Contacted', 'Replied', 'Converted')),
  qualified INTEGER NOT NULL DEFAULT 0 CHECK (qualified IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS people_linkedin_profile_url_idx
ON people(linkedin_profile_url)
WHERE linkedin_profile_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS people_quickmail_lead_id_idx
ON people(quickmail_lead_id)
WHERE quickmail_lead_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS people_set_updated_at
AFTER UPDATE ON people
FOR EACH ROW
WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE people
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

/*
  Table: positions
  Fields:
    - id
    - company_id
    - person_id
    - title
    - department
    - seniority
    - start_date
    - end_date
    - is_current
    - notes
    - created_at
    - updated_at
*/
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL,
  title TEXT,
  department TEXT,
  seniority TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS positions_company_id_idx
ON positions(company_id);

CREATE INDEX IF NOT EXISTS positions_person_id_idx
ON positions(person_id);

CREATE UNIQUE INDEX IF NOT EXISTS positions_unique_role_idx
ON positions(
  company_id,
  person_id,
  COALESCE(title, ''),
  COALESCE(start_date, '')
);

CREATE TRIGGER IF NOT EXISTS positions_set_updated_at
AFTER UPDATE ON positions
FOR EACH ROW
WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE positions
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
