# Database Schema

The Drawscape Outreach database lives at `data/outreach.sqlite`. Inspect `db/schema.sql` and the live database before writing because local migrations may differ from the checked-in schema.

## companies

Required fields:

- `name`
- `domain`
- `linkedin_company_url`

Useful optional fields:

- `website_url`
- `description`
- `industry`
- `location`
- `employee_count`
- `employee_count_range`
- `date_enriched`
- `notes`

Uniqueness:

- `domain` is unique and is the logical company key.
- `linkedin_company_url` is unique and is a secondary exact identity key.

Rules:

- Normalize `domain` to lowercase host without `www.`.
- Normalize `linkedin_company_url` to `https://www.linkedin.com/company/<slug>`.
- Use a single-sentence display description.
- Use `employee_count` only for exact total employee counts and `employee_count_range` when only a range is available.
- Use `date_enriched` as a nullable text date/timestamp for when company enrichment data was last gathered.
- Do not store evidence URLs, source snippets, or research-only text in `notes`.

## people

Required fields:

- `profile_key`
- `linkedin_profile_url`
- `name`

Useful optional fields:

- `email`
- `status`
- `qualified`
- `notes`

Uniqueness:

- `profile_key` is unique. For LinkedIn URLs, use `in/<slug>`.
- `linkedin_profile_url` is unique.

Rules:

- Default `status` to `New`.
- Set `qualified` to `1` only when the person appears sales/client-facing and relevant to the target vertical.
- Do not insert people without stable identity unless the schema is extended to support unverified candidates.

## positions

Required relationships:

- `company_id`
- `person_id`

Useful optional fields:

- `title`
- `department`
- `seniority`
- `start_date`
- `end_date`
- `is_current`
- `notes`

Uniqueness:

- Current schema has a unique expression index on `company_id`, `person_id`, normalized `title`, and normalized `start_date`.

Rules:

- Default `is_current` to `1` when public evidence suggests the role is current.
- Leave dates null when unknown.
- Prefer one current position per person per company unless evidence supports multiple roles.
