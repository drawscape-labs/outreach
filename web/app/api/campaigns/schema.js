export const CAMPAIGN_FIELDS = {
  id: "id",
  quickmailCampaignId: "quickmailCampaignId",
  name: "name",
  workspaceId: "workspaceId",
  workspaceName: "workspaceName",
  paused: "paused",
  archived: "archived",
  appUrl: "appUrl",
  quickmailCreatedAt: "quickmailCreatedAt",
  lastSyncedAt: "lastSyncedAt",
  notes: "notes",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};

export const CAMPAIGN_API_MESSAGES = {
  notFound: "Campaign not found.",
  syncFailed: "Could not sync campaigns from QuickMail."
};

export const CAMPAIGN_REVALIDATION_PATHS = [
  "/campaigns"
];
