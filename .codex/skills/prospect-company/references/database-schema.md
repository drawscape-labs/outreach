# Database Schema

Inspect `web/prisma/schema.prisma`, `web/prisma/migrations/`, and the live web app API before changing import behavior because local migrations may differ from older checked-in notes. Do not create generated files under `data/`.

## API Write Path

Prospect imports must write through the web app API so route/model validation runs:

- `POST /api/companies` and `PATCH /api/companies/:id`
- `POST /api/people` and `PATCH /api/people/:id`
- `POST /api/positions` for new role rows

Use `node .codex/skills/prospect-company/scripts/upsert-prospects.js <prospect.json> --api-base http://localhost:4200 --apply`. The script uses API reads for duplicate planning, then performs all creates/updates through the API. Start the app with `npm run dev -- --port 4200` when `http://localhost:4200` is unavailable.

## companies

Required fields:

- `name`
- `domain`

Useful optional fields:

- `website_url`
- `description`
- `category`
- `industry`
- `location`
- `employee_count`
- `employee_count_range`
- `date_enriched`
- `notes`

Uniqueness:

- `domain` is unique and is the logical company key.
- `linkedin_company_url` is optional, unique when present, and is a secondary exact identity key.

Rules:

- Normalize `domain` to lowercase host without `www.`.
- Normalize `linkedin_company_url` to `https://www.linkedin.com/company/<slug>`.
- Use the consistent category name or identifier described in `docs/industries.md` for `category`.
- Use a single-sentence display description.
- Use `employee_count` only for exact total employee counts and `employee_count_range` when only a range is available.
- Use `date_enriched` as a nullable text date/timestamp for when company enrichment data was last gathered.
- Do not store evidence URLs, source snippets, or research-only text in `notes`.

## people

Required fields:

- `profile_key`
- `name`

Useful optional fields:

- `linkedin_profile_url`
- `email`
- `phone_number`
- `status`
- `qualified`
- `notes`

Uniqueness:

- `profile_key` is unique. For LinkedIn URLs, use `in/<slug>`. For website-confirmed email-only identities, use `email/<normalized-email>`.
- `linkedin_profile_url` is unique when present.

Rules:

- Default `status` to `New`.
- Set `qualified` to `1` only when the person appears sales/client-facing and relevant to the target vertical.
- Prefer LinkedIn profile URLs when available.
- Store `phone_number` only for personal/direct numbers tied to the named person. Do not store company main, office, location, department, service, sales desk, fax, or shared numbers.
- Insert email-only people only when a company website or other primary company-controlled source confirms the person's name, current position, and public work email together.
- Do not insert people without either a canonical LinkedIn profile URL or a website-confirmed public work email.

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
