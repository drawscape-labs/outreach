# Source Rules

Use current sources; company staff and titles change frequently.

## Source Priority

1. Company website pages and structured metadata.
2. Public team, broker, sales, location, staff, contact, news, or press pages.
3. Official social profiles and public search result snippets.
4. Reputable secondary sources such as manufacturer/dealer directories, industry associations, conference speaker pages, and local business profiles.
5. Weak secondary sources only as discovery leads, not final proof.

## LinkedIn Boundary

- Do not automate logged-in LinkedIn browsing.
- Do not bypass login, anti-bot controls, paywalls, or member-only pages.
- Do not use unofficial LinkedIn scraping APIs unless the user explicitly provides and approves a compliant data source.
- It is acceptable to record a canonical LinkedIn profile URL found from public search results or public pages.
- Search for public LinkedIn profile URLs during candidate discovery using the person's name, company, title, location, and company domain.
- Store only identity-aligned public profile URLs. If a URL could belong to multiple people with the same name, keep it out of the import and mark the identity `needs_review`.
- If profile details are inaccessible, write `unknown` or `needs_review` rather than guessing.

## Email Search

- Use the `$find-person-email` rules while prospecting: work emails only, company website first, exact public evidence only, no personal emails, no pattern-only guesses.
- Check visible staff/team/broker pages, `mailto:` links, contact buttons, vCards, page source, public PDFs, manufacturer directories, industry associations, and reputable public profiles for the person's exact work email.
- Store `email` only when the exact address is directly associated with the named person.
- If only a coworker pattern or domain format is observed, keep `email` null and note the pattern as evidence or an assumption. Do not create `first.last@domain` style guesses.
- Treat generic addresses such as `sales@`, `info@`, `brokerage@`, `office@`, or location inboxes as company contact evidence only; do not store them on a person.

## Confidence

- `high`: primary source confirms the field, or multiple reputable independent sources agree.
- `medium`: strong public search result snippet or reputable secondary source confirms the field.
- `low`: weak source, stale source, or inference from indirect evidence.
- `unknown`: no usable evidence.
- `needs_review`: plausible match with ambiguity, conflict, or insufficient identity certainty.

## Email-Only People

- Import without LinkedIn only when a primary company-controlled source, such as a staff/team/broker page, confirms the person's name, current position, and public work email together.
- Assign `high` when the company site shows all three fields in the same staff card or clearly associated page section.
- Assign `medium` when the company site confirms the role and email but the association requires light page-structure interpretation.
- Keep as `needs_review` when the email is pattern-derived, appears only in page source without a visible/current role, or comes only from a third-party directory.

## Phone Numbers

- Store `phone_number` only when it is clearly personal/direct for the named person, such as a staff-card number, broker profile number, vCard number, `tel:` link adjacent to the person's name, or a number explicitly labeled direct, mobile, or cell.
- Do not store office, main, location, department, receptionist, service, sales desk, fax, after-hours, or other shared numbers.
- If the same number appears broadly across multiple staff, a footer/contact page, or a location page, treat it as shared and leave `phone_number` null.
- If the association between the person and number is unclear, leave `phone_number` null and mention the ambiguity in evidence or assumptions when useful.

## Evidence Notes

For prospect artifacts, include short evidence objects with:

- `url`
- `label`
- `note`

Avoid long copied text. Summarize what the source supports.
