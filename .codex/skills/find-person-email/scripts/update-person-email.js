#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

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

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

function runSqliteJson(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-readonly", "-json", dbPath, sql], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    fail(result.stderr.trim() || result.stdout.trim() || `sqlite3 exited with ${result.status}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : [];
}

function runSqliteExec(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-bail", dbPath], {
    input: sql,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    fail(result.stderr.trim() || result.stdout.trim() || `sqlite3 exited with ${result.status}`);
  }
}

function usage() {
  return [
    "Usage:",
    "  node update-person-email.js <person-id> <email> --db data/outreach.sqlite --evidence direct --source <url> [--apply] [--overwrite] [--confidence high|medium|low|needs_review|unknown]",
    "",
    "Without --apply, the script prints a dry-run summary and does not write.",
    "With --apply, --evidence direct and --source are required. Pattern-inferred emails are not saved."
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const personId = Number(args._[0]);
  const email = normalizeEmail(args._[1]);
  const dbPath = args.db || "data/outreach.sqlite";
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

  const people = runSqliteJson(
    dbPath,
    `SELECT p.id,
            p.name,
            p.email,
            p.linkedin_profile_url,
            group_concat(DISTINCT c.name) AS companies,
            group_concat(DISTINCT c.domain) AS domains
     FROM people p
     LEFT JOIN positions pos ON pos.person_id = p.id AND pos.is_current = 1
     LEFT JOIN companies c ON c.id = pos.company_id
     WHERE p.id = ${personId}
     GROUP BY p.id;`
  );

  if (people.length !== 1) {
    fail(`Expected one person for id ${personId}, found ${people.length}.`, 1);
  }

  const person = people[0];
  const existingEmail = normalizeEmail(person.email);
  const sameEmail = existingEmail === email;
  if (existingEmail && !sameEmail && !args.overwrite) {
    fail(
      `Person ${personId} already has ${existingEmail}. Re-run with --overwrite to replace it with ${email}.`,
      1
    );
  }

  const summary = {
    ok: true,
    mode: args.apply ? "applied" : "dry-run",
    db: dbPath,
    person: {
      id: person.id,
      name: person.name,
      current_email: person.email || null,
      companies: person.companies || null,
      domains: person.domains || null,
      linkedin_profile_url: person.linkedin_profile_url || null
    },
    proposed_email: email,
    confidence,
    evidence,
    source: args.source || null,
    overwrite: Boolean(args.overwrite),
    changed: !sameEmail
  };

  if (args.apply && !sameEmail) {
    runSqliteExec(
      dbPath,
      `BEGIN;
       UPDATE people
       SET email = ${sqlString(email)}
       WHERE id = ${personId};
       COMMIT;`
    );
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
