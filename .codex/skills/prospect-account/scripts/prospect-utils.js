const fs = require("fs");
const { spawnSync } = require("child_process");

const CONFIDENCE_VALUES = new Set(["high", "medium", "low", "unknown", "needs_review"]);

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

function normalizeLinkedInUrl(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "linkedin.com") return normalized;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "https://www.linkedin.com";
    return `https://www.linkedin.com/${parts[0].toLowerCase()}/${parts[1]}`;
  } catch {
    return normalized;
  }
}

function profileKeyFromLinkedIn(value) {
  const normalized = normalizeLinkedInUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    if (!["in", "pub"].includes(parts[0].toLowerCase())) return null;
    return `${parts[0].toLowerCase()}/${parts[1]}`;
  } catch {
    return null;
  }
}

function normalizeTitle(value) {
  if (!value || typeof value !== "string") return "";
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeConfidence(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return CONFIDENCE_VALUES.has(normalized) ? normalized : "unknown";
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBoolean(value) {
  return value ? 1 : 0;
}

function runSqliteJson(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-readonly", "-json", dbPath, sql], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `sqlite3 exited with ${result.status}`);
  }
  const output = result.stdout.trim();
  return output ? JSON.parse(output) : [];
}

function runSqliteExec(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-bail", dbPath], {
    input: sql,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `sqlite3 exited with ${result.status}`);
  }
  return result.stdout;
}

function normalizePosition(position, companyDomain) {
  const normalized = {
    company_domain: normalizeDomain(position.company_domain || companyDomain),
    title: normalizeWhitespace(position.title || null),
    department: normalizeWhitespace(position.department || null),
    seniority: normalizeWhitespace(position.seniority || null),
    start_date: normalizeWhitespace(position.start_date || null),
    end_date: normalizeWhitespace(position.end_date || null),
    is_current: position.is_current === undefined ? true : Boolean(position.is_current),
    notes: normalizeWhitespace(position.notes || null),
    confidence: normalizeConfidence(position.confidence),
    evidence: Array.isArray(position.evidence) ? position.evidence : []
  };
  normalized.normalized_title = normalizeTitle(normalized.title);
  return normalized;
}

function normalizePerson(person, companyDomain) {
  const linkedinProfileUrl = normalizeLinkedInUrl(person.linkedin_profile_url);
  const profileKey = normalizeWhitespace(person.profile_key) || profileKeyFromLinkedIn(linkedinProfileUrl);
  const positions = Array.isArray(person.positions) ? person.positions : [];
  return {
    name: normalizeWhitespace(person.name || null),
    linkedin_profile_url: linkedinProfileUrl,
    profile_key: profileKey,
    email: normalizeWhitespace(person.email || null),
    status: normalizeWhitespace(person.status || "New"),
    qualified: Boolean(person.qualified),
    notes: normalizeWhitespace(person.notes || null),
    confidence: normalizeConfidence(person.confidence),
    match_reason: normalizeWhitespace(person.match_reason || null),
    evidence: Array.isArray(person.evidence) ? person.evidence : [],
    positions: positions.map((position) => normalizePosition(position, companyDomain))
  };
}

function normalizeProspect(prospect) {
  const input = prospect.input || {};
  const company = prospect.company || {};
  const domain = normalizeDomain(company.domain || input.domain);
  const normalized = {
    ...prospect,
    mode: prospect.mode || "dry-run",
    input: {
      ...input,
      company_name: normalizeWhitespace(input.company_name || company.name || null),
      domain: normalizeDomain(input.domain || company.domain),
      linkedin_company_url: normalizeLinkedInUrl(input.linkedin_company_url || company.linkedin_company_url),
      target_titles: Array.isArray(input.target_titles) ? input.target_titles.map(normalizeWhitespace).filter(Boolean) : []
    },
    company: {
      name: normalizeWhitespace(company.name || input.company_name || null),
      domain,
      website_url: normalizeUrl(company.website_url || input.website_url || domain),
      linkedin_company_url: normalizeLinkedInUrl(company.linkedin_company_url || input.linkedin_company_url),
      description: normalizeWhitespace(company.description || null),
      industry: normalizeWhitespace(company.industry || null),
      location: normalizeWhitespace(company.location || null),
      notes: normalizeWhitespace(company.notes || null),
      confidence: normalizeConfidence(company.confidence),
      evidence: Array.isArray(company.evidence) ? company.evidence : []
    },
    people: Array.isArray(prospect.people)
      ? prospect.people.map((person) => normalizePerson(person, domain))
      : [],
    skipped: Array.isArray(prospect.skipped) ? prospect.skipped : [],
    assumptions: Array.isArray(prospect.assumptions) ? prospect.assumptions : [],
    conflicts: Array.isArray(prospect.conflicts) ? prospect.conflicts : []
  };
  return normalized;
}

function validateProspect(prospect) {
  const normalized = normalizeProspect(prospect);
  const errors = [];
  const warnings = [];

  if (!normalized.company.name) errors.push("company.name is required");
  if (!normalized.company.domain) errors.push("company.domain is required");
  if (!normalized.company.linkedin_company_url) errors.push("company.linkedin_company_url is required for import");

  const seenProfileKeys = new Map();
  const seenProfileUrls = new Map();

  normalized.people.forEach((person, index) => {
    const label = `people[${index}]`;
    if (!person.name) errors.push(`${label}.name is required`);
    if (!person.linkedin_profile_url) errors.push(`${label}.linkedin_profile_url is required for import`);
    if (!person.profile_key) errors.push(`${label}.profile_key could not be derived`);
    if (person.status && !["New", "Contacted", "Replied"].includes(person.status)) {
      errors.push(`${label}.status must be New, Contacted, or Replied`);
    }
    if (person.profile_key) {
      if (seenProfileKeys.has(person.profile_key)) {
        errors.push(`${label}.profile_key duplicates people[${seenProfileKeys.get(person.profile_key)}]`);
      }
      seenProfileKeys.set(person.profile_key, index);
    }
    if (person.linkedin_profile_url) {
      if (seenProfileUrls.has(person.linkedin_profile_url)) {
        errors.push(`${label}.linkedin_profile_url duplicates people[${seenProfileUrls.get(person.linkedin_profile_url)}]`);
      }
      seenProfileUrls.set(person.linkedin_profile_url, index);
    }
    if (!["high", "medium"].includes(person.confidence)) {
      warnings.push(`${label} is ${person.confidence}; default import will skip it`);
    }
    person.positions.forEach((position, positionIndex) => {
      const positionLabel = `${label}.positions[${positionIndex}]`;
      if (!position.title) errors.push(`${positionLabel}.title is required for import`);
      if (!position.company_domain) errors.push(`${positionLabel}.company_domain is required`);
      if (!["high", "medium"].includes(position.confidence)) {
        warnings.push(`${positionLabel} is ${position.confidence}; default import will skip it`);
      }
    });
  });

  return { normalized, errors, warnings };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

module.exports = {
  CONFIDENCE_VALUES,
  normalizeConfidence,
  normalizeDomain,
  normalizeLinkedInUrl,
  normalizePerson,
  normalizePosition,
  normalizeProspect,
  normalizeTitle,
  normalizeUrl,
  parseArgs,
  profileKeyFromLinkedIn,
  readJson,
  runSqliteExec,
  runSqliteJson,
  sqlBoolean,
  sqlString,
  validateProspect
};
