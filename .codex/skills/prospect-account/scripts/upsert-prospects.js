#!/usr/bin/env node
const {
  parseArgs,
  readJson,
  runSqliteExec,
  runSqliteJson,
  sqlBoolean,
  sqlIntegerValue,
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

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== null && value !== undefined && value !== "")));
}

function matchingPeopleForInput(person, rows) {
  const matchedIds = new Set();
  const matches = [];

  rows.forEach((row) => {
    const matchesProfileKey = person.profile_key && row.profile_key === person.profile_key;
    const matchesLinkedIn =
      person.linkedin_profile_url && row.linkedin_profile_url === person.linkedin_profile_url;
    const matchesEmail = person.email && row.email === person.email;

    if ((matchesProfileKey || matchesLinkedIn || matchesEmail) && !matchedIds.has(row.id)) {
      matchedIds.add(row.id);
      matches.push(row);
    }
  });

  return matches;
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
  const importableProfileKeys = unique(importablePeople.map((person) => person.profile_key));
  const importableProfileUrls = unique(importablePeople.map((person) => person.linkedin_profile_url));
  const importableEmails = unique(importablePeople.map((person) => person.email));
  const personClauses = [];
  if (importableProfileKeys.length > 0) {
    personClauses.push(`profile_key IN (${sqlInList(importableProfileKeys)})`);
  }
  if (importableProfileUrls.length > 0) {
    personClauses.push(`linkedin_profile_url IN (${sqlInList(importableProfileUrls)})`);
  }
  if (importableEmails.length > 0) {
    personClauses.push(`email IN (${sqlInList(importableEmails)})`);
  }

  const existingPeople = personClauses.length > 0
    ? runSqliteJson(
      dbPath,
      `SELECT id, profile_key, linkedin_profile_url, email, phone_number
       FROM people
       WHERE ${personClauses.join(" OR ")};`
    )
    : [];
  const existingPeopleByInputKey = new Map();

  importablePeople.forEach((person) => {
    const matches = matchingPeopleForInput(person, existingPeople);
    if (matches.length > 1) {
      throw new Error(`${person.name} matches multiple existing people: ${matches.map((row) => row.id).join(", ")}`);
    }
    if (matches.length === 1) {
      const [match] = matches;
      if (
        person.linkedin_profile_url &&
        match.linkedin_profile_url &&
        match.linkedin_profile_url !== person.linkedin_profile_url
      ) {
        throw new Error(`${person.name} matches existing person ${match.id} by email, but LinkedIn URLs differ`);
      }
      existingPeopleByInputKey.set(person.profile_key, matches[0]);
    }
  });

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
          employee_count = COALESCE(${sqlIntegerValue(prospect.company.employee_count)}, employee_count),
          employee_count_range = COALESCE(${sqlString(prospect.company.employee_count_range)}, employee_count_range),
          notes = COALESCE(${sqlString(prospect.company.notes)}, notes)
      WHERE id = ${companyMatch.id};\n`;
    summary.company = "updated";
  } else {
    sql += `INSERT INTO companies
      (name, domain, linkedin_company_url, website_url, description, industry, location, employee_count, employee_count_range, notes)
      VALUES (
        ${sqlString(prospect.company.name)},
        ${sqlString(prospect.company.domain)},
        ${sqlString(prospect.company.linkedin_company_url)},
        ${sqlString(prospect.company.website_url)},
        ${sqlString(prospect.company.description)},
        ${sqlString(prospect.company.industry)},
        ${sqlString(prospect.company.location)},
        ${sqlIntegerValue(prospect.company.employee_count)},
        ${sqlString(prospect.company.employee_count_range)},
        ${sqlString(prospect.company.notes)}
      );\n`;
    summary.company = "inserted";
  }

  sql += `CREATE TEMP TABLE IF NOT EXISTS _prospect_ids (
    kind TEXT,
    key TEXT,
    id INTEGER,
    PRIMARY KEY (kind, key)
  );\n`;
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

    const existingPerson = existingPeopleByInputKey.get(person.profile_key);

    if (existingPerson) {
      sql += `UPDATE people
        SET linkedin_profile_url = COALESCE(linkedin_profile_url, ${sqlString(person.linkedin_profile_url)}),
            name = COALESCE(${sqlString(person.name)}, name),
            email = COALESCE(email, ${sqlString(person.email)}),
            phone_number = COALESCE(phone_number, ${sqlString(person.phone_number)}),
            qualified = MAX(qualified, ${sqlBoolean(person.qualified)}),
            notes = COALESCE(${sqlString(person.notes)}, notes)
        WHERE id = ${existingPerson.id};\n`;
      sql += `INSERT OR REPLACE INTO _prospect_ids (kind, key, id)
        VALUES ('person', ${sqlString(person.profile_key)}, ${existingPerson.id});\n`;
    } else {
      sql += `INSERT INTO people
        (profile_key, linkedin_profile_url, name, email, phone_number, status, qualified, notes)
        VALUES (
          ${sqlString(person.profile_key)},
          ${sqlString(person.linkedin_profile_url)},
          ${sqlString(person.name)},
          ${sqlString(person.email)},
          ${sqlString(person.phone_number)},
          ${sqlString(person.status || "New")},
          ${sqlBoolean(person.qualified)},
          ${sqlString(person.notes)}
        )
        ON CONFLICT(profile_key) DO UPDATE SET
          linkedin_profile_url = COALESCE(people.linkedin_profile_url, excluded.linkedin_profile_url),
          name = COALESCE(excluded.name, people.name),
          email = COALESCE(people.email, excluded.email),
          phone_number = COALESCE(people.phone_number, excluded.phone_number),
          qualified = MAX(people.qualified, excluded.qualified),
          notes = COALESCE(excluded.notes, people.notes);\n`;
      sql += `INSERT OR REPLACE INTO _prospect_ids (kind, key, id)
        SELECT 'person', ${sqlString(person.profile_key)}, id
        FROM people
        WHERE profile_key = ${sqlString(person.profile_key)}
        LIMIT 1;\n`;
    }
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
        JOIN _prospect_ids pp ON pp.kind = 'person'
          AND pp.key = ${sqlString(person.profile_key)}
        JOIN people p ON p.id = pp.id
        WHERE lower(c.domain) = lower(${sqlString(position.company_domain || prospect.company.domain)})
        LIMIT 1;\n`;
      summary.positions_inserted_or_existing += 1;
    });
  });

  sql += "COMMIT;\n";
  runSqliteExec(dbPath, sql);

  let affectedPeople = [];
  const existingPersonIds = unique(
    importablePeople.map((person) => existingPeopleByInputKey.get(person.profile_key)?.id)
  );
  const affectedWhere = [];
  if (importableProfileKeys.length > 0) {
    affectedWhere.push(`profile_key IN (${sqlInList(importableProfileKeys)})`);
  }
  if (existingPersonIds.length > 0) {
    affectedWhere.push(`id IN (${existingPersonIds.join(", ")})`);
  }

  if (affectedWhere.length > 0) {
    const affectedInputs = importablePeople.map((person, index) => ({
      index,
      person,
      existingPerson: existingPeopleByInputKey.get(person.profile_key) || null
    }));
    affectedPeople = runSqliteJson(
      dbPath,
       `SELECT id, profile_key, linkedin_profile_url, name, email, phone_number, status, qualified
       FROM people
       WHERE ${affectedWhere.join(" OR ")};`
    )
      .map((row) => ({
        input: affectedInputs.find((entry) => (
          entry.existingPerson?.id === row.id ||
          (!entry.existingPerson && entry.person.profile_key === row.profile_key)
        )),
        row
      }))
      .filter((entry) => entry.input)
      .map(({ input, row }) => ({
        id: row.id,
        profile_key: row.profile_key,
        linkedin_profile_url: row.linkedin_profile_url,
        name: row.name,
        email: row.email,
        phone_number: row.phone_number,
        status: row.status,
        qualified: Boolean(row.qualified),
        action: input.existingPerson ? "updated" : "inserted",
        email_status: row.email ? "present" : "missing",
        needs_email_lookup: !row.email,
        _sort_index: input.index
      }))
      .sort((a, b) => a._sort_index - b._sort_index)
      .map(({ _sort_index, ...row }) => row);
  }

  process.stdout.write(`${JSON.stringify({ ok: true, db: dbPath, summary, affected_people: affectedPeople }, null, 2)}\n`);
}

main();
