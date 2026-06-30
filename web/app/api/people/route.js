import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";
import { isLeadStatus } from "../../../lib/statuses";

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

function readText(payload, names, label, { required = false } = {}) {
  const value = payloadValue(payload, names);

  if (value === undefined || value === null) {
    if (required) {
      throw new ApiError(`${label} is required.`);
    }

    return undefined;
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

function readPositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(`${label} must be a positive integer.`);
  }

  return parsed;
}

function sqliteTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
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

function personData(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }

  const data = {};
  const textFields = [
    ["profile_key", ["profileKey", "profile_key"], "profileKey", !partial],
    ["linkedin_profile_url", ["linkedinProfileUrl", "linkedin_profile_url"], "linkedinProfileUrl", false],
    ["quickmail_lead_id", ["quickmailLeadId", "quickmail_lead_id"], "quickmailLeadId", false],
    ["name", ["name"], "name", !partial],
    ["email", ["email"], "email", false],
    ["phone_number", ["phoneNumber", "phone_number"], "phoneNumber", false],
    ["notes", ["notes"], "notes", false]
  ];

  for (const [column, names, label, required] of textFields) {
    const value = readText(payload, names, label, { required });

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

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one person field.");
  }

  return data;
}

function revalidatePerson(person) {
  ["/", "/people", "/companies", "/contacted", "/replied", "/converted", `/people/${person.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const where = {};
    const status = searchParams.get("status");
    const qualified = readBooleanFilter(searchParams.get("qualified"), "qualified");

    if (status) {
      if (!isLeadStatus(status)) {
        throw new ApiError("Invalid status.");
      }

      where.status = status;
    }

    if (qualified !== undefined) {
      where.qualified = qualified;
    }

    if (searchParams.has("companyId") || searchParams.has("company_id")) {
      where.positions = {
        some: {
          company_id: readPositiveInteger(
            searchParams.get("companyId") || searchParams.get("company_id"),
            "companyId"
          )
        }
      };
    }

    const people = await prisma.people.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: personSelect
    });

    return Response.json({ people: people.map(personJson) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const timestamp = sqliteTimestamp();
    const person = await prisma.people.create({
      data: {
        ...personData(payload),
        created_at: timestamp,
        updated_at: timestamp
      },
      select: personSelect
    });

    revalidatePerson(person);

    return Response.json({ person: personJson(person) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
