import { handleApiError, readPayload } from "../lib/model-helpers";
import {
  createPosition,
  listPositions,
  positionJson,
  revalidatePosition
} from "./model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const foreignKeyMessage = "Related company or person was not found.";

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const positions = await listPositions(searchParams);

    return Response.json({ positions: positions.map(positionJson) });
  } catch (error) {
    return handleApiError(error, { foreignKeyMessage });
  }
}

export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const position = await createPosition(payload);

    revalidatePosition(position);

    return Response.json({ position: positionJson(position) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { foreignKeyMessage });
  }
}
