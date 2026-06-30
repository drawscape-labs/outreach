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
