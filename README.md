# Drawscape Outreach

Prospecting workspace for finding companies and people to reach out to.

## Core Identifiers

- Company records use `domain` as the primary key.
- Company LinkedIn pages live in `linkedin_company_url`.
- Company `category` values are currently `aircraft`, `automotive`, or `yacht`.
- Company `description` values should be a single sentence suitable for display.
- Person records use generated `id` values as the primary key.
- Person `profile_key` values are unique identity keys, usually LinkedIn path keys like `in/lewis-nisbet-097071137`; website-confirmed email-only identities use `email/name@example.com`.
- Full person LinkedIn URLs live separately in `linkedin_profile_url` when available.
- Person `quickmail_lead_id` stores the QuickMail lead id after a successful sync.
- Person `status` values are `New`, `Contacted`, `Replied`, or `Converted`; the source enum lives in `web/app/api/people/schema.js`, and `web/lib/statuses.js` re-exports it for shared UI imports.
- Person `qualified` is a boolean stored as `0` or `1`.
- Position records map people to companies with `person_id` and `company_id`.
- Position `is_current` is a boolean role-tenure flag, not a person status.

## Database

The local SQLite database lives at `data/outreach.sqlite`. Prisma schema and
checked-in migrations live in `web/prisma/`.

Migration history is intentionally forward-only. The first Prisma migration
creates the legacy `schema_migrations` table so existing databases can be
baselined consistently, the next migration drops it, and later migrations add
Prisma-era direct-write guards such as SQLite triggers and expression indexes
that Prisma schema syntax cannot represent.

```bash
npm run db:init
```

Create and apply a development migration after editing `web/prisma/schema.prisma`:

```bash
npm run db:migrate
```

Apply checked-in migrations without creating new ones:

```bash
npm run db:migrate:deploy
```

Check migration status:

```bash
npm run db:migrate:status
```

Regenerate Prisma Client after schema changes:

```bash
npm run db:generate
```

## Run

```bash
npm start
```

## Web App

The Next.js app lives in `web/`.

```bash
npm run web:dev
```

Then open `http://127.0.0.1:4200`.

Routes:

- `/companies`
- `/companies/:id`
- `/people`
- `/people/:id`
- `/contacted`
- `/replied`
- `/converted`

Styling uses Tailwind CSS through `web/postcss.config.mjs` and the global import in `web/app/styles.css`.

## QuickMail API

Set `QUICKMAIL_API_KEY` in `.env`. `QUICKMAIL_WORKSPACE_ID` is optional when
the request body includes `workspaceId`.

Browser-side QuickMail requests go through local endpoints under
`/api/quickmail/*`; the server-only QuickMail library supplies the QuickMail API
key and external API calls.

List campaigns:

```bash
curl http://127.0.0.1:4200/api/quickmail/campaigns
```

Add a lead to a campaign:

```bash
curl -X POST http://127.0.0.1:4200/api/quickmail/campaigns/cmp_123/leads \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"wrk_123","personId":1}'
```

The body must include exactly one of:

- `leadId`: an existing QuickMail lead id.
- `personId`: a local person id; the endpoint reuses an exact QuickMail lead match or creates one first.
- `lead`: a QuickMail lead object with at least `email`; exact email or LinkedIn matches are reused.

Use `"markContacted": true` with `personId` to update the local person status
after QuickMail accepts the campaign add.
