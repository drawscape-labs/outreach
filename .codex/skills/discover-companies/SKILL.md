---
name: discover-companies
description: Discover, qualify, and import company accounts for the audience defined in docs/industries.md. Use when the user asks to find more companies, build an account list, research lookalikes, import discovered companies, or seed companies before enrichment.
---

# Discover Companies

Find companies that match a user-provided audience prompt and the repository's configured outreach strategy, import new company rows through the web app API, then run `$enrich-company` for the newly inserted records.

## Outreach Configuration

Before discovery, read `docs/industries.md` and `docs/personas.md`. They are the source of truth for the organization and value proposition, industries, qualification and priority rules, personas, discovery sources, and query suggestions. User-provided audience requirements take precedence.

## Core Rules

- Use current web search and browser inspection for discovery. Company data changes; do not rely on memory.
- Interface with the database only through the outreach web app API. Do not use Prisma, `sqlite3`, direct SQLite reads/writes, seed scripts, or ad hoc database edits from this skill.
- If the API is unreachable, start the app from `web/` with `npm run dev -- --port 4200` or use the existing local instance. Stop before import if the API remains unreachable.
- Default API base: `http://localhost:4200`.
- Create only companies with a verified `name` and normalized `domain`; add a public `linkedin_company_url` whenever one is verified. The current API permits a missing LinkedIn company URL for domain-first account staging.
- Never use company name alone as a uniqueness key. Check existing companies by normalized `domain` first and public `linkedin_company_url` second when present.
- Do not store discovery evidence URLs in company `notes`. Keep evidence in the run artifact.
- Do not set `date_enriched` during discovery import. `$enrich-company` owns enrichment completion and date stamping.
- Do not scrape logged-in LinkedIn pages, bypass access controls, or rely on member-only data. Use public search results and public pages only.

## Working Directory

Save each run under `.codex/tmp/discover-companies/<run-label>/`.

Use:

- `prompt.md` for the user's audience prompt and any assumptions.
- `research-notes.md` for search queries, inspected sources, rejected patterns, and stop conditions.
- `candidates.json` for import-ready candidate companies.
- `import-plan.json` for dry-run duplicate checks and payload review.
- `import-result.json` for applied API results.
- `enrichment-log.md` for the `$enrich-company` follow-up status.

## Workflow

1. Interpret the audience prompt:
   - Extract required traits, examples/lookalikes, geography, exclusions, minimum quality bar, and requested count.
   - If no count is provided, use the default candidate count in `docs/industries.md`.
   - Use the category name or identifier given for the relevant industry in `docs/industries.md`. Keep it consistent across records rather than inventing variations.
2. Build search strategy:
   - For lookalikes, identify shared traits first: offering, customer type, geography, price point, sales motion, and relevance to the configured value proposition.
   - Use the discovery sources and query suggestions described for the selected industry, plus any general source guidance, to build several query families instead of relying on one broad search.
   - Treat directories as name sources unless they are authoritative for the field being verified. Verify candidates through company-controlled or authoritative sources before import.
3. Qualify candidates:
   - Apply the global `qualification` rules and the selected account segment's `qualification` rules.
   - Prefer accounts with visible people matching the personas associated with that industry so `$prospect-company` has useful contacts to pursue.
   - Apply the selected industry's priority guidance; use the documented default only when no more specific supported rule applies.
   - Treat local or subsidiary records separately from parent brands when the local entity has its own domain or public identity.
   - Mark uncertain matches as `needs_review`; do not import them.
4. Prepare `candidates.json`:
   - Keep one object per company.
   - Include only schema-safe app fields at the top level, plus a separate `discovery` object for evidence and reasoning.
   - Use this shape:

```json
{
  "companies": [
    {
      "name": "Example Company",
      "domain": "example.com",
      "linkedin_company_url": "https://www.linkedin.com/company/example-company",
      "website_url": "https://www.example.com",
      "category": "<industry category name or identifier>",
      "priority": "high",
      "industry": "Configured target industry",
      "location": "City, ST",
      "description": "Company matching a configured account segment with a visible client-facing team.",
      "discovery": {
        "why_fit": "Matches the configured qualification and priority rules.",
        "source_urls": [
          "https://www.example.com"
        ],
        "confidence": "high"
      }
    }
  ]
}
```

5. Dry-run import through the API:
   - Run:

```bash
node .codex/skills/discover-companies/scripts/import-discovered-companies-api.js .codex/tmp/discover-companies/<run-label>/candidates.json --api-base http://localhost:4200
```

   - Save stdout to `import-plan.json`.
   - Review invalid, duplicate, and conflict results. Fix candidate identity issues before applying.
6. Apply import through the API:
   - Run:

```bash
node .codex/skills/discover-companies/scripts/import-discovered-companies-api.js .codex/tmp/discover-companies/<run-label>/candidates.json --api-base http://localhost:4200 --apply
```

   - Save stdout to `import-result.json`.
   - The helper only creates new rows with `POST /api/companies`. It skips existing rows, reports conflicts, and never writes directly to SQLite.
7. Enrich new companies:
   - For every result in `affected_companies`, immediately use `$enrich-company`.
   - Pass the inserted company id, domain, LinkedIn company URL, and discovery notes as input context.
   - Let `$enrich-company` perform API-backed updates, fill richer fields, and set `date_enriched` after enrichment succeeds.
   - Do not enrich skipped existing companies unless the user explicitly asks to refresh them.

## Output

Return a compact report with:

- Discovery prompt summary and search scope.
- Counts: candidates researched, import-ready, inserted, skipped existing, conflicts, invalid, enriched, and still needing review.
- Inserted company ids and domains.
- Conflicts or review items with the minimum detail needed for human resolution.
- Paths to `candidates.json`, `import-plan.json`, `import-result.json`, and `enrichment-log.md`.
