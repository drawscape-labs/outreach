import { QUICKMAIL_OPERATION_NAMES } from "./quickmail-operation-names";

export const quickmailCampaignsQueryKey = ["quickmail", "campaigns"];

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function quickmailProxyRequest({ operationName, variables = {} }) {
  const payload = await fetchJson("/api/quickmail/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      operationName,
      variables
    })
  });

  return payload.data;
}

function flattenCampaigns(data) {
  return (data?.workspaces?.nodes || []).flatMap((workspace) =>
    (workspace.campaigns?.nodes || []).map((campaign) => ({
      ...campaign,
      workspaceId: workspace.id,
      workspaceName: workspace.name
    }))
  );
}

export async function fetchQuickmailCampaigns({
  text = "",
  first = 50,
  skip = 0
} = {}) {
  const data = await quickmailProxyRequest({
    operationName: QUICKMAIL_OPERATION_NAMES.listCampaigns
  });
  const needle = text.trim().toLowerCase();
  const campaigns = flattenCampaigns(data);
  const filteredCampaigns = needle
    ? campaigns.filter((campaign) => campaign.name.toLowerCase().includes(needle))
    : campaigns;

  return filteredCampaigns.slice(skip, skip + first);
}

export async function addQuickmailLeadToCampaign({ campaignId, body }) {
  return fetchJson(
    `/api/quickmail/campaigns/${encodeURIComponent(campaignId)}/leads`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}
