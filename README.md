# Outreach

A local-first B2B prospecting workspace for researching target accounts, finding the right contacts, tracking outreach status, and optionally syncing with external research and sequencing tools.

The included strategy is configured for Drawscape, which creates custom artwork that dealers, brokers, and clubs can give to clients or members. Fork owners can replace that strategy without changing application code.

## Requirements

- Node.js 20.9 or newer
- npm
- Git

Codex CLI, Hunter, and QuickMail are optional. The core web app and SQLite database work without them.

## Install from a fresh clone

```bash
git clone https://github.com/drawscape-labs/outreach.git
cd outreach
npm --prefix web ci
cp .env.example .env
npm run db:init
npm run dev
```

Open [http://127.0.0.1:4200](http://127.0.0.1:4200). The main routes are `/companies`, `/people`, and `/campaigns`.

`npm run db:init` generates Prisma Client, creates `data/outreach.sqlite` when it does not exist, and applies every checked-in migration. The database file is ignored by Git, so each clone starts with its own empty data store.

## Initialize it for your company

The repository includes a guided Codex setup skill. Open the cloned repository in Codex and enter:

```text
$setup
```

The skill interviews you about your company, offering, value proposition, target industries, buyer personas, title rules, qualification and priority rules, discovery sources, and optional integrations. It then previews the replacement before updating the bundled Drawscape strategy and repository identity.

If the clone includes sample prospect data, the skill will ask before resetting it and will make an ignored local backup first. API keys are never written to tracked files; add any requested credentials to the root `.env` after setup.

You can run `$setup` again later to reinitialize the repository for a different company.

## Environment

The repository-root `.env` is the only environment file used by the project. Start from `.env.example`:

```dotenv
DATABASE_URL="file:./data/outreach.sqlite"

# Optional application label
# OUTREACH_APP_NAME="Outreach"

# Optional integrations
# HUNTER_API_KEY=
# QUICKMAIL_API_KEY=
# QUICKMAIL_WORKSPACE_ID=
```

Never commit `.env`, API keys, prospect exports, or a populated SQLite database.

## Customize the outreach strategy

[`industries.md`](./industries.md) and [`personas.md`](./personas.md) are the single source of truth for:

- Organization name, offering, and value proposition
- Account segments and their qualification and priority rules
- Contact personas and their target, review, and excluded titles
- Suggested discovery sources and search queries

Account segments describe the organizations you want to reach, such as aircraft dealers or yacht clubs. Contact personas describe the people inside those organizations, such as brokers, sales managers, or event directors. Keep these concepts separate when adapting the configuration.

To reuse the project for another market, describe the strategy, qualification rules, priorities, and discovery approach in `industries.md`, then describe the relevant people and role titles in `personas.md`. The files are guidance for Codex skills, not application configuration, so they can use whatever Markdown structure is clearest.

The web app does not read or validate these files. Company category and priority are ordinary database strings, and filter choices are derived from values already stored in company records. Changing the strategy therefore requires no application restart, code edit, or database migration.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 4200 |
| `npm run build` | Create a production build |
| `npm start` | Run the production build on port 4200 |
| `npm run db:init` | Create the local database if needed and apply migrations |
| `npm run db:migrate` | Create and apply a development migration after editing the Prisma schema |
| `npm run db:migrate:deploy` | Apply checked-in migrations only |
| `npm run db:migrate:status` | Show migration status |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm --prefix web run lint` | Run ESLint |

Production setup:

```bash
npm run build
npm start
```

## Optional integrations

- **Codex:** install and sign in to Codex CLI, then run the app from the same local user account. Repository skills under `.codex/skills/` provide account discovery, company enrichment, contact prospecting, and email research workflows.
- **Hunter:** set `HUNTER_API_KEY` in the root `.env` to enable the Hunter-backed skill scripts.
- **QuickMail:** set `QUICKMAIL_API_KEY` and, when useful, `QUICKMAIL_WORKSPACE_ID` in the root `.env` to enable campaign and reply synchronization.

Codex actions use the authenticated CLI installed for the user running the server. Install and sign in using the [official CLI instructions](https://learn.chatgpt.com/docs/codex/cli). Run artifacts live in `.codex/tmp/`. The current launcher bypasses approvals and sandboxing, so treat these actions as privileged local automation.

## Security

This project is intended for trusted, local use. It has no authentication or multi-user authorization, and its optional Codex endpoint can launch local agent processes. Do not expose the development or production server to the public internet without adding authentication, authorization, request hardening, and a safer job runner.

Prospect data and provider credentials may be sensitive. Keep `.env`, `data/*.sqlite`, `.codex/tmp/`, exports, and backups out of version control. Before publishing a fork, inspect the full Git history as well as the current tree for previously committed secrets or personal data.

## Project structure

The Next.js app and API live in `web/app/`, shared UI in `web/components/`, and the database schema and migrations in `web/prisma/`. Companies are identified by domain; people by a unique profile key. Positions link people to companies, and campaigns cache QuickMail metadata. Person statuses are New, Contacted, Replied, or Converted.

Edit [industries.md](./industries.md) and [personas.md](./personas.md) to change how the bundled skills choose and qualify prospects. Keeping category names consistent is useful for clean filtering, but the application does not impose an allowlist.
