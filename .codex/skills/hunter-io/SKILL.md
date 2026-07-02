---
name: hunter-io
description: Use the Hunter.io API for Drawscape Outreach prospecting. Use when the user asks to run Hunter domain search, find a likely work email, verify email deliverability, enrich a person/company/email, smoke test the Hunter key, or prepare Hunter-backed evidence before QuickMail outreach or API-backed email updates.
---

# Hunter.io

Use Hunter.io as a secondary prospecting and verification source for Drawscape Outreach.

## Defaults

- Load credentials from `HUNTER_API_KEY` in `.env` or the process environment.
- Prefer `scripts/hunter-api.js` for API calls; it sends the key in the `X-API-KEY` header and does not print secrets.
- Default to research-only. Do not write Hunter results into the app database/API unless the user explicitly asks to save/update records.
- Work with professional emails only. Reject webmail, disposable, consumer, or role emails for person outreach unless the user explicitly asks for generic contact discovery.
- Treat Hunter as secondary evidence. For database updates, preserve the `$find-person-email` rule: save only exact work emails after explicit approval, and prefer direct public source evidence when available.
- Honor Hunter 451 `claimed_email` responses: do not process, store, or retry that person/email.
- Do not scrape logged-in LinkedIn pages or use Hunter LinkedIn handles to bypass access controls.

## Working Directory

- Put generated Hunter files under `.codex/tmp/hunter-io/<domain-person-or-run>/`.
- Use relevant subfolders such as `inputs/`, `outputs/`, `logs/`, `evidence/`, and `scratch/` for request payloads, raw API responses, summaries, verification reports, and saved evidence.
- Do not write Hunter exports, API responses, evidence reports, or scratch files to `data/`, `/private/tmp`, or a root-level `tmp/` directory.

## Required References

- Read `references/api-reference.md` before constructing direct API calls, debugging endpoint failures, or interpreting limits/statuses.
- Read `references/examples.md` when the user wants saved examples, reusable commands, or a smoke-test command.

## Common Commands

Run commands from the repository root:

```bash
node .codex/skills/hunter-io/scripts/hunter-api.js account --summary
node .codex/skills/hunter-io/scripts/hunter-api.js domain-search --domain example.com --department sales --type personal --limit 10 --summary
node .codex/skills/hunter-io/scripts/hunter-api.js email-finder --domain example.com --first-name Jane --last-name Doe --summary
node .codex/skills/hunter-io/scripts/hunter-api.js email-verifier --email jane@example.com --summary
node .codex/skills/hunter-io/scripts/hunter-api.js enrich-company --domain example.com --summary
```

Use `--test-key` for Hunter's documented dummy responses on Domain Search, Email Finder, and Email Verifier:

```bash
node .codex/skills/hunter-io/scripts/hunter-api.js domain-search --domain hunter.io --test-key --summary
```

## Workflow

1. Resolve the target:
   - Use company domain over company name whenever possible.
   - Normalize person names into `first_name` and `last_name`; use `full_name` only when splitting is ambiguous.
   - Keep LinkedIn handles as optional identity hints, not as proof of current employment.
2. Choose the endpoint:
   - Use `domain-search` to discover known emails at a company. For Drawscape prospecting, start with `--type personal --department sales --required-field full_name,position`.
   - Use `email-finder` for a specific person at a known domain.
   - Use `email-verifier` before adding an email to QuickMail or saving a Hunter-found candidate.
   - Use `enrich-company`, `enrich-person`, or `enrich-combined` to fill profile/company context, not as a substitute for identity review.
3. Interpret conservatively:
   - Prefer `verification.status=valid`; treat `accept_all` and `unknown` as review states.
   - Report Hunter `score`, `confidence`, verification status, source count, and the most relevant source URLs.
   - If Hunter returns a candidate without sources, say that clearly.
4. Cross-check before persistence:
   - Compare Hunter company/title/domain data with the live SQLite person/company record.
   - If the user asks to save an email, dry-run the existing email update script first where applicable.
   - Never overwrite an existing email without explicit approval.

## Output

Return a compact result with:

1. Endpoint and status.
2. Candidate email or enriched entity, if any.
3. Hunter score/confidence and verification status.
4. Source URLs or source count.
5. Recommendation: `ready_to_review`, `verify_first`, `needs_direct_evidence`, `do_not_use`, or `not_found`.
