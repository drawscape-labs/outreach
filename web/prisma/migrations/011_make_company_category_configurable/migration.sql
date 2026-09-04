-- Categories are ordinary application strings rather than a fixed taxonomy.
-- Removing the SQLite allowlist lets operators add categories without migrations.
DROP TRIGGER IF EXISTS "companies_category_allowed_insert";
DROP TRIGGER IF EXISTS "companies_category_allowed_update";
