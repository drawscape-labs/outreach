import { revalidatePath } from "next/cache";
import prisma from "../../../lib/prisma";
import { toJsonDate } from "../../../lib/date-json";
import { isLeadStatus } from "../../../lib/statuses";
import {
  ApiError,
  assertPayloadObject,
  payloadValue,
  readBoolean,
  readBooleanFilter,
  readPositiveInteger,
  readText
} from "../lib/model-helpers";

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

function personData(payload, { partial = false } = {}) {
  assertPayloadObject(payload);

  const data = {};
  const textFields = [
    ["profileKey", ["profileKey", "profile_key"], "profileKey", !partial],
    ["linkedinProfileUrl", ["linkedinProfileUrl", "linkedin_profile_url"], "linkedinProfileUrl", false],
    ["quickmailLeadId", ["quickmailLeadId", "quickmail_lead_id"], "quickmailLeadId", false],
    ["name", ["name"], "name", !partial],
    ["email", ["email"], "email", false],
    ["phoneNumber", ["phoneNumber", "phone_number"], "phoneNumber", false],
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
        companyId: readPositiveInteger(
          searchParams.get("companyId") || searchParams.get("company_id"),
          "companyId"
        )
      }
    };
  }

  return where;
}

export function revalidatePerson(person) {
  ["/", "/people", "/companies", "/contacted", "/replied", "/converted", `/people/${person.id}`].forEach((path) =>
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
