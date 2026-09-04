DROP TRIGGER IF EXISTS "companies_category_allowed_insert";
DROP TRIGGER IF EXISTS "companies_category_allowed_update";

CREATE TRIGGER IF NOT EXISTS "companies_category_allowed_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'automotive', 'yacht', 'yacht_club')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft, automotive, yacht, or yacht_club.');
END;

CREATE TRIGGER IF NOT EXISTS "companies_category_allowed_update"
BEFORE UPDATE OF "category" ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'automotive', 'yacht', 'yacht_club')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft, automotive, yacht, or yacht_club.');
END;
