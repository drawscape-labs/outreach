# Company Enrichment Record Schema

Use the active project schema when available. When no schema is available, use this canonical shape.

For Drawscape Outreach, the active schema intentionally omits source/evidence columns. Do not persist source URLs, evidence arrays, or source-only prose into the database or `notes` unless the user explicitly asks for that data.
Drawscape Outreach uses `companies.date_enriched` for the company enrichment date when writing enriched company records.
Drawscape Outreach company writes must go through the web app API, not direct SQLite. Use `scripts/upsert-company-api.js` from this skill; add API functionality before falling back to database access.

## Canonical JSON

```json
{
  "input": {
    "raw": null,
    "type": "name|domain|linkedin_url|url|partial_record"
  },
  "identity": {
    "name": null,
    "legal_name": null,
    "aliases": [],
    "description": null,
    "status": "active|acquired|merged|closed|unknown",
    "confidence": "high|medium|low|unknown"
  },
  "web": {
    "website_url": null,
    "domain": null,
    "linkedin_url": null,
    "logo_url": null,
    "social_urls": []
  },
  "classification": {
    "industries": [],
    "categories": [],
    "tags": [],
    "business_model": "b2b|b2c|b2b2c|marketplace|nonprofit|government|unknown",
    "priority": "high|medium|low|unknown"
  },
  "location": {
    "headquarters": {
      "street": null,
      "city": null,
      "region": null,
      "postal_code": null,
      "country": null,
      "country_code": null
    },
    "other_locations": []
  },
  "company_details": {
    "founded_year": null,
    "employee_count": null,
    "employee_count_range": null,
    "revenue_range": null,
    "ownership": "private|public|subsidiary|nonprofit|government|unknown",
    "stock_ticker": null,
    "parent_company": null
  },
  "people": {
    "founders": [],
    "executives": []
  },
  "funding": {
    "total_funding": null,
    "currency": null,
    "last_round_type": null,
    "last_round_date": null,
    "investors": []
  },
  "metadata": {
    "last_enriched_at": null,
    "record_confidence": "high|medium|low|unknown",
    "unknown_fields": [],
    "review_notes": []
  },
  "evidence": []
}
```

## Evidence Shape

Use one evidence entry per source or per field when the target schema supports it:

```json
{
  "field": "identity.name",
  "value": "Example Co",
  "source_name": "Example Co About",
  "url": "https://example.com/about",
  "source_type": "official|filing|registry|platform|secondary|snippet",
  "observed_at": "YYYY-MM-DD",
  "confidence": "high|medium|low"
}
```

## Normalization

- `identity.name`: use the casual public brand/display name. Prefer the shortest name a human would naturally use in the CRM when the official site, logo, domain, or LinkedIn profile supports it.
- Strip legal suffixes and generic service descriptors from `identity.name` when they are filler rather than the brand: `Inc.`, `LLC`, `Ltd.`, `Company`, `Group`, `Aircraft Sales`, `Sales & Acquisitions`, `Aircraft Sales & Acquisitions`, `Aircraft Sales and Brokerage`, `Brokerage`, `Aviation Services`, `Yacht Sales`, `Auto Group`, `Dealership`.
- Preserve descriptors that are part of the actual brand or needed for disambiguation. Do not reduce a name to a generic word when the shorter brand is not clearly supported by evidence.
- Put the full legal, SEO, or directory name in `identity.legal_name`, `identity.aliases`, or evidence when supported.
- Example: `Altivation Aircraft Sales & Acquisitions` maps to `identity.name: "Altivation"` and an alias or evidence value containing the full source name.
- `domain`: registrable domain only, lowercased, without protocol, path, or `www`. Treat this as the logical primary key for company records; it must be unique and non-null.
- `website_url`: canonical HTTPS URL when available.
- `linkedin_url`: normalized LinkedIn company page URL, not a personal profile. In the Drawscape Outreach `companies` table this maps to `linkedin_company_url`, which must be unique.
- `social_urls`: array of objects with `platform` and `url` if the schema allows objects; otherwise array of URLs.
- `industries`, `categories`, `tags`: lowercase slugs unless the project uses title-cased labels.
- `priority`: for Drawscape Outreach, map top-level `priority` or `classification.priority` to `companies.priority`. Use only `high`, `medium`, or `low`; omit unknown priority rather than writing a placeholder value.
- `country_code`: ISO 3166-1 alpha-2.
- `founded_year`: integer year only.
- `employee_count`: concrete integer total headcount only when a source reports one. Use evidence confidence to distinguish official counts from secondary/platform estimates.
- `employee_count_range`: use when only a range is available, such as `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001-10000`, `10001+`.
- Do not convert employee ranges into midpoint guesses. For branches, dealerships, subsidiaries, franchises, and local offices, avoid using parent-company headcount unless the parent is the target entity.
- `revenue_range`: preserve the project's enum when available; otherwise use a conservative range string and low confidence.
- `stock_ticker`: include exchange when known, such as `NASDAQ:ABCD`.
- `date_enriched`, `last_enriched_at`, and `observed_at`: use `YYYY-MM-DD`.

## Completeness Checklist

Aim to fill these high-value fields when evidence exists:

- canonical name
- legal name or best available public name
- domain and canonical website URL
- LinkedIn company URL
- short company description
- industry/category tags
- headquarters city, region, and country
- founded year
- total employee headcount or employee range
- ownership/status
- parent company or acquisition status
- founders and current chief executive
- evidence and confidence

Leave fields null or empty when not supported by evidence. Do not substitute prose like "not available" inside data fields unless the project schema requires strings.

## Drawscape Outreach Priority Rules

For Drawscape Outreach, company `priority` is a fit score with values `high`, `medium`, or `low`.

- Use `high` for yacht brokers with current evidence of sailboat, sailing yacht, sail catamaran, or sail-focused brokerage/listing presence.
- Use `low` for yacht brokers only when evidence shows they are strictly a superyacht broker and do not sell or broker sailboats, sailing yachts, powerboats, motor yachts, or other non-superyacht boats.
- Use `medium` for yacht brokers that sell or broker powerboats/motor yachts but have no verified sailboat presence.
- Use `medium` when a yacht broker is described only generically and the evidence does not prove the sailboat/high-priority or strict-superyacht/low-priority case.
- Preserve a user-provided priority unless current evidence clearly contradicts it; note the reason when changing priority during enrichment.

## Company Upsert Rules

For database writes:

- Use the web app API for lookup and writes: `GET /api/companies?domain=...`, `GET /api/companies?linkedin_company_url=...`, `POST /api/companies`, and `PATCH /api/companies/:id`.
- Use normalized `domain` as the primary match key.
- Use normalized `linkedin_company_url` as the secondary unique match key.
- Update an existing row when either key matches the same company.
- Stop for human review when the domain matches one company and the LinkedIn company URL matches another.
- Do not insert a company record without both a unique domain and a unique LinkedIn company URL when the target schema requires both.
