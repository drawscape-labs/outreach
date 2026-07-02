import { handleApiError, readPayload } from "@/app/api/lib/model-helpers";
import {
  createPosition,
  listPositions,
  positionJson,
  revalidatePosition
} from "./model";
import { POSITION_API_MESSAGES } from "./schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const foreignKeyMessage = POSITION_API_MESSAGES.foreignKey;

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
