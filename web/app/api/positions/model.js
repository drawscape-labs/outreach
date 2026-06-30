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
  POSITION_API_MESSAGES,
  POSITION_FIELD_ALIASES,
  POSITION_FIELDS,
  POSITION_FILTER_PARAMS,
  POSITION_REVALIDATION_PATHS
} from "./schema";

const positionSelect = {
  id: true,
  companyId: true,
  personId: true,
  title: true,
  department: true,
  seniority: true,
  startDate: true,
  endDate: true,
  isCurrent: true,
  notes: true,
  createdAt: true,
  updatedAt: true
};

const positionIdFields = [
  {
    column: POSITION_FIELDS.companyId,
    label: "companyId",
    names: POSITION_FIELD_ALIASES.companyId,
    requiredOnCreate: true
  },
  {
    column: POSITION_FIELDS.personId,
    label: "personId",
    names: POSITION_FIELD_ALIASES.personId,
    requiredOnCreate: true
  }
];

const positionTextFields = [
  {
    column: POSITION_FIELDS.title,
    label: "title",
    names: POSITION_FIELD_ALIASES.title
  },
  {
    column: POSITION_FIELDS.department,
    label: "department",
    names: POSITION_FIELD_ALIASES.department
  },
  {
    column: POSITION_FIELDS.seniority,
    label: "seniority",
    names: POSITION_FIELD_ALIASES.seniority
  },
  {
    column: POSITION_FIELDS.startDate,
    label: "startDate",
    names: POSITION_FIELD_ALIASES.startDate
  },
  {
    column: POSITION_FIELDS.endDate,
    label: "endDate",
    names: POSITION_FIELD_ALIASES.endDate
  },
  {
    column: POSITION_FIELDS.notes,
    label: "notes",
    names: POSITION_FIELD_ALIASES.notes
  }
];

const positionBooleanFields = [
  {
    column: POSITION_FIELDS.isCurrent,
    label: "isCurrent",
    names: POSITION_FIELD_ALIASES.isCurrent
  }
];

function positionData(payload, { partial = false } = {}) {
  assertPayloadObject(payload);

  const data = {};

  for (const field of positionIdFields) {
    const value = payloadValue(payload, field.names);

    if (value !== undefined) {
      data[field.column] = readPositiveInteger(value, field.label);
    } else if (!partial && field.requiredOnCreate) {
      throw new ApiError(`${field.label} is required.`);
    }
  }

  for (const field of positionTextFields) {
    const value = readText(payload, field.names, field.label);

    if (value !== undefined) {
      data[field.column] = value;
    }
  }

  for (const field of positionBooleanFields) {
    const value = readBoolean(payloadValue(payload, field.names), field.label);

    if (value !== undefined) {
      data[field.column] = value;
    }
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError(POSITION_API_MESSAGES.emptyPatch);
  }

  return data;
}

export function positionJson(position) {
  return {
    id: position.id,
    companyId: position.companyId,
    personId: position.personId,
    title: position.title,
    department: position.department,
    seniority: position.seniority,
    startDate: position.startDate,
    endDate: position.endDate,
    isCurrent: Boolean(position.isCurrent),
    notes: position.notes,
    createdAt: toJsonDate(position.createdAt),
    updatedAt: toJsonDate(position.updatedAt)
  };
}

function positionsWhere(searchParams) {
  const where = {};
  const currentParams = POSITION_FILTER_PARAMS.isCurrent;
  const companyIdParams = POSITION_FILTER_PARAMS.companyId;
  const personIdParams = POSITION_FILTER_PARAMS.personId;
  const currentValue =
    searchParams.get(currentParams[0]) ??
    searchParams.get(currentParams[1]) ??
    searchParams.get(currentParams[2]);
  const isCurrent = readBooleanFilter(currentValue, "isCurrent");

  if (companyIdParams.some((name) => searchParams.has(name))) {
    const companyId =
      searchParams.get(companyIdParams[0]) ||
      searchParams.get(companyIdParams[1]);

    where.companyId = readPositiveInteger(companyId, "companyId");
  }

  if (personIdParams.some((name) => searchParams.has(name))) {
    const personId =
      searchParams.get(personIdParams[0]) ||
      searchParams.get(personIdParams[1]);

    where.personId = readPositiveInteger(personId, "personId");
  }

  if (isCurrent !== undefined) {
    where.isCurrent = isCurrent;
  }

  return where;
}

export function revalidatePosition(position) {
  const paths = new Set(POSITION_REVALIDATION_PATHS);

  if (position?.personId) {
    paths.add(`/people/${position.personId}`);
  }

  if (position?.companyId) {
    paths.add(`/companies/${position.companyId}`);
  }

  paths.forEach((path) => revalidatePath(path));
}

export function listPositions(searchParams) {
  return prisma.position.findMany({
    where: positionsWhere(searchParams),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: positionSelect
  });
}

export function createPosition(payload) {
  return prisma.position.create({
    data: positionData(payload),
    select: positionSelect
  });
}

export function getPosition(id) {
  return prisma.position.findUnique({
    where: { id },
    select: positionSelect
  });
}

export async function updatePosition(id, payload) {
  const previousPosition = await getPosition(id);

  if (!previousPosition) {
    return null;
  }

  await prisma.position.update({
    where: { id },
    data: positionData(payload, { partial: true }),
    select: { id: true }
  });

  const position = await getPosition(id);

  return { position, previousPosition };
}

export async function deletePosition(id) {
  const position = await getPosition(id);

  if (!position) {
    return null;
  }

  await prisma.position.delete({ where: { id } });

  return position;
}
