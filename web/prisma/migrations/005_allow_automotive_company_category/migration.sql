DROP TRIGGER IF EXISTS "companies_category_allowed_insert";
DROP TRIGGER IF EXISTS "companies_category_allowed_update";

CREATE TRIGGER IF NOT EXISTS "companies_category_allowed_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'automotive', 'yacht')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft, automotive, or yacht.');
END;

CREATE TRIGGER IF NOT EXISTS "companies_category_allowed_update"
BEFORE UPDATE OF "category" ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'automotive', 'yacht')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft, automotive, or yacht.');
END;

UPDATE "companies"
SET "category" = 'automotive'
WHERE "category" IS NULL
  AND (
    LOWER(COALESCE("name", '')) LIKE '%porsche%'
    OR LOWER(COALESCE("industry", '')) LIKE '%automotive%'
    OR LOWER(COALESCE("industry", '')) LIKE '%car%'
    OR LOWER(COALESCE("industry", '')) LIKE '%dealership%'
  );
