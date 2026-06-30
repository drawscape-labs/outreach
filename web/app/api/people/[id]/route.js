import { revalidatePath } from "next/cache";
import prisma from "../../../../lib/prisma";
import { isLeadStatus } from "../../../../lib/statuses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const personSelect = {
  id: true,
  profile_key: true,
  linkedin_profile_url: true,
  quickmail_lead_id: true,
  name: true,
  email: true,
  phone_number: true,
  status: true,
  qualified: true,
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

  if (error?.code === "P2025") {
    return jsonError("Person not found.", 404);
  }

  return jsonError("Database query failed.", 500);
}

async function readId(context) {
  const { id } = await context.params;
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError("Invalid person id.");
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

function personJson(person) {
  return {
    id: person.id,
    profileKey: person.profile_key,
    linkedinProfileUrl: person.linkedin_profile_url,
    quickmailLeadId: person.quickmail_lead_id,
    name: person.name,
    email: person.email,
    phoneNumber: person.phone_number,
    status: person.status,
    qualified: Boolean(person.qualified),
    notes: person.notes,
    createdAt: person.created_at,
    updatedAt: person.updated_at
  };
}

function personPatchData(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }

  const data = {};
  const textFields = [
    ["profile_key", ["profileKey", "profile_key"], "profileKey"],
    ["linkedin_profile_url", ["linkedinProfileUrl", "linkedin_profile_url"], "linkedinProfileUrl"],
    ["quickmail_lead_id", ["quickmailLeadId", "quickmail_lead_id"], "quickmailLeadId"],
    ["name", ["name"], "name"],
    ["email", ["email"], "email"],
    ["phone_number", ["phoneNumber", "phone_number"], "phoneNumber"],
    ["notes", ["notes"], "notes"]
  ];

  for (const [column, names, label] of textFields) {
    const value = readText(payload, names, label);

    if (value !== undefined) {
      data[column] = value;
    }
  }

  const status = payloadValue(payload, ["status"]);

  if (status !== undefined) {
    if (!isLeadStatus(status)) {
      throw new ApiError("Invalid status.");
    }

    data.status = status;
  }

  const qualified = readBoolean(payloadValue(payload, ["qualified"]), "qualified");

  if (qualified !== undefined) {
    data.qualified = qualified;
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one person field.");
  }

  return data;
}

function revalidatePerson(person) {
  ["/", "/people", "/companies", "/contacted", "/replied", "/converted", `/people/${person.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export async function GET(_request, context) {
  try {
    const id = await readId(context);
    const person = await prisma.people.findUnique({
      where: { id },
      select: personSelect
    });

    if (!person) {
      return jsonError("Person not found.", 404);
    }

    return Response.json({ person: personJson(person) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request, context) {
  try {
    const id = await readId(context);
    const payload = await readPayload(request);
    const result = await prisma.people.updateMany({
      where: { id },
      data: personPatchData(payload)
    });

    if (result.count === 0) {
      return jsonError("Person not found.", 404);
    }

    const person = await prisma.people.findUnique({
      where: { id },
      select: personSelect
    });

    revalidatePerson(person);

    return Response.json({ person: personJson(person) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request, context) {
  try {
    const id = await readId(context);
    const person = await prisma.people.findUnique({
      where: { id },
      select: personSelect
    });

    if (!person) {
      return jsonError("Person not found.", 404);
    }

    await prisma.people.delete({ where: { id } });
    revalidatePerson(person);

    return Response.json({
      deleted: true,
      person: personJson(person)
    });
  } catch (error) {
    return handleError(error);
  }
}
