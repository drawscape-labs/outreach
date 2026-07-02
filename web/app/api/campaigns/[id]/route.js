import {
  handleApiError,
  jsonError,
  readId
} from "@/app/api/lib/model-helpers";
import { campaignJson, getCampaign } from "@/app/api/campaigns/model";
import { CAMPAIGN_API_MESSAGES } from "@/app/api/campaigns/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFoundMessage = CAMPAIGN_API_MESSAGES.notFound;

export async function GET(_request, context) {
  try {
    const id = await readId(context, "campaign");
    const campaign = await getCampaign(id);

    if (!campaign) {
      return jsonError(notFoundMessage, 404);
    }

    return Response.json({ campaign: campaignJson(campaign) });
  } catch (error) {
    return handleApiError(error, { notFoundMessage });
  }
}
