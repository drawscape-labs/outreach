ALTER TABLE "companies" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';

CREATE TRIGGER IF NOT EXISTS "companies_priority_allowed_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."priority" NOT IN ('high', 'medium', 'low')
BEGIN
  SELECT RAISE(ABORT, 'priority must be high, medium, or low.');
END;

CREATE TRIGGER IF NOT EXISTS "companies_priority_allowed_update"
BEFORE UPDATE OF "priority" ON "companies"
FOR EACH ROW
WHEN NEW."priority" NOT IN ('high', 'medium', 'low')
BEGIN
  SELECT RAISE(ABORT, 'priority must be high, medium, or low.');
END;
