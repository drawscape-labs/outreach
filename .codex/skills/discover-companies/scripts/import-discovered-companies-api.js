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

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
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
    const parts = url.pathname.split("/").filter(Boolean);
    if (host !== "linkedin.com" || parts[0]?.toLowerCase() !== "company" || !parts[1]) {
      return null;
    }
    return `https://www.linkedin.com/company/${parts[1]}`;
  } catch {
    return null;
  }
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
      normalized.includes("dealership") ||
      normalized.includes("porsche")
    ) {
      return "automotive";
    }
    if (
      normalized === "yacht" ||
      normalized === "yachts" ||
      normalized === "boat" ||
      normalized === "boats" ||
      normalized.includes("sailboat")
    ) {
      return "yacht";
    }
  }
  return null;
}

function priorityFrom(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return ["high", "medium", "low"].includes(normalized) ? normalized : null;
}

function candidateList(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.companies)) return input.companies;
  if (Array.isArray(input.candidates)) return input.candidates;
  if (Array.isArray(input.discovered_companies)) return input.discovered_companies;
  if (input.company) return [input.company];
  return [input];
}

function normalizeCandidate(input, index) {
  const source = input.company || input;
  const web = source.web || {};
  const discovery = source.discovery || {};
  const classification = source.classification || {};
  const domain = normalizeDomain(firstValue(
    source.domain,
    web.domain,
    source.website_url,
    source.websiteUrl,
    web.website_url,
    web.websiteUrl
  ));
  const websiteUrl = normalizeUrl(firstValue(
    source.website_url,
    source.websiteUrl,
    web.website_url,
    web.websiteUrl,
    domain
  ));
  const linkedinCompanyUrl = normalizeLinkedInCompanyUrl(firstValue(
    source.linkedin_company_url,
    source.linkedinCompanyUrl,
    source.linkedin_url,
    source.linkedinUrl,
    web.linkedin_company_url,
    web.linkedinCompanyUrl,
    web.linkedin_url,
    web.linkedinUrl
  ));
  const category = categoryFrom(firstValue(
    source.category,
    classification.category,
    classification.categories,
    source.industry
  ));

  return {
    index,
    name: normalizeWhitespace(firstValue(source.name, source.company_name, source.companyName)),
    domain,
    linkedin_company_url: linkedinCompanyUrl,
    website_url: websiteUrl,
    description: normalizeWhitespace(source.description),
    category,
    priority: priorityFrom(source.priority),
    industry: normalizeWhitespace(source.industry),
    location: normalizeWhitespace(source.location),
    notes: normalizeWhitespace(source.notes),
    discovery
  };
}

function validateCandidate(candidate) {
  const errors = [];
  if (!candidate.name) errors.push("name is required");
  if (!candidate.domain) errors.push("domain is required");
  if (!candidate.linkedin_company_url) errors.push("linkedin_company_url is required");
  if (candidate.category && !["aircraft", "automotive", "yacht"].includes(candidate.category)) {
    errors.push("category must be aircraft, automotive, or yacht");
  }
  if (candidate.priority && !["high", "medium", "low"].includes(candidate.priority)) {
    errors.push("priority must be high, medium, or low");
  }
  return errors;
}

function addValue(payload, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    payload[key] = value;
  }
}

function apiPayload(candidate) {
  const payload = {};
  addValue(payload, "name", candidate.name);
  addValue(payload, "domain", candidate.domain);
  addValue(payload, "linkedin_company_url", candidate.linkedin_company_url);
  addValue(payload, "website_url", candidate.website_url);
  addValue(payload, "description", candidate.description);
  addValue(payload, "category", candidate.category);
  addValue(payload, "priority", candidate.priority);
  addValue(payload, "industry", candidate.industry);
  addValue(payload, "location", candidate.location);
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

async function existingMatches(apiBase, candidate) {
  const byId = new Map();
  const lookups = [];

  if (candidate.domain) {
    lookups.push(findCompanies(apiBase, { domain: candidate.domain }));
  }
  if (candidate.linkedin_company_url) {
    lookups.push(findCompanies(apiBase, { linkedin_company_url: candidate.linkedin_company_url }));
  }

  for (const companies of await Promise.all(lookups)) {
    companies.forEach((company) => byId.set(company.id, company));
  }

  return Array.from(byId.values());
}

async function planCandidate(apiBase, candidate, seenKeys) {
  const errors = validateCandidate(candidate);
  if (errors.length > 0) {
    return { index: candidate.index, action: "invalid", candidate, errors };
  }

  const inputKeys = [candidate.domain, candidate.linkedin_company_url].filter(Boolean);
  const duplicateKey = inputKeys.find((key) => seenKeys.has(key));
  if (duplicateKey) {
    return {
      index: candidate.index,
      action: "duplicate_input",
      candidate,
      duplicate_key: duplicateKey
    };
  }
  inputKeys.forEach((key) => seenKeys.add(key));

  const matches = await existingMatches(apiBase, candidate);
  const ids = Array.from(new Set(matches.map((match) => match.id)));

  if (ids.length > 1) {
    return {
      index: candidate.index,
      action: "conflict",
      candidate,
      matches,
      message: "Domain and LinkedIn company URL match different existing rows."
    };
  }

  if (ids.length === 1) {
    return {
      index: candidate.index,
      action: "skip_existing",
      candidate,
      existing_company: matches.find((match) => match.id === ids[0])
    };
  }

  return {
    index: candidate.index,
    action: "insert",
    candidate,
    payload: apiPayload(candidate)
  };
}

function summarize(results) {
  return results.reduce(
    (summary, result) => {
      summary[result.action] = (summary[result.action] || 0) + 1;
      summary.total += 1;
      return summary;
    },
    { total: 0 }
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  const apiBase = apiBaseUrl(args["api-base"] || process.env.DISCOVER_COMPANIES_API_BASE || process.env.DRAWSCAPE_API_BASE);

  if (!inputPath) {
    console.error("Usage: node import-discovered-companies-api.js <candidates.json|-> [--api-base http://localhost:4200] [--apply]");
    process.exit(2);
  }

  const candidates = candidateList(readJson(inputPath)).map(normalizeCandidate);
  const seenKeys = new Set();
  const planned = [];

  for (const candidate of candidates) {
    planned.push(await planCandidate(apiBase, candidate, seenKeys));
  }

  if (!args.apply) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      mode: "plan",
      api_base: apiBase,
      summary: summarize(planned),
      results: planned
    }, null, 2)}\n`);
    return;
  }

  const applied = [];
  for (const result of planned) {
    if (result.action !== "insert") {
      applied.push(result);
      continue;
    }

    try {
      const response = await apiJson(apiBase, "/api/companies", {
        method: "POST",
        body: result.payload
      });
      applied.push({
        ...result,
        action: "inserted",
        company: response.company
      });
    } catch (error) {
      applied.push({
        ...result,
        action: "insert_failed",
        error: error.message
      });
    }
  }

  const affectedCompanies = applied
    .filter((result) => result.action === "inserted" && result.company)
    .map((result) => ({
      id: result.company.id,
      name: result.company.name,
      domain: result.company.domain,
      linkedinCompanyUrl: result.company.linkedinCompanyUrl,
      needs_enrichment: true
    }));

  process.stdout.write(`${JSON.stringify({
    ok: !applied.some((result) => result.action === "insert_failed"),
    mode: "apply",
    api_base: apiBase,
    summary: summarize(applied),
    affected_companies: affectedCompanies,
    results: applied
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`);
  process.exit(1);
});
