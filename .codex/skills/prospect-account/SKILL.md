---
name: prospect-account
description: Research and prepare Drawscape Outreach prospect records from a company name, domain, LinkedIn company URL, and desired sales titles. Use when the user wants to find account contacts, discover sales reps or brokers, dedupe against the SQLite outreach database, produce a dry-run import plan, upsert companies, people, and positions, or kick off email lookup after approved imports.
---

# Prospect Account

Research one target account, find likely sales contacts, dedupe against the Drawscape Outreach SQLite database, and produce a reviewable import plan.

## Default Behavior

- Default to `dry-run`. Do not write to `data/outreach.sqlite` unless the user explicitly asks for an import/upsert after reviewing the plan.
- Prefer target accounts that sell aircraft, cars, sailboats, yachts, or related high-value vehicles where custom Drawscape art could be gifted to clients.
- Treat the provided domain and LinkedIn company URL as identity hints; verify them before importing.
- Never use company name alone as a database uniqueness key.
- Do not scrape logged-in LinkedIn pages, bypass access controls, automate LinkedIn sessions, or collect data from paywalled/member-only pages. Record LinkedIn profile URLs found through public web search or public pages, but mark inaccessible LinkedIn details as unavailable.
- LinkedIn is preferred but not required for people when the company website directly confirms the person's name, current sales/client-facing position, and public work email address.
- Add `phone_number` when a source clearly identifies it as a personal/direct number for that person. Do not add office, main, location, department, receptionist, service, sales desk, fax, or other shared numbers; leave `phone_number` null when ambiguous.
- If a match is ambiguous, stop at `needs_review` instead of forcing an insert.
- After a successful approved import, start email lookup for imported people with missing emails. Preserve the `$find-person-email` rule that database email updates require explicit user approval unless the user already asked to import and save emails.

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
   - For car dealerships, explicitly check About Us / Meet Our Team / Staff pages. Dealer sites often list department-grouped staff cards with names, titles, direct/personal phone numbers, and `Email Me` links; inspect visible text and link targets/source for `mailto:`, `/cdn-cgi/l/email-protection`, or similar encoded email patterns.
   - For car dealerships, prioritize Sales, Brand Ambassador, General Manager, Sales Manager, and Guest Experience people.
   - For sailboat and yacht companies, explicitly check Brokers, Brokerage, Yacht Sales, Sailboat Sales, New Yachts, Pre-Owned Yachts, Used Yachts, Team, Staff, Locations, and Contact pages. Treat broker/brokerage, sales, business development, manager, director, VP, and vice president as high-priority title keywords.
   - Use current web search for public corroboration and candidate profile discovery.
   - Use LinkedIn only as a public identity hint. Do not attempt authenticated scraping.
4. Find candidate people:
   - Match requested titles exactly first, then use title-taxonomy synonyms.
   - Prefer current sales/client-facing roles over operations, marketing, service, or former employees.
   - Require a stable person identity before import: use a canonical LinkedIn profile URL when available, otherwise use a website-confirmed public work email and allow the scripts to derive `profile_key` as `email/<normalized-email>`.
   - Do not import email-only people from weak secondary sources; use email identity only when the company website or another primary company-controlled source confirms name, position, and email together.
   - Populate `phone_number` only from person-specific staff cards, broker profiles, vCards, `tel:` links next to the person's name, or source text that labels the number as direct/mobile/cell for that person.
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
   - Report inserted, updated, skipped, conflicted records, and the returned `affected_people` list.
9. Kick off post-import email lookup:
   - Parse `affected_people` from the successful import output.
   - Target people where `needs_email_lookup` is `true`, especially entries with `action: "inserted"`.
   - Skip people whose `email_status` is `present` unless the user asked to verify existing emails.
   - Read and use `$find-person-email` before researching emails.
   - Prefer a subagent when multi-agent tools are available. Spawn one focused email-research agent for the import batch, passing the exact person ids and this instruction:
     `Use $find-person-email for these Drawscape Outreach people in data/outreach.sqlite: PERSON_IDS. Find public work emails only. Default to research-only; do not update the database unless the original user request explicitly approved saving emails. Return status, email if directly found, confidence, evidence URLs, and exact update commands when a save is appropriate.`
   - If subagents are unavailable or the batch is tiny, run the same `$find-person-email` workflow inline.
   - Save emails only when the original request explicitly included email updates or the user approves the email results. Never save pattern-only guesses.

## Output

For normal conversation, return:

1. A compact account summary.
2. Candidate people grouped by `ready_to_import`, `needs_review`, and `skipped`.
3. Duplicate/conflict findings.
4. Post-import email lookup status for imported people when an import ran.
5. The exact next command if the user wants to validate, import, or save found emails.

For artifacts, create a machine-readable JSON file under a user-approved path. If the user did not provide a path, use `.codex/tmp/` as the temporary working path and create it if needed. Do not create or write to a root-level `tmp/` directory. Keep evidence and confidence outside SQLite unless the schema is extended.
