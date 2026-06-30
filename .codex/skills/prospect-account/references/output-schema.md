# Output Schema

Use this JSON shape for dry-run files and import scripts.

```json
{
  "mode": "dry-run",
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

Position:

- `title`

The scripts derive `profile_key` from `linkedin_profile_url` when possible. If no LinkedIn URL is available and the company website confirms the person's name, position, and public work email, the scripts derive `profile_key` as `email/<normalized-email>`.

## Evidence

Evidence is for review and confidence only. The current SQLite schema does not store evidence URLs, source snippets, or confidence.
