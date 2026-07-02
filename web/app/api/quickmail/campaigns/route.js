import { listQuickmailCampaigns, QuickmailError } from "@/lib/quickmail";

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

function readPositiveInteger(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const text = searchParams.get("text")?.trim() || "";
  const first = readPositiveInteger(searchParams.get("first"), 50);
  const skip = readPositiveInteger(searchParams.get("skip"), 0);

  if (!first || first > 100) {
    return jsonError("first must be between 1 and 100.");
  }

  if (skip === null) {
    return jsonError("skip must be a positive integer.");
  }

  try {
    const campaigns = await listQuickmailCampaigns({ text, first, skip });

    return Response.json({ campaigns });
  } catch (error) {
    if (error instanceof QuickmailError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError("Could not load QuickMail campaigns.", 500);
  }
}
