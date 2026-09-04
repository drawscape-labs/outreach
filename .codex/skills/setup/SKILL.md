---
name: setup
description: Interview a repository owner and replace the bundled company identity, outreach industries, personas, optional integrations, and local prospect data for their organization. Use when initializing or reinitializing a fork of this outreach repository.
---

# Set Up the Outreach Repository

Configure this repository for the user's organization. Treat the existing Drawscape content as sample data to replace, not defaults to preserve.

## Start with an audit

Read `README.md`, `industries.md`, `personas.md`, `package.json`, `web/package.json`, `.env.example`, and `AGENTS.md`. Search tracked files for the current organization name, domain, repository slug, package prefix, and organization-specific environment variable names. Separate:

- Core outreach identity and targeting that should be replaced.
- Generic application or research mechanics that should remain.
- Organization-specific optional skills or integrations that require an explicit keep, adapt, or remove decision.
- Historical migrations or third-party references that should not be rewritten blindly.

Do not treat industries as personas. Industries classify target organizations; personas classify people within those organizations.

## Interview the user

Ask a few related questions at a time and retain earlier answers. Offer reasonable drafts when the user gives broad descriptions. Collect enough information to define:

1. **Organization**
   - Company name, website, workspace name, and preferred repository/package slug.
   - Product or service offered.
   - The concise value proposition used for outreach.

2. **Targeting policy**
   - Default number of candidates to find.
   - Minimum evidence required to qualify an account.
   - Account types that must always be excluded.
   - Priority levels, their order and definitions, and the default priority. Recommend keeping `high`, `medium`, and `low` unless the user needs a different model.

3. **Industries / account segments**
   - A consistent category value, label, and description for each segment.
   - Terms and aliases that indicate a match.
   - Qualification, exclusion, and priority rules.
   - Preferred discovery sources and example search queries.
   - Which personas apply to the segment.

4. **Contact personas**
   - A consistent persona name, label, and description for each persona.
   - Which industries it applies to.
   - Target titles, titles that need manual review, and excluded titles.
   - Any role-specific qualification notes.

5. **Repository options**
   - Which optional Codex, Hunter, QuickMail, Cloudflare, or other bundled integrations should remain.
   - Whether organization-specific optional skills should be adapted or removed.
   - Whether the local database contains sample data that should be cleared.

Never ask the user to paste secrets into tracked files. Explain that integration credentials belong only in the repository-root `.env`.

## Preview and apply

Before editing, show a compact summary of the proposed organization, industries, personas, priority model, optional integrations, and database action. Resolve missing relationships or contradictory title rules.

After the user accepts the summary:

- Replace the contents of `industries.md` and `personas.md` with clear human-readable guidance. These files do not need a machine-readable structure and must not be required for the web application to run.
- Update current organization identity in package metadata, lockfile metadata, README examples, browser storage namespaces, core outreach skill wording, and generic API-base environment variable names where applicable.
- Adapt or remove organization-specific optional skills only according to the user's explicit choice. Do not replace unrelated domains, URLs, credentials, or historical migration contents merely because they contain the old name.
- Keep reusable research, evidence, API, deduplication, and application mechanics intact.
- Run a tracked-file search for the former organization name, domain, and slug. Review each remaining match and either update it or explain why it was intentionally retained.

If the active SQLite database contains shipped or existing records, do not overwrite it silently. Get explicit confirmation for the reset, copy it to an ignored timestamped file under `data/backups/`, remove only the active database and its SQLite sidecar files, then run `npm run db:init`. Never rewrite Git history; if sensitive data was previously committed, flag that separately for the repository owner.

## Validate and hand off

Run:

```bash
npm --prefix web run lint
npm run build
```

When useful, start the development server and check the main routes. Finish with a concise report covering changed strategy and identity files, retained old-name references, database backup/reset status, optional integrations, validation results, and any remaining manual secret setup.
