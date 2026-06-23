---
name: cloudflare-dns
description: Inspect or update Drawscape Cloudflare DNS records from this repo. Use when the user asks to list accessible Cloudflare zones, smoke test the local Cloudflare key, add verification TXT/CNAME records, update DNS records, or confirm DNS changes for domains such as drawscape.ink.
---

# Cloudflare DNS

Use this skill for Cloudflare DNS work in the Drawscape Outreach repo.

## Core Rules

- Load the Cloudflare credential from `.env`; this repo currently uses `CLOUDFLARE_API_KEY`.
- Also check `CLOUDFARE_API_KEY` because older Drawscape instructions used that misspelled name. Do not print either value.
- Treat DNS writes as production-impacting. Create, update, or delete records only when the user explicitly asks for that DNS change or asks for a write smoke test.
- Redact zone, account, and record IDs in user-facing output unless the exact ID is needed for follow-up work.
- Prefer idempotent changes: query existing records first, skip exact duplicates, then create or update.
- Always verify after a write by querying the exact `type`, `name`, and `content` or target.

## Known Access

As of 2026-06-23, the repo `.env` token under `CLOUDFLARE_API_KEY` could:

- list the `drawscape.ink` zone
- create and delete TXT records in `drawscape.ink`

The same credential returned `401 Invalid API Token` from `/user/tokens/verify`, so prefer practical zone/DNS endpoint checks over relying on token verification alone.

## Node API Pattern

Run Cloudflare snippets from the repo root so `.env` is available:

```js
import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[match[1]] = value;
}

const token = env.CLOUDFARE_API_KEY || env.CLOUDFLARE_API_KEY;
if (!token) throw new Error("No Cloudflare token found in .env");

const API = "https://api.cloudflare.com/client/v4";
const short = (id) => id ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;

async function cf(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }
  return { status: res.status, ok: res.ok && data.success !== false, data };
}
```

## Workflow

1. Identify the zone:
   - Query `/zones?name=<zone>&per_page=50`.
   - Stop if no matching zone is returned.
2. Inspect existing records:
   - Query by `type` and `name` before writing.
   - If an exact record already exists, report `already_exists` and do not create a duplicate.
3. Write the record:
   - TXT records must use `proxied: false`.
   - For Cloudflare API TTL, `ttl: 1` means Auto. Use it when a verifier asks for the lowest/default TTL unless the user gives a specific TTL.
   - Do not infer `proxied: true` for A, AAAA, or CNAME records; use the value provided by the user or preserve the existing value on updates.
4. Verify:
   - Query the record again by exact `type`, `name`, and expected `content`.
   - Report the action, redacted record ID, TTL, proxied state, and modified timestamp.

## Adding Verification Records

For screenshots or prompts that say "Host: default value" or "Host: @", use the zone apex as the record name, for example `drawscape.ink`.

Typical Google verification TXT shape:

```json
{
  "type": "TXT",
  "name": "drawscape.ink",
  "content": "google-site-verification=...",
  "ttl": 1,
  "proxied": false,
  "comment": "Google site verification"
}
```

## Smoke Test

When the user asks to test whether DNS edits work:

1. List accessible zones.
2. For each target zone, create a temporary TXT record named `_codex-smoke-<timestamp-random>.<zone>`.
3. Delete the temporary record immediately.
4. Query the exact temporary name afterward and confirm `records_found: 0`.
5. If cleanup fails, report the leftover name and redacted record ID clearly.
