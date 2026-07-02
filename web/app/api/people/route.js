import { handleApiError, readPayload } from "@/app/api/lib/model-helpers";
import {
  createPerson,
  listPeople,
  personJson,
  revalidatePerson
} from "./model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const people = await listPeople(searchParams);

    return Response.json({ people: people.map(personJson) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const person = await createPerson(payload);

    revalidatePerson(person);

    return Response.json({ person: personJson(person) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
