---
name: prospect-account
description: Research and prepare Drawscape Outreach prospect records from a company name, domain, LinkedIn company URL, and desired sales titles. Use when the user wants to find account contacts, discover sales reps or brokers, dedupe against the SQLite outreach database, produce a dry-run import plan, or upsert companies, people, and positions.
---

# Prospect Account

Research one target account, find likely sales contacts, dedupe against the Drawscape Outreach SQLite database, and produce a reviewable import plan.

## Default Behavior

- Default to `dry-run`. Do not write to `data/outreach.sqlite` unless the user explicitly asks for an import/upsert after reviewing the plan.
- Prefer target accounts that sell aircraft, cars, sailboats, yachts, or related high-value vehicles where custom Drawscape art could be gifted to clients.
- Treat the provided domain and LinkedIn company URL as identity hints; verify them before importing.
- Never use company name alone as a database uniqueness key.
- Do not scrape logged-in LinkedIn pages, bypass access controls, automate LinkedIn sessions, or collect data from paywalled/member-only pages. Record LinkedIn profile URLs found through public web search or public pages, but mark inaccessible LinkedIn details as unavailable.
- If a match is ambiguous, stop at `needs_review` instead of forcing an insert.

## Required References

Before a full prospecting run, read the relevant references:

- `references/output-schema.md` for the dry-run JSON shape expected by scripts.
- `references/database-schema.md` for Drawscape Outreach table mappings.
- `references/dedupe-rules.md` for duplicate and conflict handling.
- `references/source-rules.md` for source priority, evidence, confidence, and LinkedIn boundaries.
- `references/title-taxonomy.md` when expanding or ranking target titles.

## Workflow

1. Normalize input:
   - Canonicalize the domain, website URL, LinkedIn company URL, and target titles.
   - Run `node .codex/skills/prospect-account/scripts/canonicalize-input.js <input.json>` when useful.
2. Check the existing database:
   - Look for companies by normalized `domain` first and canonical `linkedin_company_url` second.
   - Look for people by `profile_key`, `linkedin_profile_url`, then email when available.
3. Research the account:
   - Start with the company website: homepage, About, Team, Staff, Broker, Sales, Locations, Contact, News, press, and structured metadata.
   - For car dealerships, explicitly check About Us / Meet Our Team / Staff pages. Dealer sites often list department-grouped staff cards with names, titles, direct phone numbers, and `Email Me` links; inspect visible text and link targets/source for `mailto:`, `/cdn-cgi/l/email-protection`, or similar encoded email patterns.
   - For car dealerships, prioritize Sales, Brand Ambassador, General Manager, Sales Manager, and Guest Experience people.
   - Use current web search for public corroboration and candidate profile discovery.
   - Use LinkedIn only as a public identity hint. Do not attempt authenticated scraping.
4. Find candidate people:
   - Match requested titles exactly first, then use title-taxonomy synonyms.
   - Prefer current sales/client-facing roles over operations, marketing, service, or former employees.
   - Require a stable person identity before import; for this database that usually means a canonical LinkedIn profile URL.
5. Assign confidence:
   - Use `high`, `medium`, `low`, `unknown`, or `needs_review`.
   - Import only `high` and `medium` people/positions by default.
6. Produce the dry-run JSON:
   - Follow `references/output-schema.md`.
   - Include field-level evidence in the dry-run output, but do not store source URLs in `notes` because the current schema does not track evidence.
7. Validate and dedupe:
   - Run `node .codex/skills/prospect-account/scripts/validate-prospect-json.js <prospect.json>`.
   - Run `node .codex/skills/prospect-account/scripts/check-duplicates.js <prospect.json> --db data/outreach.sqlite`.
8. Import only after approval:
   - Run `node .codex/skills/prospect-account/scripts/upsert-prospects.js <prospect.json> --db data/outreach.sqlite --apply`.
   - Report inserted, updated, skipped, and conflicted records.

## Output

For normal conversation, return:

1. A compact account summary.
2. Candidate people grouped by `ready_to_import`, `needs_review`, and `skipped`.
3. Duplicate/conflict findings.
4. The exact next command if the user wants to validate or import the JSON.

For artifacts, create a machine-readable JSON file under a user-approved path or a temporary working path. Keep evidence and confidence outside SQLite unless the schema is extended.
