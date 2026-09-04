-- Priorities are ordinary application strings rather than a fixed taxonomy.
-- Removing the SQLite allowlist lets operators add priorities without migrations.
DROP TRIGGER IF EXISTS "companies_priority_allowed_insert";
DROP TRIGGER IF EXISTS "companies_priority_allowed_update";
