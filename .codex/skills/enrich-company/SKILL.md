---
name: enrich-company
description: Enrich a company input into a complete database-ready company record. Use when the user provides a company name, website/domain, LinkedIn company profile, or partial company data and wants a normalized company record, CRM/account record, prospecting row, lead enrichment output, or database-ready JSON/CSV/SQL insert.
---

# Enrich Company

Turn a company name, domain, LinkedIn company URL, or partial company object into a database-ready company record with field-level evidence, confidence, and explicit unknowns.

## Required References

Before producing a full enriched record, read:

- `references/source-rules.md` for source priority, conflict handling, and freshness rules.
- `references/record-schema.md` for the canonical output shape and field normalization rules.

If the active repo already has a company/account schema, inspect it first and map the enriched data to that schema. Use the canonical schema only when no project-specific schema is available.

## Workflow

1. Classify the input:
   - Domain or URL: normalize to the registrable domain and resolve redirects.
   - LinkedIn URL: treat it as an identity hint, not a complete source by itself.
   - Company name: disambiguate before enrichment.
   - Partial record: preserve supplied IDs and user-provided fields unless evidence contradicts them.
2. Search current sources. Company data changes, so verify with current web or connected data sources instead of relying on memory.
3. Resolve identity:
   - Match domain, canonical name, LinkedIn profile, logo/brand, headquarters, and business description.
   - Detect subsidiaries, parent companies, similarly named companies, acquired brands, and local branches.
   - If more than one plausible entity remains, stop and ask for the minimum disambiguating detail.
4. Gather evidence from primary sources first, then reputable secondary sources.
5. Normalize values into the target database schema.
6. Attach field-level sources and confidence.
7. Return the record plus a short enrichment note listing major assumptions, conflicts, and unknown high-value fields.

## Database Integration

When the user wants the record written into a codebase or database:

- Inspect migrations, models, seed files, import scripts, and API contracts with `rg`.
- Respect existing column names, enum values, nullable fields, casing, and relationship tables.
- Treat the company `domain` as the logical primary key for company records. It must be normalized, non-null, and unique.
- Treat `linkedin_company_url` as a required unique company identifier when the target schema has that column.
- Before inserting a company, check for an existing row by normalized `domain` first and `linkedin_company_url` second. Update the existing row instead of creating a duplicate.
- If one input conflicts with an existing domain or LinkedIn company URL, stop and surface the conflict rather than forcing an insert.
- Never use company name alone as a uniqueness key.
- Use deterministic IDs only if the project already has a convention for them.
- Do not invent schema fields. Put useful extra data in a notes/metadata field only if one exists.
- For Drawscape Outreach, do not store source URLs, evidence links, or source-only text in `notes`; the schema intentionally does not track source information yet.
- Avoid writing to production systems unless the user explicitly asks and confirms the target.

## Research Rules

- Never fabricate missing values. Use `null`, an empty array, or omit fields according to the target schema.
- Prefer legal or official names for legal fields; prefer public brand names for display fields.
- Keep original user-supplied input in an `input` or `source_input` field when the schema allows it.
- Use ISO country codes, normalized URLs, and stable enum slugs when possible.
- Treat employee count, revenue, funding, and traffic estimates as ranges unless a primary source gives exact values.
- Include `last_enriched_at` with the current date when the schema has such a field.
- Mark inaccessible LinkedIn data as unavailable instead of trying to bypass login, scraping controls, or paywalls.

## Output

For conversational output, return:

1. The normalized record in JSON unless the user requests another format.
2. A compact evidence summary with links.
3. A short list of unresolved fields worth human review.

For file or database output, create or update the requested artifact and report what changed. Keep the record machine-readable; do not bury important fields in prose.

## Confidence

- `high`: primary source or multiple independent reputable sources agree.
- `medium`: reputable secondary source, indirect primary evidence, or stale official source.
- `low`: weak source, inferred value, estimates, or unresolved conflict.
- `unknown`: no usable evidence found.
