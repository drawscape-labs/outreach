UPDATE "companies"
SET "category" = CASE
  WHEN LOWER(COALESCE("industry", '')) LIKE '%yacht%'
    OR LOWER(COALESCE("industry", '')) LIKE '%boat%'
    OR LOWER(COALESCE("industry", '')) LIKE '%catamaran%'
    THEN 'yacht'
  WHEN LOWER(COALESCE("industry", '')) LIKE '%aircraft%'
    OR LOWER(COALESCE("industry", '')) LIKE '%aviation%'
    THEN 'aircraft'
  ELSE "category"
END
WHERE "category" IS NULL;
