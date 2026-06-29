import { revalidatePath } from "next/cache";
import {
  createRecord,
  CrudError,
  deleteRecord,
  getModel,
  getRecord,
  listRecords,
  updateRecord
} from "./crud";

function jsonError(error, status = 400, details) {
  return Response.json(
    {
      error,
      ...(details ? { details } : {})
    },
    { status }
  );
}

async function readPayload(request) {
  try {
    return await request.json();
  } catch {
    throw new CrudError("Request body must be valid JSON.");
  }
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function databaseError(error) {
  const message = String(error?.message || "");

  if (message.includes("UNIQUE constraint failed")) {
    return {
      status: 409,
      message: "A record with that unique value already exists."
    };
  }

  if (message.includes("FOREIGN KEY constraint failed")) {
    return {
      status: 400,
      message: "Related company or person was not found."
    };
  }

  if (message.includes("CHECK constraint failed")) {
    return {
      status: 400,
      message: "A value failed a database constraint."
    };
  }

  return {
    status: 500,
    message: "Database query failed."
  };
}

function handleError(error) {
  if (error instanceof CrudError) {
    return jsonError(error.message, error.status);
  }

  const dbError = databaseError(error);
  return jsonError(dbError.message, dbError.status);
}

function revalidateRecord(modelName, record) {
  const paths = new Set(["/", "/people", "/companies", "/contacted", "/replied", "/converted"]);

  if (modelName === "people" && record?.id) {
    paths.add(`/people/${record.id}`);
  }

  if (modelName === "companies" && record?.id) {
    paths.add(`/companies/${record.id}`);
  }

  if (modelName === "positions") {
    if (record?.personId) {
      paths.add(`/people/${record.personId}`);
    }

    if (record?.companyId) {
      paths.add(`/companies/${record.companyId}`);
    }
  }

  paths.forEach((path) => revalidatePath(path));
}

async function readId(context) {
  const params = await context.params;
  return params.id;
}

export function collectionHandlers(modelName) {
  const model = getModel(modelName);

  return {
    GET(request) {
      try {
        const searchParams = new URL(request.url).searchParams;
        const records = listRecords(modelName, searchParams);

        return Response.json({ [model.name]: records });
      } catch (error) {
        return handleError(error);
      }
    },

    async POST(request) {
      try {
        const payload = await readPayload(request);
        const record = createRecord(modelName, payload);

        revalidateRecord(modelName, record);

        return Response.json({ [model.singular]: record }, { status: 201 });
      } catch (error) {
        return handleError(error);
      }
    }
  };
}

export function itemHandlers(modelName) {
  const model = getModel(modelName);
  const notFoundLabel = titleCase(model.singular);

  return {
    async GET(_request, context) {
      try {
        const id = await readId(context);
        const record = getRecord(modelName, id);

        return Response.json({ [model.singular]: record });
      } catch (error) {
        return handleError(error);
      }
    },

    async PATCH(request, context) {
      try {
        const id = await readId(context);
        const payload = await readPayload(request);
        const record = updateRecord(modelName, id, payload);

        revalidateRecord(modelName, record);

        return Response.json({ [model.singular]: record });
      } catch (error) {
        return handleError(error);
      }
    },

    async DELETE(_request, context) {
      try {
        const id = await readId(context);
        const record = deleteRecord(modelName, id);

        revalidateRecord(modelName, record);

        return Response.json({
          deleted: true,
          [model.singular]: record
        });
      } catch (error) {
        if (error instanceof CrudError && error.status === 404) {
          return jsonError(`${notFoundLabel} not found.`, 404);
        }

        return handleError(error);
      }
    }
  };
}
