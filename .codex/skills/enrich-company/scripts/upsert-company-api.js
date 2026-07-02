#!/usr/bin/env node
const fs = require("fs");

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function readJson(path) {
  const raw = path && path !== "-" ? fs.readFileSync(path, "utf8") : fs.readFileSync(0, "utf8");
  return JSON.parse(raw);
}

function normalizeWhitespace(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

function normalizeDomain(value) {
  if (!value || typeof value !== "string") return null;
  let input = value.trim();
  if (!input) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    input = `https://${input}`;
  }
  try {
    const url = new URL(input);
    return url.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "") || null;
  } catch {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/\.$/, "") || null;
  }
}

function normalizeUrl(value) {
  if (!value || typeof value !== "string") return null;
  let input = value.trim();
  if (!input) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    input = `https://${input}`;
  }
  try {
    const url = new URL(input);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeLinkedInCompanyUrl(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "linkedin.com") return normalized;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || parts[0].toLowerCase() !== "company") return normalized;
    return `https://www.linkedin.com/company/${parts[1]}`;
  } catch {
    return normalized;
  }
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Number.isInteger(value) && value >= 0) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function firstArrayValue(value) {
  return Array.isArray(value) ? value.find((item) => item !== null && item !== undefined && item !== "") : null;
}

function categoryFrom(value) {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates.filter(Boolean)) {
    const normalized = String(candidate).trim().toLowerCase();
    if (normalized === "aircraft" || normalized === "aviation") return "aircraft";
    if (
      normalized === "automotive" ||
      normalized === "auto" ||
      normalized === "car" ||
      normalized === "cars" ||
      normalized.includes("dealership")
    ) {
      return "automotive";
    }
    if (
      normalized === "yacht" ||
      normalized === "yachts" ||
      normalized === "boat" ||
      normalized === "boats" ||
      normalized.includes("sailboat") ||
      normalized.includes("sailing yacht") ||
      normalized.includes("yacht brokerage")
    ) {
      return "yacht";
    }
  }
  return null;
}

function normalizePriority(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

function headquartersText(location) {
  const headquarters = location?.headquarters || {};
  return [
    headquarters.city,
    headquarters.region,
    headquarters.country
  ].filter(Boolean).join(", ") || null;
}

function normalizeCompany(input) {
  const company = input.company || input;
  const identity = input.identity || company.identity || {};
  const web = input.web || company.web || {};
  const classification = input.classification || company.classification || {};
  const location = input.location || company.location || {};
  const details = input.company_details || company.company_details || {};
  const metadata = input.metadata || company.metadata || {};

  const domain = normalizeDomain(firstValue(company.domain, web.domain, input.domain, input.input?.domain, company.website_url, web.website_url));
  const websiteUrl = normalizeUrl(firstValue(company.website_url, company.websiteUrl, web.website_url, web.websiteUrl, domain));
  const linkedinCompanyUrl = normalizeLinkedInCompanyUrl(firstValue(
    company.linkedin_company_url,
    company.linkedinCompanyUrl,
    web.linkedin_url,
    web.linkedinCompanyUrl,
    input.linkedin_company_url,
    input.input?.linkedin_company_url
  ));
  const industry = normalizeWhitespace(firstValue(company.industry, firstArrayValue(classification.industries)));
  const locationText = typeof company.location === "string" ? company.location : headquartersText(location);

  return {
    name: normalizeWhitespace(firstValue(company.name, identity.name, input.input?.company_name)),
    domain,
    linkedin_company_url: linkedinCompanyUrl,
    website_url: websiteUrl,
    description: normalizeWhitespace(firstValue(company.description, identity.description)),
    category: normalizeWhitespace(firstValue(company.category, categoryFrom(classification.categories), categoryFrom(industry))),
    priority: normalizePriority(firstValue(company.priority, input.priority, classification.priority, metadata.priority)),
    industry,
    location: normalizeWhitespace(locationText),
    employee_count: normalizeInteger(firstValue(company.employee_count, company.employeeCount, details.employee_count)),
    employee_count_range: normalizeWhitespace(firstValue(company.employee_count_range, company.employeeCountRange, details.employee_count_range)),
    date_enriched: normalizeWhitespace(firstValue(company.date_enriched, company.dateEnriched, metadata.last_enriched_at)),
    notes: normalizeWhitespace(company.notes || null)
  };
}

function validateCompany(company) {
  const errors = [];
  if (!company.name) errors.push("name is required");
  if (!company.domain) errors.push("domain is required");
  if (!company.linkedin_company_url) errors.push("linkedin_company_url is required");
  if (company.category && !["aircraft", "automotive", "yacht"].includes(company.category)) {
    errors.push("category must be aircraft, automotive, or yacht");
  }
  if (company.priority && !["high", "medium", "low"].includes(company.priority)) {
    errors.push("priority must be high, medium, or low");
  }
  return errors;
}

function addValue(payload, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    payload[key] = value;
  }
}

function addInteger(payload, key, value) {
  if (Number.isInteger(value)) {
    payload[key] = value;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function apiPayload(company, { forCreate, stampDate }) {
  const payload = {};

  addValue(payload, "name", company.name);
  addValue(payload, "domain", company.domain);
  addValue(payload, "linkedin_company_url", company.linkedin_company_url);
  addValue(payload, "website_url", company.website_url);
  addValue(payload, "description", company.description);
  addValue(payload, "category", company.category);
  addValue(payload, "priority", company.priority);
  addValue(payload, "industry", company.industry);
  addValue(payload, "location", company.location);
  addInteger(payload, "employee_count", company.employee_count);
  addValue(payload, "employee_count_range", company.employee_count_range);
  addValue(payload, "date_enriched", stampDate ? todayIso() : company.date_enriched);
  addValue(payload, "notes", company.notes);

  if (forCreate) {
    return {
      name: payload.name,
      domain: payload.domain,
      linkedin_company_url: payload.linkedin_company_url,
      ...payload
    };
  }

  return payload;
}

function apiBaseUrl(value) {
  return String(value || "http://localhost:4200").replace(/\/+$/, "");
}

async function apiJson(apiBase, path, { method = "GET", body } = {}) {
  const url = `${apiBase}${path}`;
  const init = { method };

  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(
      `Could not reach ${url}. Start the web app with \`npm run dev -- --port 4200\`, or pass --api-base. ${error.message}`
    );
  }

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${data.error || text}`);
  }

  return data;
}

async function findCompanies(apiBase, params) {
  const searchParams = new URLSearchParams(params);
  const data = await apiJson(apiBase, `/api/companies?${searchParams.toString()}`);
  return data.companies || [];
}

async function companyMatches(apiBase, company) {
  const byId = new Map();
  const lookups = [];

  if (company.domain) {
    lookups.push(findCompanies(apiBase, { domain: company.domain }));
  }

  if (company.linkedin_company_url) {
    lookups.push(findCompanies(apiBase, { linkedin_company_url: company.linkedin_company_url }));
  }

  for (const companies of await Promise.all(lookups)) {
    companies.forEach((match) => byId.set(match.id, match));
  }

  return Array.from(byId.values());
}

async function buildPlan(apiBase, company) {
  const matches = await companyMatches(apiBase, company);
  const ids = Array.from(new Set(matches.map((match) => match.id)));
  const conflicts = [];

  if (ids.length > 1) {
    conflicts.push({
      type: "company",
      message: "Domain and LinkedIn company URL match different existing rows.",
      matches
    });
  }

  return {
    action: ids.length === 0 ? "insert" : ids.length === 1 ? "update" : "conflict",
    existing_company: ids.length === 1 ? matches.find((match) => match.id === ids[0]) : null,
    matches,
    conflicts
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  const apiBase = apiBaseUrl(args["api-base"] || process.env.ENRICH_COMPANY_API_BASE || process.env.DRAWSCAPE_API_BASE);

  if (!inputPath) {
    console.error("Usage: node upsert-company-api.js <company.json> [--api-base http://localhost:4200] [--apply]");
    process.exit(2);
  }

  const company = normalizeCompany(readJson(inputPath));
  const errors = validateCompany(company);

  if (errors.length > 0) {
    process.stdout.write(`${JSON.stringify({ ok: false, errors, company }, null, 2)}\n`);
    process.exit(1);
  }

  const plan = await buildPlan(apiBase, company);
  if (plan.conflicts.length > 0) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      api_base: apiBase,
      action: plan.action,
      company,
      conflicts: plan.conflicts
    }, null, 2)}\n`);
    process.exit(1);
  }

  if (!args.apply) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      mode: "plan",
      api_base: apiBase,
      action: plan.action,
      existing_company: plan.existing_company,
      company,
      payload: apiPayload(company, { forCreate: plan.action === "insert", stampDate: true })
    }, null, 2)}\n`);
    return;
  }

  const response = plan.action === "insert"
    ? await apiJson(apiBase, "/api/companies", {
      method: "POST",
      body: apiPayload(company, { forCreate: true, stampDate: true })
    })
    : await apiJson(apiBase, `/api/companies/${plan.existing_company.id}`, {
      method: "PATCH",
      body: apiPayload(company, { forCreate: false, stampDate: true })
    });

  process.stdout.write(`${JSON.stringify({
    ok: true,
    mode: "apply",
    api_base: apiBase,
    action: plan.action === "insert" ? "inserted" : "updated",
    company: response.company,
    date_enriched_ok: Boolean(response.company?.dateEnriched)
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`);
  process.exit(1);
});
