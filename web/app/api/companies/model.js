import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";
import { toJsonDate } from "../../../lib/date-json";
import {
  ApiError,
  assertPayloadObject,
  readNonNegativeInteger,
  readText
} from "../lib/model-helpers";
import { PERSON_STATUS_BUCKETS } from "../people/schema";
import {
  COMPANY_API_MESSAGES,
  COMPANY_FIELD_ALIASES,
  COMPANY_FIELDS,
  COMPANY_FILTER_PARAMS,
  COMPANY_REVALIDATION_PATHS
} from "./schema";

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

const companyTextFields = [
  {
    column: COMPANY_FIELDS.name,
    label: "name",
    names: COMPANY_FIELD_ALIASES.name,
    requiredOnCreate: true
  },
  {
    column: COMPANY_FIELDS.domain,
    label: "domain",
    names: COMPANY_FIELD_ALIASES.domain,
    requiredOnCreate: true
  },
  {
    column: COMPANY_FIELDS.linkedinCompanyUrl,
    label: "linkedinCompanyUrl",
    names: COMPANY_FIELD_ALIASES.linkedinCompanyUrl,
    requiredOnCreate: true
  },
  {
    column: COMPANY_FIELDS.websiteUrl,
    label: "websiteUrl",
    names: COMPANY_FIELD_ALIASES.websiteUrl
  },
  {
    column: COMPANY_FIELDS.description,
    label: "description",
    names: COMPANY_FIELD_ALIASES.description
  },
  {
    column: COMPANY_FIELDS.industry,
    label: "industry",
    names: COMPANY_FIELD_ALIASES.industry
  },
  {
    column: COMPANY_FIELDS.location,
    label: "location",
    names: COMPANY_FIELD_ALIASES.location
  },
  {
    column: COMPANY_FIELDS.employeeCountRange,
    label: "employeeCountRange",
    names: COMPANY_FIELD_ALIASES.employeeCountRange
  },
  {
    column: COMPANY_FIELDS.dateEnriched,
    label: "dateEnriched",
    names: COMPANY_FIELD_ALIASES.dateEnriched
  },
  {
    column: COMPANY_FIELDS.notes,
    label: "notes",
    names: COMPANY_FIELD_ALIASES.notes
  }
];

const companyNumberFields = [
  {
    column: COMPANY_FIELDS.employeeCount,
    label: "employeeCount",
    names: COMPANY_FIELD_ALIASES.employeeCount
  }
];

function companyData(payload, { partial = false } = {}) {
  assertPayloadObject(payload);

  const data = {};

  for (const field of companyTextFields) {
    const value = readText(payload, field.names, field.label, {
      nullAsUndefined: !partial,
      required: !partial && field.requiredOnCreate
    });

    if (value !== undefined) {
      data[field.column] = value;
    }
  }

  for (const field of companyNumberFields) {
    const value = readNonNegativeInteger(payload, field.names, field.label);

    if (value !== undefined) {
      data[field.column] = value;
    }
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError(COMPANY_API_MESSAGES.emptyPatch);
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
      PERSON_STATUS_BUCKETS.contacted.includes(status)
    ).length,
    repliedCount: statuses.filter((status) =>
      PERSON_STATUS_BUCKETS.replied.includes(status)
    ).length,
    convertedCount: statuses.filter((status) =>
      PERSON_STATUS_BUCKETS.converted.includes(status)
    ).length
  };
}

export function revalidateCompany(company) {
  [...COMPANY_REVALIDATION_PATHS, `/companies/${company.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export function listCompanies(searchParams) {
  const industry = searchParams.get(COMPANY_FILTER_PARAMS.industry[0])?.trim();

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
