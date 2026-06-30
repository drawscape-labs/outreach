import { revalidatePath } from "next/cache";
import prisma from "../../../../lib/prisma";

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

  if (error?.code === "P2025") {
    return jsonError("Position not found.", 404);
  }

  return jsonError("Database query failed.", 500);
}

async function readId(context) {
  const { id } = await context.params;
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError("Invalid position id.");
  }

  return parsed;
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

function positionPatchData(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }

  const data = {};

  if (payloadValue(payload, ["companyId", "company_id"]) !== undefined) {
    data.company_id = readPositiveInteger(
      payloadValue(payload, ["companyId", "company_id"]),
      "companyId"
    );
  }

  if (payloadValue(payload, ["personId", "person_id"]) !== undefined) {
    data.person_id = readPositiveInteger(
      payloadValue(payload, ["personId", "person_id"]),
      "personId"
    );
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

  if (Object.keys(data).length === 0) {
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

export async function GET(_request, context) {
  try {
    const id = await readId(context);
    const position = await prisma.positions.findUnique({
      where: { id },
      select: positionSelect
    });

    if (!position) {
      return jsonError("Position not found.", 404);
    }

    return Response.json({ position: positionJson(position) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request, context) {
  try {
    const id = await readId(context);
    const payload = await readPayload(request);
    const previousPosition = await prisma.positions.findUnique({
      where: { id },
      select: positionSelect
    });

    if (!previousPosition) {
      return jsonError("Position not found.", 404);
    }

    await prisma.positions.update({
      where: { id },
      data: positionPatchData(payload),
      select: { id: true }
    });

    const position = await prisma.positions.findUnique({
      where: { id },
      select: positionSelect
    });

    revalidatePosition(previousPosition);
    revalidatePosition(position);

    return Response.json({ position: positionJson(position) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request, context) {
  try {
    const id = await readId(context);
    const position = await prisma.positions.findUnique({
      where: { id },
      select: positionSelect
    });

    if (!position) {
      return jsonError("Position not found.", 404);
    }

    await prisma.positions.delete({ where: { id } });
    revalidatePosition(position);

    return Response.json({
      deleted: true,
      position: positionJson(position)
    });
  } catch (error) {
    return handleError(error);
  }
}
