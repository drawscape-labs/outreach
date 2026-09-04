---
name: quickmail-sync-replies
description: Sync replied QuickMail prospects into the outreach database through the web app API. Use when the user asks to import, reconcile, or apply QuickMail reply events, exports, or webhook payloads so matching people are marked Replied.
compatibility: Requires Node.js 20+ and the local outreach web app. API probing also requires internet access and QUICKMAIL_API_KEY.
---

# QuickMail Sync Replies

Sync QuickMail reply events to `people.status = 'Replied'` in the outreach database.

In commands below, set `SKILL_DIR` to the directory containing this `SKILL.md`. Keep the repository root as the current working directory so the root `.env` and `.agent-runs/` resolve correctly.

## Defaults

- Default to dry-run. Do not write unless the user explicitly asks to apply/save/update; applies must go through the web app API so model validation and revalidation run.
- Match by `people.quickmail_lead_id` first, then by exact normalized `people.email`.
- Never infer a person from name, company, or fuzzy email. Report unmatched or ambiguous rows for review.
- Only set status to `Replied`; do not change emails, qualification, notes, companies, or positions.
- Preserve existing `Replied` rows and report them as already replied.
- Current QuickMail v2 GraphQL docs/schema do not expose a historical per-lead reply feed. If a user asks to fetch directly from QuickMail, run the script without `--source` or with `--probe-api` to confirm capability, then use a reply export/webhook payload unless the API has added reply-level fields.

## Working Directory

- Put generated QuickMail sync files under `.agent-runs/quickmail-sync-replies/<run-or-source>/`.
- Use relevant subfolders such as `inputs/`, `outputs/`, `logs/`, `evidence/`, and `scratch/` for imported reply exports, normalized events, dry-run reports, apply reports, API probes, and troubleshooting logs.
- Do not write QuickMail exports, sync reports, webhook captures, or scratch files to `data/`, `/private/tmp`, or a root-level `tmp/` directory.

## Quick Start

Dry-run a reply event file:

```bash
RUN_DIR=.agent-runs/quickmail-sync-replies/replies-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$RUN_DIR"/{inputs,outputs,logs,scratch}
cp path/to/quickmail-replies.csv "$RUN_DIR/inputs/replies.csv"

node "$SKILL_DIR/scripts/sync-quickmail-replies.js" \
  --days 14 \
  --source "$RUN_DIR/inputs/replies.csv" \
  --api-base http://localhost:4200 \
  > "$RUN_DIR/outputs/dry-run.json"
```

Apply the same sync after reviewing the dry-run report:

```bash
node "$SKILL_DIR/scripts/sync-quickmail-replies.js" \
  --days 14 \
  --source "$RUN_DIR/inputs/replies.csv" \
  --api-base http://localhost:4200 \
  --apply \
  > "$RUN_DIR/outputs/apply.json"
```

Probe whether the live QuickMail API exposes historical reply fetch fields:

```bash
node "$SKILL_DIR/scripts/sync-quickmail-replies.js" --probe-api \
  > "$RUN_DIR/outputs/api-probe.json"
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

1. Inspect the live API when needed:

   ```bash
   curl -sS http://localhost:4200/api/people > "$RUN_DIR/outputs/people-api.json"
   ```

2. If the user provided a file path, run the script in dry-run mode with the requested `--days`.
3. Review the JSON report:
   - `matched` lists local people that would be or were marked `Replied`.
   - `unmatched` lists QuickMail replies that did not map to exactly one person.
   - `skipped` lists stale, non-reply, or undated events.
4. Apply only after the user asks for a write, with the web app running:

   ```bash
   node "$SKILL_DIR/scripts/sync-quickmail-replies.js" --days DAYS --source "$RUN_DIR/inputs/replies.csv" --api-base http://localhost:4200 --apply > "$RUN_DIR/outputs/apply.json"
   ```

5. After applying, confirm through the API:

   ```bash
   curl -sS "http://localhost:4200/api/people?status=Replied" > "$RUN_DIR/outputs/replied-readback.json"
   ```

## Output

For normal conversation, report:

1. Dry-run or applied mode.
2. Number of reply events read, matched, updated, already replied, skipped, and unmatched.
3. Any ambiguous or unmatched prospects that need review.
4. The exact apply command when the user has not yet approved a write.
