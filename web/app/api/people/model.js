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
  PERSON_FIELD_ALIASES,
  PERSON_FIELDS,
  PERSON_FILTER_PARAMS,
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

function peopleWhere(searchParams) {
  const where = {};
  const status = searchParams.get(PERSON_FILTER_PARAMS.status[0]);
  const qualified = readBooleanFilter(
    searchParams.get(PERSON_FILTER_PARAMS.qualified[0]),
    "qualified"
  );

  if (status) {
    if (!PERSON_STATUSES.includes(status)) {
      throw new ApiError(PERSON_API_MESSAGES.invalidStatus);
    }

    where.status = status;
  }

  if (qualified !== undefined) {
    where.qualified = qualified;
  }

  const companyIdParams = PERSON_FILTER_PARAMS.companyId;

  if (companyIdParams.some((name) => searchParams.has(name))) {
    const companyId =
      searchParams.get(companyIdParams[0]) ||
      searchParams.get(companyIdParams[1]);

    where.positions = {
      some: {
        companyId: readPositiveInteger(companyId, "companyId")
      }
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
