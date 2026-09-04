# Project overview

This is a local prospecting and sales workspace for researching companies and the people who influence purchasing decisions.

## Outreach strategy

Before discovering, qualifying, enriching, or prospecting accounts, read `docs/industries.md` and `docs/personas.md`. Together, they are the single source of truth for:

- The organization, offering, and value proposition
- Account segments and their qualification and priority rules
- Contact personas and their target, review, and excluded titles
- Preferred discovery sources and suggested queries

Keep reusable research, evidence, deduplication, and API workflow rules in skills. Do not copy market-specific segments, title lists, or priority rules into skills, application code, or agent instructions. User-provided targeting requirements take precedence over configured defaults.

The Markdown strategy files guide agent skills only. The web application must not parse them, require a fixed structure, or depend on them to start. Store company category and priority as ordinary strings and derive application filter choices from existing database values.

Account segments classify companies. Contact personas classify the people to find at those companies. Do not use one concept as the other.

## Agent skills

- `.agents/skills/` is the canonical skill directory.
- `.codex/skills` is a compatibility link for Codex. Claude reads the canonical directory through `CLAUDE.md`. Do not create duplicate skill copies.
- Keep skill instructions agent-neutral. Put agent-specific invocation syntax in the README or the relevant interface.
- Resolve bundled scripts and references relative to each skill's `SKILL.md`.
- Store generated skill artifacts under `.agent-runs/`, which is ignored by Git.
- The web app's `/api/codex` route is intentionally Codex-only and may launch privileged background processes.

## Web application

The app uses a local SQLite database to track companies, people, positions, campaigns, and outreach status.

### Project structure

- `web/app/` — Next.js pages, layouts, and feature routes
- `web/app/[feature]/[id]/` — detail pages for individual records
- `web/app/[feature]/components/` — components used only by that feature
- `web/app/[feature]/lib/` — feature-specific non-React helpers
- `web/app/api/` — API route handlers
- `web/app/api/[model]/model.js` — model data access and manipulation
- `web/app/api/[model]/schema.js` — model fields, aliases, allowed values, defaults, and messages
- `web/components/` — components reused across features
- `web/components/ui/` — shared Headless UI-based controls
- `web/lib/` — shared non-React helpers, API wrappers, Prisma, and integrations
- `web/prisma/` — Prisma schema and forward-only database migrations

Use the examples in `ui-examples/` before creating new UI patterns. Reuse `web/components/ui/` controls where appropriate.

### Design

- Prefer minimal interfaces with concise labels and only necessary explanatory text.
- Support dark mode.
- Create global components only for patterns reused in more than one place.
- Keep display code out of `lib/` modules.

### Data and API changes

- Use the local API for normal application and skill writes; do not edit SQLite directly.
- Preserve domain-based company deduplication and profile/email-based person deduplication.
- Let skills read industries, priorities, personas, and title guidance from the Markdown strategy files; keep the application independent of their contents.
- Use Prisma migrations for structural database changes. Do not add fixed segment or persona allowlists to SQLite.

### Testing

For application changes, run lint and a production build. Start the development or production server and check the changed flow in a browser when the environment permits it.

## Optional integrations

- QuickMail API documentation: https://api.quickmail.com/help
- Codex, Hunter, and QuickMail setup: `README.md`

Treat the Codex route as privileged local automation. Do not expose this application to an untrusted network without authentication, authorization, and a hardened job runner.
