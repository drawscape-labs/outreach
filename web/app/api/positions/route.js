import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const positionSelect = {
  id: true,
  company_id: true,
  person_id: true,
  title: true,
  department: true,
  seniority: true,
  start_date: true,
  end_date: true,
  is_current: true,
  notes: true,
  created_at: true,
  updated_at: true
};

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function jsonError(error, status = 400) {
  return Response.json({ error }, { status });
}

function handleError(error) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status);
  }

  if (error?.code === "P2002") {
    return jsonError("A record with that unique value already exists.", 409);
  }

  if (error?.code === "P2003") {
    return jsonError("Related company or person was not found.", 400);
  }

  return jsonError("Database query failed.", 500);
}

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Request body must be valid JSON.");
  }
}

function payloadValue(payload, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(payload, name)) {
      return payload[name];
    }
  }

  return undefined;
}

function readText(payload, names, label) {
  const value = payloadValue(payload, names);

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(`${label} must be a string.`);
  }

  const text = String(value).trim();

  return text || null;
}

function readPositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(`${label} must be a positive integer.`);
  }

  return parsed;
}

function readBoolean(value, label) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === 1) {
    return 1;
  }

  if (value === false || value === 0) {
    return 0;
  }

  throw new ApiError(`${label} must be true or false.`);
}

function readBooleanFilter(value, label) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (value === "true" || value === "1" || value === "yes") {
    return 1;
  }

  if (value === "false" || value === "0" || value === "no") {
    return 0;
  }

  return readBoolean(value, label);
}

function sqliteTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function positionJson(position) {
  return {
    id: position.id,
    companyId: position.company_id,
    personId: position.person_id,
    title: position.title,
    department: position.department,
    seniority: position.seniority,
    startDate: position.start_date,
    endDate: position.end_date,
    isCurrent: Boolean(position.is_current),
    notes: position.notes,
    createdAt: position.created_at,
    updatedAt: position.updated_at
  };
}

function positionData(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }

  const data = {};

  if (payloadValue(payload, ["companyId", "company_id"]) !== undefined) {
    data.company_id = readPositiveInteger(
      payloadValue(payload, ["companyId", "company_id"]),
      "companyId"
    );
  } else if (!partial) {
    throw new ApiError("companyId is required.");
  }

  if (payloadValue(payload, ["personId", "person_id"]) !== undefined) {
    data.person_id = readPositiveInteger(
      payloadValue(payload, ["personId", "person_id"]),
      "personId"
    );
  } else if (!partial) {
    throw new ApiError("personId is required.");
  }

  const textFields = [
    ["title", ["title"], "title"],
    ["department", ["department"], "department"],
    ["seniority", ["seniority"], "seniority"],
    ["start_date", ["startDate", "start_date"], "startDate"],
    ["end_date", ["endDate", "end_date"], "endDate"],
    ["notes", ["notes"], "notes"]
  ];

  for (const [column, names, label] of textFields) {
    const value = readText(payload, names, label);

    if (value !== undefined) {
      data[column] = value;
    }
  }

  const isCurrent = readBoolean(
    payloadValue(payload, ["isCurrent", "is_current"]),
    "isCurrent"
  );

  if (isCurrent !== undefined) {
    data.is_current = isCurrent;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one position field.");
  }

  return data;
}

function revalidatePosition(position) {
  const paths = new Set(["/", "/people", "/companies", "/contacted", "/replied", "/converted"]);

  if (position?.person_id) {
    paths.add(`/people/${position.person_id}`);
  }

  if (position?.company_id) {
    paths.add(`/companies/${position.company_id}`);
  }

  paths.forEach((path) => revalidatePath(path));
}

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const where = {};
    const currentValue =
      searchParams.get("isCurrent") ??
      searchParams.get("is_current") ??
      searchParams.get("current");
    const isCurrent = readBooleanFilter(currentValue, "isCurrent");

    if (searchParams.has("companyId") || searchParams.has("company_id")) {
      where.company_id = readPositiveInteger(
        searchParams.get("companyId") || searchParams.get("company_id"),
        "companyId"
      );
    }

    if (searchParams.has("personId") || searchParams.has("person_id")) {
      where.person_id = readPositiveInteger(
        searchParams.get("personId") || searchParams.get("person_id"),
        "personId"
      );
    }

    if (isCurrent !== undefined) {
      where.is_current = isCurrent;
    }

    const positions = await prisma.positions.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: positionSelect
    });

    return Response.json({ positions: positions.map(positionJson) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const timestamp = sqliteTimestamp();
    const position = await prisma.positions.create({
      data: {
        ...positionData(payload),
        created_at: timestamp,
        updated_at: timestamp
      },
      select: positionSelect
    });

    revalidatePosition(position);

    return Response.json({ position: positionJson(position) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
