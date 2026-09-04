# Outreach

A local-first B2B prospecting workspace for researching target accounts, finding the right contacts, tracking outreach status, and optionally syncing with external research and sequencing tools.

The included strategy is configured for Drawscape, which creates custom artwork that dealers, brokers, and clubs can give to clients or members. Fork owners can replace that strategy without changing application code.

## Requirements

- Node.js 20.9 or newer
- npm
- Git

The web app and SQLite database can be used as a manually maintained prospect database without any external integration. Additional requirements depend on the workflow:

| Workflow | Requirement |
| --- | --- |
| Manually create, edit, browse, and filter companies and people | No external integration |
| Run guided setup, company discovery, qualification, enrichment, contact prospecting, or skill-based email research | Codex CLI |
| Improve work-email discovery and verification in the included research workflows | Hunter API key (optional enhancement) |
| Add prospects to automated sequences, send outreach, manage campaigns, and synchronize campaign activity | QuickMail |

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

[`docs/industries.md`](./docs/industries.md) and [`docs/personas.md`](./docs/personas.md) are the single source of truth for:

- Organization name, offering, and value proposition
- Account segments and their qualification and priority rules
- Contact personas and their target, review, and excluded titles
- Suggested discovery sources and search queries

Account segments describe the organizations you want to reach, such as aircraft dealers or yacht clubs. Contact personas describe the people inside those organizations, such as brokers, sales managers, or event directors. Keep these concepts separate when adapting the configuration.

To reuse the project for another market, describe the strategy, qualification rules, priorities, and discovery approach in `docs/industries.md`, then describe the relevant people and role titles in `docs/personas.md`. The files are guidance for Codex skills, not application configuration, so they can use whatever Markdown structure is clearest.

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

## Workflow integrations

- **Codex CLI — required for guided prospecting:** install and sign in to Codex CLI, then run the app from the same local user account. The repository's guided setup, account discovery, qualification, company enrichment, contact prospecting, and skill-based email research workflows are implemented as skills under `.codex/skills/`. Without Codex CLI, the web app remains usable as a manually maintained prospect database, but it cannot launch those research agents.
- **QuickMail — required for automated outreach:** QuickMail owns the email sequences, sending schedules, inboxes, and campaign delivery. It is required to add researched contacts to automated campaigns and synchronize campaign activity. It is not required for research or manual record management. See [QuickMail campaign integration](#quickmail-campaign-integration).
- **Hunter — optional email-research enhancement:** set `HUNTER_API_KEY` in the root `.env` to enable Hunter-backed email discovery and verification. Hunter can improve email coverage and confidence, but the remaining discovery and prospecting workflows can run without it. The included Hunter workflow is invoked through Codex CLI.

Codex actions use the authenticated CLI installed for the user running the server. Install and sign in using the [official CLI instructions](https://learn.chatgpt.com/docs/codex/cli). Run artifacts live in `.codex/tmp/`. The current launcher bypasses approvals and sandboxing, so treat these actions as privileged local automation.

## QuickMail campaign integration

QuickMail is the campaign and sending system for this project. It is optional if you only want to research companies, collect contacts, and track them locally. It is required if you want to place contacts into automated outreach sequences, manage active campaigns, or synchronize outreach activity back into the application.

Create campaign sequences, sending schedules, inboxes, and message content in QuickMail. The application does not replace QuickMail's sequence editor or email-delivery infrastructure. Instead, it connects researched people in the local database to the campaigns managed by QuickMail.

### Configure QuickMail

Create a QuickMail API key and add it to the repository-root `.env`:

```dotenv
QUICKMAIL_API_KEY="your-api-key"
QUICKMAIL_WORKSPACE_ID="your-workspace-id"
```

`QUICKMAIL_API_KEY` authenticates campaign and lead operations. `QUICKMAIL_WORKSPACE_ID` identifies the workspace in which new QuickMail leads should be created. The workspace ID can sometimes be inferred from a selected campaign, but configuring it explicitly is recommended. Never commit either value.

### Campaign workflow

1. Create and configure the campaign in QuickMail, including its sequence, schedule, sending inboxes, and safety limits.
2. Open **Campaigns** in this application and select **Sync from QuickMail**. Campaigns remain owned by QuickMail; the local database stores a mirror used for selection and status display.
3. Research and verify a person in this application. A verified work email is strongly recommended before outreach.
4. From the person's action menu, select **Add to campaign** and choose the appropriate QuickMail campaign.
5. The application creates or reuses the QuickMail lead, adds it to the campaign, saves the QuickMail lead ID locally, and marks the person as **Contacted**.

Campaign synchronization imports active and archived campaign metadata. If a campaign is removed from the QuickMail response, its local record is archived rather than deleted so existing prospect records retain stable references.

### Reply synchronization

The bundled `$quickmail-sync-replies` skill reconciles reply events with local people and changes matching records to **Replied**. It matches the stored QuickMail lead ID first and then falls back to an exact normalized email address.

QuickMail's API may not expose a complete historical, per-lead reply feed. When direct retrieval is unavailable, provide the skill with a QuickMail or Zapier reply export, webhook payload, or other supported CSV, JSON, or NDJSON event file. Review unmatched or ambiguous events before applying updates.

Adding a person to a campaign is an external action that can cause email to be sent according to the campaign's QuickMail configuration. Confirm the campaign, message content, recipients, sending schedule, and compliance requirements in QuickMail before adding leads.

## Security

This project is intended for trusted, local use. It has no authentication or multi-user authorization, and its optional Codex endpoint can launch local agent processes. Do not expose the development or production server to the public internet without adding authentication, authorization, request hardening, and a safer job runner.

Prospect data and provider credentials may be sensitive. Keep `.env`, `data/*.sqlite`, `.codex/tmp/`, exports, and backups out of version control. Before publishing a fork, inspect the full Git history as well as the current tree for previously committed secrets or personal data.

## Project structure

The Next.js app and API live in `web/app/`, shared UI in `web/components/`, and the database schema and migrations in `web/prisma/`. Companies are identified by domain; people by a unique profile key. Positions link people to companies, and campaigns cache QuickMail metadata. Person statuses are New, Contacted, Replied, or Converted.

Edit [docs/industries.md](./docs/industries.md) and [docs/personas.md](./docs/personas.md) to change how the bundled skills choose and qualify prospects. Keeping category names consistent is useful for clean filtering, but the application does not impose an allowlist.
