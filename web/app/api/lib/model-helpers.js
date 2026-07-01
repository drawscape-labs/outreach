// Shared API route validation and Prisma error handling helpers.
// Keep generic request parsing, coercion, and error mapping here; model rules belong with each model.
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonError(error, status = 400) {
  return Response.json({ error }, { status });
}

export function handleApiError(
  error,
  {
    conflictMessage = "A record with that unique value already exists.",
    fallbackMessage = "Database query failed.",
    foreignKeyMessage,
    notFoundMessage
  } = {}
) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status);
  }

  if (error?.code === "P2002") {
    return jsonError(conflictMessage, 409);
  }

  if (error?.code === "P2003" && foreignKeyMessage) {
    return jsonError(foreignKeyMessage, 400);
  }

  if (error?.code === "P2025" && notFoundMessage) {
    return jsonError(notFoundMessage, 404);
  }

  return jsonError(fallbackMessage, 500);
}

export async function readId(context, label) {
  const { id } = await context.params;
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(`Invalid ${label} id.`);
  }

  return parsed;
}

export async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Request body must be valid JSON.");
  }
}

export function assertPayloadObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }
}

export function payloadValue(payload, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(payload, name)) {
      return payload[name];
    }
  }

  return undefined;
}

export function readText(
  payload,
  names,
  label,
  { nullAsUndefined = false, required = false } = {}
) {
  const value = payloadValue(payload, names);

  if (value === undefined) {
    if (required) {
      throw new ApiError(`${label} is required.`);
    }

    return undefined;
  }

  if (value === null) {
    if (required) {
      throw new ApiError(`${label} is required.`);
    }

    return nullAsUndefined ? undefined : null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(`${label} must be a string.`);
  }

  const text = String(value).trim();

  if (!text) {
    if (required) {
      throw new ApiError(`${label} is required.`);
    }

    return null;
  }

  return text;
}

export function readBoolean(value, label) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  throw new ApiError(`${label} must be true or false.`);
}

export function readBooleanFilter(value, label) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (value === "true" || value === "1" || value === "yes") {
    return true;
  }

  if (value === "false" || value === "0" || value === "no") {
    return false;
  }

  return readBoolean(value, label);
}

export function readPositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(`${label} must be a positive integer.`);
  }

  return parsed;
}

export function readNonNegativeInteger(payload, names, label) {
  const value = payloadValue(payload, names);

  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError(`${label} must be zero or a positive integer.`);
  }

  return parsed;
}

function readModelField(payload, field, { partial }) {
  const required = !partial && field.requiredOnCreate;
  const type = field.type || "text";

  if (type === "text") {
    return readText(payload, field.names, field.label, {
      nullAsUndefined: !partial && field.nullAsUndefinedOnCreate === true,
      required
    });
  }

  const value = payloadValue(payload, field.names);

  if (value === undefined) {
    if (required) {
      throw new ApiError(`${field.label} is required.`);
    }

    return undefined;
  }

  if (type === "boolean") {
    return readBoolean(value, field.label);
  }

  if (type === "nonNegativeInteger") {
    if (value === null || value === "") {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new ApiError(`${field.label} must be zero or a positive integer.`);
    }

    return parsed;
  }

  if (type === "positiveInteger") {
    return readPositiveInteger(value, field.label);
  }

  throw new ApiError(`Unsupported field type for ${field.label}.`, 500);
}

export function buildModelData(
  payload,
  { emptyPatchMessage, fields, partial = false }
) {
  assertPayloadObject(payload);

  const data = {};

  for (const field of fields) {
    const value = readModelField(payload, field, { partial });

    if (value === undefined) {
      continue;
    }

    const normalizedValue = field.normalize
      ? field.normalize(value, { field, partial, payload })
      : value;

    if (
      normalizedValue !== null &&
      field.allowedValues &&
      !field.allowedValues.includes(normalizedValue)
    ) {
      throw new ApiError(field.invalidMessage || `Invalid ${field.label}.`);
    }

    if (field.validate) {
      field.validate(normalizedValue, { field, partial, payload });
    }

    data[field.column] = normalizedValue;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError(emptyPatchMessage);
  }

  return data;
}

export function normalizeWhitespace(value) {
  if (value === null || value === undefined) {
    return value;
  }

  return String(value).trim().replace(/\s+/g, " ");
}

export function normalizeLowercaseText(value) {
  if (value === null || value === undefined) {
    return value;
  }

  return String(value).trim().toLowerCase();
}

export function normalizeDomain(value) {
  if (value === null || value === undefined) {
    return value;
  }

  let input = String(value).trim();

  if (!input) {
    return null;
  }

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    input = `https://${input}`;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");

    return hostname || null;
  } catch {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/\.$/, "") || null;
  }
}

export function normalizeUrl(value, message = "URL must be valid.") {
  if (value === null || value === undefined) {
    return value;
  }

  let input = String(value).trim();

  if (!input) {
    return null;
  }

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    input = `https://${input}`;
  }

  try {
    const url = new URL(input);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol.");
    }

    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");

    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ApiError(message);
  }
}

export function normalizeLinkedInCompanyUrl(value, message) {
  const normalizedUrl = normalizeUrl(value, message);

  if (normalizedUrl === null || normalizedUrl === undefined) {
    return normalizedUrl;
  }

  try {
    const url = new URL(normalizedUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);

    if (
      hostname !== "linkedin.com" ||
      segments[0]?.toLowerCase() !== "company" ||
      !segments[1]
    ) {
      throw new Error("Invalid LinkedIn company URL.");
    }

    return `https://www.linkedin.com/company/${segments[1]}`;
  } catch {
    throw new ApiError(message);
  }
}

export function normalizeLinkedInProfileUrl(value, message) {
  const normalizedUrl = normalizeUrl(value, message);

  if (normalizedUrl === null || normalizedUrl === undefined) {
    return normalizedUrl;
  }

  try {
    const url = new URL(normalizedUrl);
    const hostname = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);
    const profileType = segments[0]?.toLowerCase();
    const handle = segments[1];

    if (
      (hostname !== "linkedin.com" && !hostname.endsWith(".linkedin.com")) ||
      !["in", "pub"].includes(profileType) ||
      !handle ||
      /\s/.test(handle) ||
      handle.includes("/") ||
      handle.includes("?") ||
      handle.includes("#")
    ) {
      throw new Error("Invalid LinkedIn profile URL.");
    }

    return `https://www.linkedin.com/${profileType}/${handle}`;
  } catch {
    throw new ApiError(message);
  }
}
