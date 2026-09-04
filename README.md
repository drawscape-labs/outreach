# Outreach

A local app for finding companies and contacts, tracking outreach, and sending contacts to QuickMail campaigns.

The included outreach strategy is for Drawscape. Use the setup skill to replace it with your company, industries, and buyer personas.

## Requirements

- Node.js 20.9 or newer
- npm
- Git

Extra tools are needed for some features:

| Feature | Requirement |
| --- | --- |
| Manual company and contact management | None |
| Guided research and prospecting | Codex, Claude Code, or another Agent Skills-compatible tool |
| Background jobs started from the web app | Codex CLI |
| Automated email campaigns | QuickMail |
| Extra email discovery and verification | Hunter API key (optional) |

## Install

```bash
git clone https://github.com/drawscape-labs/outreach.git
cd outreach
npm --prefix web ci
cp .env.example .env
npm run db:init
npm run dev
```

Open [http://127.0.0.1:4200](http://127.0.0.1:4200).

The database is stored at `data/outreach.sqlite` and is not committed to Git.

## Set up your company

Open the repository in an agent tool and start the setup skill:

- Codex: [`$setup`](./.codex/skills/setup/SKILL.md)
- Claude Code: `/setup`
- Other tools: “Use the setup skill”

The skill asks about your company, offer, target industries, buyer personas, title rules, and integrations. It shows a summary before replacing the included Drawscape settings.

You can also edit the strategy files directly:

- [`docs/industries.md`](./docs/industries.md) defines your company, offer, target account types, and qualification rules.
- [`docs/personas.md`](./docs/personas.md) defines the people and job titles to find.

These files guide the agent skills. The web app does not parse them, so you can use any clear Markdown structure. Company categories and priorities are stored as normal database values and do not require code changes or migrations.

## Environment

The project uses the root `.env` file:

```dotenv
DATABASE_URL="file:./data/outreach.sqlite"

# Optional
# OUTREACH_APP_NAME="Outreach"
# HUNTER_API_KEY=
# QUICKMAIL_API_KEY=
# QUICKMAIL_WORKSPACE_ID=
```

Never commit `.env` or API keys.

## Agent skills

Skills are stored in `.agents/skills/`. `.codex/skills` and `.claude/skills` link to the same directory.

- **Codex CLI** is required only for background jobs started by the **Enrich Company** and **Prospect & Save** buttons. Install it using the [official Codex CLI instructions](https://learn.chatgpt.com/docs/codex/cli).
- **Hunter** is optional. Add `HUNTER_API_KEY` to `.env` to improve work-email discovery and verification.
- Skill output and background-job logs are stored in `.agent-runs/`.

Web-launched Codex jobs run without interactive approval or sandboxing. Use this feature only on a trusted computer.

## QuickMail

QuickMail is required for automated email campaigns. It is not required for research or manual contact tracking.

Add your credentials to `.env`:

```dotenv
QUICKMAIL_API_KEY="your-api-key"
QUICKMAIL_WORKSPACE_ID="your-workspace-id"
```

Basic workflow:

1. Create the campaign, messages, inboxes, and schedule in QuickMail.
2. Open **Campaigns** in this app and select **Sync from QuickMail**.
3. Open a contact, select **Add to campaign**, and choose a campaign.
4. The app adds the contact to QuickMail and marks the contact as **Contacted**.

Use the `quickmail-sync-replies` skill with a QuickMail or Zapier reply export to mark matching contacts as **Replied**. Review your campaign settings before adding contacts because QuickMail may send email automatically.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the app on port 4200 |
| `npm run build` | Build the app |
| `npm start` | Run the production build |
| `npm run db:init` | Create or update the local database |
| `npm run db:migrate` | Create and apply a Prisma migration |
| `npm run db:migrate:deploy` | Apply existing migrations |
| `npm run db:migrate:status` | Show migration status |
| `npm run db:generate` | Generate Prisma Client |
| `npm --prefix web run lint` | Run ESLint |

For production:

```bash
npm run build
npm start
```

## Security

This app is designed for local use and has no login system. Do not expose it to the public internet without adding authentication and a secure job runner.

Do not commit `.env`, SQLite databases, prospect exports, `.agent-runs/`, or backups. Check the full Git history for old secrets or personal data before making a fork public.

## Project structure

The Next.js app is in `web/app/`, shared UI is in `web/components/`, agent skills are in `.agents/skills/`, and Prisma files are in `web/prisma/`.
