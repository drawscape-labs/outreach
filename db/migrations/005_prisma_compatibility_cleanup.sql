/*
  Prisma compatibility cleanup.

  This removes database features that Prisma cannot represent cleanly in
  schema.prisma:
    - updated_at triggers
    - CHECK constraints
    - partial unique indexes
    - expression unique indexes

  Intentional tradeoffs:
    - updated_at no longer changes automatically on raw SQL updates
    - status/boolean/headcount values are no longer database-constrained
    - duplicate positions with NULL title/start_date are no longer blocked by
      the unique index, because the COALESCE expression index is replaced with
      a normal composite unique index
*/

DROP TRIGGER IF EXISTS companies_set_updated_at;
DROP TRIGGER IF EXISTS people_set_updated_at;
DROP TRIGGER IF EXISTS positions_set_updated_at;

DROP INDEX IF EXISTS people_linkedin_profile_url_idx;
DROP INDEX IF EXISTS people_quickmail_lead_id_idx;
DROP INDEX IF EXISTS positions_company_id_idx;
DROP INDEX IF EXISTS positions_person_id_idx;
DROP INDEX IF EXISTS positions_unique_role_idx;

CREATE TEMP TABLE positions_prisma_compat_data AS
SELECT
  id,
  company_id,
  person_id,
  title,
  department,
  seniority,
  start_date,
  end_date,
  is_current,
  notes,
  created_at,
  updated_at
FROM positions;

DROP TABLE positions;

CREATE TABLE companies_prisma_compat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  linkedin_company_url TEXT NOT NULL UNIQUE,
  website_url TEXT,
  description TEXT,
  industry TEXT,
  location TEXT,
  employee_count INTEGER,
  employee_count_range TEXT,
  date_enriched TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO companies_prisma_compat (
  id,
  name,
  domain,
  linkedin_company_url,
  website_url,
  description,
  industry,
  location,
  employee_count,
  employee_count_range,
  date_enriched,
  notes,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  domain,
  linkedin_company_url,
  website_url,
  description,
  industry,
  location,
  employee_count,
  employee_count_range,
  date_enriched,
  notes,
  created_at,
  updated_at
FROM companies;

DROP TABLE companies;
ALTER TABLE companies_prisma_compat RENAME TO companies;

CREATE TABLE people_prisma_compat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_key TEXT NOT NULL UNIQUE,
  linkedin_profile_url TEXT,
  quickmail_lead_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  qualified BOOLEAN NOT NULL DEFAULT 0,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO people_prisma_compat (
  id,
  profile_key,
  linkedin_profile_url,
  quickmail_lead_id,
  name,
  email,
  phone_number,
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
  phone_number,
  status,
  qualified,
  notes,
  created_at,
  updated_at
FROM people;

DROP TABLE people;
ALTER TABLE people_prisma_compat RENAME TO people;

CREATE TABLE positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL,
  title TEXT,
  department TEXT,
  seniority TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT 1,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

INSERT INTO positions (
  id,
  company_id,
  person_id,
  title,
  department,
  seniority,
  start_date,
  end_date,
  is_current,
  notes,
  created_at,
  updated_at
)
SELECT
  id,
  company_id,
  person_id,
  title,
  department,
  seniority,
  start_date,
  end_date,
  is_current,
  notes,
  created_at,
  updated_at
FROM positions_prisma_compat_data;

DROP TABLE positions_prisma_compat_data;

CREATE UNIQUE INDEX people_linkedin_profile_url_idx
ON people(linkedin_profile_url);

CREATE UNIQUE INDEX people_quickmail_lead_id_idx
ON people(quickmail_lead_id);

CREATE INDEX positions_company_id_idx
ON positions(company_id);

CREATE INDEX positions_person_id_idx
ON positions(person_id);

CREATE UNIQUE INDEX positions_unique_role_idx
ON positions(company_id, person_id, title, start_date);
