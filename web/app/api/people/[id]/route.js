import {
  handleApiError,
  jsonError,
  readId,
  readPayload
} from "../../lib/model-helpers";
import {
  deletePerson,
  getPerson,
  personJson,
  revalidatePerson,
  updatePerson
} from "../model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFoundMessage = "Person not found.";

export async function GET(_request, context) {
  try {
    const id = await readId(context, "person");
    const person = await getPerson(id);

    if (!person) {
      return jsonError(notFoundMessage, 404);
    }

    return Response.json({ person: personJson(person) });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}

export async function PATCH(request, context) {
  try {
    const id = await readId(context, "person");
    const payload = await readPayload(request);
    const person = await updatePerson(id, payload);

    if (!person) {
      return jsonError(notFoundMessage, 404);
    }

    revalidatePerson(person);

    return Response.json({ person: personJson(person) });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}

export async function DELETE(_request, context) {
  try {
    const id = await readId(context, "person");
    const person = await deletePerson(id);

    if (!person) {
      return jsonError(notFoundMessage, 404);
    }

    revalidatePerson(person);

    return Response.json({
      deleted: true,
      person: personJson(person)
    });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}
