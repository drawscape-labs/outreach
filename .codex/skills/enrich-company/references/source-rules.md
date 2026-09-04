# Company Enrichment Source Rules

## Source Priority

Use the strongest available source for each field:

1. Company-owned sources: official website, about page, careers page, press room, terms/privacy pages, investor relations, blog, official social profiles.
2. Public filings and registries: SEC/EDGAR, Companies House, state/country business registries, trademark databases, nonprofit registries.
3. Platform profiles: LinkedIn company profile, GitHub org, app marketplaces, Shopify/store pages, verified social profiles.
4. Reputable secondary sources: Crunchbase, PitchBook, BuiltWith, G2, Capterra, Wellfound, Wikipedia/Wikidata, news coverage, industry directories.
5. Search snippets and aggregators: use only as hints unless no better source exists.

Do not use random lead-list clones, scraped contact pages, or SEO spam pages as authoritative evidence.

## Required Source Behavior

- Browse or query current connected sources for every enrichment task because company facts change.
- Cite sources in the final answer when responding conversationally.
- Store field-level source URLs when the output schema supports evidence metadata.
- Use direct URLs for evidence, not only search result pages.
- Respect robots, authentication, paywalls, and platform access boundaries. Do not bypass LinkedIn login walls or scraping protections.
- Do not use the Hunter API or Hunter-derived company metrics for company enrichment.

## Entity Resolution

Strong identity signals:

- Exact domain match from the official site or verified profile.
- LinkedIn profile linked from the official site, or official site linked from LinkedIn.
- Legal name, display name, logo, and description alignment.
- Headquarters and industry alignment.
- Parent/subsidiary references that explain naming differences.

Weak identity signals:

- Same or similar company name only.
- Same city only.
- Similar logo colors or broad industry category.
- Search result title without supporting page content.

When a name maps to multiple plausible companies, ask for a domain, location, industry, or LinkedIn URL before producing a final record.

## Conflict Handling

- Prefer primary, current, and field-specific evidence over broad profile pages.
- If official sources conflict, use the newest dated source and record the conflict.
- If a company has rebranded, store the current brand as `name` and old names as aliases when supported.
- If an acquisition changed the legal entity or parent, record parent/acquired status separately from the brand identity.
- If only stale data exists, include the value with low confidence or leave it unknown, depending on target schema requirements.

## Freshness

Treat these fields as volatile and verify recently:

- employee count
- leadership
- funding
- revenue
- headquarters
- status, acquisition, shutdown, or rebrand
- website redirects and LinkedIn URLs

Stable fields still need evidence, but may be accepted from older sources:

- founding year
- founders
- historical legal names
- original location

## Headcount Research

- Treat `headcount`, `total employees`, `employee count`, `team size`, and `company size` as the same enrichment target.
- Prefer source-reported total employee counts in this order: official company pages or press kits, public filings/registries, official investor relations, LinkedIn company size, reputable company profiles such as Crunchbase, then news/directories.
- Set `company_details.employee_count` only for a concrete integer reported by a source. Set `company_details.employee_count_range` when the best source is a range such as LinkedIn company size.
- Do not convert a range into a midpoint or rounded estimate. If a source says "more than 500 employees," use an open-ended range or note the phrasing in evidence rather than inventing `501`.
- For dealerships, branches, subsidiaries, franchises, and local offices, verify whether the count belongs to the target entity or a parent group. Prefer the local/entity-specific count for the target company and record the parent separately when supported.
- When sources disagree, prefer the newest primary or filing source. Otherwise keep the most defensible value, lower confidence, and list the conflict in review notes or evidence.

## Inference Rules

- Infer industry/tags from the company's own positioning and product categories, not only from a directory.
- Infer country from headquarters address only when the address is unambiguous.
- Infer B2B/B2C from customers, pricing, product language, and sales motion.
- Do not infer revenue, employee count/headcount, or funding from company size language such as "fast-growing."
- Record inferred values with `medium` or `low` confidence unless backed by direct evidence.

## Account Fit And Priority Evidence

- Read `industries.md` and use the selected industry's qualification and priority rules.
- Verify priority using the source types relevant to the configured rule, favoring current company-owned evidence and authoritative directories.
- Do not upgrade priority from generic market language alone. If the evidence does not prove a segment-specific high or low rule, use the configured default and note the ambiguity.
