---
name: find-person-email
description: Find and verify work email addresses for existing outreach people through the web app API. Use when the user asks to find a person's email address, fill a missing people.email field, verify or update a business email, research a public contact email for a database person, or prepare a confidence/evidence report before outreach.
compatibility: Requires internet access, Node.js 20+, and the local outreach web app for database writes.
---

# Find Person Email

Find a public, professional email address for a person already tracked in the outreach workspace.

In commands below, set `SKILL_DIR` to the directory containing this `SKILL.md`. Keep the repository root as the current working directory so project files and `.agent-runs/` resolve correctly.

## Defaults

- Default to research-only. Do not write through the API unless the user explicitly asks to update/save/apply the email.
- Interface with the database through the web app API. Do not access the SQLite database directly from this skill; add or extend an API endpoint first if a needed database operation is missing.
- Find work emails only. Do not search for or store personal email addresses.
- Use current public sources. Staff pages, email formats, and roles change often.
- Always check the company's own website before broader web search or secondary sources.
- Do not synthesize candidate email addresses from company email patterns.
- Email patterns are evidence notes only: report the observed pattern and confidence that the pattern works, but do not treat a pattern-only address as found.
- Save only exact work email addresses directly observed in a public source for that person.
- Do not scrape logged-in LinkedIn pages, bypass access controls, solve CAPTCHAs, use leaked datasets, or collect paywalled/member-only information.
- Do not send test emails or perform SMTP probing unless the user explicitly approves a compliant verification tool.
- If evidence is weak or conflicting, return `needs_review` instead of guessing.

## Working Directory

- Put generated email-research files under `.agent-runs/find-person-email/<person-or-run>/`.
- Use relevant subfolders such as `inputs/`, `outputs/`, `logs/`, `evidence/`, and `scratch/` for API readbacks, evidence notes, dry-run output, apply output, and source snapshots.
- Do not write generated artifacts, evidence reports, exports, or scratch files to `data/`, `/private/tmp`, or a root-level `tmp/` directory.

## Workflow

1. Check the company website first:
   - Query the web app API to resolve the person, current company, domain, and `website_url`.
   - Resolve by `people.id` when possible; otherwise match by name plus company/position context.
   - Go directly to the company's public website before using general web search.
   - Check team, staff, sales, broker, leadership, contact, location, About Us, Meet Our Team, news, press, and profile pages for the person's exact email.
   - Inspect visible text, `mailto:` links, contact buttons, vCards, linked PDFs, and public page source for the address.
   - For dealerships, prioritize About Us, Meet Our Team, Staff, Sales, and location pages.
   - If the person's exact work email appears on the company site, report it as `high` confidence and skip broader research unless the user asked for extra verification.

   ```bash
   curl -sS http://localhost:4200/api/people/PERSON_ID
   ```

2. Stop early when appropriate:
   - If `people.email` already exists, report it and verify only if the user asked for verification.
   - If multiple people match the request, ask for the exact person or present the ambiguous matches.

3. Search public corroborating sources only when the company website does not list the exact email:
   - Use web search for the person name, company, domain, title, and exact email evidence.
   - Look at manufacturer/dealer directories, industry association pages, conference bios, public PDFs, press releases, and official social profile snippets.
   - Use LinkedIn only as a public identity hint; do not automate authenticated LinkedIn browsing.

4. Note patterns without deriving addresses:
   - If no exact email for the person is found, you may identify the company's public coworker email pattern.
   - Do not derive, return, or save a candidate email for the person from the pattern.
   - Report the pattern, example count, example source URLs, and `pattern_confidence`.
   - Keep the result status as `pattern_observed`, `needs_review`, or `unknown`; use `found` only when the person's exact email appears in a public source.

5. Classify confidence:
   - `high`: exact email appears on an official company page, public staff profile, public PDF, or another primary source.
   - `medium`: exact email appears on a reputable secondary source.
   - `low`: exact email appears only on a weak, stale, or partially ambiguous source.
   - `needs_review`: identity, company domain, email format, or source freshness is ambiguous.
   - `unknown`: no usable candidate found.
   - `pattern_confidence`: classify observed company patterns separately as `high`, `medium`, or `low`; never use pattern confidence as permission to save an email.

6. Report results:
   - Include the person id, name, company, current email state, exact email if directly found, confidence, and short evidence notes with URLs.
   - If only a pattern is found, include the pattern and `pattern_confidence`, and explicitly say no email was found for the person.
   - Keep evidence in the response or a separate artifact. Do not store source URLs or research notes in `people.notes` unless the user explicitly asks for that schema usage.

7. Update only after explicit approval:
   - Use `scripts/update-person-email.js` to write `people.email` through `PATCH /api/people/:id` only for exact directly observed emails.
   - Pattern-only findings must not be saved to `people.email`.
   - Run without `--apply` first for a dry run.
   - Use `--overwrite` only when replacing a different existing email is intentional.

   ```bash
   node "$SKILL_DIR/scripts/update-person-email.js" PERSON_ID email@example.com --api-base http://localhost:4200 --evidence direct --source SOURCE_URL
   node "$SKILL_DIR/scripts/update-person-email.js" PERSON_ID email@example.com --api-base http://localhost:4200 --evidence direct --source SOURCE_URL --apply
   ```

## Output Shape

For normal conversation, return:

1. `found`, `already_present`, `pattern_observed`, `needs_review`, or `unknown`.
2. The exact email only if directly found.
3. Confidence and why, or the observed pattern plus `pattern_confidence`.
4. Evidence URLs summarized briefly.
5. The exact dry-run or apply command when a database update is appropriate.
