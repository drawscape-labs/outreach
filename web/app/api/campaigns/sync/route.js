import { QuickmailError } from "@/lib/quickmail";
import { syncCampaignsFromQuickmail } from "../model";
import { CAMPAIGN_API_MESSAGES } from "../schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const summary = await syncCampaignsFromQuickmail();

    return Response.json({ summary });
  } catch (error) {
    if (error instanceof QuickmailError) {
      return Response.json(
        {
          error: error.message,
          ...(error.details ? { details: error.details } : {})
        },
        { status: error.status }
      );
    }

    return Response.json(
      { error: CAMPAIGN_API_MESSAGES.syncFailed },
      { status: 500 }
    );
  }
}
