import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { toJsonDate } from "@/lib/date-json";
import {
  listArchivedQuickmailCampaigns,
  listQuickmailCampaigns
} from "@/lib/quickmail";
import { CAMPAIGN_REVALIDATION_PATHS } from "./schema";

const campaignSelect = {
  id: true,
  quickmailCampaignId: true,
  name: true,
  workspaceId: true,
  workspaceName: true,
  paused: true,
  archived: true,
  appUrl: true,
  quickmailCreatedAt: true,
  lastSyncedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true
};

export function campaignJson(campaign) {
  return {
    id: campaign.id,
    quickmailCampaignId: campaign.quickmailCampaignId,
    name: campaign.name,
    workspaceId: campaign.workspaceId,
    workspaceName: campaign.workspaceName,
    paused: campaign.paused,
    archived: campaign.archived,
    appUrl: campaign.appUrl,
    quickmailCreatedAt: toJsonDate(campaign.quickmailCreatedAt),
    lastSyncedAt: toJsonDate(campaign.lastSyncedAt),
    notes: campaign.notes,
    createdAt: toJsonDate(campaign.createdAt),
    updatedAt: toJsonDate(campaign.updatedAt)
  };
}

export function getCampaign(id) {
  return prisma.campaign.findUnique({
    where: { id },
    select: campaignSelect
  });
}

export function listCampaigns() {
  return prisma.campaign.findMany({
    orderBy: [{ archived: "asc" }, { name: "asc" }, { id: "asc" }],
    select: campaignSelect
  });
}

function parseQuickmailDate(value) {
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function quickmailCampaignData(campaign, { archived, syncedAt }) {
  return {
    name: campaign.name,
    workspaceId: campaign.workspaceId || null,
    workspaceName: campaign.workspaceName || null,
    paused: Boolean(campaign.paused),
    archived,
    appUrl: campaign.appUrl || null,
    quickmailCreatedAt: parseQuickmailDate(campaign.createdAt),
    lastSyncedAt: syncedAt
  };
}

// Campaigns live in QuickMail; this mirror is refreshed by upserting every
// campaign QuickMail returns and archiving local rows it no longer mentions.
// Local rows are never deleted so future leads keep a stable campaign id.
export async function syncCampaignsFromQuickmail() {
  const [activeCampaigns, archivedCampaigns] = await Promise.all([
    listQuickmailCampaigns({ first: 100 }),
    listArchivedQuickmailCampaigns()
  ]);
  const syncedAt = new Date();
  const seenIds = new Set();
  const summary = { archived: 0, created: 0, updated: 0 };
  const remoteCampaigns = [
    ...activeCampaigns.map((campaign) => ({ archived: false, campaign })),
    ...archivedCampaigns.map((campaign) => ({ archived: true, campaign }))
  ];

  for (const { archived, campaign } of remoteCampaigns) {
    if (!campaign?.id || seenIds.has(campaign.id)) {
      continue;
    }

    seenIds.add(campaign.id);

    const data = quickmailCampaignData(campaign, { archived, syncedAt });
    const existing = await prisma.campaign.findUnique({
      where: { quickmailCampaignId: campaign.id },
      select: { id: true }
    });

    if (existing) {
      await prisma.campaign.update({
        where: { quickmailCampaignId: campaign.id },
        data
      });
      summary.updated += 1;
    } else {
      await prisma.campaign.create({
        data: {
          quickmailCampaignId: campaign.id,
          ...data
        }
      });
      summary.created += 1;
    }
  }

  const missing = await prisma.campaign.updateMany({
    where: {
      archived: false,
      quickmailCampaignId: { notIn: Array.from(seenIds) }
    },
    data: {
      archived: true,
      lastSyncedAt: syncedAt
    }
  });

  summary.archived = missing.count;
  summary.total = await prisma.campaign.count();

  CAMPAIGN_REVALIDATION_PATHS.forEach((path) => revalidatePath(path));

  return summary;
}
