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

function positionData(payload, { partial = false } = {}) {
  assertPayloadObject(payload);

  const data = {};

  if (payloadValue(payload, ["companyId", "company_id"]) !== undefined) {
    data.companyId = readPositiveInteger(
      payloadValue(payload, ["companyId", "company_id"]),
      "companyId"
    );
  } else if (!partial) {
    throw new ApiError("companyId is required.");
  }

  if (payloadValue(payload, ["personId", "person_id"]) !== undefined) {
    data.personId = readPositiveInteger(
      payloadValue(payload, ["personId", "person_id"]),
      "personId"
    );
  } else if (!partial) {
    throw new ApiError("personId is required.");
  }

  const textFields = [
    ["title", ["title"], "title"],
    ["department", ["department"], "department"],
    ["seniority", ["seniority"], "seniority"],
    ["startDate", ["startDate", "start_date"], "startDate"],
    ["endDate", ["endDate", "end_date"], "endDate"],
    ["notes", ["notes"], "notes"]
  ];

  for (const [column, names, label] of textFields) {
    const value = readText(payload, names, label);

    if (value !== undefined) {
      data[column] = value;
    }
  }

  const isCurrent = readBoolean(
    payloadValue(payload, ["isCurrent", "is_current"]),
    "isCurrent"
  );

  if (isCurrent !== undefined) {
    data.isCurrent = isCurrent;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new ApiError("Provide at least one position field.");
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
  const currentValue =
    searchParams.get("isCurrent") ??
    searchParams.get("is_current") ??
    searchParams.get("current");
  const isCurrent = readBooleanFilter(currentValue, "isCurrent");

  if (searchParams.has("companyId") || searchParams.has("company_id")) {
    where.companyId = readPositiveInteger(
      searchParams.get("companyId") || searchParams.get("company_id"),
      "companyId"
    );
  }

  if (searchParams.has("personId") || searchParams.has("person_id")) {
    where.personId = readPositiveInteger(
      searchParams.get("personId") || searchParams.get("person_id"),
      "personId"
    );
  }

  if (isCurrent !== undefined) {
    where.isCurrent = isCurrent;
  }

  return where;
}

export function revalidatePosition(position) {
  const paths = new Set(["/", "/people", "/companies", "/contacted", "/replied", "/converted"]);

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
