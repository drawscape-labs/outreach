import { revalidatePath } from "next/cache";
import { query, sqlInteger } from "../../../../lib/db";
import { isLeadStatus } from "../../../../lib/statuses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error, status = 400) {
  return Response.json({ error }, { status });
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export async function PATCH(request, context) {
  const { id } = await context.params;
  const personId = sqlInteger(id);

  if (!personId) {
    return jsonError("Invalid person id.");
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Request body must be an object.");
  }

  const updates = [];

  if (hasOwn(payload, "status")) {
    if (!isLeadStatus(payload.status)) {
      return jsonError("Invalid status.");
    }

    updates.push(`status = '${payload.status}'`);
  }

  if (hasOwn(payload, "qualified")) {
    if (
      payload.qualified !== true &&
      payload.qualified !== false &&
      payload.qualified !== 1 &&
      payload.qualified !== 0
    ) {
      return jsonError("Invalid qualified value.");
    }

    updates.push(`qualified = ${payload.qualified ? 1 : 0}`);
  }

  if (!updates.length) {
    return jsonError("No supported fields provided.");
  }

  const people = query(`
    UPDATE people
    SET ${updates.join(", ")}
    WHERE id = ${personId}
    RETURNING id, status, qualified;
  `);

  const person = people[0];

  if (!person) {
    return jsonError("Person not found.", 404);
  }

  revalidatePath("/people");

  return Response.json({
    person: {
      id: person.id,
      status: person.status,
      qualified: Boolean(person.qualified)
    }
  });
}
