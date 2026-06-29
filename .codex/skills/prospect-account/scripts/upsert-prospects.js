#!/usr/bin/env node
const {
  parseArgs,
  readJson,
  runSqliteExec,
  runSqliteJson,
  sqlBoolean,
  sqlString,
  validateProspect
} = require("./prospect-utils");

function importable(record, includeLow) {
  return includeLow || ["high", "medium"].includes(record.confidence);
}

function getSingleMatch(rows, label) {
  const ids = Array.from(new Set(rows.map((row) => row.id)));
  if (ids.length > 1) {
    throw new Error(`${label} matches multiple existing rows: ${ids.join(", ")}`);
  }
  return rows[0] || null;
}

function sqlInList(values) {
  return values.map(sqlString).join(", ");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  const dbPath = args.db || "data/outreach.sqlite";
  const includeLow = Boolean(args["include-low"]);

  if (!inputPath || !args.apply) {
    console.error("Usage: node upsert-prospects.js <prospect.json> --db data/outreach.sqlite --apply [--include-low]");
    console.error("This script writes to SQLite only when --apply is present.");
    process.exit(2);
  }

  const validation = validateProspect(readJson(inputPath));
  if (validation.errors.length > 0) {
    process.stdout.write(`${JSON.stringify({ ok: false, errors: validation.errors, warnings: validation.warnings }, null, 2)}\n`);
    process.exit(1);
  }

  const prospect = validation.normalized;
  const importablePeople = prospect.people.filter((person) => importable(person, includeLow));
  const importableProfileKeys = Array.from(
    new Set(importablePeople.map((person) => person.profile_key).filter(Boolean))
  );
  const existingPeopleByKey = new Map();

  if (importableProfileKeys.length > 0) {
    runSqliteJson(
      dbPath,
      `SELECT id, profile_key
       FROM people
       WHERE profile_key IN (${sqlInList(importableProfileKeys)});`
    ).forEach((row) => existingPeopleByKey.set(row.profile_key, row));
  }

  const summary = {
    company: "skipped",
    people_inserted_or_updated: 0,
    people_skipped: 0,
    positions_inserted_or_existing: 0,
    positions_skipped: 0,
    warnings: validation.warnings
  };

  const companyMatches = runSqliteJson(
    dbPath,
    `SELECT id
     FROM companies
     WHERE lower(domain) = lower(${sqlString(prospect.company.domain)})
        OR linkedin_company_url = ${sqlString(prospect.company.linkedin_company_url)};`
  );
  const companyMatch = getSingleMatch(companyMatches, "company");

  let sql = "BEGIN;\n";
  if (companyMatch) {
    sql += `UPDATE companies
      SET name = COALESCE(${sqlString(prospect.company.name)}, name),
          website_url = COALESCE(${sqlString(prospect.company.website_url)}, website_url),
          description = COALESCE(${sqlString(prospect.company.description)}, description),
          industry = COALESCE(${sqlString(prospect.company.industry)}, industry),
          location = COALESCE(${sqlString(prospect.company.location)}, location),
          notes = COALESCE(${sqlString(prospect.company.notes)}, notes)
      WHERE id = ${companyMatch.id};\n`;
    summary.company = "updated";
  } else {
    sql += `INSERT INTO companies
      (name, domain, linkedin_company_url, website_url, description, industry, location, notes)
      VALUES (
        ${sqlString(prospect.company.name)},
        ${sqlString(prospect.company.domain)},
        ${sqlString(prospect.company.linkedin_company_url)},
        ${sqlString(prospect.company.website_url)},
        ${sqlString(prospect.company.description)},
        ${sqlString(prospect.company.industry)},
        ${sqlString(prospect.company.location)},
        ${sqlString(prospect.company.notes)}
      );\n`;
    summary.company = "inserted";
  }

  sql += `CREATE TEMP TABLE IF NOT EXISTS _prospect_ids (kind TEXT, key TEXT, id INTEGER);\n`;
  sql += `DELETE FROM _prospect_ids;\n`;
  sql += `INSERT INTO _prospect_ids (kind, key, id)
    SELECT 'company', ${sqlString(prospect.company.domain)}, id
    FROM companies
    WHERE lower(domain) = lower(${sqlString(prospect.company.domain)})
    LIMIT 1;\n`;

  prospect.people.forEach((person) => {
    if (!importable(person, includeLow)) {
      summary.people_skipped += 1;
      summary.positions_skipped += person.positions.length;
      return;
    }

    sql += `INSERT INTO people
      (profile_key, linkedin_profile_url, name, email, status, qualified, notes)
      VALUES (
        ${sqlString(person.profile_key)},
        ${sqlString(person.linkedin_profile_url)},
        ${sqlString(person.name)},
        ${sqlString(person.email)},
        ${sqlString(person.status || "New")},
        ${sqlBoolean(person.qualified)},
        ${sqlString(person.notes)}
      )
      ON CONFLICT(profile_key) DO UPDATE SET
        linkedin_profile_url = COALESCE(excluded.linkedin_profile_url, people.linkedin_profile_url),
        name = COALESCE(excluded.name, people.name),
        email = COALESCE(excluded.email, people.email),
        qualified = MAX(people.qualified, excluded.qualified),
        notes = COALESCE(excluded.notes, people.notes);\n`;
    sql += `INSERT OR IGNORE INTO _prospect_ids (kind, key, id)
      SELECT 'person', ${sqlString(person.profile_key)}, id
      FROM people
      WHERE profile_key = ${sqlString(person.profile_key)}
      LIMIT 1;\n`;
    summary.people_inserted_or_updated += 1;

    person.positions.forEach((position) => {
      if (!importable(position, includeLow)) {
        summary.positions_skipped += 1;
        return;
      }
      sql += `INSERT OR IGNORE INTO positions
        (company_id, person_id, title, department, seniority, start_date, end_date, is_current, notes)
        SELECT c.id,
               p.id,
               ${sqlString(position.title)},
               ${sqlString(position.department)},
               ${sqlString(position.seniority)},
               ${sqlString(position.start_date)},
               ${sqlString(position.end_date)},
               ${sqlBoolean(position.is_current)},
               ${sqlString(position.notes)}
        FROM companies c
        JOIN people p ON p.profile_key = ${sqlString(person.profile_key)}
        WHERE lower(c.domain) = lower(${sqlString(position.company_domain || prospect.company.domain)})
        LIMIT 1;\n`;
      summary.positions_inserted_or_existing += 1;
    });
  });

  sql += "COMMIT;\n";
  runSqliteExec(dbPath, sql);

  let affectedPeople = [];
  if (importableProfileKeys.length > 0) {
    const sortIndex = new Map(importableProfileKeys.map((key, index) => [key, index]));
    affectedPeople = runSqliteJson(
      dbPath,
      `SELECT id, profile_key, linkedin_profile_url, name, email, status, qualified
       FROM people
       WHERE profile_key IN (${sqlInList(importableProfileKeys)});`
    )
      .map((row) => ({
        id: row.id,
        profile_key: row.profile_key,
        linkedin_profile_url: row.linkedin_profile_url,
        name: row.name,
        email: row.email,
        status: row.status,
        qualified: Boolean(row.qualified),
        action: existingPeopleByKey.has(row.profile_key) ? "updated" : "inserted",
        email_status: row.email ? "present" : "missing",
        needs_email_lookup: !row.email
      }))
      .sort((a, b) => sortIndex.get(a.profile_key) - sortIndex.get(b.profile_key));
  }

  process.stdout.write(`${JSON.stringify({ ok: true, db: dbPath, summary, affected_people: affectedPeople }, null, 2)}\n`);
}

main();
