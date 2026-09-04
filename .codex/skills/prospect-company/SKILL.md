---
name: prospect-company
description: Research and import prospect records for the industries and personas in industries.md and personas.md. Use when the user wants to find account contacts, public professional profiles and work emails, dedupe through the web app API, or upsert companies, people, and positions.
---

# Prospect Company

Research one target account, find contacts matching the configured buyer personas, dedupe through the outreach web app API, and import verified prospects.

## Default Behavior

- Default to importing verified prospects through the web app API after validation and duplicate checks. Use dry-run only when the user explicitly asks to review without writing, or when unresolved conflicts/ambiguous matches require review.
- Interface with the database through the web app API. Do not access the SQLite database directly from this skill; add or extend an API endpoint first if a needed database operation is missing.
- If the API is unreachable from the current Codex run, stop before import and report the API connectivity failure. Do not fall back to Prisma, `sqlite3`, or direct SQLite writes.
- Read the repository-root `industries.md` and `personas.md` before selecting or ranking contacts. Use the industry's associated personas and the stated value proposition. User-requested titles take precedence over configured defaults.
- Treat the provided domain and LinkedIn company URL as identity hints; verify them before importing.
- Never use company name alone as a database uniqueness key.
- Do not scrape logged-in LinkedIn pages, bypass access controls, automate LinkedIn sessions, or collect data from paywalled/member-only pages. Record LinkedIn profile URLs found through public web search or public pages, but mark inaccessible LinkedIn details as unavailable.
- LinkedIn is preferred but not required for people when the company website directly confirms the person's name, current sales/client-facing position, and public work email address.
- During prospect search, actively look for both a canonical LinkedIn profile URL and an exact public work email for every import candidate. Record whichever fields are verified, and use `null` for fields not directly found.
- Apply the `$find-person-email` rules whenever researching emails: work emails only, company website first, exact public evidence only, no personal emails, no pattern-only guesses, no SMTP probing without approval.
- Add `phone_number` when a source clearly identifies it as a personal/direct number for that person. Do not add office, main, location, department, receptionist, service, sales desk, fax, or other shared numbers; leave `phone_number` null when ambiguous.
- If a match is ambiguous, stop at `needs_review` instead of forcing an insert.
- After a successful import, start email lookup for imported people with missing emails. Preserve the `$find-person-email` rule that database email updates require explicit user approval unless the user already asked to import and save emails.

## Required References

Before a full prospecting run, read the relevant references:

- The repository-root `industries.md` and `personas.md` for industries, personas, and title rankings.
- `references/output-schema.md` for the prospect JSON shape expected by scripts.
- `references/database-schema.md` for the app's table mappings.
- `references/dedupe-rules.md` for duplicate and conflict handling.
- `references/source-rules.md` for source priority, evidence, confidence, and LinkedIn boundaries.

## Working Directory

- Save all generated prospecting files under `.codex/tmp/prospect-company/`.
- Start each run by creating a per-company run directory: `node .codex/skills/prospect-company/scripts/create-run-dir.js --label "<company or domain>"`.
- Use the returned folders and paths for intermediate input, research notes, the prospect JSON artifact, validation output, duplicate-check output, and upsert output.
- Do not write prospect artifacts, run logs, scratch files, exports, or intermediate JSON to `data/`, `/private/tmp`, or a root-level `tmp/` directory.
- If the user provides a final artifact path, also keep a working copy and command outputs in the `.codex/tmp/prospect-company/` run directory.

## Workflow

1. Create the run directory:
   - Run `node .codex/skills/prospect-company/scripts/create-run-dir.js --label "<company or domain>"`.
   - Save normalized input to the returned `paths.input` when the input is structured or reused by scripts.
   - Save research notes, inspected URLs, and any non-final scratch data to the returned `paths.research_notes`.
2. Normalize input:
   - Canonicalize the domain, website URL, LinkedIn company URL, and target titles.
   - Run `node .codex/skills/prospect-company/scripts/canonicalize-input.js <input.json>` when useful.
3. Check the existing database:
   - Look for companies by normalized `domain` first and canonical `linkedin_company_url` second.
   - Look for people by `profile_key`, `linkedin_profile_url`, then email when available.
4. Research the account:
   - Resolve the account to an industry described in `industries.md`, then identify the relevant personas and title lists in `personas.md`.
   - Start with the company website and inspect the team, staff, leadership, location, contact, news, press, and other pages suggested by the selected segment's discovery configuration.
   - Prioritize titles described as targets, review titles marked for manual judgment, and normally skip titles described as excluded.
   - For each candidate, search the same company-controlled pages for a public work email and inspect visible text, `mailto:` links, contact buttons, vCards, PDFs, and page source for directly associated email addresses.
   - Use current web search for public corroboration and candidate profile discovery.
   - Use LinkedIn only as a public identity hint. Do not attempt authenticated scraping.
   - Search public web results for the candidate's canonical LinkedIn profile URL using their name, company, title, city, and domain. Store only public canonical `/in/` or `/pub/` URLs that are identity-aligned.
5. Find candidate people:
   - Match user-requested titles exactly first, then use the configured contact personas for expansion and ranking.
   - Prefer current sales/client-facing roles over operations, marketing, service, or former employees.
   - Require a stable person identity before import: use a canonical LinkedIn profile URL when available, otherwise use a website-confirmed public work email and allow the scripts to derive `profile_key` as `email/<normalized-email>`.
   - Prefer records that have both a LinkedIn profile URL and exact public work email. Do not skip otherwise good candidates solely because one of those fields is unavailable.
   - Do not import email-only people from weak secondary sources; use email identity only when the company website or another primary company-controlled source confirms name, position, and email together.
   - Never derive or save an email from an observed company pattern. If only a pattern is found, keep `email: null`, note the pattern in evidence or assumptions, and let `$find-person-email` report `pattern_observed` after import if useful.
   - Populate `phone_number` only from person-specific staff cards, broker profiles, vCards, `tel:` links next to the person's name, or source text that labels the number as direct/mobile/cell for that person.
6. Assign confidence:
   - Use `high`, `medium`, `low`, `unknown`, or `needs_review`.
   - Import only `high` and `medium` people/positions by default.
7. Produce the prospect JSON artifact:
   - Follow `references/output-schema.md`.
   - Save it to the returned `paths.prospect` unless the user explicitly provided another path.
   - Include field-level evidence in the artifact, but do not store source URLs in `notes` because the current schema does not track evidence.
8. Validate and dedupe:
   - Run `node .codex/skills/prospect-company/scripts/validate-prospect-json.js <prospect.json>` and save the output to the returned `paths.validation`.
   - Run `node .codex/skills/prospect-company/scripts/check-duplicates.js <prospect.json> --api-base http://localhost:4200` and save the output to the returned `paths.duplicates`.
9. Import by default:
   - Use the app API for writes so model validation runs. Ensure the web app is reachable at `http://localhost:4200`; start it with `npm run dev -- --port 4200` if needed.
   - Run `node .codex/skills/prospect-company/scripts/upsert-prospects.js <prospect.json> --api-base http://localhost:4200 --apply` and save the output to the returned `paths.upsert_result`.
   - The importer uses the API for duplicate planning and writes via `GET/POST/PATCH /api/companies`, `GET/POST/PATCH /api/people`, and `GET/POST /api/positions`.
   - Report inserted, updated, skipped, conflicted records, and the returned `affected_people` list.
   - If duplicate checks report conflicts, multiple matches, or `needs_review` identities, do not import the affected records; report the review items instead.
10. Kick off post-import email lookup:
   - Parse `affected_people` from the successful import output.
   - Target people where `needs_email_lookup` is `true`, especially entries with `action: "inserted"`.
   - Skip people whose `email_status` is `present` unless the user asked to verify existing emails.
   - Read and use `$find-person-email` before researching or verifying emails.
   - Prefer a subagent when multi-agent tools are available. Spawn one focused email-research agent for the import batch, passing the exact person ids and this instruction:
     `Use $find-person-email for these outreach people: PERSON_IDS. Find public work emails only. Use the web app API for person lookup and updates. Default to research-only; do not update the database unless the original user request explicitly approved saving emails. Return status, email if directly found, confidence, evidence URLs, and exact update commands when a save is appropriate.`
   - If subagents are unavailable or the batch is tiny, run the same `$find-person-email` workflow inline.
   - Save emails only when the original request explicitly included email updates or the user approves the email results. Never save pattern-only guesses.

## Output

For normal conversation, return:

1. A compact account summary.
2. Import results: inserted, updated, skipped, conflicted records, and affected person ids.
3. Review items: `needs_review`, skipped candidates, and duplicate/conflict findings.
4. Post-import email lookup status for imported people when an import ran.
5. The exact next command only when useful for dry-run review, conflict resolution, retrying an import, or saving found emails.

For artifacts, create machine-readable JSON under the per-run directory in `.codex/tmp/prospect-company/`. Keep all intermediate files and logs in that run directory. Do not create or write generated files to `data/`, `/private/tmp`, or a root-level `tmp/` directory. Keep evidence and confidence outside persisted app records unless the schema is extended.
