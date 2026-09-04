-- Domain remains the required account key. LinkedIn company URLs may be
-- unknown during directory imports, but retain a unique constraint when set.
PRAGMA foreign_keys=OFF;

DROP TRIGGER IF EXISTS "companies_employee_count_nonnegative_insert";
DROP TRIGGER IF EXISTS "companies_employee_count_nonnegative_update";
DROP TRIGGER IF EXISTS "companies_category_allowed_insert";
DROP TRIGGER IF EXISTS "companies_category_allowed_update";
DROP TRIGGER IF EXISTS "companies_priority_allowed_insert";
DROP TRIGGER IF EXISTS "companies_priority_allowed_update";

CREATE TABLE "new_companies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL UNIQUE,
    "linkedin_company_url" TEXT UNIQUE,
    "website_url" TEXT,
    "description" TEXT,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "industry" TEXT,
    "location" TEXT,
    "country" TEXT,
    "employee_count" INTEGER,
    "employee_count_range" TEXT,
    "date_enriched" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_companies" (
    "id", "name", "domain", "linkedin_company_url", "website_url",
    "description", "category", "priority", "industry", "location",
    "country", "employee_count", "employee_count_range", "date_enriched",
    "notes", "created_at", "updated_at"
)
SELECT
    "id", "name", "domain", "linkedin_company_url", "website_url",
    "description", "category", "priority", "industry", "location",
    "country", "employee_count", "employee_count_range", "date_enriched",
    "notes", "created_at", "updated_at"
FROM "companies";

DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";

CREATE TRIGGER "companies_employee_count_nonnegative_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."employee_count" IS NOT NULL AND NEW."employee_count" < 0
BEGIN
  SELECT RAISE(ABORT, 'employee_count must be zero or a positive integer.');
END;

CREATE TRIGGER "companies_employee_count_nonnegative_update"
BEFORE UPDATE OF "employee_count" ON "companies"
FOR EACH ROW
WHEN NEW."employee_count" IS NOT NULL AND NEW."employee_count" < 0
BEGIN
  SELECT RAISE(ABORT, 'employee_count must be zero or a positive integer.');
END;

CREATE TRIGGER "companies_category_allowed_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'automotive', 'yacht', 'yacht_club')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft, automotive, yacht, or yacht_club.');
END;

CREATE TRIGGER "companies_category_allowed_update"
BEFORE UPDATE OF "category" ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'automotive', 'yacht', 'yacht_club')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft, automotive, yacht, or yacht_club.');
END;

CREATE TRIGGER "companies_priority_allowed_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."priority" NOT IN ('high', 'medium', 'low')
BEGIN
  SELECT RAISE(ABORT, 'priority must be high, medium, or low.');
END;

CREATE TRIGGER "companies_priority_allowed_update"
BEFORE UPDATE OF "priority" ON "companies"
FOR EACH ROW
WHEN NEW."priority" NOT IN ('high', 'medium', 'low')
BEGIN
  SELECT RAISE(ABORT, 'priority must be high, medium, or low.');
END;

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
