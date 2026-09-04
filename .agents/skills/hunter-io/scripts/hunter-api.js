#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "https://api.hunter.io/v2";
const CONTROL_ARGS = new Set(["api-key", "test-key", "summary", "dry-run", "help"]);

const COMMANDS = {
  "account": { path: "/account", testKey: false },
  "domain-search": { path: "/domain-search", testKey: true },
  "email-finder": { path: "/email-finder", testKey: true },
  "email-verifier": { path: "/email-verifier", testKey: true },
  "enrich-person": { path: "/people/find", testKey: false },
  "enrich-company": { path: "/companies/find", testKey: false },
  "enrich-combined": { path: "/combined/find", testKey: false }
};

const ALIASES = {
  "domain": "domain-search",
  "finder": "email-finder",
  "find-email": "email-finder",
  "verify": "email-verifier",
  "verify-email": "email-verifier",
  "person": "enrich-person",
  "people": "enrich-person",
  "company": "enrich-company",
  "companies": "enrich-company",
  "combined": "enrich-combined"
};

function usage() {
  return [
    "Usage:",
    "  node hunter-api.js <command> [options]",
    "",
    "Commands:",
    "  account",
    "  domain-search --domain <domain> [--department sales --type personal --limit 10]",
    "  email-finder --domain <domain> --first-name <first> --last-name <last>",
    "  email-verifier --email <email>",
    "  enrich-person --email <email> | --linkedin-handle <handle>",
    "  enrich-company --domain <domain>",
    "  enrich-combined --email <email>",
    "",
    "Options:",
    "  --summary      Print a compact summary instead of raw JSON",
    "  --dry-run      Validate and print request details without calling Hunter",
    "  --test-key     Use Hunter's documented test-api-key where supported",
    "  --api-key KEY  Override HUNTER_API_KEY for this run"
  ].join("\n");
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const raw = arg.slice(2);
    const eq = raw.indexOf("=");
    if (eq !== -1) {
      args[raw.slice(0, eq)] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[raw] = next;
      i += 1;
    } else {
      args[raw] = true;
    }
  }
  return args;
}

function findDotEnv(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadDotEnv() {
  const envPath = findDotEnv(process.cwd());
  if (!envPath) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const match = cleaned.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = unquote(value);
    }
  }
}

function normalizeCommand(rawCommand) {
  const command = rawCommand || "";
  return COMMANDS[command] ? command : ALIASES[command];
}

function toParams(args) {
  const params = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === "_" || CONTROL_ARGS.has(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    params[key.replace(/-/g, "_")] = value === true ? "true" : String(value);
  }
  return params;
}

function has(params, key) {
  return params[key] !== undefined && params[key] !== "";
}

function validate(command, params) {
  if (command === "account") return;
  if (command === "domain-search" && !(has(params, "domain") || has(params, "company"))) {
    fail("domain-search requires --domain or --company.", 2);
  }
  if (command === "email-finder") {
    const hasCompany = has(params, "domain") || has(params, "company") || has(params, "linkedin_handle");
    const hasName = has(params, "linkedin_handle") || has(params, "full_name") || (has(params, "first_name") && has(params, "last_name"));
    if (!hasCompany || !hasName) {
      fail("email-finder requires --domain/--company plus a name, or --linkedin-handle.", 2);
    }
  }
  if (command === "email-verifier" && !has(params, "email")) {
    fail("email-verifier requires --email.", 2);
  }
  if (command === "enrich-person" && !(has(params, "email") || has(params, "linkedin_handle"))) {
    fail("enrich-person requires --email or --linkedin-handle.", 2);
  }
  if (command === "enrich-company" && !has(params, "domain")) {
    fail("enrich-company requires --domain.", 2);
  }
  if (command === "enrich-combined" && !has(params, "email")) {
    fail("enrich-combined requires --email.", 2);
  }
}

function buildUrl(command, params) {
  const url = new URL(`${BASE_URL}${COMMANDS[command].path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function requestHunter(command, params, apiKey) {
  const url = buildUrl(command, params);
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "X-API-KEY": apiKey
    }
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok && response.status !== 202) {
    const error = new Error(`Hunter API returned ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return { status: response.status, body };
}

function firstSourceUris(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((source) => source.uri).filter(Boolean).slice(0, 5);
}

function summarize(command, status, body) {
  const data = body && body.data ? body.data : {};
  if (command === "account") {
    return {
      endpoint: command,
      status_code: status,
      plan_name: data.plan_name || null,
      reset_date: data.reset_date || null,
      requests: data.requests || null
    };
  }
  if (command === "domain-search") {
    const emails = Array.isArray(data.emails) ? data.emails : [];
    return {
      endpoint: command,
      status_code: status,
      domain: data.domain || null,
      organization: data.organization || null,
      pattern: data.pattern || null,
      accept_all: data.accept_all ?? null,
      results: body.meta && body.meta.results !== undefined ? body.meta.results : emails.length,
      emails: emails.slice(0, 10).map((email) => ({
        value: email.value,
        type: email.type,
        confidence: email.confidence,
        name: [email.first_name, email.last_name].filter(Boolean).join(" ") || null,
        position: email.position || null,
        department: email.department || null,
        seniority: email.seniority || null,
        verification_status: email.verification ? email.verification.status : null,
        sources: firstSourceUris(email.sources)
      }))
    };
  }
  if (command === "email-finder") {
    return {
      endpoint: command,
      status_code: status,
      email: data.email || null,
      score: data.score ?? null,
      domain: data.domain || null,
      company: data.company || null,
      position: data.position || null,
      accept_all: data.accept_all ?? null,
      verification_status: data.verification ? data.verification.status : null,
      sources: firstSourceUris(data.sources)
    };
  }
  if (command === "email-verifier") {
    return {
      endpoint: command,
      status_code: status,
      email: data.email || null,
      status: data.status || null,
      score: data.score ?? null,
      regexp: data.regexp ?? null,
      webmail: data.webmail ?? null,
      disposable: data.disposable ?? null,
      mx_records: data.mx_records ?? null,
      smtp_server: data.smtp_server ?? null,
      smtp_check: data.smtp_check ?? null,
      accept_all: data.accept_all ?? null,
      block: data.block ?? null,
      sources: firstSourceUris(data.sources)
    };
  }
  if (command === "enrich-person") {
    return {
      endpoint: command,
      status_code: status,
      name: data.name ? data.name.fullName : null,
      email: data.email || null,
      location: data.location || null,
      employment: data.employment || null,
      linkedin_handle: data.linkedin ? data.linkedin.handle : null,
      indexed_at: data.indexedAt || null,
      active_at: data.activeAt || null,
      inactive_at: data.inactiveAt || null
    };
  }
  if (command === "enrich-company") {
    return {
      endpoint: command,
      status_code: status,
      name: data.name || null,
      legal_name: data.legalName || null,
      domain: data.domain || null,
      description: data.description || null,
      industry: data.category ? data.category.industry : null,
      location: data.location || null,
      employees: data.metrics ? data.metrics.employees : null,
      linkedin_handle: data.linkedin ? data.linkedin.handle : null,
      site_email_count: data.site && Array.isArray(data.site.emailAddresses) ? data.site.emailAddresses.length : null
    };
  }
  if (command === "enrich-combined") {
    const person = data.person || {};
    const company = data.company || {};
    return {
      endpoint: command,
      status_code: status,
      person: {
        name: person.name ? person.name.fullName : null,
        email: person.email || null,
        employment: person.employment || null,
        linkedin_handle: person.linkedin ? person.linkedin.handle : null
      },
      company: {
        name: company.name || null,
        domain: company.domain || null,
        industry: company.category ? company.category.industry : null,
        employees: company.metrics ? company.metrics.employees : null
      }
    };
  }
  return { endpoint: command, status_code: status, data };
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const command = normalizeCommand(args._[0]);
  if (!command) {
    fail(`${usage()}\n\nUnknown command: ${args._[0]}`, 2);
  }

  if (args["test-key"] && !COMMANDS[command].testKey) {
    fail(`--test-key is not documented for ${command}.`, 2);
  }

  const params = toParams(args);
  validate(command, params);

  const apiKey = args["test-key"] ? "test-api-key" : (args["api-key"] || process.env.HUNTER_API_KEY);
  if (!apiKey) {
    fail("Missing HUNTER_API_KEY. Add it to .env or pass --api-key.", 2);
  }

  if (args["dry-run"]) {
    process.stdout.write(`${JSON.stringify({
      endpoint: command,
      method: "GET",
      url: buildUrl(command, params).toString(),
      auth_header: "X-API-KEY",
      will_call_api: false
    }, null, 2)}\n`);
    return;
  }

  try {
    const result = await requestHunter(command, params, apiKey);
    const output = args.summary ? summarize(command, result.status, result.body) : result.body;
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    if (error.body) {
      process.stderr.write(`${JSON.stringify(error.body, null, 2)}\n`);
    }
    process.exit(1);
  }
}

main();
