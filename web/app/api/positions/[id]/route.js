import {
  handleApiError,
  jsonError,
  readId,
  readPayload
} from "@/app/api/lib/model-helpers";
import {
  deletePosition,
  getPosition,
  positionJson,
  revalidatePosition,
  updatePosition
} from "@/app/api/positions/model";
import { POSITION_API_MESSAGES } from "@/app/api/positions/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const foreignKeyMessage = POSITION_API_MESSAGES.foreignKey;
const notFoundMessage = POSITION_API_MESSAGES.notFound;

export async function GET(_request, context) {
  try {
    const id = await readId(context, "position");
    const position = await getPosition(id);

    if (!position) {
      return jsonError(notFoundMessage, 404);
    }

    return Response.json({ position: positionJson(position) });
  } catch (error) {
    return handleApiError(error, { foreignKeyMessage, notFoundMessage });
  }
}

export async function PATCH(request, context) {
  try {
    const id = await readId(context, "position");
    const payload = await readPayload(request);
    const result = await updatePosition(id, payload);

    if (!result) {
      return jsonError(notFoundMessage, 404);
    }

    revalidatePosition(result.previousPosition);
    revalidatePosition(result.position);

    return Response.json({ position: positionJson(result.position) });
  } catch (error) {
    return handleApiError(error, { foreignKeyMessage, notFoundMessage });
  }
}

export async function DELETE(_request, context) {
  try {
    const id = await readId(context, "position");
    const position = await deletePosition(id);

    if (!position) {
      return jsonError(notFoundMessage, 404);
    }

    revalidatePosition(position);

    return Response.json({
      deleted: true,
      position: positionJson(position)
    });
  } catch (error) {
    return handleApiError(error, { foreignKeyMessage, notFoundMessage });
  }
}
