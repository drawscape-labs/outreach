import { query, sqlInteger } from "./db";
import { isLeadStatus } from "./statuses";

export function getCompanies() {
  return query(`
    SELECT
      c.id,
      c.name,
      c.domain,
      c.linkedin_company_url AS linkedinCompanyUrl,
      c.website_url AS websiteUrl,
      c.description,
      c.industry,
      c.location,
      c.notes,
      COUNT(pos.id) AS positionCount,
      COUNT(DISTINCT pos.person_id) AS peopleCount,
      COUNT(DISTINCT CASE
        WHEN p.status IN ('Contacted', 'Replied', 'Converted') THEN pos.person_id
      END) AS contactedCount,
      COUNT(DISTINCT CASE
        WHEN p.status IN ('Replied', 'Converted') THEN pos.person_id
      END) AS repliedCount,
      COUNT(DISTINCT CASE
        WHEN p.status = 'Converted' THEN pos.person_id
      END) AS convertedCount
    FROM companies c
    LEFT JOIN positions pos ON pos.company_id = c.id AND pos.is_current = 1
    LEFT JOIN people p ON p.id = pos.person_id
    GROUP BY c.id
    ORDER BY c.name;
  `);
}

export function getCompany(companyId) {
  const id = sqlInteger(companyId);

  if (!id) {
    return null;
  }

  const companies = query(`
    SELECT
      id,
      name,
      domain,
      linkedin_company_url AS linkedinCompanyUrl,
      website_url AS websiteUrl,
      description,
      industry,
      location,
      notes
    FROM companies
    WHERE id = ${id}
    LIMIT 1;
  `);

  return companies[0] || null;
}

export function getCompanyPositions(companyId) {
  const id = sqlInteger(companyId);

  if (!id) {
    return [];
  }

  return query(`
    SELECT
      pos.id,
      pos.title,
      pos.department,
      pos.seniority,
      pos.start_date AS startDate,
      pos.end_date AS endDate,
      pos.is_current AS isCurrent,
      pos.created_at AS positionCreatedAt,
      pos.notes,
      p.id AS personId,
      p.name AS personName,
      p.profile_key AS profileKey,
      p.linkedin_profile_url AS linkedinProfileUrl,
      p.email,
      p.status AS status,
      p.qualified AS qualified
    FROM positions pos
    JOIN people p ON p.id = pos.person_id
    WHERE pos.company_id = ${id}
      AND pos.is_current = 1
    ORDER BY pos.created_at DESC, pos.id DESC, p.name, pos.title;
  `);
}

export function getPerson(personId) {
  const id = sqlInteger(personId);

  if (!id) {
    return null;
  }

  const people = query(`
    SELECT
      id,
      profile_key AS profileKey,
      linkedin_profile_url AS linkedinProfileUrl,
      quickmail_lead_id AS quickmailLeadId,
      name,
      email,
      status,
      qualified,
      notes,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM people
    WHERE id = ${id}
    LIMIT 1;
  `);

  return people[0] || null;
}

export function getPersonPositions(personId) {
  const id = sqlInteger(personId);

  if (!id) {
    return [];
  }

  return query(`
    SELECT
      pos.id,
      pos.title,
      pos.department,
      pos.seniority,
      pos.start_date AS startDate,
      pos.end_date AS endDate,
      pos.is_current AS isCurrent,
      pos.notes,
      c.id AS companyId,
      c.name AS companyName,
      c.domain,
      c.linkedin_company_url AS linkedinCompanyUrl,
      c.website_url AS websiteUrl
    FROM positions pos
    JOIN companies c ON c.id = pos.company_id
    WHERE pos.person_id = ${id}
    ORDER BY pos.is_current DESC, pos.created_at DESC, pos.id DESC;
  `);
}

export function getPeople() {
  return query(`
    SELECT
      p.id,
      p.profile_key AS profileKey,
      p.linkedin_profile_url AS linkedinProfileUrl,
      p.name,
      p.email,
      p.status AS status,
      p.qualified AS qualified,
      MAX(pos.created_at) AS positionCreatedAt,
      COUNT(pos.id) AS positionCount,
      GROUP_CONCAT(DISTINCT c.name) AS companies,
      GROUP_CONCAT(c.id || '::' || c.name, '||') AS companyRefs,
      GROUP_CONCAT(NULLIF(pos.title, ''), '||') AS currentPositionTitles
    FROM people p
    JOIN positions pos ON pos.person_id = p.id AND pos.is_current = 1
    LEFT JOIN companies c ON c.id = pos.company_id
    GROUP BY p.id
    ORDER BY positionCreatedAt DESC, p.name;
  `);
}

export function getPeopleByStatus(status) {
  return getPeopleByStatuses([status]);
}

export function getPeopleByStatuses(statuses) {
  const leadStatuses = statuses.filter((status) => isLeadStatus(status));

  if (!leadStatuses.length) {
    return [];
  }

  const statusList = leadStatuses.map((status) => `'${status}'`).join(", ");

  return query(`
    SELECT
      p.id,
      p.profile_key AS profileKey,
      p.linkedin_profile_url AS linkedinProfileUrl,
      p.name,
      p.email,
      p.status AS status,
      p.qualified AS qualified,
      MAX(pos.created_at) AS positionCreatedAt,
      COUNT(pos.id) AS positionCount,
      GROUP_CONCAT(DISTINCT c.name) AS companies,
      GROUP_CONCAT(c.id || '::' || c.name, '||') AS companyRefs,
      GROUP_CONCAT(NULLIF(pos.title, ''), '||') AS currentPositionTitles
    FROM people p
    JOIN positions pos ON pos.person_id = p.id AND pos.is_current = 1
    LEFT JOIN companies c ON c.id = pos.company_id
    WHERE p.status IN (${statusList})
    GROUP BY p.id
    ORDER BY
      positionCreatedAt DESC,
      p.name;
  `);
}

export function getRepliedProspects() {
  return getPeopleByStatuses(["Replied", "Converted"]);
}
