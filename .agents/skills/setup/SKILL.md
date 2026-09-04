---
name: setup
description: Guide a repository owner from a fresh computer to a running outreach app. Check prerequisites, install dependencies, prepare the environment and database, and configure their company, targeting, and chosen integrations. Use for first-time setup or reinitializing a fork.
compatibility: Requires an agent interface with repository access. Shell access enables installation and checks; internet access is needed to download missing software and dependencies. Helps install Node.js, npm, and Git when missing. Codex CLI is optional for web-launched jobs.
---

# Set Up the Outreach Repository

Configure this repository for the user's organization. Treat the bundled organization content as sample data to replace, not defaults to preserve.

Assume the user is already working in Claude, Claude Code, Codex, or another agent interface. Do not require Codex CLI to use this skill. If the interface cannot run local commands, give short commands for the user's operating system and ask for the results. A server running in a remote agent environment is not necessarily reachable at localhost on the user's computer.

Use simple language and ask a few related questions at a time. Reuse answers already given. Complete routine installation steps within the user's request; ask about choices that affect their company, integrations, existing data, or system setup. On repeat runs, inspect what already works and resume from the missing step.

## Sequence and waiting rules

Run setup in two phases:

1. **Install and verify the base app.** Finish the audit, prerequisite checks, dependency installation, environment setup, database initialization, build, and server checks before asking company or strategy questions. Leave optional integrations until the interview establishes which ones the user wants.
2. **Interview and configure.** Once base checks are complete, briefly report their results, then ask the first company questions. Collect answers, preview the configuration, apply it after acceptance, and verify the result.

Whenever you ask the user a question or request an action, stop all task work and wait for their response. This includes installation choices, port conflicts, credentials, interview questions, and confirmation of the proposed configuration. Do not run tools, edit files, start new commands, or continue independent work while an answer is pending. Finish any active one-time installation/check command before asking. An already-running app server may remain running.

Use a blocking question tool if available, or end the response with the question. Do not use asynchronous questions that let work continue. No response is not approval or a default selection. Resume only after receiving the answer, and resolve that answer before moving on.

Keep routine interview pauses natural: ask the question and end the response. Do not add statements such as “the setup skill requires me to wait” or “I am pausing for your answer,” and do not quote these internal workflow rules or show their file path as part of the interview. Explain actual installation blockers only when that helps the user answer.

Ask during phase one only when installation cannot safely proceed without an answer. For example, finish checks that do not depend on the port choice before asking about an occupied port; once the question is asked, stop. Never ask company questions early to collect answers while installation runs.

## Start with an audit

Read `README.md`, `docs/industries.md`, `docs/personas.md`, `package.json`, `web/package.json`, `.env.example`, and `AGENTS.md`. Search tracked files for the current organization name, domain, repository slug, package prefix, and organization-specific environment variable names. Separate:

- Core outreach identity and targeting that should be replaced.
- Generic application or research mechanics that should remain.
- Organization-specific optional skills or integrations that require an explicit keep, adapt, or remove decision.
- Historical migrations or third-party references that should not be rewritten blindly.

Do not treat industries as personas. Industries classify target organizations; personas classify people within those organizations.

## Check the computer and install

1. Identify the repository root, operating system, shell, and whether commands run on the user's computer or a remote environment. Read the package engine requirements and scripts before selecting commands.
2. Check `node --version`, `npm --version`, and `git --version` separately. Check the Node version against both package files, not just whether the command exists. The current minimum is Node.js 20.9. Missing Node or Git must not prevent reading the files and planning setup.
3. If software is missing or too old, guide installation using the official Node.js download page (https://nodejs.org/en/download) and Git installation page (https://git-scm.com/downloads). Prefer a supported Node LTS version compatible with the repository. Check for an existing version manager before choosing an installer; do not replace an existing system installation blindly. npm normally comes with Node. Use instructions for the detected OS and verify versions again after installation or a terminal restart. Let the user handle installer dialogs and credentials when necessary.
4. Run `npm --prefix web ci` from the repository root for a fresh install. Keep development dependencies: Prisma and build tools are needed during setup. On an existing working install, avoid reinstalling without a reason. If installation fails, inspect the first actionable error and resolve it before continuing; do not delete the lockfile or use force flags to hide dependency problems.

If Git metadata is absent because the user downloaded an archive, use filesystem searches for the audit. Do not require cloning again merely to read skills or run the app.

## Prepare the environment and database

- Create the repository-root `.env` from `.env.example` only when it is absent. Preserve existing values and add only missing settings. Use shell-appropriate commands. Do not print credentials or ask the user to paste them into chat.
- Check for competing environment files under `web/` and inherited environment variables. Report conflicting keys without exposing values. Reconcile the intended root configuration before proceeding; preserve a local backup before relocating an existing file. Do not silently point the app at a different database.
- Resolve `DATABASE_URL` to the actual database path using the repository's database helper. Check whether a database already exists. Keep it by default; ask about a reset only if the user wants to remove existing records.
- Run `npm run db:init` to generate Prisma Client and apply checked-in migrations, then `npm run db:migrate:status`. Use these commands instead of creating a migration during setup. No separate SQLite server is needed.
- Confirm the app can read the same database after starting it. A successful migration command alone does not prove the runtime configuration is correct. Also verify the configured application label in the browser; do not claim an environment setting works merely because it was written to `.env`.

## Verify the base app before the interview

Run `npm --prefix web run lint` and `npm run build`. Resolve installation failures before proceeding.

Start `npm run dev` using the interface's supported persistent process mechanism. Check port 4200 first; reuse a healthy instance of this repository or report a conflict instead of stopping an unrelated process. If a port decision needs user input, ask and wait. If using another port, account for the repository's port-4200 assumptions in skill/API workflows before claiming they work.

Check `/companies`, `/people`, `/skills`, and database reads through `/api/companies` and `/api/people`. Empty lists are valid on a fresh install. Verify page navigation and a filter in the browser when available. Keep the server running and give its reachable URL. If browser checks or local access are unavailable, state exactly what was checked and what remains unverified. Report application defects rather than masking them with undocumented local settings or broad code changes.

Do not begin the interview while a required installation check is failing or an installation question is unanswered. Once ready, say briefly that the base app is installed, note any unverified checks, and ask only the first group of company questions. Stop and wait.

## Interview the user

Ask a few related questions at a time and retain earlier answers. Offer reasonable drafts when the user gives broad descriptions. Collect enough information to define:

Wait for each group's answers before asking the next group or doing more work. Do not configure integrations or edit company settings between unanswered questions.

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
   - Ask which types of companies they want to reach, in which locations, and what makes a company a good or poor fit. Ask for example customers when useful.
   - A consistent category value, label, and description for each segment.
   - Terms and aliases that indicate a match.
   - Qualification, exclusion, and priority rules.
   - Preferred discovery sources and example search queries.
   - Which personas apply to the segment.

4. **Contact personas**
   - Ask who buys, approves, or influences the purchase within each target industry, and which roles should be excluded. Offer suggested titles based on their answers when they do not know the exact titles.
   - A consistent persona name, label, and description for each persona.
   - Which industries it applies to.
   - Target titles, titles that need manual review, and excluded titles.
   - Any role-specific qualification notes.

5. **Repository options**
   - Whether they want only manual records, guided research in their current agent, web-launched background jobs, or automated email campaigns.
   - Whether to configure Hunter, QuickMail, Cloudflare, or other bundled integrations now or skip them.
   - Whether organization-specific optional skills should be adapted or removed.
   - Whether the local database contains sample data that should be cleared.

Never ask the user to paste secrets into tracked files. Explain that integration credentials belong only in the repository-root `.env`.

The industry and persona questions are required for company configuration, even when the user skips every integration. Explain briefly that their answers will replace the bundled strategy in both documents. Do not assume the current industries, personas, or exclusions apply to the new company. If answers are incomplete, propose a concise draft and wait for confirmation rather than retaining sample targeting or inventing it silently.

## Configure chosen integrations

- **Codex CLI:** needed only for background jobs launched by web buttons. Skip installation if the user does not want that feature. If selected, check that the server's local user can run `codex --version`. Inspect `codex login --help` for the installed version's sign-in/status commands, check authentication, and guide sign-in if needed. CLI availability, authentication, and a successful job are separate checks. Do not launch a prospecting job merely to test login. If unavailable, the user can still ask their current agent to use the skills.
- **Hunter:** optional email research. Guide the user to put `HUNTER_API_KEY` in root `.env`; use the `hunter-io` skill for an account check when requested. Avoid paid searches as an installation test.
- **QuickMail:** required for automated email campaigns. Guide root `.env` configuration using the README. Verify access with a read-only check when configured. Do not add leads, activate campaigns, or send email during setup.
- **Cloudflare and other integrations:** configure only when chosen, following the relevant skill. Do not change DNS just to verify credentials.

Read the relevant integration skill before using it. Missing optional integrations must not block the base app. Report whether each chosen integration was verified, skipped, or still needs user action.

## Preview and apply

Before editing company settings, show a compact summary of the proposed organization, industries, personas, priority model, optional integrations, and database action. Resolve missing relationships or contradictory title rules. Ask the user to confirm the summary, then stop and wait. This preview applies to company configuration, not the routine base installation already completed.

After the user accepts the summary:

- Regenerate both `docs/industries.md` and `docs/personas.md` from the accepted interview answers. Replace the full bundled strategy; do not merely rename the company, append new sections, or leave unrelated Drawscape targeting in place. Retain an existing strategy detail only when the user explicitly chose it.
- In `docs/industries.md`, write the organization, offering, value proposition, target company segments and locations, qualification and exclusion rules, priority guidance, and discovery sources or queries.
- In `docs/personas.md`, write the contact roles for those segments, their purchasing role, target/review/excluded titles, and relevant qualification notes. Use the same segment names across both documents.
- Write concise, human-readable Markdown. These files do not need a machine-readable structure and must not be required for the web application to run.
- Update current organization identity in package metadata, lockfile metadata, README examples, browser storage namespaces, core outreach skill wording, and generic API-base environment variable names where applicable.
- Adapt or remove organization-specific optional skills only according to the user's explicit choice. Do not replace unrelated domains, URLs, credentials, or historical migration contents merely because they contain the old name.
- Keep reusable research, evidence, API, deduplication, and application mechanics intact.
- Run a tracked-file search for the former organization name, domain, and slug. Review each remaining match and either update it or explain why it was intentionally retained.

If the user requests a database reset, resolve the exact active database path and confirm which data will be removed. Stop writers and make a consistent SQLite backup (including any WAL data) under ignored `data/backups/`. Verify the backup before removing the active database and its sidecars, then run `npm run db:init`. Never rewrite Git history; if sensitive data was previously committed, flag that separately for the repository owner.

## Validate and hand off

Read both regenerated strategy documents and review their diff. Confirm that both reflect the approved answers, persona-to-industry relationships agree, and no unapproved sample identity, offering, segment, title list, or exclusion remains. Searching for the former company name alone is insufficient: old targeting can remain without mentioning that name. Report both documents as updated in the handoff. If either is unfinished, report company configuration as incomplete and do not start prospect discovery using the bundled strategy.

After applying configuration, rerun lint and build if files affecting those checks changed:

```bash
npm --prefix web run lint
npm run build
```

Reuse the server verified in phase one. Restart if needed for changed settings and check the affected pages and configured application label. Avoid repeating unchanged installation steps.

Offer a first task: “Use the discover-companies skill to find and save five companies matching my industries.” Run it only if the user wants that research and saving step, and read that skill first. Do not imply setup has already populated the database.

Finish with the app URL, installation/database check results, company configuration status, chosen integrations, and any remaining user actions. Include how to restart the app. Distinguish verified functionality from skipped checks; do not claim a complete setup while a required check is failing.
