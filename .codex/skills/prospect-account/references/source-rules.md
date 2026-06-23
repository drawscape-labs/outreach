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
- If profile details are inaccessible, write `unknown` or `needs_review` rather than guessing.

## Confidence

- `high`: primary source confirms the field, or multiple reputable independent sources agree.
- `medium`: strong public search result snippet or reputable secondary source confirms the field.
- `low`: weak source, stale source, or inference from indirect evidence.
- `unknown`: no usable evidence.
- `needs_review`: plausible match with ambiguity, conflict, or insufficient identity certainty.

## Evidence Notes

For dry-run reports, include short evidence objects with:

- `url`
- `label`
- `note`

Avoid long copied text. Summarize what the source supports.
