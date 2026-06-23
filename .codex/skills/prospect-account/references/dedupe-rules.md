# Dedupe Rules

Use exact keys for writes and fuzzy matches only for review warnings.

## Company Dedupe

Order:

1. Exact normalized `domain`.
2. Exact canonical `linkedin_company_url`.
3. Fuzzy company name plus matching location/industry as `needs_review`.

Outcomes:

- Same row by domain and LinkedIn URL: update missing fields only.
- Domain matches one row and LinkedIn URL matches another row: conflict, do not write.
- Fuzzy name match only: show possible duplicate, do not auto-merge.

## Person Dedupe

Order:

1. Exact canonical `linkedin_profile_url`.
2. Exact `profile_key`.
3. Exact email.
4. Fuzzy name plus same company or same title as `needs_review`.

Outcomes:

- Exact profile match: update missing fields only; do not reset `status`.
- Email match with different LinkedIn URL: conflict unless there is strong evidence it is the same person.
- Name match only: review, never auto-merge.

## Position Dedupe

Order:

1. Same company, same person, normalized title, same `start_date` or both start dates unknown.
2. Same company and person with similar title as `needs_review`.

Rules:

- Do not create duplicate current positions with the same title.
- If a person has a former role and a current role at the same company, keep both only when dates or evidence distinguish them.

## Confidence Gate

Default import gate:

- Import: `high`, `medium`.
- Dry-run only: `low`, `unknown`, `needs_review`.

The user can explicitly override the gate, but the final response must list low-confidence records that were imported.
