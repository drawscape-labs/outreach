import {
  handleApiError,
  jsonError,
  readId,
  readPayload
} from "@/app/api/lib/model-helpers";
import {
  deletePerson,
  getPersonDetail,
  getPerson,
  personDetailJson,
  personJson,
  revalidatePerson,
  updatePerson
} from "@/app/api/people/model";
import { PERSON_API_MESSAGES } from "@/app/api/people/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFoundMessage = PERSON_API_MESSAGES.notFound;

export async function GET(_request, context) {
  try {
    const id = await readId(context, "person");
    const person = await getPerson(id);

    if (!person) {
      return jsonError(notFoundMessage, 404);
    }

    const personDetail = await getPersonDetail(id);

    return Response.json({ person: personDetailJson(personDetail) });
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
