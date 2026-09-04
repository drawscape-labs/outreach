import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { toJsonDate } from "@/lib/date-json";
import {
  ApiError,
  buildModelData,
  normalizeLinkedInProfileUrl,
  normalizeLowercaseText,
  normalizeWhitespace,
  readBooleanFilter,
  readPositiveInteger
} from "@/app/api/lib/model-helpers";
import {
  COMPANY_API_MESSAGES,
  COMPANY_CATEGORIES,
  COMPANY_PRIORITIES
} from "@/app/api/companies/schema";
import {
  PERSON_API_MESSAGES,
  PERSON_EMAIL_FILTER_VALUES,
  PERSON_FIELD_ALIASES,
  PERSON_FIELDS,
  PERSON_FILTER_PARAMS,
  PERSON_LINKEDIN_FILTER_VALUES,
  PERSON_REVALIDATION_PATHS,
  PERSON_STATUS,
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_PROFILE_TYPES = new Set(["in", "pub"]);
const PHONE_ALLOWED_PATTERN = /^[0-9+().\-\s#ext]+$/i;
const QUICKMAIL_LEAD_ID_PATTERN = /^lead_[A-Za-z0-9]+$/;
const POSITION_SEARCH_ALIASES = {
  bd: ["business", "development"],
  bizdev: ["business", "development"],
  ceo: ["chief", "executive", "officer"],
  cfo: ["chief", "financial", "officer"],
  cmo: ["chief", "marketing", "officer"],
  coo: ["chief", "operating", "officer"],
  cso: ["chief", "sales", "officer"],
  gm: ["general", "manager"],
  md: ["managing", "director"],
  mgr: ["manager"],
  vp: ["vice", "president"]
};

function assertEmail(value, message = PERSON_API_MESSAGES.invalidEmail) {
  if (value === null || value === undefined) {
    return;
  }

  if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
    throw new ApiError(message);
  }
}

function assertLinkedInHandle(value, message) {
  if (
    !value ||
    /\s/.test(value) ||
    value.includes("/") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    throw new ApiError(message);
  }
}

function assertProfileKey(value) {
  if (value === null || value === undefined) {
    return;
  }

  const separatorIndex = value.indexOf("/");

  if (separatorIndex < 1 || separatorIndex === value.length - 1) {
    throw new ApiError(PERSON_API_MESSAGES.invalidProfileKey);
  }

  const type = value.slice(0, separatorIndex).toLowerCase();
  const identifier = value.slice(separatorIndex + 1);

  if (LINKEDIN_PROFILE_TYPES.has(type)) {
    assertLinkedInHandle(identifier, PERSON_API_MESSAGES.invalidProfileKey);
    return;
  }

  if (type === "email") {
    assertEmail(identifier, PERSON_API_MESSAGES.invalidProfileKey);
    return;
  }

  throw new ApiError(PERSON_API_MESSAGES.invalidProfileKey);
}

function normalizeProfileKey(value) {
  if (value === null || value === undefined) {
    return value;
  }

  assertProfileKey(value);

  const separatorIndex = value.indexOf("/");
  const type = value.slice(0, separatorIndex).toLowerCase();
  const identifier = value.slice(separatorIndex + 1);

  return type === "email" ? `${type}/${identifier.toLowerCase()}` : `${type}/${identifier}`;
}

function normalizeEmail(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const email = normalizeLowercaseText(value);

  assertEmail(email);

  return email;
}

function assertPhoneNumber(value) {
  if (value === null || value === undefined) {
    return;
  }

  const digitCount = value.replace(/\D/g, "").length;

  if (
    digitCount < 7 ||
    digitCount > 20 ||
    !PHONE_ALLOWED_PATTERN.test(value)
  ) {
    throw new ApiError(PERSON_API_MESSAGES.invalidPhoneNumber);
  }
}

function normalizeQuickmailLeadId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const leadId = normalizeWhitespace(value);

  if (!QUICKMAIL_LEAD_ID_PATTERN.test(leadId)) {
    throw new ApiError(PERSON_API_MESSAGES.invalidQuickmailLeadId);
  }

  return leadId;
}

function validateStatus(value) {
  if (!PERSON_STATUSES.includes(value)) {
    throw new ApiError(PERSON_API_MESSAGES.invalidStatus);
  }
}

const personFields = [
  {
    column: PERSON_FIELDS.profileKey,
    label: "profileKey",
    names: PERSON_FIELD_ALIASES.profileKey,
    normalize: normalizeProfileKey,
    nullAsUndefinedOnCreate: true,
    requiredOnCreate: true
  },
  {
    column: PERSON_FIELDS.linkedinProfileUrl,
    label: "linkedinProfileUrl",
    names: PERSON_FIELD_ALIASES.linkedinProfileUrl,
    normalize(value) {
      return normalizeLinkedInProfileUrl(
        value,
        PERSON_API_MESSAGES.invalidLinkedinProfileUrl
      );
    },
    nullAsUndefinedOnCreate: true
  },
  {
    column: PERSON_FIELDS.quickmailLeadId,
    label: "quickmailLeadId",
    names: PERSON_FIELD_ALIASES.quickmailLeadId,
    normalize: normalizeQuickmailLeadId,
    nullAsUndefinedOnCreate: true
  },
  {
    column: PERSON_FIELDS.name,
    label: "name",
    names: PERSON_FIELD_ALIASES.name,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true,
    requiredOnCreate: true
  },
  {
    column: PERSON_FIELDS.email,
    label: "email",
    names: PERSON_FIELD_ALIASES.email,
    normalize: normalizeEmail,
    nullAsUndefinedOnCreate: true
  },
  {
    column: PERSON_FIELDS.phoneNumber,
    label: "phoneNumber",
    names: PERSON_FIELD_ALIASES.phoneNumber,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true,
    validate: assertPhoneNumber
  },
  {
    column: PERSON_FIELDS.notes,
    label: "notes",
    names: PERSON_FIELD_ALIASES.notes,
    normalize: normalizeWhitespace,
    nullAsUndefinedOnCreate: true
  },
  {
    column: PERSON_FIELDS.status,
    label: "status",
    names: PERSON_FIELD_ALIASES.status,
    normalize: normalizeWhitespace,
    validate: validateStatus
  },
  {
    column: PERSON_FIELDS.qualified,
    label: "qualified",
    names: PERSON_FIELD_ALIASES.qualified,
    type: "boolean"
  }
];

function personData(payload, { partial = false } = {}) {
  return buildModelData(payload, {
    emptyPatchMessage: PERSON_API_MESSAGES.emptyPatch,
    fields: personFields,
    partial
  });
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

export function personDetailJson(person) {
  return {
    ...personJson(person),
    positions: (person.positions || []).map(positionCompany)
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

function statusFilterValues(searchParams) {
  const values = typeof searchParams?.getAll === "function"
    ? PERSON_FILTER_PARAMS.status.flatMap((name) => searchParams.getAll(name))
    : [searchParamValue(searchParams, PERSON_FILTER_PARAMS.status)];

  return [...new Set(
    values
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim())
      .filter(Boolean)
  )];
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

function positionSearchTerms(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 1)
    .map((term) => ({
      term,
      aliases: POSITION_SEARCH_ALIASES[term] || []
    }));
}

function addPositionSearchFilter(positionFilter, value) {
  const terms = positionSearchTerms(value);

  if (!terms.length) {
    return;
  }

  positionFilter.AND = [
    ...(positionFilter.AND || []),
    ...terms.map(({ term, aliases }) => {
      const directMatch = { title: { contains: term } };

      if (!aliases.length) {
        return directMatch;
      }

      return {
        OR: [
          directMatch,
          {
            AND: aliases.map((alias) => ({
              title: { contains: alias }
            }))
          }
        ]
      };
    })
  ];
}

function peopleWhere(searchParams, { currentPositionsOnly = false } = {}) {
  const where = {};
  const positionFilter = {};
  const statuses = statusFilterValues(searchParams);
  const email = searchParamValue(searchParams, PERSON_FILTER_PARAMS.email);
  const emailAddress = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.emailAddress
  );
  const linkedin = searchParamValue(searchParams, PERSON_FILTER_PARAMS.linkedin);
  const linkedinProfileUrl = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.linkedinProfileUrl
  );
  const profileKey = searchParamValue(searchParams, PERSON_FILTER_PARAMS.profileKey);
  const position = searchParamValue(searchParams, PERSON_FILTER_PARAMS.position);
  const quickmailLeadId = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.quickmailLeadId
  );
  const companyIndustry = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.companyIndustry
  );
  const companyCategory = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.companyCategory
  );
  const companyPriority = searchParamValue(
    searchParams,
    PERSON_FILTER_PARAMS.companyPriority
  ).toLowerCase();
  const qualified = readBooleanFilter(
    searchParamValue(searchParams, PERSON_FILTER_PARAMS.qualified),
    "qualified"
  );

  if (currentPositionsOnly) {
    positionFilter.isCurrent = true;
  }

  if (position) {
    addPositionSearchFilter(positionFilter, position);
  }

  if (statuses.length) {
    if (statuses.some((status) => !PERSON_STATUSES.includes(status))) {
      throw new ApiError(PERSON_API_MESSAGES.invalidStatus);
    }

    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }

  if (qualified !== undefined) {
    where.qualified = qualified;
  }

  if (profileKey) {
    where.profileKey = normalizeProfileKey(profileKey);
  }

  if (emailAddress) {
    where.email = normalizeLowercaseText(emailAddress);
  }

  if (quickmailLeadId) {
    where.quickmailLeadId = normalizeQuickmailLeadId(quickmailLeadId);
  }

  if (linkedinProfileUrl) {
    where.linkedinProfileUrl = normalizeLinkedInProfileUrl(
      linkedinProfileUrl,
      PERSON_API_MESSAGES.invalidLinkedinProfileUrl
    );
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

  const companyFilter = {};

  if (companyCategory) {
    if (!COMPANY_CATEGORIES.includes(companyCategory)) {
      throw new ApiError(COMPANY_API_MESSAGES.invalidCategory);
    }

    companyFilter.category = companyCategory;
  }

  if (companyIndustry) {
    companyFilter.industry = companyIndustry;
  }

  if (companyPriority) {
    if (!COMPANY_PRIORITIES.includes(companyPriority)) {
      throw new ApiError(COMPANY_API_MESSAGES.invalidPriority);
    }

    companyFilter.priority = companyPriority;
  }

  if (Object.keys(companyFilter).length > 0) {
    positionFilter.company = companyFilter;
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

export function getPersonDetail(id) {
  return prisma.person.findUnique({
    where: { id },
    select: personDetailSelect
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

export async function syncPersonQuickmailState({
  markContacted = false,
  personId,
  quickmailLeadId
}) {
  const id = readPositiveInteger(personId, "personId");
  const payload = {};
  const leadId =
    typeof quickmailLeadId === "string" && quickmailLeadId.trim()
      ? quickmailLeadId.trim()
      : "";

  if (leadId) {
    payload.quickmailLeadId = leadId;
  }

  if (markContacted) {
    payload.status = PERSON_STATUS.contacted;
  }

  if (Object.keys(payload).length === 0) {
    return getPerson(id);
  }

  const data = personData(payload, { partial: true });

  return prisma.$transaction(async (tx) => {
    const existingPerson = await tx.person.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingPerson) {
      return null;
    }

    const updateData = { ...data };

    if (updateData.quickmailLeadId) {
      const existingLeadOwner = await tx.person.findFirst({
        where: {
          quickmailLeadId: updateData.quickmailLeadId,
          NOT: { id }
        },
        select: { id: true }
      });

      if (existingLeadOwner) {
        delete updateData.quickmailLeadId;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.person.update({
        where: { id },
        data: updateData,
        select: { id: true }
      });
    }

    return tx.person.findUnique({
      where: { id },
      select: personSelect
    });
  });
}

export async function deletePerson(id) {
  const person = await getPerson(id);

  if (!person) {
    return null;
  }

  await prisma.person.delete({ where: { id } });

  return person;
}
