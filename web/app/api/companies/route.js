import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const companySelect = {
  id: true,
  name: true,
  domain: true,
  linkedin_company_url: true,
  website_url: true,
  description: true,
  industry: true,
  location: true,
  employee_count: true,
  employee_count_range: true,
  date_enriched: true,
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

function readNonNegativeInteger(payload, names, label) {
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

function sqliteTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function companyJson(company) {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    linkedinCompanyUrl: company.linkedin_company_url,
    websiteUrl: company.website_url,
    description: company.description,
    industry: company.industry,
    location: company.location,
    employeeCount: company.employee_count,
    employeeCountRange: company.employee_count_range,
    dateEnriched: company.date_enriched,
    notes: company.notes,
    createdAt: company.created_at,
    updatedAt: company.updated_at
  };
}

function companyData(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }

  const data = {};
  const textFields = [
    ["name", ["name"], "name", !partial],
    ["domain", ["domain"], "domain", !partial],
    ["linkedin_company_url", ["linkedinCompanyUrl", "linkedin_company_url"], "linkedinCompanyUrl", !partial],
    ["website_url", ["websiteUrl", "website_url"], "websiteUrl", false],
    ["description", ["description"], "description", false],
    ["industry", ["industry"], "industry", false],
    ["location", ["location"], "location", false],
    ["employee_count_range", ["employeeCountRange", "employee_count_range"], "employeeCountRange", false],
    ["date_enriched", ["dateEnriched", "date_enriched"], "dateEnriched", false],
    ["notes", ["notes"], "notes", false]
  ];

  for (const [column, names, label, required] of textFields) {
    const value = readText(payload, names, label, { required });

    if (value !== undefined) {
      data[column] = value;
    }
  }

  const employeeCount = readNonNegativeInteger(
    payload,
    ["employeeCount", "employee_count"],
    "employeeCount"
  );

  if (employeeCount !== undefined) {
    data.employee_count = employeeCount;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one company field.");
  }

  return data;
}

function revalidateCompany(company) {
  ["/", "/companies", `/companies/${company.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const industry = searchParams.get("industry")?.trim();
    const companies = await prisma.companies.findMany({
      where: industry ? { industry } : {},
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: companySelect
    });

    return Response.json({ companies: companies.map(companyJson) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const timestamp = sqliteTimestamp();
    const company = await prisma.companies.create({
      data: {
        ...companyData(payload),
        created_at: timestamp,
        updated_at: timestamp
      },
      select: companySelect
    });

    revalidateCompany(company);

    return Response.json({ company: companyJson(company) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
