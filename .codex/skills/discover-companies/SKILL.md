---
name: discover-companies
description: Discover, qualify, and import new Drawscape Outreach company accounts from a natural-language audience prompt, lookalike company list, geography, or niche such as aircraft dealers, Porsche/luxury car dealerships, yacht/sailboat brokers, and other high-value vehicle sellers. Use when the user asks to find more companies, build an account list, research lookalikes, import discovered companies, or seed companies before enrichment through the Drawscape web app API.
---

# Discover Companies

Find companies that match a user-provided audience prompt, verify they fit Drawscape's B2B gifting use case, import new company rows through the web app API, then run `$enrich-company` for the newly inserted records.

## Core Rules

- Use current web search and browser inspection for discovery. Company data changes; do not rely on memory.
- Interface with the database only through the Drawscape web app API. Do not use Prisma, `sqlite3`, direct SQLite reads/writes, seed scripts, or ad hoc database edits from this skill.
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
   - If no count is provided, aim for 10 strong candidates before importing.
- Map target fit to API categories: `aircraft`, `automotive`, `yacht`, or `yacht_club`. Use `yacht_club` for private sailing/yachting clubs; use `yacht` only for yacht brokers, dealers, and sellers.
2. Build search strategy:
   - For lookalikes, identify shared traits first: brands sold, customer type, region, price point, brokerage/dealer model, sales motion, and gifting relevance.
   - Use several query families instead of one broad search. Examples: `"Porsche dealer" "sales" "LinkedIn company"`, `"aircraft sales" "brokerage" "team"`, `"yacht brokerage" "sailboat sales" "LinkedIn"`, brand dealer locators, association directories, and regional searches.
   - For sailboat or yacht company discovery, check the YBAA CPYB Certified Yacht Brokers directory at `https://members.ybaa.org/cpyb-certified-yacht-brokers/FindStartsWith?term=%23%21`. Treat it as a name source: broker entries often expose brokerage/company names even when no company link is available. Google those names and verify each company through official websites, authoritative directories, or public LinkedIn company pages before adding it as a candidate.
   - Prefer official company websites, manufacturer/dealer locators, industry associations, reputable directories, and public LinkedIn company pages. Use directories to discover candidates, then verify on company-controlled or authoritative sources.
3. Qualify candidates:
   - Require evidence that the company sells aircraft, cars, Porsche/luxury automobiles, sailboats, yachts, or the user-specified high-value category.
   - Prefer companies with visible sales teams, brokers, brand ambassadors, client advisors, or dealership staff that `$prospect-account` could later target.
   - Reject service-only, parts-only, rental-only, defunct, acquired/merged, or ambiguous businesses unless the user explicitly asked for them.
   - Treat local dealership/location records separately from parent brands when the local entity has its own domain or LinkedIn page.
   - For yacht brokers, set `priority` before import: use `high` for mainstream/high-volume sailboat dealers or brokers with production sailboat, sailing catamaran, active used sailboat, or brand evidence such as Catalina, J/Boats, Beneteau, Jeanneau, Dufour, Hanse, Lagoon, or comparable non-superyacht sail brands. Use `low` for primarily luxury-yacht or superyacht brokers whose sail evidence is limited to sailing superyachts, custom megayachts, crewed sailing-yacht charters, or occasional large-yacht listings. Use `medium` for powerboat, motor-yacht, general boat, mixed yacht, or ambiguous yacht broker evidence when the high or low rule is not clearly proven.
   - Mark uncertain matches as `needs_review`; do not import them.
4. Prepare `candidates.json`:
   - Keep one object per company.
   - Include only schema-safe app fields at the top level, plus a separate `discovery` object for evidence and reasoning.
   - Use this shape:

```json
{
  "companies": [
    {
      "name": "Example Porsche",
      "domain": "exampleporsche.com",
      "linkedin_company_url": "https://www.linkedin.com/company/example-porsche",
      "website_url": "https://www.exampleporsche.com",
      "category": "automotive",
      "priority": "high",
      "industry": "Porsche dealership",
      "location": "City, ST",
      "description": "Porsche dealership with client-facing sales advisors.",
      "discovery": {
        "why_fit": "Sells high-value vehicles through a sales team that could gift custom client art.",
        "source_urls": [
          "https://www.exampleporsche.com"
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
