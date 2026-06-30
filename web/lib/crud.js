import { query, sqlInteger, sqlValue } from "./db";
import { isLeadStatus } from "./statuses";

export class CrudError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CrudError";
    this.status = status;
  }
}

const MODELS = Object.freeze({
  companies: {
    name: "companies",
    singular: "company",
    table: "companies",
    alias: "c",
    orderBy: "c.name COLLATE NOCASE, c.id",
    fields: {
      name: { column: "name", type: "requiredText" },
      domain: { column: "domain", type: "requiredText" },
      linkedinCompanyUrl: {
        column: "linkedin_company_url",
        type: "requiredText",
        aliases: ["linkedin_company_url"]
      },
      websiteUrl: {
        column: "website_url",
        type: "text",
        aliases: ["website_url"]
      },
      description: { column: "description", type: "text" },
      industry: { column: "industry", type: "text" },
      location: { column: "location", type: "text" },
      employeeCount: {
        column: "employee_count",
        type: "nonNegativeInteger",
        aliases: ["employee_count"]
      },
      employeeCountRange: {
        column: "employee_count_range",
        type: "text",
        aliases: ["employee_count_range"]
      },
      dateEnriched: {
        column: "date_enriched",
        type: "text",
        aliases: ["date_enriched"]
      },
      notes: { column: "notes", type: "text" }
    }
  },
  people: {
    name: "people",
    singular: "person",
    table: "people",
    alias: "p",
    orderBy: "p.created_at DESC, p.id DESC",
    fields: {
      profileKey: {
        column: "profile_key",
        type: "requiredText",
        aliases: ["profile_key"]
      },
      linkedinProfileUrl: {
        column: "linkedin_profile_url",
        type: "text",
        aliases: ["linkedin_profile_url"]
      },
      quickmailLeadId: {
        column: "quickmail_lead_id",
        type: "text",
        aliases: ["quickmail_lead_id"]
      },
      name: { column: "name", type: "requiredText" },
      email: { column: "email", type: "text" },
      phoneNumber: {
        column: "phone_number",
        type: "text",
        aliases: ["phone_number"]
      },
      status: { column: "status", type: "leadStatus" },
      qualified: { column: "qualified", type: "boolean" },
      notes: { column: "notes", type: "text" }
    }
  },
  positions: {
    name: "positions",
    singular: "position",
    table: "positions",
    alias: "pos",
    orderBy: "pos.created_at DESC, pos.id DESC",
    fields: {
      companyId: {
        column: "company_id",
        type: "positiveInteger",
        aliases: ["company_id"]
      },
      personId: {
        column: "person_id",
        type: "positiveInteger",
        aliases: ["person_id"]
      },
      title: { column: "title", type: "text" },
      department: { column: "department", type: "text" },
      seniority: { column: "seniority", type: "text" },
      startDate: {
        column: "start_date",
        type: "text",
        aliases: ["start_date"]
      },
      endDate: {
        column: "end_date",
        type: "text",
        aliases: ["end_date"]
      },
      isCurrent: {
        column: "is_current",
        type: "boolean",
        aliases: ["is_current"]
      },
      notes: { column: "notes", type: "text" }
    }
  }
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function getModel(modelName) {
  const model = MODELS[modelName];

  if (!model) {
    throw new CrudError("Unknown model.", 404);
  }

  return model;
}

function publicFieldNames(model) {
  return Object.keys(model.fields);
}

function resultColumns(model, qualifier = "") {
  const prefix = qualifier ? `${qualifier}.` : "";

  return [
    `${prefix}id AS id`,
    ...Object.entries(model.fields).map(
      ([name, field]) => `${prefix}${field.column} AS "${name}"`
    ),
    `${prefix}created_at AS "createdAt"`,
    `${prefix}updated_at AS "updatedAt"`
  ].join(",\n      ");
}

function readPayloadValue(payload, name, field) {
  if (hasOwn(payload, name)) {
    return { found: true, value: payload[name] };
  }

  for (const alias of field.aliases || []) {
    if (hasOwn(payload, alias)) {
      return { found: true, value: payload[alias] };
    }
  }

  return { found: false };
}

function readText(value, fieldName, required = false) {
  if (value === null || value === undefined) {
    if (required) {
      throw new CrudError(`${fieldName} is required.`);
    }

    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new CrudError(`${fieldName} must be a string.`);
  }

  const text = String(value).trim();

  if (!text) {
    if (required) {
      throw new CrudError(`${fieldName} is required.`);
    }

    return null;
  }

  return text;
}

function readPositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new CrudError(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function readNonNegativeInteger(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CrudError(`${fieldName} must be zero or a positive integer.`);
  }

  return parsed;
}

function readBoolean(value, fieldName) {
  if (value === true || value === 1) {
    return 1;
  }

  if (value === false || value === 0) {
    return 0;
  }

  throw new CrudError(`${fieldName} must be true or false.`);
}

function readBooleanFilter(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value === "true" || value === "1" || value === "yes") {
    return 1;
  }

  if (value === "false" || value === "0" || value === "no") {
    return 0;
  }

  return readBoolean(value, fieldName);
}

function normalizeValue(field, fieldName, value) {
  switch (field.type) {
    case "requiredText":
      return readText(value, fieldName, true);
    case "text":
      return readText(value, fieldName);
    case "positiveInteger":
      return readPositiveInteger(value, fieldName);
    case "nonNegativeInteger":
      return readNonNegativeInteger(value, fieldName);
    case "boolean":
      return readBoolean(value, fieldName);
    case "leadStatus":
      if (!isLeadStatus(value)) {
        throw new CrudError("Invalid status.");
      }

      return value;
    default:
      throw new CrudError(`Unsupported field type for ${fieldName}.`);
  }
}

function normalizePayload(model, payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new CrudError("Request body must be an object.");
  }

  const values = {};

  for (const [name, field] of Object.entries(model.fields)) {
    const payloadValue = readPayloadValue(payload, name, field);

    if (!payloadValue.found) {
      if (!partial && field.type === "requiredText") {
        throw new CrudError(`${name} is required.`);
      }

      if (!partial && field.type === "positiveInteger") {
        throw new CrudError(`${name} is required.`);
      }

      continue;
    }

    values[name] = normalizeValue(field, name, payloadValue.value);
  }

  if (partial && Object.keys(values).length === 0) {
    throw new CrudError(`Provide at least one of: ${publicFieldNames(model).join(", ")}.`);
  }

  return values;
}

function buildAssignments(model, values) {
  return Object.entries(values).map(([name, value]) => {
    const field = model.fields[name];

    return `${field.column} = ${sqlValue(value)}`;
  });
}

function normalizeRecord(model, record) {
  if (!record) {
    return null;
  }

  const normalized = { ...record };

  for (const [name, field] of Object.entries(model.fields)) {
    if (field.type === "boolean" && normalized[name] !== null && normalized[name] !== undefined) {
      normalized[name] = Boolean(normalized[name]);
    }
  }

  return normalized;
}

function normalizeRecords(model, records) {
  return records.map((record) => normalizeRecord(model, record));
}

function buildListWhere(model, searchParams) {
  if (!searchParams) {
    return [];
  }

  const clauses = [];

  if (model.name === "people") {
    const status = searchParams.get("status");
    const qualified = readBooleanFilter(searchParams.get("qualified"), "qualified");
    const companyId = sqlInteger(searchParams.get("companyId") || searchParams.get("company_id"));

    if (status) {
      if (!isLeadStatus(status)) {
        throw new CrudError("Invalid status.");
      }

      clauses.push(`${model.alias}.status = ${sqlValue(status)}`);
    }

    if (qualified !== null) {
      clauses.push(`${model.alias}.qualified = ${qualified}`);
    }

    if (searchParams.has("companyId") || searchParams.has("company_id")) {
      if (!companyId) {
        throw new CrudError("companyId must be a positive integer.");
      }

      clauses.push(`EXISTS (
        SELECT 1
        FROM positions pos
        WHERE pos.person_id = ${model.alias}.id
          AND pos.company_id = ${companyId}
      )`);
    }
  }

  if (model.name === "companies") {
    const industry = searchParams.get("industry")?.trim();

    if (industry) {
      clauses.push(`${model.alias}.industry = ${sqlValue(industry)}`);
    }
  }

  if (model.name === "positions") {
    const companyId = sqlInteger(searchParams.get("companyId") || searchParams.get("company_id"));
    const personId = sqlInteger(searchParams.get("personId") || searchParams.get("person_id"));
    const currentValue =
      searchParams.get("isCurrent") ??
      searchParams.get("is_current") ??
      searchParams.get("current");
    const isCurrent = readBooleanFilter(currentValue, "isCurrent");

    if (searchParams.has("companyId") || searchParams.has("company_id")) {
      if (!companyId) {
        throw new CrudError("companyId must be a positive integer.");
      }

      clauses.push(`${model.alias}.company_id = ${companyId}`);
    }

    if (searchParams.has("personId") || searchParams.has("person_id")) {
      if (!personId) {
        throw new CrudError("personId must be a positive integer.");
      }

      clauses.push(`${model.alias}.person_id = ${personId}`);
    }

    if (isCurrent !== null) {
      clauses.push(`${model.alias}.is_current = ${isCurrent}`);
    }
  }

  return clauses;
}

export function listRecords(modelName, searchParams) {
  const model = getModel(modelName);
  const where = buildListWhere(model, searchParams);
  const records = query(`
    SELECT
      ${resultColumns(model, model.alias)}
    FROM ${model.table} ${model.alias}
    ${where.length ? `WHERE ${where.join("\n      AND ")}` : ""}
    ORDER BY ${model.orderBy};
  `);

  return normalizeRecords(model, records);
}

export function getRecord(modelName, rawId) {
  const model = getModel(modelName);
  const id = sqlInteger(rawId);

  if (!id) {
    throw new CrudError(`Invalid ${model.singular} id.`);
  }

  const records = query(`
    SELECT
      ${resultColumns(model, model.alias)}
    FROM ${model.table} ${model.alias}
    WHERE ${model.alias}.id = ${id}
    LIMIT 1;
  `);

  const record = normalizeRecord(model, records[0]);

  if (!record) {
    throw new CrudError(`${model.singular[0].toUpperCase()}${model.singular.slice(1)} not found.`, 404);
  }

  return record;
}

export function createRecord(modelName, payload) {
  const model = getModel(modelName);
  const values = normalizePayload(model, payload);
  const entries = Object.entries(values);
  const columns = entries.map(([name]) => model.fields[name].column).join(", ");
  const sqlValues = entries.map(([, value]) => sqlValue(value)).join(", ");
  const records = query(`
    INSERT INTO ${model.table} (${columns})
    VALUES (${sqlValues})
    RETURNING
      ${resultColumns(model)};
  `);

  return normalizeRecord(model, records[0]);
}

export function updateRecord(modelName, rawId, payload) {
  const model = getModel(modelName);
  const id = sqlInteger(rawId);

  if (!id) {
    throw new CrudError(`Invalid ${model.singular} id.`);
  }

  const values = normalizePayload(model, payload, { partial: true });
  const records = query(`
    UPDATE ${model.table}
    SET ${buildAssignments(model, values).join(", ")}
    WHERE id = ${id}
    RETURNING
      ${resultColumns(model)};
  `);

  const record = normalizeRecord(model, records[0]);

  if (!record) {
    throw new CrudError(`${model.singular[0].toUpperCase()}${model.singular.slice(1)} not found.`, 404);
  }

  return record;
}

export function deleteRecord(modelName, rawId) {
  const record = getRecord(modelName, rawId);
  const model = getModel(modelName);

  query(`
    DELETE FROM ${model.table}
    WHERE id = ${record.id};
  `);

  return record;
}
