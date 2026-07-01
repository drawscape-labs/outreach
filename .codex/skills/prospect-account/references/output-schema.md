# Output Schema

Use this JSON shape for prospect artifacts and import scripts. Set `mode` to `"apply"` for the default import flow and `"dry-run"` only when the user explicitly asks to review without writing.

```json
{
  "mode": "apply",
  "input": {
    "company_name": "Hinckley Yachts",
    "domain": "hinckleyyachts.com",
    "linkedin_company_url": "https://www.linkedin.com/company/hinckley-yachts/",
    "target_titles": ["Yacht Broker", "Sales Director"]
  },
  "company": {
    "name": "Hinckley Yachts",
    "domain": "hinckleyyachts.com",
    "website_url": "https://www.hinckleyyachts.com",
    "linkedin_company_url": "https://www.linkedin.com/company/hinckley-yachts",
    "description": "Hinckley Yachts builds, sells, and services premium yachts.",
    "category": "yacht",
    "industry": "Yacht sales and service",
    "location": "Southwest Harbor, Maine",
    "confidence": "high",
    "evidence": [
      {
        "url": "https://www.hinckleyyachts.com",
        "label": "Company website",
        "note": "Brand and domain match."
      }
    ]
  },
  "people": [
    {
      "name": "Jane Smith",
      "linkedin_profile_url": "https://www.linkedin.com/in/jane-smith",
      "profile_key": "in/jane-smith",
      "email": null,
      "phone_number": null,
      "qualified": true,
      "confidence": "medium",
      "match_reason": "Search result and company page indicate current sales role.",
      "evidence": [
        {
          "url": "https://example.com/team/jane-smith",
          "label": "Team page",
          "note": "Lists Jane Smith as Yacht Broker."
        }
      ],
      "positions": [
        {
          "company_domain": "hinckleyyachts.com",
          "title": "Yacht Broker",
          "department": "Sales",
          "seniority": null,
          "start_date": null,
          "end_date": null,
          "is_current": true,
          "confidence": "medium",
          "evidence": []
        }
      ]
    }
  ],
  "skipped": [
    {
      "name": "Unverified Candidate",
      "reason": "No stable profile URL or company evidence."
    }
  ],
  "assumptions": [],
  "conflicts": []
}
```

## Required For Import

Company:

- `name`
- `domain`
- `linkedin_company_url`

Person:

- `name`
- `linkedin_profile_url` or a website-confirmed `email`
- `linkedin_profile_url` should be the public canonical LinkedIn `/in/` or `/pub/` URL when found; use `null` only after searching public sources.
- `email` should be an exact public work email directly observed for that person; use `null` when only a company pattern, generic inbox, or unverified guess is available.
- `phone_number` only when it is a personal/direct number for that person; otherwise use `null`

Position:

- `title`

The scripts derive `profile_key` from `linkedin_profile_url` when possible. If no LinkedIn URL is available and the company website confirms the person's name, position, and public work email, the scripts derive `profile_key` as `email/<normalized-email>`.

Include evidence notes for LinkedIn and email search outcomes. For example, cite the staff page or `mailto:` source that directly shows the email, and cite the public search result or public profile page that supports the LinkedIn URL. Do not include or save pattern-derived email guesses.

Do not put office, main, location, department, service, sales desk, fax, or other shared numbers in `phone_number`.

## Evidence

Evidence is for review and confidence only. The current app schema does not store evidence URLs, source snippets, or confidence.
