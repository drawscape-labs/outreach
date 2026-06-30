import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";
import { toJsonDate } from "../../../lib/date-json";
import {
  ApiError,
  assertPayloadObject,
  readNonNegativeInteger,
  readText
} from "../lib/model-helpers";

const companySelect = {
  id: true,
  name: true,
  domain: true,
  linkedinCompanyUrl: true,
  websiteUrl: true,
  description: true,
  industry: true,
  location: true,
  employeeCount: true,
  employeeCountRange: true,
  dateEnriched: true,
  notes: true,
  createdAt: true,
  updatedAt: true
};

export const companyListSelect = {
  id: true,
  name: true,
  domain: true,
  linkedinCompanyUrl: true,
  websiteUrl: true,
  description: true,
  industry: true,
  location: true,
  employeeCount: true,
  employeeCountRange: true,
  dateEnriched: true,
  createdAt: true,
  notes: true,
  positions: {
    where: {
      isCurrent: true
    },
    select: {
      id: true,
      personId: true,
      person: {
        select: {
          status: true
        }
      }
    }
  }
};

export const companyDetailSelect = {
  id: true,
  name: true,
  domain: true,
  linkedinCompanyUrl: true,
  websiteUrl: true,
  description: true,
  industry: true,
  location: true,
  employeeCount: true,
  employeeCountRange: true,
  dateEnriched: true,
  notes: true,
  positions: {
    where: {
      isCurrent: true
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" }
    ],
    select: {
      id: true,
      title: true,
      department: true,
      seniority: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      createdAt: true,
      notes: true,
      person: {
        select: {
          id: true,
          name: true,
          profileKey: true,
          linkedinProfileUrl: true,
          createdAt: true,
          email: true,
          phoneNumber: true,
          status: true,
          qualified: true
        }
      }
    }
  }
};

function companyData(payload, { partial = false } = {}) {
  assertPayloadObject(payload);

  const data = {};
  const textFields = [
    ["name", ["name"], "name", !partial],
    ["domain", ["domain"], "domain", !partial],
    ["linkedinCompanyUrl", ["linkedinCompanyUrl", "linkedin_company_url"], "linkedinCompanyUrl", !partial],
    ["websiteUrl", ["websiteUrl", "website_url"], "websiteUrl", false],
    ["description", ["description"], "description", false],
    ["industry", ["industry"], "industry", false],
    ["location", ["location"], "location", false],
    ["employeeCountRange", ["employeeCountRange", "employee_count_range"], "employeeCountRange", false],
    ["dateEnriched", ["dateEnriched", "date_enriched"], "dateEnriched", false],
    ["notes", ["notes"], "notes", false]
  ];

  for (const [column, names, label, required] of textFields) {
    const value = readText(payload, names, label, {
      nullAsUndefined: !partial,
      required
    });

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
    data.employeeCount = employeeCount;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one company field.");
  }

  return data;
}

export function companyJson(company) {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    linkedinCompanyUrl: company.linkedinCompanyUrl,
    websiteUrl: company.websiteUrl,
    description: company.description,
    industry: company.industry,
    location: company.location,
    employeeCount: company.employeeCount,
    employeeCountRange: company.employeeCountRange,
    dateEnriched: company.dateEnriched,
    notes: company.notes,
    createdAt: toJsonDate(company.createdAt),
    updatedAt: toJsonDate(company.updatedAt)
  };
}

export function companyDetail(company) {
  return companyJson(company);
}

export function companyTableRow(company) {
  const currentPositions = company.positions || [];
  const personStatuses = new Map();

  currentPositions.forEach((position) => {
    if (!personStatuses.has(position.personId)) {
      personStatuses.set(position.personId, position.person?.status || "");
    }
  });

  const statuses = Array.from(personStatuses.values());

  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    linkedinCompanyUrl: company.linkedinCompanyUrl,
    websiteUrl: company.websiteUrl,
    description: company.description,
    industry: company.industry,
    location: company.location,
    employeeCount: company.employeeCount,
    employeeCountRange: company.employeeCountRange,
    dateEnriched: company.dateEnriched,
    createdAt: toJsonDate(company.createdAt),
    notes: company.notes,
    positionCount: currentPositions.length,
    peopleCount: personStatuses.size,
    contactedCount: statuses.filter((status) =>
      ["Contacted", "Replied", "Converted"].includes(status)
    ).length,
    repliedCount: statuses.filter((status) =>
      ["Replied", "Converted"].includes(status)
    ).length,
    convertedCount: statuses.filter((status) => status === "Converted").length
  };
}

export function revalidateCompany(company) {
  ["/", "/companies", `/companies/${company.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export function listCompanies(searchParams) {
  const industry = searchParams.get("industry")?.trim();

  return prisma.company.findMany({
    where: industry ? { industry } : {},
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: companySelect
  });
}

export function createCompany(payload) {
  return prisma.company.create({
    data: companyData(payload),
    select: companySelect
  });
}

export function getCompany(id) {
  return prisma.company.findUnique({
    where: { id },
    select: companySelect
  });
}

export async function updateCompany(id, payload) {
  const result = await prisma.company.updateMany({
    where: { id },
    data: companyData(payload, { partial: true })
  });

  if (result.count === 0) {
    return null;
  }

  return getCompany(id);
}

export async function deleteCompany(id) {
  const company = await getCompany(id);

  if (!company) {
    return null;
  }

  await prisma.company.delete({ where: { id } });

  return company;
}
