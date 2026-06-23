---
name: gmail-domain-cloudflare
description: Set up a new Gmail or Google Workspace domain by managing DNS records and web redirects in Cloudflare. Use when activating Gmail for a domain, replacing MX records with Google's Gmail MX record, adding Google verification TXT records, adding SPF/DKIM/DMARC records, redirecting a secondary domain to drawscape.io, or confirming DNS and redirect propagation for a Google Workspace domain.
---

# Gmail Domain Cloudflare

Use this skill to set up Gmail/Google Workspace DNS and default web redirects for a domain hosted in Cloudflare.

## Core Rules

- Make DNS changes through Cloudflare, using the repo-local Cloudflare access pattern.
- Before writing DNS records, read `.codex/skills/cloudflare-dns/SKILL.md` if its Cloudflare token/API helper is not already in context.
- Do not print Cloudflare API tokens or full zone/account IDs.
- Use the exact DNS values provided by Google Admin screenshots or setup pages. If Google-provided values differ from this skill, the Google-provided values win.
- For host values shown as "default value", `@`, or blank, use the zone apex, for example `drawscape.ink`.
- Query existing records before writes, avoid exact duplicates, then verify through both Cloudflare API and public DNS.

## First DNS Action: Gmail MX

For a new Gmail domain, the first required DNS action is to replace existing apex MX records with this Google Workspace MX record:

```json
{
  "type": "MX",
  "name": "<domain>",
  "content": "SMTP.GOOGLE.COM",
  "priority": 1,
  "ttl": 1,
  "comment": "Google Workspace Gmail activation MX"
}
```

Implementation notes:

- `name` is the domain apex, for example `drawscape.ink`.
- Cloudflare normalizes the target to `smtp.google.com`; treat that as equivalent to `SMTP.GOOGLE.COM`.
- `ttl: 1` means Auto in the Cloudflare API and matches Google's "lowest possible value" instruction.
- Delete all other apex MX records unless the user explicitly says to preserve an existing mail route.
- After the write, only `priority 1 smtp.google.com` should remain for the apex.
- Verify with `dig MX <domain> +short`, `dig @1.1.1.1 MX <domain> +short`, and `dig @8.8.8.8 MX <domain> +short`.

## Setup Workflow

1. Add or confirm the Gmail MX record first:
   - Find the Cloudflare zone for the domain.
   - List current apex MX records.
   - Delete non-Google apex MX records.
   - Create the Google MX record if it is missing.
   - Verify only the Google MX record remains.
2. Add Google domain/site verification when provided:
   - TXT record at the host Google provides.
   - For default host, use the domain apex.
   - Typical value shape: `google-site-verification=...`.
3. Add or merge SPF:
   - Gmail-only SPF value: `v=spf1 include:_spf.google.com ~all`.
   - A domain must have only one SPF TXT record at a given host.
   - If an SPF record already exists, merge `include:_spf.google.com` into it instead of creating a second SPF record.
4. Add or confirm starter DMARC:
   - Host: `_dmarc.<domain>`.
   - Value: `v=DMARC1; p=none; pct=100`.
   - TTL: Auto (`ttl: 1` in Cloudflare).
   - A domain must have only one DMARC TXT record at `_dmarc.<domain>`.
   - Use `p=none` for a new Gmail domain unless the user requests `quarantine` or `reject`.
   - Do not add `rua` or `ruf` reporting addresses unless the user provides a confirmed mailbox for reports.
5. Add DKIM only after Google Admin provides the selector and record value:
   - Do not invent DKIM selectors or keys.
   - Common host shape: `google._domainkey.<domain>`, but use the exact Google Admin value.
6. Configure the Cloudflare redirect to Drawscape:
   - Redirect the apex and `www` hostnames to `https://drawscape.io`.
   - Use Cloudflare Redirect Rules, not DNS forwarding.
   - Ensure each redirected hostname has a proxied DNS record so Cloudflare receives the HTTP request.
   - Preserve the incoming path and query string by default.
7. Run the validation checklist:
   - Query Cloudflare API for the exact records.
   - Query public DNS for MX, TXT, DKIM, DMARC, and proxied redirect hostnames that were changed.
   - Verify HTTP redirects with `curl -I`.
   - Report changed records, deleted records, redirect rule status, and any records still waiting on Google-provided values.

## Starter DMARC Record

Add this DMARC record during standard Gmail domain setup unless the user provides a different policy:

```json
{
  "type": "TXT",
  "name": "_dmarc.<domain>",
  "content": "v=DMARC1; p=none; pct=100",
  "ttl": 1,
  "comment": "Starter DMARC policy for Google Workspace"
}
```

Verification commands:

```sh
dig TXT _dmarc.<domain> +short
dig @1.1.1.1 TXT _dmarc.<domain> +short
dig @8.8.8.8 TXT _dmarc.<domain> +short
```

## Redirect to Drawscape

For secondary domains such as `drawscape.ink`, set up a Cloudflare Redirect Rule so web traffic forwards to `https://drawscape.io`.

### DNS Prerequisite

Cloudflare Redirect Rules require the incoming hostname to be proxied by Cloudflare. If the domain has no real web origin, create proxied placeholder records:

```json
[
  {
    "type": "A",
    "name": "<domain>",
    "content": "192.0.2.1",
    "ttl": 1,
    "proxied": true,
    "comment": "Placeholder origin for Cloudflare redirect"
  },
  {
    "type": "A",
    "name": "www",
    "content": "192.0.2.1",
    "ttl": 1,
    "proxied": true,
    "comment": "Placeholder origin for Cloudflare redirect"
  }
]
```

Rules:

- Do not overwrite a real website origin without explicit user confirmation.
- `192.0.2.1` is a reserved documentation address and is safe as a proxied placeholder.
- If a usable proxied `A`, `AAAA`, or `CNAME` record already exists for the hostname, reuse it instead of creating a duplicate placeholder.

### Redirect Rule

Create or update the zone-level Redirect Rules entry point for the `http_request_dynamic_redirect` phase. Preserve existing redirect rules.

API endpoint:

```txt
PUT /zones/<zone_id>/rulesets/phases/http_request_dynamic_redirect/entrypoint
```

If the entrypoint does not exist, this `PUT` creates it. If it already exists, read the current entrypoint first, preserve unrelated rules, remove any stale redirect rule for the same domain, then write the full rules array back with the replacement rule.

Default rule:

```json
{
  "description": "Redirect domain to drawscape.io",
  "expression": "(http.host eq \"<domain>\" or http.host eq \"www.<domain>\")",
  "action": "redirect",
  "action_parameters": {
    "from_value": {
      "target_url": {
        "expression": "concat(\"https://drawscape.io\", http.request.uri.path)"
      },
      "status_code": 301,
      "preserve_query_string": true
    }
  },
  "enabled": true
}
```

Verification commands:

```sh
dig <domain> +short
dig www.<domain> +short
curl -I http://<domain>/test-path?codex=1
curl -I https://<domain>/test-path?codex=1
curl -I http://www.<domain>/test-path?codex=1
curl -I https://www.<domain>/test-path?codex=1
```

Expected HTTP result:

- Status: `301`
- `Location`: `https://drawscape.io/test-path?codex=1`

Known-good result for `drawscape.ink` on 2026-06-23:

- Created `http_request_dynamic_redirect` entrypoint with one rule.
- Rule expression: `(http.host eq "drawscape.ink" or http.host eq "www.drawscape.ink")`.
- All four curl variants returned `301` to `https://drawscape.io/test-path?codex=1`.

## Validation Checklist

Run this checklist after setup or when auditing an existing Gmail domain.

### Zone and Nameservers

- Cloudflare zone exists and is active.
- Public NS records point at the Cloudflare nameservers shown on the zone.
- Cloudflare API calls use the repo-local token loading pattern from `.codex/skills/cloudflare-dns/SKILL.md`.

Commands:

```sh
dig NS <domain> +short
```

### Gmail MX

- Exactly one apex MX record remains unless the user explicitly preserved another mail route.
- The remaining MX is `priority 1 smtp.google.com`.
- Cloudflare API and public DNS agree.

Commands:

```sh
dig MX <domain> +short
dig @1.1.1.1 MX <domain> +short
dig @8.8.8.8 MX <domain> +short
```

### Google Verification TXT

- If Google provided a verification TXT, it exists at the exact host Google specified.
- For default host, the record is at the domain apex.
- Do not remove unrelated TXT records such as SPF, DKIM, or verification records.

Commands:

```sh
dig TXT <verification-host> +short
```

### SPF

- There is exactly one SPF TXT record at the sending host.
- For Gmail-only sending, it includes `include:_spf.google.com`.
- Do not create a second SPF record; merge into the existing SPF record when needed.

Commands:

```sh
dig TXT <domain> +short
```

### DMARC

- There is exactly one TXT record at `_dmarc.<domain>`.
- New Gmail domains use the starter policy unless the user requested stricter enforcement: `v=DMARC1; p=none; pct=100`.
- Do not include `rua` or `ruf` unless the report mailbox is confirmed.

Commands:

```sh
dig TXT _dmarc.<domain> +short
dig @1.1.1.1 TXT _dmarc.<domain> +short
dig @8.8.8.8 TXT _dmarc.<domain> +short
```

### DKIM

- Google Admin has provided a DKIM selector and TXT value.
- The DKIM host exists exactly as Google provided; for the default Google selector this is usually `google._domainkey.<domain>`.
- The TXT value starts with `v=DKIM1; k=rsa; p=`.
- The public `p=` key decodes as base64.
- Cloudflare API and public DNS return the exact DKIM value. Long TXT records may be split into quoted chunks by `dig`; join chunks before comparing.
- After DNS is visible, the user must click **Start authentication** in Google Admin.

Commands:

```sh
dig TXT <selector>._domainkey.<domain> +short
dig @1.1.1.1 TXT <selector>._domainkey.<domain> +short
dig @8.8.8.8 TXT <selector>._domainkey.<domain> +short
```

### Redirect to Drawscape

- Apex and `www` hostnames have proxied DNS records so Cloudflare can receive HTTP requests.
- Redirect Rule exists in the `http_request_dynamic_redirect` phase.
- Redirect target is `https://drawscape.io`.
- Path and query string are preserved.

Commands:

```sh
dig <domain> +short
dig www.<domain> +short
curl -I http://<domain>/test-path?codex=1
curl -I https://<domain>/test-path?codex=1
curl -I http://www.<domain>/test-path?codex=1
curl -I https://www.<domain>/test-path?codex=1
```

Expected redirect:

- Status: `301`
- `Location`: `https://drawscape.io/test-path?codex=1`

### Final Report

Report each item as `pass`, `fixed`, `missing`, or `blocked`:

- Cloudflare zone and nameservers
- MX
- Google verification TXT
- SPF
- DMARC
- DKIM
- Redirect DNS records
- Redirect Rule
- Google Admin action still needed

## Output

When the user asks to set up a domain, return:

- The domain.
- MX status first, including whether old MX records were removed.
- Verification TXT/SPF/DKIM/DMARC status.
- Redirect status, including proxied hostname records and target `https://drawscape.io`.
- Any Google Admin step the user still needs to click, such as "Verify domain" or "Activate Gmail".
