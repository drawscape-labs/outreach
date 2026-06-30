import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";
import { toJsonDate } from "../../../lib/date-json";
import {
  ApiError,
  assertPayloadObject,
  payloadValue,
  readBoolean,
  readBooleanFilter,
  readPositiveInteger,
  readText
} from "../lib/model-helpers";
import {
  PERSON_API_MESSAGES,
  PERSON_EMAIL_FILTER_VALUES,
  PERSON_FIELD_ALIASES,
  PERSON_FIELDS,
  PERSON_FILTER_PARAMS,
  PERSON_LINKEDIN_FILTER_VALUES,
  PERSON_REVALIDATION_PATHS,
  PERSON_STATUSES
} from "./schema";

const personSelect = {
  id: true,
  profileKey: true,
  linkedinProfileUrl: true,
  quickmailLeadId: true,
  name: true,
  email: true,
  phoneNumber: true,
  status: true,
  qualified: true,
  notes: true,
  createdAt: true,
  updatedAt: true
};

export const personTableSelect = {
  id: true,
  profileKey: true,
  linkedinProfileUrl: true,
  name: true,
  createdAt: true,
  email: true,
  phoneNumber: true,
  status: true,
  qualified: true,
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
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
          websiteUrl: true
        }
      }
    }
  }
};

export const personDetailSelect = {
  ...personSelect,
  positions: {
    orderBy: [
      { isCurrent: "desc" },
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
      notes: true,
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
          linkedinCompanyUrl: true,
          websiteUrl: true
        }
      }
    }
  }
};

const personTextFields = [
  {
    column: PERSON_FIELDS.profileKey,
    label: "profileKey",
    names: PERSON_FIELD_ALIASES.profileKey,
    requiredOnCreate: true
  },
  {
    column: PERSON_FIELDS.linkedinProfileUrl,
    label: "linkedinProfileUrl",
    names: PERSON_FIELD_ALIASES.linkedinProfileUrl
  },
  {
    column: PERSON_FIELDS.quickmailLeadId,
    label: "quickmailLeadId",
    names: PERSON_FIELD_ALIASES.quickmailLeadId
  },
  {
    column: PERSON_FIELDS.name,
    label: "name",
    names: PERSON_FIELD_ALIASES.name,
    requiredOnCreate: true
  },
  {
    column: PERSON_FIELDS.email,
    label: "email",
    names: PERSON_FIELD_ALIASES.email
  },
  {
    column: PERSON_FIELDS.phoneNumber,
    label: "phoneNumber",
    names: PERSON_FIELD_ALIASES.phoneNumber
  },
  {
    column: PERSON_FIELDS.notes,
    label: "notes",
    names: PERSON_FIELD_ALIASES.notes
  }
];

function personData(payload, { partial = false } = {}) {
  assertPayloadObject(payload);

  const data = {};

  for (const field of personTextFields) {
    const value = readText(payload, field.names, field.label, {
      nullAsUndefined: !partial,
      required: !partial && field.requiredOnCreate
    });

    if (value !== undefined) {
      data[field.column] = value;
    }
  }

  const status = payloadValue(payload, PERSON_FIELD_ALIASES.status);

  if (status !== undefined) {
    if (!PERSON_STATUSES.includes(status)) {
      throw new ApiError(PERSON_API_MESSAGES.invalidStatus);
    }

    data.status = status;
  }

  const qualified = readBoolean(
    payloadValue(payload, PERSON_FIELD_ALIASES.qualified),
    "qualified"
  );

  if (qualified !== undefined) {
    data.qualified = qualified;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError(PERSON_API_MESSAGES.emptyPatch);
  }

  return data;
}

export function personJson(person) {
  return {
    id: person.id,
    profileKey: person.profileKey,
    linkedinProfileUrl: person.linkedinProfileUrl,
    quickmailLeadId: person.quickmailLeadId,
    name: person.name,
    email: person.email,
    phoneNumber: person.phoneNumber,
    status: person.status,
    qualified: Boolean(person.qualified),
    notes: person.notes,
    createdAt: toJsonDate(person.createdAt),
    updatedAt: toJsonDate(person.updatedAt)
  };
}

export function personTableRow(person, { emptyPositionCreatedAt = null } = {}) {
  const currentPositions = person.positions || [];
  const companies = new Map();
  const titles = [];

  currentPositions.forEach((position) => {
    if (position.title) {
      titles.push(position.title);
    }

    if (position.company && !companies.has(position.company.id)) {
      companies.set(position.company.id, position.company);
    }
  });

  return {
    id: person.id,
    profileKey: person.profileKey,
    linkedinProfileUrl: person.linkedinProfileUrl,
    name: person.name,
    createdAt: toJsonDate(person.createdAt),
    email: person.email,
    phoneNumber: person.phoneNumber,
    status: person.status,
    qualified: Boolean(person.qualified),
    positionCreatedAt: toJsonDate(currentPositions[0]?.createdAt) || emptyPositionCreatedAt,
    positionCount: currentPositions.length,
    companies: Array.from(companies.values()).map((company) => company.name).join(","),
    companyRefs: Array.from(companies.values())
      .map((company) => [
        company.id,
        company.name,
        company.domain || "",
        company.websiteUrl || ""
      ].join("::"))
      .join("||"),
    currentPositionTitles: titles.join("||")
  };
}

export function personFromCompanyPosition(position, company) {
  return {
    id: position.id,
    title: position.title,
    department: position.department,
    seniority: position.seniority,
    startDate: position.startDate,
    endDate: position.endDate,
    isCurrent: position.isCurrent,
    positionCreatedAt: toJsonDate(position.createdAt),
    notes: position.notes,
    personId: position.person.id,
    personName: position.person.name,
    profileKey: position.person.profileKey,
    linkedinProfileUrl: position.person.linkedinProfileUrl,
    createdAt: toJsonDate(position.person.createdAt),
    email: position.person.email,
    phoneNumber: position.person.phoneNumber,
    status: position.person.status,
    qualified: Boolean(position.person.qualified),
    companyId: company.id,
    companyName: company.name,
    companyDomain: company.domain,
    companyWebsiteUrl: company.websiteUrl
  };
}

export function positionCompany(position) {
  return {
    id: position.id,
    title: position.title,
    department: position.department,
    seniority: position.seniority,
    startDate: position.startDate,
    endDate: position.endDate,
    isCurrent: position.isCurrent,
    notes: position.notes,
    companyId: position.company.id,
    companyName: position.company.name,
    domain: position.company.domain,
    linkedinCompanyUrl: position.company.linkedinCompanyUrl,
    websiteUrl: position.company.websiteUrl
  };
}

function searchParamValue(searchParams, names) {
  for (const name of names) {
    const value = searchParams.get(name);

    if (value !== null && value !== undefined && value !== "") {
      return value.trim();
    }
  }

  return "";
}

function addAndFilter(where, filter) {
  where.AND = [...(where.AND || []), filter];
}

function addTextPresenceFilter(where, field, value) {
  if (value === "has") {
    addAndFilter(where, {
      [field]: {
        not: null
      }
    });
    addAndFilter(where, {
      [field]: {
        not: ""
      }
    });
  } else if (value === "missing") {
    addAndFilter(where, {
      OR: [
        { [field]: null },
        { [field]: "" }
      ]
    });
  }
}

function peopleWhere(searchParams, { currentPositionsOnly = false } = {}) {
  const where = {};
  const positionFilter = {};
  const status = searchParamValue(searchParams, PERSON_FILTER_PARAMS.status);
  const email = searchParamValue(searchParams, PERSON_FILTER_PARAMS.email);
  const linkedin = searchParamValue(searchParams, PERSON_FILTER_PARAMS.linkedin);
  const companyIndustry = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.companyIndustry
  );
  const qualified = readBooleanFilter(
    searchParamValue(searchParams, PERSON_FILTER_PARAMS.qualified),
    "qualified"
  );

  if (currentPositionsOnly) {
    positionFilter.isCurrent = true;
  }

  if (status) {
    if (!PERSON_STATUSES.includes(status)) {
      throw new ApiError(PERSON_API_MESSAGES.invalidStatus);
    }

    where.status = status;
  }

  if (qualified !== undefined) {
    where.qualified = qualified;
  }

  if (email) {
    if (!PERSON_EMAIL_FILTER_VALUES.includes(email)) {
      throw new ApiError(PERSON_API_MESSAGES.invalidEmailFilter);
    }

    addTextPresenceFilter(where, "email", email);
  }

  if (linkedin) {
    if (!PERSON_LINKEDIN_FILTER_VALUES.includes(linkedin)) {
      throw new ApiError(PERSON_API_MESSAGES.invalidLinkedinFilter);
    }

    addTextPresenceFilter(where, "linkedinProfileUrl", linkedin);
  }

  const companyIdParams = PERSON_FILTER_PARAMS.companyId;

  if (companyIdParams.some((name) => searchParams.has(name))) {
    const companyId =
      searchParams.get(companyIdParams[0]) ||
      searchParams.get(companyIdParams[1]);

    positionFilter.companyId = readPositiveInteger(companyId, "companyId");
  }

  if (companyIndustry) {
    positionFilter.company = {
      industry: companyIndustry
    };
  }

  if (Object.keys(positionFilter).length > 0) {
    where.positions = {
      some: positionFilter
    };
  }

  return where;
}

export function revalidatePerson(person) {
  [...PERSON_REVALIDATION_PATHS, `/people/${person.id}`].forEach((path) =>
    revalidatePath(path)
  );
}

export function listPeople(searchParams) {
  return prisma.person.findMany({
    where: peopleWhere(searchParams),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: personSelect
  });
}

export async function listPeopleTableRows(searchParams, { orderBy } = {}) {
  const people = await prisma.person.findMany({
    where: peopleWhere(searchParams, { currentPositionsOnly: true }),
    orderBy: orderBy || [{ createdAt: "desc" }, { id: "desc" }],
    select: personTableSelect
  });

  return people.map(personTableRow);
}

export async function listPeopleTablePage(
  searchParams,
  { orderBy, page = 1, pageSize = 100 } = {}
) {
  const where = peopleWhere(searchParams, { currentPositionsOnly: true });
  const totalCount = await prisma.person.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const people = await prisma.person.findMany({
    where,
    orderBy: orderBy || [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: personTableSelect
  });

  return {
    currentPage,
    people: people.map(personTableRow),
    totalCount,
    totalPages
  };
}

export async function listPeopleCompanyIndustries() {
  const companies = await prisma.company.findMany({
    where: {
      industry: {
        not: null
      },
      positions: {
        some: {
          isCurrent: true
        }
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

export function createPerson(payload) {
  return prisma.person.create({
    data: personData(payload),
    select: personSelect
  });
}

export function getPerson(id) {
  return prisma.person.findUnique({
    where: { id },
    select: personSelect
  });
}

export async function updatePerson(id, payload) {
  const result = await prisma.person.updateMany({
    where: { id },
    data: personData(payload, { partial: true })
  });

  if (result.count === 0) {
    return null;
  }

  return getPerson(id);
}

export async function deletePerson(id) {
  const person = await getPerson(id);

  if (!person) {
    return null;
  }

  await prisma.person.delete({ where: { id } });

  return person;
}
