import { quickmailGraphql, QuickmailError } from "../../../../lib/quickmail";
import { quickmailOperationPayload } from "../../../../lib/quickmail-graphql-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    return null;
  }
}

export async function POST(request) {
  const payload = await readPayload(request);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Request body must be a JSON object.");
  }

  const operation = quickmailOperationPayload(
    payload.operationName,
    payload.variables || {}
  );

  if (operation.error) {
    return jsonError(operation.error);
  }

  try {
    const data = await quickmailGraphql(operation);

    return Response.json({ data });
  } catch (error) {
    if (error instanceof QuickmailError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError("Could not complete QuickMail request.", 500);
  }
}
