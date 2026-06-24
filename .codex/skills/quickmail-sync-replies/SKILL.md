---
name: quickmail-sync-replies
description: Sync replied QuickMail prospects into the Drawscape Outreach SQLite database. Use when the user asks to fetch, import, reconcile, or apply recent QuickMail reply events, QuickMail/Zapier reply exports, or webhook payloads so matching people rows in data/outreach.sqlite are marked Replied.
---

# QuickMail Sync Replies

Sync QuickMail reply events to `people.status = 'Replied'` in the Drawscape Outreach database.

## Defaults

- Default to dry-run. Do not write to `data/outreach.sqlite` unless the user explicitly asks to apply/save/update.
- Match by `people.quickmail_lead_id` first, then by exact normalized `people.email`.
- Never infer a person from name, company, or fuzzy email. Report unmatched or ambiguous rows for review.
- Only set status to `Replied`; do not change emails, qualification, notes, companies, or positions.
- Preserve existing `Replied` rows and report them as already replied.
- Current QuickMail v2 GraphQL docs/schema do not expose a historical per-lead reply feed. If a user asks to fetch directly from QuickMail, run the script without `--source` or with `--probe-api` to confirm capability, then use a reply export/webhook payload unless the API has added reply-level fields.

## Quick Start

Dry-run a reply event file:

```bash
node .codex/skills/quickmail-sync-replies/scripts/sync-quickmail-replies.js \
  --days 14 \
  --source path/to/quickmail-replies.csv \
  --db data/outreach.sqlite
```

Apply the same sync after reviewing the dry-run report:

```bash
node .codex/skills/quickmail-sync-replies/scripts/sync-quickmail-replies.js \
  --days 14 \
  --source path/to/quickmail-replies.csv \
  --db data/outreach.sqlite \
  --apply
```

Probe whether the live QuickMail API exposes historical reply fetch fields:

```bash
node .codex/skills/quickmail-sync-replies/scripts/sync-quickmail-replies.js --probe-api
```

## Accepted Sources

Use `--source` with JSON, NDJSON, or CSV from QuickMail, Zapier, a native webhook capture, or a manual export. The script accepts common field names for:

- prospect email: `email`, `prospect_email`, `prospectEmail`, `lead.email`, `prospect.email`
- QuickMail lead id: `quickmail_lead_id`, `quickmailLeadId`, `leadId`, `lead.id`, `prospectId`, `prospect.id`
- reply/event date: `repliedAt`, `replyDate`, `eventDate`, `createdAt`, `timestamp`, `date`
- event type: `event`, `eventType`, `trigger`, `type`

If an event type is present and does not include `reply`, the script skips it. If no event type is present, the file is treated as a reply-only export.

Read `references/quickmail-reply-sources.md` when deciding what source to use or when the user asks why direct historical fetching is unavailable.

## Workflow

1. Inspect the live database when needed:

   ```bash
   sqlite3 -header -column data/outreach.sqlite "
   SELECT id, name, email, quickmail_lead_id, status
   FROM people
   WHERE quickmail_lead_id IS NOT NULL OR email IS NOT NULL
   ORDER BY status, name;"
   ```

2. If the user provided a file path, run the script in dry-run mode with the requested `--days`.
3. Review the JSON report:
   - `matched` lists local people that would be or were marked `Replied`.
   - `unmatched` lists QuickMail replies that did not map to exactly one person.
   - `skipped` lists stale, non-reply, or undated events.
4. Apply only after the user asks for a write:

   ```bash
   node .codex/skills/quickmail-sync-replies/scripts/sync-quickmail-replies.js --days DAYS --source SOURCE --db data/outreach.sqlite --apply
   ```

5. After applying, confirm with SQLite:

   ```bash
   sqlite3 -header -column data/outreach.sqlite "
   SELECT id, name, email, quickmail_lead_id, status, updated_at
   FROM people
   WHERE status = 'Replied'
   ORDER BY updated_at DESC, name;"
   ```

## Output

For normal conversation, report:

1. Dry-run or applied mode.
2. Number of reply events read, matched, updated, already replied, skipped, and unmatched.
3. Any ambiguous or unmatched prospects that need review.
4. The exact apply command when the user has not yet approved a write.
