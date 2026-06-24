#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULT_DB = "data/outreach.sqlite";
const DEFAULT_DAYS = 7;
const QUICKMAIL_GRAPHQL_ENDPOINT = "https://api.quickmail.com/v2/graphql";

const EMAIL_FIELDS = [
  "email",
  "prospect_email",
  "prospectEmail",
  "prospect.email",
  "lead_email",
  "leadEmail",
  "lead.email",
  "recipient",
  "recipientEmail",
  "to"
];

const LEAD_ID_FIELDS = [
  "quickmail_lead_id",
  "quickmailLeadId",
  "lead_id",
  "leadId",
  "lead.id",
  "prospect_id",
  "prospectId",
  "prospect.id",
  "quickmailProspectId",
  "quickmail_prospect_id"
];

const DATE_FIELDS = [
  "replied_at",
  "repliedAt",
  "reply_date",
  "replyDate",
  "event_date",
  "eventDate",
  "event.createdAt",
  "created_at",
  "createdAt",
  "received_at",
  "receivedAt",
  "timestamp",
  "date"
];

const EVENT_FIELDS = [
  "event",
  "event_type",
  "eventType",
  "eventName",
  "trigger",
  "type"
];

const FIRST_TIME_FIELDS = ["first_time", "firstTime", "first"];

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

function usage() {
  return [
    "Usage:",
    "  node sync-quickmail-replies.js --days 14 --source replies.csv --db data/outreach.sqlite [--apply]",
    "  node sync-quickmail-replies.js --probe-api",
    "",
    "Options:",
    "  --source <path>       JSON, NDJSON, or CSV reply events/export.",
    "  --days <n>            Keep replies from the last n days. Default: 7.",
    "  --db <path>           SQLite database. Default: data/outreach.sqlite.",
    "  --apply               Write people.status = 'Replied'. Dry-run without this flag.",
    "  --include-undated     Include events with no parseable date.",
    "  --first-time-only     Skip events whose first_time/firstTime field is false.",
    "  --now <iso-date>      Override current time for repeatable tests.",
    "  --probe-api           Check whether QuickMail exposes reply-level fetch fields.",
    "  --help                Show this help."
  ].join("\n");
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseBoolean(value) {
  if (value === true || value === false) return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return null;
}

function parseDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 100000000000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return parseDate(Number(raw));
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function flattenRecord(value, prefix = "", output = {}) {
  if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
    Object.entries(value).forEach(([key, nested]) => {
      const nestedPrefix = prefix ? `${prefix}.${key}` : key;
      flattenRecord(nested, nestedPrefix, output);
    });
    return output;
  }

  if (prefix) {
    output[normalizeKey(prefix)] = value;
  }

  return output;
}

function pick(flat, candidates) {
  for (const field of candidates) {
    const value = flat[normalizeKey(field)];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell !== "") || rows.length) {
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((header) => String(header || "").trim());
  return rows.slice(1).filter((cells) => cells.some((cell) => String(cell || "").trim() !== "")).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cells[index] || "";
    });
    return record;
  });
}

function parseSource(sourcePath) {
  const text = fs.readFileSync(sourcePath, "utf8");
  const ext = path.extname(sourcePath).toLowerCase();

  if (ext === ".csv") {
    return parseCsv(text);
  }

  if (ext === ".ndjson" || ext === ".jsonl") {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.events)) return parsed.events;
    if (Array.isArray(parsed.replies)) return parsed.replies;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch (error) {
    if (ext === ".json") throw error;
  }

  return parseCsv(text);
}

function normalizeEvent(record, index) {
  const flat = flattenRecord(record);
  const eventType = normalizeString(pick(flat, EVENT_FIELDS));
  const firstTime = parseBoolean(pick(flat, FIRST_TIME_FIELDS));
  const date = parseDate(pick(flat, DATE_FIELDS));
  const email = normalizeEmail(pick(flat, EMAIL_FIELDS));
  const quickmailLeadId = normalizeString(pick(flat, LEAD_ID_FIELDS));

  return {
    index,
    raw: record,
    eventType,
    firstTime,
    eventDate: date ? date.toISOString() : null,
    email,
    quickmailLeadId
  };
}

function eventKey(event) {
  if (event.quickmailLeadId) return `lead:${event.quickmailLeadId}`;
  if (event.email) return `email:${event.email}`;
  return `row:${event.index}`;
}

function newestEvent(existing, next) {
  if (!existing) return next;
  if (!existing.eventDate) return next;
  if (!next.eventDate) return existing;
  return new Date(next.eventDate) > new Date(existing.eventDate) ? next : existing;
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSqliteJson(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-readonly", "-json", dbPath, sql], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    fail(result.stderr.trim() || result.stdout.trim() || `sqlite3 exited with ${result.status}`);
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
    fail(result.stderr.trim() || result.stdout.trim() || `sqlite3 exited with ${result.status}`);
  }
}

function groupBy(rows, getKey) {
  const map = new Map();
  rows.forEach((row) => {
    const key = getKey(row);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function findPerson(event, peopleByLeadId, peopleByEmail) {
  if (event.quickmailLeadId) {
    const matches = peopleByLeadId.get(event.quickmailLeadId) || [];
    if (matches.length === 1) {
      return { method: "quickmail_lead_id", person: matches[0] };
    }
    if (matches.length > 1) {
      return { method: "quickmail_lead_id", ambiguous: matches };
    }
  }

  if (event.email) {
    const matches = peopleByEmail.get(event.email) || [];
    if (matches.length === 1) {
      return { method: "email", person: matches[0] };
    }
    if (matches.length > 1) {
      return { method: "email", ambiguous: matches };
    }
  }

  return { method: event.quickmailLeadId ? "quickmail_lead_id" : "email", person: null };
}

function prepareSync({ dbPath, events, cutoff, includeUndated, firstTimeOnly }) {
  const people = runSqliteJson(
    dbPath,
    `SELECT id,
            name,
            email,
            lower(email) AS normalizedEmail,
            quickmail_lead_id AS quickmailLeadId,
            status
     FROM people
     WHERE quickmail_lead_id IS NOT NULL
        OR (email IS NOT NULL AND email != '');`
  );

  const peopleByLeadId = groupBy(people, (person) => person.quickmailLeadId);
  const peopleByEmail = groupBy(people, (person) => normalizeEmail(person.normalizedEmail || person.email));
  const skipped = [];
  const eligibleByKey = new Map();

  events.forEach((event) => {
    if (event.eventType && !/reply/i.test(event.eventType)) {
      skipped.push({ reason: "not_reply_event", event });
      return;
    }

    if (firstTimeOnly && event.firstTime === false) {
      skipped.push({ reason: "not_first_reply", event });
      return;
    }

    if (!event.eventDate && !includeUndated) {
      skipped.push({ reason: "missing_event_date", event });
      return;
    }

    if (event.eventDate && new Date(event.eventDate) < cutoff) {
      skipped.push({ reason: "outside_day_window", event });
      return;
    }

    if (!event.quickmailLeadId && !event.email) {
      skipped.push({ reason: "missing_match_key", event });
      return;
    }

    const key = eventKey(event);
    eligibleByKey.set(key, newestEvent(eligibleByKey.get(key), event));
  });

  const matched = [];
  const unmatched = [];

  Array.from(eligibleByKey.values()).forEach((event) => {
    const match = findPerson(event, peopleByLeadId, peopleByEmail);

    if (match.person) {
      matched.push({
        person: {
          id: match.person.id,
          name: match.person.name,
          email: match.person.email || null,
          quickmailLeadId: match.person.quickmailLeadId || null,
          previousStatus: match.person.status
        },
        event: {
          email: event.email || null,
          quickmailLeadId: event.quickmailLeadId || null,
          eventDate: event.eventDate,
          eventType: event.eventType || null,
          firstTime: event.firstTime
        },
        matchMethod: match.method,
        action: match.person.status === "Replied" ? "already_replied" : "mark_replied"
      });
      return;
    }

    unmatched.push({
      reason: match.ambiguous ? "ambiguous_match" : "no_local_person_match",
      matchMethod: match.method,
      event: {
        email: event.email || null,
        quickmailLeadId: event.quickmailLeadId || null,
        eventDate: event.eventDate,
        eventType: event.eventType || null,
        firstTime: event.firstTime
      },
      matches: match.ambiguous
        ? match.ambiguous.map((person) => ({
            id: person.id,
            name: person.name,
            email: person.email || null,
            quickmailLeadId: person.quickmailLeadId || null,
            status: person.status
          }))
        : []
    });
  });

  return { people, matched, unmatched, skipped };
}

function applySync(dbPath, matched) {
  const ids = Array.from(
    new Set(
      matched
        .filter((item) => item.action === "mark_replied")
        .map((item) => item.person.id)
    )
  );

  if (!ids.length) return 0;

  runSqliteExec(
    dbPath,
    `BEGIN;
     UPDATE people
     SET status = 'Replied'
     WHERE id IN (${ids.join(", ")})
       AND status != 'Replied';
     COMMIT;`
  );

  return ids.length;
}

function parseEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const assignment = trimmed.startsWith("export ") ? trimmed.slice("export ".length) : trimmed;
    const index = assignment.indexOf("=");
    if (index === -1) return;
    const key = assignment.slice(0, index).trim();
    if (!key) return;
    env[key] = parseEnvValue(assignment.slice(index + 1));
  });
  return env;
}

function getQuickmailApiKey() {
  return (
    process.env.QUICKMAIL_API_KEY ||
    readEnvFile(path.join(process.cwd(), ".env")).QUICKMAIL_API_KEY ||
    readEnvFile(path.join(process.cwd(), "..", ".env")).QUICKMAIL_API_KEY ||
    ""
  );
}

function typeName(type) {
  if (!type) return "";
  if (type.name) return type.name;
  return typeName(type.ofType);
}

async function quickmailGraphql(apiKey, query, variables = {}, operationName = "ProbeQuickmailReplies") {
  const response = await fetch(QUICKMAIL_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables, operationName })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.errors) {
    return {
      ok: false,
      status: response.status,
      errors: payload.errors || payload.error || payload
    };
  }

  return { ok: true, data: payload.data };
}

async function probeQuickmailApi() {
  const apiKey = getQuickmailApiKey();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      message: "QUICKMAIL_API_KEY is not configured."
    };
  }

  const query = `
    query ProbeQuickmailReplies {
      __schema {
        queryType {
          fields {
            name
            args { name type { kind name ofType { kind name ofType { kind name } } } }
            type { kind name ofType { kind name ofType { kind name } } }
          }
        }
        types {
          name
          fields {
            name
            args { name type { kind name ofType { kind name ofType { kind name } } } }
            type { kind name ofType { kind name ofType { kind name } } }
          }
        }
      }
    }
  `;

  const result = await quickmailGraphql(apiKey, query);
  if (!result.ok) return { ok: false, configured: true, ...result };

  const schema = result.data.__schema;
  const queryFields = schema.queryType.fields.map((field) => ({
    name: field.name,
    type: typeName(field.type),
    args: field.args.map((arg) => arg.name)
  }));
  const leadType = schema.types.find((type) => type.name === "Lead");
  const leadFields = (leadType?.fields || []).map((field) => ({
    name: field.name,
    type: typeName(field.type),
    args: field.args.map((arg) => arg.name)
  }));

  const replyPattern = /reply|replied|opportun|conversation|inbox|event|journey|sentiment/i;
  const possibleQueryFields = queryFields.filter((field) => replyPattern.test(field.name) || replyPattern.test(field.type));
  const possibleLeadFields = leadFields.filter((field) => replyPattern.test(field.name) || replyPattern.test(field.type));

  return {
    ok: true,
    configured: true,
    fetchSupported: possibleQueryFields.length > 0 || possibleLeadFields.length > 0,
    possibleQueryFields,
    possibleLeadFields,
    note:
      possibleQueryFields.length || possibleLeadFields.length
        ? "QuickMail may expose reply-level fields. Inspect docs/schema before implementing fetch."
        : "No reply-level query or Lead field found. Use a reply export, Zapier trigger output, or webhook capture."
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const sourcePath = args.source || args._[0] || "";
  const dbPath = args.db || DEFAULT_DB;
  const days = args.days === undefined ? DEFAULT_DAYS : Number(args.days);
  const now = args.now ? parseDate(args.now) : new Date();

  if (!Number.isFinite(days) || days < 0) {
    fail("--days must be a positive number.", 2);
  }

  if (!now) {
    fail("--now must be a parseable date.", 2);
  }

  if (args["probe-api"] && !sourcePath) {
    const probe = await probeQuickmailApi();
    process.stdout.write(`${JSON.stringify({ ok: probe.ok, probe }, null, 2)}\n`);
    return;
  }

  if (!sourcePath) {
    const probe = await probeQuickmailApi();
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          mode: "dry-run",
          reason: "historical_quickmail_reply_fetch_unavailable",
          message:
            "No --source was provided. The current QuickMail v2 API does not expose a documented per-lead reply feed for last-N-days sync.",
          next_step: "Provide a QuickMail/Zapier reply export or webhook payload with --source.",
          probe
        },
        null,
        2
      )}\n`
    );
    process.exit(1);
  }

  if (!fs.existsSync(sourcePath)) {
    fail(`Source not found: ${sourcePath}`, 2);
  }

  if (!fs.existsSync(dbPath)) {
    fail(`Database not found: ${dbPath}`, 2);
  }

  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const rawEvents = parseSource(sourcePath);
  const events = rawEvents.map(normalizeEvent);
  const sync = prepareSync({
    dbPath,
    events,
    cutoff,
    includeUndated: Boolean(args["include-undated"]),
    firstTimeOnly: Boolean(args["first-time-only"])
  });
  const changedCount = args.apply ? applySync(dbPath, sync.matched) : 0;
  const markReplied = sync.matched.filter((item) => item.action === "mark_replied").length;
  const alreadyReplied = sync.matched.filter((item) => item.action === "already_replied").length;

  const report = {
    ok: true,
    mode: args.apply ? "applied" : "dry-run",
    db: dbPath,
    source: sourcePath,
    days,
    now: now.toISOString(),
    cutoff: cutoff.toISOString(),
    summary: {
      events_read: rawEvents.length,
      normalized_events: events.length,
      eligible_unique_replies: sync.matched.length + sync.unmatched.length,
      matched: sync.matched.length,
      would_mark_replied: args.apply ? 0 : markReplied,
      updated_to_replied: changedCount,
      already_replied: alreadyReplied,
      unmatched: sync.unmatched.length,
      skipped: sync.skipped.length
    },
    matched: sync.matched,
    unmatched: sync.unmatched,
    skipped: sync.skipped
  };

  if (args["probe-api"]) {
    report.probe = await probeQuickmailApi();
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  fail(error.stack || error.message || String(error), 1);
});
