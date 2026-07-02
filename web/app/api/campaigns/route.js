import { campaignJson, listCampaigns } from "./model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const campaigns = await listCampaigns();

  return Response.json({ campaigns: campaigns.map(campaignJson) });
}
