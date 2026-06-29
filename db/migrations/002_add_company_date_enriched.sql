-- migrate:verify-column companies date_enriched

ALTER TABLE companies
ADD COLUMN date_enriched TEXT;
