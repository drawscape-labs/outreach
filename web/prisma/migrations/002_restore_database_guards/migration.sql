-- Prisma cannot model SQLite expression indexes or table-level CHECK clauses
-- for this schema, so keep these direct-write guards in a hand-written
-- migration.

DROP INDEX IF EXISTS "positions_unique_role_idx";

CREATE UNIQUE INDEX "positions_unique_role_idx"
ON "positions" (
  "company_id",
  "person_id",
  COALESCE("title", ''),
  COALESCE("start_date", '')
);

CREATE TRIGGER IF NOT EXISTS "companies_employee_count_nonnegative_insert"
BEFORE INSERT ON "companies"
FOR EACH ROW
WHEN NEW."employee_count" IS NOT NULL AND NEW."employee_count" < 0
BEGIN
  SELECT RAISE(ABORT, 'employee_count must be zero or a positive integer.');
END;

CREATE TRIGGER IF NOT EXISTS "companies_employee_count_nonnegative_update"
BEFORE UPDATE OF "employee_count" ON "companies"
FOR EACH ROW
WHEN NEW."employee_count" IS NOT NULL AND NEW."employee_count" < 0
BEGIN
  SELECT RAISE(ABORT, 'employee_count must be zero or a positive integer.');
END;

CREATE TRIGGER IF NOT EXISTS "people_status_allowed_insert"
BEFORE INSERT ON "people"
FOR EACH ROW
WHEN NEW."status" NOT IN ('New', 'Contacted', 'Replied', 'Converted')
BEGIN
  SELECT RAISE(ABORT, 'status must be New, Contacted, Replied, or Converted.');
END;

CREATE TRIGGER IF NOT EXISTS "people_status_allowed_update"
BEFORE UPDATE OF "status" ON "people"
FOR EACH ROW
WHEN NEW."status" NOT IN ('New', 'Contacted', 'Replied', 'Converted')
BEGIN
  SELECT RAISE(ABORT, 'status must be New, Contacted, Replied, or Converted.');
END;

CREATE TRIGGER IF NOT EXISTS "people_qualified_boolean_insert"
BEFORE INSERT ON "people"
FOR EACH ROW
WHEN NEW."qualified" NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'qualified must be 0 or 1.');
END;

CREATE TRIGGER IF NOT EXISTS "people_qualified_boolean_update"
BEFORE UPDATE OF "qualified" ON "people"
FOR EACH ROW
WHEN NEW."qualified" NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'qualified must be 0 or 1.');
END;

CREATE TRIGGER IF NOT EXISTS "positions_is_current_boolean_insert"
BEFORE INSERT ON "positions"
FOR EACH ROW
WHEN NEW."is_current" NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'is_current must be 0 or 1.');
END;

CREATE TRIGGER IF NOT EXISTS "positions_is_current_boolean_update"
BEFORE UPDATE OF "is_current" ON "positions"
FOR EACH ROW
WHEN NEW."is_current" NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'is_current must be 0 or 1.');
END;
