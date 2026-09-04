# QuickMail Reply Sources

## Current API Reality

QuickMail API v2 is GraphQL at `https://api.quickmail.com/v2/graphql` and uses the raw API key in the `Authorization` header. The public docs list `lead` and `leads` queries plus campaign stats, including aggregate `replies`, `repliesPositive`, and `repliesNegative`.

As of 2026-06-24, authenticated schema introspection for this workspace showed no query or `Lead` field that returns per-lead reply events or reply timestamps. Do not claim direct "fetch all replied prospects in the last X days" is available from QuickMail v2 unless a fresh probe or updated docs show a reply-level feed.

The same probe showed:

- `Campaign` exposes `leadStatus`, `stats`, `steps`, and identity fields, but not `leads`.
- `Lead` exposes identity/profile fields, `tags`, and `customProperties`, but not `campaigns`, `journeys`, `status`, `repliedAt`, or campaign membership.
- `campaign.leadStatus` can confirm aggregate campaign counts (`active`, `available`, `completed`, `failed`, `total`), but not which specific lead is in which status.
- `campaign.stats(dayRange, attributionType)` can confirm aggregate sends/replies, but not the replying lead identities.
- `lead(id)` and `leads(text:)` can confirm that a QuickMail lead exists and can retrieve its id/email/name/tags.
- In this workspace, querying `Lead.customProperties` returned a QuickMail 500 for tested leads; avoid depending on it for status sync.

Useful docs:

- `https://api.quickmail.com/help`
- `https://api.quickmail.com/v2/graphiql`

## Practical Sources

Use one of these sources for historical or incremental syncs:

- QuickMail/Zapier "New Reply" trigger output saved as JSON, NDJSON, CSV, or posted to a local webhook capture.
- QuickMail native webhook output, if configured in the account.
- A manual QuickMail Opportunities/replies export, if it includes prospect email or QuickMail lead id plus a reply/event date.

Zapier and older QuickMail integration docs mention reply triggers and a `first_time` field. The sync script does not require `first_time`; it can safely mark the same local person `Replied` more than once because the SQLite update is idempotent.

## Mapping Rules

The local database maps QuickMail to local people through:

1. `people.quickmail_lead_id` equals the event lead/prospect id.
2. `lower(people.email)` equals the event prospect email.

If neither key maps to exactly one row, leave the person unchanged and report the event as unmatched.
