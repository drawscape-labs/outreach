const fs = require("fs");

const CONFIDENCE_VALUES = new Set(["high", "medium", "low", "unknown", "needs_review"]);
const EMPLOYEE_COUNT_RANGES = new Set([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+"
]);

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

function normalizeEmail(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
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

function profileKeyFromEmail(value) {
  const normalized = normalizeEmail(value);
  return normalized ? `email/${normalized}` : null;
}

function normalizeTitle(value) {
  if (!value || typeof value !== "string") return "";
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeConfidence(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return CONFIDENCE_VALUES.has(normalized) ? normalized : "unknown";
}

function normalizeEmployeeCount(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  return Number(normalized);
}

function normalizeEmployeeCountRange(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value
    .trim()
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/employees?$/i, "");
  return EMPLOYEE_COUNT_RANGES.has(normalized) ? normalized : normalizeWhitespace(value);
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
  const email = normalizeEmail(person.email);
  const profileKey =
    normalizeWhitespace(person.profile_key) ||
    profileKeyFromLinkedIn(linkedinProfileUrl) ||
    profileKeyFromEmail(email);
  const positions = Array.isArray(person.positions) ? person.positions : [];
  return {
    name: normalizeWhitespace(person.name || null),
    linkedin_profile_url: linkedinProfileUrl,
    profile_key: profileKey,
    email,
    phone_number: normalizeWhitespace(person.phone_number || person.phone || null),
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
  const companyDetails = company.company_details || prospect.company_details || {};
  const domain = normalizeDomain(company.domain || input.domain);
  const normalized = {
    ...prospect,
    mode: prospect.mode || "apply",
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
      category: normalizeWhitespace(company.category || null),
      industry: normalizeWhitespace(company.industry || null),
      location: normalizeWhitespace(company.location || null),
      employee_count: normalizeEmployeeCount(company.employee_count ?? company.headcount ?? companyDetails.employee_count),
      employee_count_range: normalizeEmployeeCountRange(
        company.employee_count_range || company.headcount_range || companyDetails.employee_count_range
      ),
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
  const seenEmails = new Map();

  normalized.people.forEach((person, index) => {
    const label = `people[${index}]`;
    if (!person.name) errors.push(`${label}.name is required`);
    if (!person.linkedin_profile_url && !person.email) {
      errors.push(`${label}.linkedin_profile_url or verified email is required for import`);
    }
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
    if (person.email) {
      if (seenEmails.has(person.email)) {
        errors.push(`${label}.email duplicates people[${seenEmails.get(person.email)}]`);
      }
      seenEmails.set(person.email, index);
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
  normalizeEmail,
  normalizeEmployeeCount,
  normalizeEmployeeCountRange,
  normalizeLinkedInUrl,
  normalizePerson,
  normalizePosition,
  normalizeProspect,
  normalizeTitle,
  normalizeUrl,
  parseArgs,
  profileKeyFromEmail,
  profileKeyFromLinkedIn,
  readJson,
  validateProspect
};
