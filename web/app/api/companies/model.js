import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { toJsonDate } from "@/lib/date-json";
import {
  ApiError,
  buildModelData,
  normalizeDomain,
  normalizeLinkedInCompanyUrl,
  normalizeLowercaseText,
  normalizeUrl,
  normalizeWhitespace
} from "@/app/api/lib/model-helpers";
import { PERSON_STATUS_BUCKETS } from "@/app/api/people/schema";
import {
  COMPANY_API_MESSAGES,
  COMPANY_DEFAULT_PRIORITY,
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
  category: true,
  priority: true,
  industry: true,
  location: true,
  country: true,
  employeeCount: true,
  employeeCountRange: true,
  dateEnriched: true,
  notes: true,
  createdAt: true,
  updatedAt: true
};

const companyOptionSelect = {
  id: true,
  name: true,
  domain: true,
  websiteUrl: true,
  category: true,
  priority: true,
  industry: true,
  country: true
};

export const companyListSelect = {
  id: true,
  name: true,
  domain: true,
  linkedinCompanyUrl: true,
  websiteUrl: true,
  description: true,
  category: true,
  priority: true,
  industry: true,
  location: true,
  country: true,
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
  category: true,
  priority: true,
  industry: true,
  location: true,
  country: true,
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
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true,
    requiredOnCreate: true
  },
  {
    column: COMPANY_FIELDS.domain,
    label: "domain",
    names: COMPANY_FIELD_ALIASES.domain,
    normalize(value) {
      const domain = normalizeDomain(value);

      if (!domain) {
        throw new ApiError(COMPANY_API_MESSAGES.invalidDomain);
      }

      return domain;
    },
    nullAsUndefinedOnCreate: true,
    requiredOnCreate: true
  },
  {
    column: COMPANY_FIELDS.linkedinCompanyUrl,
    label: "linkedinCompanyUrl",
    names: COMPANY_FIELD_ALIASES.linkedinCompanyUrl,
    normalize(value) {
      return normalizeLinkedInCompanyUrl(
        value,
        COMPANY_API_MESSAGES.invalidLinkedinCompanyUrl
      );
    },
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.websiteUrl,
    label: "websiteUrl",
    names: COMPANY_FIELD_ALIASES.websiteUrl,
    normalize(value) {
      return normalizeUrl(value, COMPANY_API_MESSAGES.invalidWebsiteUrl);
    },
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.description,
    label: "description",
    names: COMPANY_FIELD_ALIASES.description,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.category,
    label: "category",
    names: COMPANY_FIELD_ALIASES.category,
    normalize: normalizeLowercaseText,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.priority,
    invalidMessage: COMPANY_API_MESSAGES.invalidPriority,
    label: "priority",
    names: COMPANY_FIELD_ALIASES.priority,
    normalize: normalizeLowercaseText,
    validate(value) {
      if (value === null) {
        throw new ApiError(COMPANY_API_MESSAGES.invalidPriority);
      }
    }
  },
  {
    column: COMPANY_FIELDS.industry,
    label: "industry",
    names: COMPANY_FIELD_ALIASES.industry,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.location,
    label: "location",
    names: COMPANY_FIELD_ALIASES.location,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.country,
    label: "country",
    names: COMPANY_FIELD_ALIASES.country,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.employeeCountRange,
    label: "employeeCountRange",
    names: COMPANY_FIELD_ALIASES.employeeCountRange,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.dateEnriched,
    label: "dateEnriched",
    names: COMPANY_FIELD_ALIASES.dateEnriched,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: COMPANY_FIELDS.notes,
    label: "notes",
    names: COMPANY_FIELD_ALIASES.notes,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  }
];

const companyNumberFields = [
  {
    column: COMPANY_FIELDS.employeeCount,
    label: "employeeCount",
    names: COMPANY_FIELD_ALIASES.employeeCount,
    type: "nonNegativeInteger"
  }
];

function companyData(payload, { partial = false } = {}) {
  const data = buildModelData(payload, {
    emptyPatchMessage: COMPANY_API_MESSAGES.emptyPatch,
    fields: [...companyTextFields, ...companyNumberFields],
    partial
  });

  if (!partial && data.priority === undefined) {
    data.priority = COMPANY_DEFAULT_PRIORITY;
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
    category: company.category,
    priority: company.priority,
    industry: company.industry,
    location: company.location,
    country: company.country,
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

export function companyOption(company, nameCounts = new Map()) {
  const duplicateName = nameCounts.get(company.name) > 1;
  const label = duplicateName && company.domain
    ? `${company.name} (${company.domain})`
    : company.name;

  return {
    value: String(company.id),
    label,
    id: company.id,
    name: company.name,
    domain: company.domain,
    websiteUrl: company.websiteUrl,
    category: company.category,
    priority: company.priority,
    industry: company.industry,
    country: company.country
  };
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
    category: company.category,
    priority: company.priority,
    industry: company.industry,
    location: company.location,
    country: company.country,
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
  const category = searchParams.get(COMPANY_FILTER_PARAMS.category[0])?.trim();
  const domain = searchParams.get(COMPANY_FILTER_PARAMS.domain[0])?.trim();
  const industry = searchParams.get(COMPANY_FILTER_PARAMS.industry[0])?.trim();
  const country =
    searchParams.get(COMPANY_FILTER_PARAMS.country[0])?.trim() ||
    searchParams.get(COMPANY_FILTER_PARAMS.country[1])?.trim();
  const priority = searchParams
    .get(COMPANY_FILTER_PARAMS.priority[0])
    ?.trim()
    .toLowerCase();
  const linkedinCompanyUrl =
    searchParams.get(COMPANY_FILTER_PARAMS.linkedinCompanyUrl[0])?.trim() ||
    searchParams.get(COMPANY_FILTER_PARAMS.linkedinCompanyUrl[1])?.trim();
  const where = {};
  const identityFilters = [];

  if (category) {
    where.category = category;
  }

  if (priority) {
    where.priority = priority;
  }

  if (domain) {
    const normalizedDomain = normalizeDomain(domain);

    if (!normalizedDomain) {
      throw new ApiError(COMPANY_API_MESSAGES.invalidDomain);
    }

    identityFilters.push({ domain: normalizedDomain });
  }

  if (industry) {
    where.industry = industry;
  }

  if (country) {
    where.country = country;
  }

  if (linkedinCompanyUrl) {
    identityFilters.push({
      linkedinCompanyUrl: normalizeLinkedInCompanyUrl(
        linkedinCompanyUrl,
        COMPANY_API_MESSAGES.invalidLinkedinCompanyUrl
      )
    });
  }

  if (identityFilters.length === 1) {
    Object.assign(where, identityFilters[0]);
  } else if (identityFilters.length > 1) {
    where.OR = identityFilters;
  }

  return prisma.company.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: companySelect
  });
}

function companyTableWhere(filters = {}) {
  const where = {};

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.industry) {
    where.industry = filters.industry;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.contacts === "with_people") {
    where.positions = { some: { isCurrent: true } };
  }

  if (filters.contacts === "without_people") {
    where.positions = { none: { isCurrent: true } };
  }

  return where;
}

function companyTableOrderBy(sort) {
  if (sort?.sort === "created_at") {
    return [
      { createdAt: sort.direction },
      { id: sort.direction },
      { name: "asc" }
    ];
  }

  if (sort?.sort === "priority") {
    return [
      { priority: sort.direction },
      { name: "asc" },
      { id: "asc" }
    ];
  }

  return [{ name: "asc" }, { id: "asc" }];
}

export async function listCompanyTablePage(
  filters,
  sort,
  { page = 1, pageSize = 25 } = {}
) {
  const where = companyTableWhere(filters);
  const totalCount = await prisma.company.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * pageSize;
  const companies = await prisma.company.findMany({
    where,
    orderBy: companyTableOrderBy(sort),
    skip,
    take: pageSize,
    select: companyListSelect
  });

  return {
    companies: companies.map(companyTableRow),
    currentPage,
    totalCount,
    totalPages
  };
}

export async function listCompanyIndustries() {
  const companies = await prisma.company.findMany({
    where: {
      industry: {
        not: null
      }
    },
    orderBy: [
      { industry: "asc" },
      { id: "asc" }
    ],
    select: {
      industry: true
    }
  });

  return Array.from(
    new Set(
      companies
        .map((company) => String(company.industry || "").trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

async function listDistinctCompanyValues(field) {
  const companies = await prisma.company.findMany({
    orderBy: [
      { [field]: "asc" },
      { id: "asc" }
    ],
    select: {
      [field]: true
    }
  });

  return Array.from(
    new Set(
      companies
        .map((company) => String(company[field] || "").trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

export function listCompanyCategories() {
  return listDistinctCompanyValues(COMPANY_FIELDS.category);
}

export function listCompanyPriorities() {
  return listDistinctCompanyValues(COMPANY_FIELDS.priority);
}

export async function listCompanyOptions() {
  const companies = await prisma.company.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: companyOptionSelect
  });
  const nameCounts = companies.reduce((counts, company) => {
    counts.set(company.name, (counts.get(company.name) || 0) + 1);
    return counts;
  }, new Map());

  return companies.map((company) => companyOption(company, nameCounts));
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
