#!/usr/bin/env node
const {
  normalizeTitle,
  parseArgs,
  readJson,
  runSqliteJson,
  sqlString,
  validateProspect
} = require("./prospect-utils");

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function inList(values) {
  return values.map(sqlString).join(", ");
}

function groupBy(values, key) {
  const map = new Map();
  values.forEach((value) => {
    const groupKey = value[key];
    if (!map.has(groupKey)) map.set(groupKey, []);
    map.get(groupKey).push(value);
  });
  return map;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  const dbPath = args.db || "data/outreach.sqlite";

  if (!inputPath) {
    console.error("Usage: node check-duplicates.js <prospect.json> [--db data/outreach.sqlite]");
    process.exit(2);
  }

  const validation = validateProspect(readJson(inputPath));
  const prospect = validation.normalized;
  const report = {
    ok: validation.errors.length === 0,
    db: dbPath,
    validation: {
      errors: validation.errors,
      warnings: validation.warnings
    },
    summary: {
      company_action: "review",
      people_insert: 0,
      people_update: 0,
      people_skip: 0,
      position_insert: 0,
      position_exists: 0,
      position_skip: 0,
      conflicts: 0
    },
    company: {
      input: prospect.company,
      matches: [],
      action: "review",
      conflicts: []
    },
    people: [],
    positions: [],
    conflicts: []
  };

  if (validation.errors.length > 0) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(1);
  }

  const companyMatches = runSqliteJson(
    dbPath,
    `SELECT id, name, domain, linkedin_company_url AS linkedin_company_url
     FROM companies
     WHERE lower(domain) = lower(${sqlString(prospect.company.domain)})
        OR linkedin_company_url = ${sqlString(prospect.company.linkedin_company_url)};`
  );
  report.company.matches = companyMatches;

  const companyIds = unique(companyMatches.map((company) => company.id));
  if (companyIds.length === 0) {
    report.company.action = "insert";
  } else if (companyIds.length === 1) {
    report.company.action = "update";
  } else {
    report.company.action = "conflict";
    report.company.conflicts.push("Domain and LinkedIn company URL match different existing rows.");
    report.conflicts.push({ type: "company", message: report.company.conflicts[0], matches: companyMatches });
  }
  report.summary.company_action = report.company.action;

  const profileKeys = unique(prospect.people.map((person) => person.profile_key));
  const profileUrls = unique(prospect.people.map((person) => person.linkedin_profile_url));
  const emails = unique(prospect.people.map((person) => person.email));
  const personClauses = [];
  if (profileKeys.length) personClauses.push(`profile_key IN (${inList(profileKeys)})`);
  if (profileUrls.length) personClauses.push(`linkedin_profile_url IN (${inList(profileUrls)})`);
  if (emails.length) personClauses.push(`email IN (${inList(emails)})`);

  const personMatches = personClauses.length
    ? runSqliteJson(
        dbPath,
        `SELECT id, profile_key, linkedin_profile_url, name, email, phone_number, status, qualified
         FROM people
         WHERE ${personClauses.join(" OR ")};`
      )
    : [];

  const byProfileKey = groupBy(personMatches, "profile_key");
  const byProfileUrl = groupBy(personMatches, "linkedin_profile_url");
  const byEmail = groupBy(personMatches, "email");
  const matchedPersonIds = unique(personMatches.map((person) => person.id));
  const allCompanyIds = unique([...companyIds]);
  const existingPositions = matchedPersonIds.length || allCompanyIds.length
    ? runSqliteJson(
        dbPath,
        `SELECT pos.id,
                pos.company_id,
                pos.person_id,
                pos.title,
                pos.start_date,
                pos.is_current,
                c.domain AS company_domain,
                p.profile_key
         FROM positions pos
         JOIN companies c ON c.id = pos.company_id
         JOIN people p ON p.id = pos.person_id
         WHERE ${[
           matchedPersonIds.length ? `pos.person_id IN (${matchedPersonIds.join(", ")})` : "",
           allCompanyIds.length ? `pos.company_id IN (${allCompanyIds.join(", ")})` : ""
         ].filter(Boolean).join(" OR ")};`
      )
    : [];

  prospect.people.forEach((person) => {
    const matches = unique([
      ...(byProfileKey.get(person.profile_key) || []),
      ...(byProfileUrl.get(person.linkedin_profile_url) || []),
      ...(person.email ? (byEmail.get(person.email) || []) : [])
    ].map((match) => match.id)).map((id) => personMatches.find((match) => match.id === id));

    const importable = ["high", "medium"].includes(person.confidence);
    const conflictingLinkedInMatch = matches.find((match) => (
      person.linkedin_profile_url &&
      match.linkedin_profile_url &&
      match.linkedin_profile_url !== person.linkedin_profile_url
    ));
    const personReport = {
      input: person,
      matches,
      action: "skip",
      reason: null,
      conflicts: []
    };

    if (!importable) {
      personReport.reason = `confidence is ${person.confidence}`;
      report.summary.people_skip += 1;
    } else if (matches.length === 0) {
      personReport.action = "insert";
      report.summary.people_insert += 1;
    } else if (conflictingLinkedInMatch) {
      personReport.action = "conflict";
      personReport.conflicts.push("Email matches an existing person with a different LinkedIn URL.");
      report.conflicts.push({ type: "person", person: person.name, matches });
      report.summary.conflicts += 1;
    } else if (matches.length === 1) {
      personReport.action = "update";
      report.summary.people_update += 1;
    } else {
      personReport.action = "conflict";
      personReport.conflicts.push("Person identifiers match multiple existing rows.");
      report.conflicts.push({ type: "person", person: person.name, matches });
      report.summary.conflicts += 1;
    }

    report.people.push(personReport);

    person.positions.forEach((position) => {
      const positionImportable = importable && ["high", "medium"].includes(position.confidence) && matches.length <= 1;
      const matchedPersonId = matches.length === 1 ? matches[0].id : null;
      const existing = existingPositions.filter((existingPosition) => (
        (matchedPersonId
          ? existingPosition.person_id === matchedPersonId
          : existingPosition.profile_key === person.profile_key) &&
        existingPosition.company_domain === position.company_domain &&
        normalizeTitle(existingPosition.title) === position.normalized_title &&
        (existingPosition.start_date || null) === (position.start_date || null)
      ));

      const positionReport = {
        person: person.name,
        input: position,
        matches: existing,
        action: "skip",
        reason: null
      };

      if (!positionImportable) {
        positionReport.reason = !importable ? `person confidence is ${person.confidence}` : `position confidence is ${position.confidence}`;
        report.summary.position_skip += 1;
      } else if (existing.length > 0) {
        positionReport.action = "exists";
        report.summary.position_exists += 1;
      } else {
        positionReport.action = "insert";
        report.summary.position_insert += 1;
      }

      report.positions.push(positionReport);
    });
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.conflicts.length > 0) process.exit(1);
}

main();
