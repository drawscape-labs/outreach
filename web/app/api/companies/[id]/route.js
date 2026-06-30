import { revalidatePath } from "next/cache";
import prisma from "../../../../lib/prisma";

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

  if (error?.code === "P2025") {
    return jsonError("Company not found.", 404);
  }

  return jsonError("Database query failed.", 500);
}

async function readId(context) {
  const { id } = await context.params;
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError("Invalid company id.");
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

function companyPatchData(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("Request body must be an object.");
  }

  const data = {};
  const textFields = [
    ["name", ["name"], "name"],
    ["domain", ["domain"], "domain"],
    ["linkedin_company_url", ["linkedinCompanyUrl", "linkedin_company_url"], "linkedinCompanyUrl"],
    ["website_url", ["websiteUrl", "website_url"], "websiteUrl"],
    ["description", ["description"], "description"],
    ["industry", ["industry"], "industry"],
    ["location", ["location"], "location"],
    ["employee_count_range", ["employeeCountRange", "employee_count_range"], "employeeCountRange"],
    ["date_enriched", ["dateEnriched", "date_enriched"], "dateEnriched"],
    ["notes", ["notes"], "notes"]
  ];

  for (const [column, names, label] of textFields) {
    const value = readText(payload, names, label);

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

  if (Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one company field.");
  }

  return data;
}

function revalidateCompany(company) {
  ["/", "/companies", `/companies/${company.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export async function GET(_request, context) {
  try {
    const id = await readId(context);
    const company = await prisma.companies.findUnique({
      where: { id },
      select: companySelect
    });

    if (!company) {
      return jsonError("Company not found.", 404);
    }

    return Response.json({ company: companyJson(company) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request, context) {
  try {
    const id = await readId(context);
    const payload = await readPayload(request);
    const result = await prisma.companies.updateMany({
      where: { id },
      data: companyPatchData(payload)
    });

    if (result.count === 0) {
      return jsonError("Company not found.", 404);
    }

    const company = await prisma.companies.findUnique({
      where: { id },
      select: companySelect
    });

    revalidateCompany(company);

    return Response.json({ company: companyJson(company) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request, context) {
  try {
    const id = await readId(context);
    const company = await prisma.companies.findUnique({
      where: { id },
      select: companySelect
    });

    if (!company) {
      return jsonError("Company not found.", 404);
    }

    await prisma.companies.delete({ where: { id } });
    revalidateCompany(company);

    return Response.json({
      deleted: true,
      company: companyJson(company)
    });
  } catch (error) {
    return handleError(error);
  }
}
