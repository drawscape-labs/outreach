# Hunter.io API Reference

Source: https://hunter.io/api-documentation/v2, checked 2026-06-26.

Base URL: `https://api.hunter.io/v2/`

Authentication: provide the key in `api_key`, `X-API-KEY`, or `Authorization: Bearer ...`. Use `X-API-KEY` in scripts so keys do not appear in URLs or shell history.

Response shape: successful responses return `data` and sometimes `meta`; errors return `errors`. Handle these common statuses: `400` bad parameters, `401` invalid key, `403` rate limit, `404` not found, `429` usage limit, `451` claimed/legally unavailable personal data, and `5xx` Hunter server errors.

Hunter's documented `test-api-key` validates parameters and returns dummy responses for Domain Search, Email Finder, and Email Verifier only.

## Domain Search

Endpoint: `GET /domain-search`

Use for company-wide email discovery and pattern/source review.

Key parameters:

- `domain` or `company` is required; prefer `domain`.
- `limit` defaults to `10`; maximum is `100`.
- `offset` paginates results.
- `type`: `personal` or `generic`.
- `seniority`: comma-delimited `junior`, `senior`, `executive`.
- `department`: comma-delimited `executive`, `it`, `finance`, `management`, `sales`, `legal`, `support`, `hr`, `marketing`, `communication`, `education`, `design`, `health`, `operations`.
- `required_field`: comma-delimited `full_name`, `position`, `phone_number`.
- `verification_status`: comma-delimited `valid`, `accept_all`, `unknown`.
- `job_titles`: comma-delimited title text.
- `location` filters require a POST request; use direct API handling if that is needed.

Useful response fields: `data.pattern`, `data.accept_all`, `data.emails[].value`, `type`, `confidence`, `sources[]`, `first_name`, `last_name`, `position`, `department`, `seniority`, `verification.status`.

Rate limit: 15 requests/second and 500 requests/minute.

## Email Finder

Endpoint: `GET /email-finder`

Use for one known person at one known company/domain.

Required:

- At least one of `domain`, `company`, or `linkedin_handle`.
- A name via `first_name` + `last_name` or `full_name`, unless `linkedin_handle` is provided.

Optional:

- `max_duration` from `3` to `20`; default is `10`.

Useful response fields: `data.email`, `data.score`, `data.accept_all`, `data.position`, `data.company`, `data.sources[]`, `data.verification.status`.

Notes: Hunter automatically verifies found emails. Possible verification statuses are `valid`, `accept_all`, and `unknown`. No credit is charged if no email is found.

Rate limit: 15 requests/second and 500 requests/minute.

## Email Verifier

Endpoint: `GET /email-verifier`

Use before QuickMail or database persistence.

Required:

- `email`.

Useful response fields: `data.status`, `data.score`, `data.regexp`, `data.gibberish`, `data.disposable`, `data.webmail`, `data.mx_records`, `data.smtp_server`, `data.smtp_check`, `data.accept_all`, `data.block`, `data.sources[]`.

Statuses: `valid`, `invalid`, `accept_all`, `webmail`, `disposable`, `unknown`.

If Hunter returns `202`, verification is still running; polling the same endpoint counts as the same request until completion.

Rate limit: 10 requests/second and 300 requests/minute.

## Enrichment

Use enrichment to add context after identity resolution, not to blindly import people.

### Person Enrichment

Endpoint: `GET /people/find`

Required:

- `email` or `linkedin_handle`; `linkedin_handle` takes precedence when both are supplied.

Optional:

- `clearbit_format`.

Useful response fields: `data.name`, `data.email`, `data.location`, `data.employment`, `data.linkedin.handle`, `data.indexedAt`, `data.activeAt`, `data.inactiveAt`.

Rate limit: 15 requests/second and 500 requests/minute.

### Company Enrichment

Endpoint: `GET /companies/find`

Required:

- `domain`.

Optional:

- `clearbit_format`.

Useful response fields: `data.name`, `data.legalName`, `data.domain`, `data.site.emailAddresses`, `data.category`, `data.description`, `data.geo`, `data.logo`, `data.linkedin.handle`, `data.metrics.employees`, `data.tech`, `data.parent`.

Rate limit: 15 requests/second and 500 requests/minute.

### Combined Enrichment

Endpoint: `GET /combined/find`

Required:

- `email`.

Optional:

- `clearbit_format`.

Useful response fields: `data.person` and `data.company` using the same shapes as person and company enrichment.

Rate limit: 15 requests/second and 500 requests/minute.

## Account Smoke Test

Endpoint: `GET /account`

Use only to confirm the real key loads and authenticates. This call is documented as free.

Useful response fields: `data.plan_name`, `data.reset_date`, `data.requests`.
