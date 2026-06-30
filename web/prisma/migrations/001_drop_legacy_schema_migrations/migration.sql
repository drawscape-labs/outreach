-- Drop the legacy SQL migration runner table now that Prisma Migrate owns schema history.
DROP TABLE "schema_migrations";
