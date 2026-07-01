#!/usr/bin/env node
const CONFIDENCE_VALUES = new Set(["high", "medium", "low", "needs_review", "unknown"]);
const EVIDENCE_VALUES = new Set(["direct", "pattern", "unknown"]);

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
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
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

function usage() {
  return [
    "Usage:",
    "  node update-person-email.js <person-id> <email> --evidence direct --source <url> [--api-base http://localhost:4200] [--apply] [--overwrite] [--confidence high|medium|low|needs_review|unknown]",
    "",
    "Without --apply, the script prints a dry-run summary and does not write.",
    "With --apply, --evidence direct and --source are required. Pattern-inferred emails are not saved."
  ].join("\n");
}

function personSummary(person) {
  const positions = person.positions || [];
  const companies = Array.from(new Set(positions.map((position) => position.companyName).filter(Boolean)));
  const domains = Array.from(new Set(positions.map((position) => position.domain).filter(Boolean)));
  const websiteUrls = Array.from(new Set(positions.map((position) => position.websiteUrl).filter(Boolean)));

  return {
    id: person.id,
    name: person.name,
    current_email: person.email || null,
    companies: companies.length ? companies.join(", ") : null,
    domains: domains.length ? domains.join(", ") : null,
    website_urls: websiteUrls.length ? websiteUrls.join(", ") : null,
    linkedin_profile_url: person.linkedinProfileUrl || null
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const personId = Number(args._[0]);
  const email = normalizeEmail(args._[1]);
  const apiBase = apiBaseUrl(args["api-base"] || process.env.FIND_PERSON_EMAIL_API_BASE || process.env.DRAWSCAPE_API_BASE);
  const confidence = args.confidence ? String(args.confidence).toLowerCase() : null;
  const evidence = args.evidence ? String(args.evidence).toLowerCase() : null;

  if (!Number.isInteger(personId) || personId < 1 || !email) {
    fail(usage(), 2);
  }
  if (confidence && !CONFIDENCE_VALUES.has(confidence)) {
    fail(`Invalid --confidence value: ${args.confidence}`, 2);
  }
  if (evidence && !EVIDENCE_VALUES.has(evidence)) {
    fail(`Invalid --evidence value: ${args.evidence}`, 2);
  }
  if (args.apply && evidence !== "direct") {
    fail("Refusing to save: --apply requires --evidence direct for an exact email observed in a public source.", 2);
  }
  if (args.apply && !args.source) {
    fail("Refusing to save: --apply requires --source for the public page where the exact email was observed.", 2);
  }

  const { person } = await apiJson(apiBase, `/api/people/${personId}`);
  const existingEmail = normalizeEmail(person.email);
  const sameEmail = existingEmail === email;
  if (existingEmail && !sameEmail && !args.overwrite) {
    fail(
      `Person ${personId} already has ${existingEmail}. Re-run with --overwrite to replace it with ${email}.`,
      1
    );
  }

  let updatedPerson = person;
  if (args.apply && !sameEmail) {
    const response = await apiJson(apiBase, `/api/people/${personId}`, {
      method: "PATCH",
      body: { email }
    });
    updatedPerson = response.person;
  }

  const summary = {
    ok: true,
    mode: args.apply ? "applied" : "dry-run",
    api_base: apiBase,
    person: personSummary(updatedPerson),
    proposed_email: email,
    confidence,
    evidence,
    source: args.source || null,
    overwrite: Boolean(args.overwrite),
    changed: !sameEmail
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`);
  process.exit(1);
});
