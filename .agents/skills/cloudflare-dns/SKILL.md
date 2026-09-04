---
name: cloudflare-dns
description: Inspect or update Cloudflare DNS records from this repository. Use when the user asks to list accessible zones, test the configured Cloudflare credential, add or update DNS records, or confirm DNS changes.
compatibility: Requires internet access, Node.js 20+, and a Cloudflare API credential in the repository-root .env file.
---

# Cloudflare DNS

Use this skill for Cloudflare DNS work configured by this repository.

## Core Rules

- Load the Cloudflare credential from `.env`; this repo currently uses `CLOUDFLARE_API_KEY`.
- Do not print the credential value.
- Treat DNS writes as production-impacting. Create, update, or delete records only when the user explicitly asks for that DNS change or asks for a write smoke test.
- Redact zone, account, and record IDs in user-facing output unless the exact ID is needed for follow-up work.
- Prefer idempotent changes: query existing records first, skip exact duplicates, then create or update.
- Always verify after a write by querying the exact `type`, `name`, and `content` or target.

## Working Directory

- Put any generated local files under `.agent-runs/cloudflare-dns/<zone-or-run>/`.
- Use relevant subfolders such as `inputs/`, `outputs/`, `logs/`, `evidence/`, and `scratch/` for payloads, before/after snapshots, DNS query output, curl logs, and verification reports.
- Do not write generated files to `data/`, `/private/tmp`, or a root-level `tmp/` directory.

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

const token = env.CLOUDFLARE_API_KEY;
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

For screenshots or prompts that say "Host: default value" or "Host: @", use the zone apex as the record name, for example `example.com`.

Typical Google verification TXT shape:

```json
{
  "type": "TXT",
  "name": "example.com",
  "content": "google-site-verification=...",
  "ttl": 1,
  "proxied": false,
  "comment": "Google site verification"
}
```

## Smoke Test

When the user asks to test whether DNS edits work:

1. List accessible zones.
2. For each target zone, create a temporary TXT record named `_agent-smoke-<timestamp-random>.<zone>`.
3. Delete the temporary record immediately.
4. Query the exact temporary name afterward and confirm `records_found: 0`.
5. If cleanup fails, report the leftover name and redacted record ID clearly.
