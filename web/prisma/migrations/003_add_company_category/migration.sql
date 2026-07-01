ALTER TABLE "companies" ADD COLUMN "category" TEXT;

CREATE TRIGGER IF NOT EXISTS "companies_category_allowed_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'yacht')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft or yacht.');
END;

CREATE TRIGGER IF NOT EXISTS "companies_category_allowed_update"
BEFORE UPDATE OF "category" ON "companies"
FOR EACH ROW
WHEN NEW."category" IS NOT NULL AND NEW."category" NOT IN ('aircraft', 'yacht')
BEGIN
  SELECT RAISE(ABORT, 'category must be aircraft or yacht.');
END;
