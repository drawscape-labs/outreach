-- CreateTable
CREATE TABLE "companies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL UNIQUE,
    "linkedin_company_url" TEXT NOT NULL UNIQUE,
    "website_url" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "employee_count" INTEGER,
    "employee_count_range" TEXT,
    "date_enriched" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "people" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_key" TEXT NOT NULL UNIQUE,
    "linkedin_profile_url" TEXT,
    "quickmail_lead_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "positions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "seniority" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "schema_migrations" (
    "filename" TEXT PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "applied_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "execution_type" TEXT NOT NULL DEFAULT 'applied'
);

-- CreateIndex
CREATE UNIQUE INDEX "people_linkedin_profile_url_idx" ON "people"("linkedin_profile_url");

-- CreateIndex
CREATE UNIQUE INDEX "people_quickmail_lead_id_idx" ON "people"("quickmail_lead_id");

-- CreateIndex
CREATE INDEX "positions_person_id_idx" ON "positions"("person_id");

-- CreateIndex
CREATE INDEX "positions_company_id_idx" ON "positions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_unique_role_idx" ON "positions"("company_id", "person_id", "title", "start_date");
