#!/usr/bin/env node
const {
  normalizeTitle,
  parseArgs,
  readJson,
  validateProspect
} = require("./prospect-utils");

function importable(record, includeLow) {
  return includeLow || ["high", "medium"].includes(record.confidence);
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== null && value !== undefined && value !== "")));
}

function getSingleMatch(rows, label, conflicts) {
  const ids = unique(rows.map((row) => row.id));
  if (ids.length > 1) {
    conflicts.push({
      type: label,
      message: `${label} matches multiple existing rows: ${ids.join(", ")}`,
      matches: rows
    });
    return null;
  }
  return rows[0] || null;
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

function addValue(payload, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    payload[key] = value;
  }
}

function addInteger(payload, key, value) {
  if (Number.isInteger(value)) {
    payload[key] = value;
  }
}

function companyCreatePayload(company) {
  const payload = {
    name: company.name,
    domain: company.domain,
    linkedin_company_url: company.linkedin_company_url
  };

  addValue(payload, "website_url", company.website_url);
  addValue(payload, "description", company.description);
  addValue(payload, "category", company.category);
  addValue(payload, "industry", company.industry);
  addValue(payload, "location", company.location);
  addInteger(payload, "employee_count", company.employee_count);
  addValue(payload, "employee_count_range", company.employee_count_range);
  addValue(payload, "date_enriched", company.date_enriched);
  addValue(payload, "notes", company.notes);

  return payload;
}

function companyPatchPayload(company) {
  const payload = {};

  addValue(payload, "name", company.name);
  addValue(payload, "website_url", company.website_url);
  addValue(payload, "description", company.description);
  addValue(payload, "category", company.category);
  addValue(payload, "industry", company.industry);
  addValue(payload, "location", company.location);
  addInteger(payload, "employee_count", company.employee_count);
  addValue(payload, "employee_count_range", company.employee_count_range);
  addValue(payload, "date_enriched", company.date_enriched);
  addValue(payload, "notes", company.notes);

  return payload;
}

function personCreatePayload(person) {
  const payload = {
    profile_key: person.profile_key,
    name: person.name,
    status: person.status || "New",
    qualified: Boolean(person.qualified)
  };

  addValue(payload, "linkedin_profile_url", person.linkedin_profile_url);
  addValue(payload, "email", person.email);
  addValue(payload, "phone_number", person.phone_number);
  addValue(payload, "notes", person.notes);

  return payload;
}

function personPatchPayload(person, existingPerson) {
  const payload = {};

  addValue(payload, "name", person.name);
  if (!existingPerson.linkedin_profile_url) addValue(payload, "linkedin_profile_url", person.linkedin_profile_url);
  if (!existingPerson.email) addValue(payload, "email", person.email);
  if (!existingPerson.phone_number) addValue(payload, "phone_number", person.phone_number);
  if (person.qualified && !Boolean(existingPerson.qualified)) payload.qualified = true;
  addValue(payload, "notes", person.notes);

  return payload;
}

function positionCreatePayload(position, companyId, personId) {
  const payload = {
    company_id: companyId,
    person_id: personId,
    is_current: position.is_current
  };

  addValue(payload, "title", position.title);
  addValue(payload, "department", position.department);
  addValue(payload, "seniority", position.seniority);
  addValue(payload, "start_date", position.start_date);
  addValue(payload, "end_date", position.end_date);
  addValue(payload, "notes", position.notes);

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

function apiCompanyToRow(company) {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    linkedin_company_url: company.linkedinCompanyUrl,
    website_url: company.websiteUrl,
    description: company.description,
    category: company.category,
    industry: company.industry,
    location: company.location,
    employee_count: company.employeeCount,
    employee_count_range: company.employeeCountRange,
    date_enriched: company.dateEnriched,
    notes: company.notes
  };
}

function apiPersonToRow(person) {
  return {
    id: person.id,
    profile_key: person.profileKey,
    linkedin_profile_url: person.linkedinProfileUrl,
    name: person.name,
    email: person.email,
    phone_number: person.phoneNumber,
    status: person.status,
    qualified: Boolean(person.qualified),
    notes: person.notes
  };
}

function apiPositionToRow(position) {
  return {
    id: position.id,
    company_id: position.companyId,
    person_id: position.personId,
    title: position.title,
    start_date: position.startDate,
    is_current: Boolean(position.isCurrent)
  };
}

async function findCompanies(apiBase, params) {
  const searchParams = new URLSearchParams(params);
  const data = await apiJson(apiBase, `/api/companies?${searchParams.toString()}`);
  return (data.companies || []).map(apiCompanyToRow);
}

async function companyMatches(apiBase, company) {
  const matchesById = new Map();
  const lookups = [];

  if (company.domain) {
    lookups.push(findCompanies(apiBase, { domain: company.domain }));
  }
  if (company.linkedin_company_url) {
    lookups.push(findCompanies(apiBase, { linkedin_company_url: company.linkedin_company_url }));
  }

  for (const matches of await Promise.all(lookups)) {
    matches.forEach((match) => matchesById.set(match.id, match));
  }

  return Array.from(matchesById.values());
}

async function findPeople(apiBase, params) {
  const searchParams = new URLSearchParams(params);
  const data = await apiJson(apiBase, `/api/people?${searchParams.toString()}`);
  return (data.people || []).map(apiPersonToRow);
}

async function personMatches(apiBase, importablePeople) {
  const profileKeys = unique(importablePeople.map((person) => person.profile_key));
  const profileUrls = unique(importablePeople.map((person) => person.linkedin_profile_url));
  const emails = unique(importablePeople.map((person) => person.email));
  const matchesById = new Map();
  const lookups = [
    ...profileKeys.map((profileKey) => findPeople(apiBase, { profile_key: profileKey })),
    ...profileUrls.map((linkedinProfileUrl) => findPeople(apiBase, { linkedin_profile_url: linkedinProfileUrl })),
    ...emails.map((emailAddress) => findPeople(apiBase, { email_address: emailAddress }))
  ];

  for (const matches of await Promise.all(lookups)) {
    matches.forEach((match) => matchesById.set(match.id, match));
  }

  return Array.from(matchesById.values());
}

async function existingPositions(apiBase, companyId, personIds) {
  const ids = unique(personIds);
  if (!companyId || ids.length === 0) return [];

  const rows = [];
  for (const personId of ids) {
    const searchParams = new URLSearchParams({
      company_id: String(companyId),
      person_id: String(personId)
    });
    const data = await apiJson(apiBase, `/api/positions?${searchParams.toString()}`);
    rows.push(...(data.positions || []).map(apiPositionToRow));
  }

  return rows;
}

function hasExistingPosition(rows, companyId, personId, position) {
  return rows.some((row) => (
    row.company_id === companyId &&
    row.person_id === personId &&
    normalizeTitle(row.title) === position.normalized_title &&
    (row.start_date || null) === (position.start_date || null)
  ));
}

async function buildPlan(prospect, apiBase, includeLow) {
  const conflicts = [];
  const importablePeople = prospect.people.filter((person) => importable(person, includeLow));
  const companyMatch = getSingleMatch(await companyMatches(apiBase, prospect.company), "company", conflicts);
  const existingPeople = await personMatches(apiBase, importablePeople);
  const people = [];

  importablePeople.forEach((person) => {
    const matches = matchingPeopleForInput(person, existingPeople);
    const plan = {
      person,
      action: "insert",
      existing_person: null,
      conflicts: []
    };

    if (matches.length > 1) {
      plan.action = "conflict";
      plan.conflicts.push(`${person.name} matches multiple existing people: ${matches.map((row) => row.id).join(", ")}`);
      conflicts.push({ type: "person", person: person.name, matches });
    } else if (matches.length === 1) {
      const [match] = matches;
      const conflictingLinkedIn =
        person.linkedin_profile_url &&
        match.linkedin_profile_url &&
        match.linkedin_profile_url !== person.linkedin_profile_url;

      if (conflictingLinkedIn) {
        plan.action = "conflict";
        plan.conflicts.push(`${person.name} matches existing person ${match.id} by email, but LinkedIn URLs differ`);
        conflicts.push({ type: "person", person: person.name, matches });
      } else {
        plan.action = "update";
        plan.existing_person = match;
      }
    }

    people.push(plan);
  });

  return {
    company: {
      action: companyMatch ? "update" : "insert",
      existing_company: companyMatch
    },
    people,
    conflicts,
    skipped_people: prospect.people.filter((person) => !importable(person, includeLow))
  };
}

function planSummary(plan, validation) {
  return {
    company: plan.company.action,
    people_insert: plan.people.filter((entry) => entry.action === "insert").length,
    people_update: plan.people.filter((entry) => entry.action === "update").length,
    people_conflict: plan.people.filter((entry) => entry.action === "conflict").length,
    people_skip: plan.skipped_people.length,
    warnings: validation.warnings
  };
}

async function applyPlan({ apiBase, includeLow, plan, prospect, validation }) {
  const summary = {
    company: "skipped",
    people_inserted_or_updated: 0,
    people_inserted: 0,
    people_updated: 0,
    people_skipped: plan.skipped_people.length,
    positions_inserted_or_existing: 0,
    positions_inserted: 0,
    positions_existing: 0,
    positions_skipped: plan.skipped_people.reduce((total, person) => total + person.positions.length, 0),
    warnings: validation.warnings
  };

  let company;
  if (plan.company.action === "update") {
    const payload = companyPatchPayload(prospect.company);
    const response = await apiJson(apiBase, `/api/companies/${plan.company.existing_company.id}`, {
      method: "PATCH",
      body: payload
    });
    company = response.company;
    summary.company = "updated";
  } else {
    const response = await apiJson(apiBase, "/api/companies", {
      method: "POST",
      body: companyCreatePayload(prospect.company)
    });
    company = response.company;
    summary.company = "inserted";
  }

  const affectedPeople = [];
  const peopleByProfileKey = new Map();

  for (const entry of plan.people) {
    if (entry.action === "conflict") continue;

    const action = entry.action;
    const person = entry.person;
    const response = action === "update"
      ? await apiJson(apiBase, `/api/people/${entry.existing_person.id}`, {
        method: "PATCH",
        body: personPatchPayload(person, entry.existing_person)
      })
      : await apiJson(apiBase, "/api/people", {
        method: "POST",
        body: personCreatePayload(person)
      });
    const apiPerson = response.person;

    peopleByProfileKey.set(person.profile_key, apiPerson);
    affectedPeople.push({
      id: apiPerson.id,
      profile_key: apiPerson.profileKey,
      linkedin_profile_url: apiPerson.linkedinProfileUrl,
      name: apiPerson.name,
      email: apiPerson.email,
      phone_number: apiPerson.phoneNumber,
      status: apiPerson.status,
      qualified: Boolean(apiPerson.qualified),
      action: action === "update" ? "updated" : "inserted",
      email_status: apiPerson.email ? "present" : "missing",
      needs_email_lookup: !apiPerson.email
    });

    summary.people_inserted_or_updated += 1;
    if (action === "update") summary.people_updated += 1;
    else summary.people_inserted += 1;
  }

  const existingPositionRows = await existingPositions(
    apiBase,
    company.id,
    affectedPeople.map((person) => person.id)
  );

  for (const entry of plan.people) {
    if (entry.action === "conflict") {
      summary.positions_skipped += entry.person.positions.length;
      continue;
    }

    const person = peopleByProfileKey.get(entry.person.profile_key);
    if (!person) continue;

    for (const position of entry.person.positions) {
      if (!importable(position, includeLow)) {
        summary.positions_skipped += 1;
        continue;
      }

      if (hasExistingPosition(existingPositionRows, company.id, person.id, position)) {
        summary.positions_inserted_or_existing += 1;
        summary.positions_existing += 1;
        continue;
      }

      const response = await apiJson(apiBase, "/api/positions", {
        method: "POST",
        body: positionCreatePayload(position, company.id, person.id)
      });
      existingPositionRows.push({
        id: response.position.id,
        company_id: response.position.companyId,
        person_id: response.position.personId,
        title: response.position.title,
        start_date: response.position.startDate,
        is_current: response.position.isCurrent
      });
      summary.positions_inserted_or_existing += 1;
      summary.positions_inserted += 1;
    }
  }

  return { summary, affected_people: affectedPeople };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  const includeLow = Boolean(args["include-low"]);
  const apiBase = apiBaseUrl(args["api-base"] || process.env.PROSPECT_API_BASE || process.env.DRAWSCAPE_API_BASE);

  if (!inputPath) {
    console.error("Usage: node upsert-prospects.js <prospect.json> --apply [--api-base http://localhost:4200] [--include-low]");
    process.exit(2);
  }

  const validation = validateProspect(readJson(inputPath));
  if (validation.errors.length > 0) {
    process.stdout.write(`${JSON.stringify({ ok: false, errors: validation.errors, warnings: validation.warnings }, null, 2)}\n`);
    process.exit(1);
  }

  const prospect = validation.normalized;
  const plan = await buildPlan(prospect, apiBase, includeLow);

  if (plan.conflicts.length > 0) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      api_base: apiBase,
      summary: planSummary(plan, validation),
      conflicts: plan.conflicts
    }, null, 2)}\n`);
    process.exit(1);
  }

  if (!args.apply) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      mode: "plan",
      api_base: apiBase,
      summary: planSummary(plan, validation)
    }, null, 2)}\n`);
    return;
  }

  const result = await applyPlan({ apiBase, includeLow, plan, prospect, validation });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    mode: "apply",
    api_base: apiBase,
    ...result
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`);
  process.exit(1);
});
