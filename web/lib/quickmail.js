import fs from "node:fs";
import path from "node:path";

const QUICKMAIL_GRAPHQL_ENDPOINT = "https://api.quickmail.com/v2/graphql";

let localEnvCache;

export class QuickmailError extends Error {
  constructor(message, { status = 502, details } = {}) {
    super(message);
    this.name = "QuickmailError";
    this.status = status;
    this.details = details;
  }
}

function parseEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readLocalEnv() {
  if (localEnvCache) {
    return localEnvCache;
  }

  localEnvCache = {};

  for (const envPath of [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", ".env")
  ]) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const assignment = trimmed.startsWith("export ")
        ? trimmed.slice("export ".length)
        : trimmed;
      const separatorIndex = assignment.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = assignment.slice(0, separatorIndex).trim();
      const value = assignment.slice(separatorIndex + 1);

      if (key && localEnvCache[key] === undefined) {
        localEnvCache[key] = parseEnvValue(value);
      }
    }
  }

  return localEnvCache;
}

export function getQuickmailEnv(name) {
  return process.env[name] || readLocalEnv()[name] || "";
}

function getQuickmailApiKey() {
  const apiKey = getQuickmailEnv("QUICKMAIL_API_KEY");

  if (!apiKey) {
    throw new QuickmailError("QUICKMAIL_API_KEY is not configured.", {
      status: 500
    });
  }

  return apiKey;
}

function graphqlErrorMessage(payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    return payload.errors
      .map((error) => error?.message)
      .filter(Boolean)
      .join("; ");
  }

  return payload?.error || "";
}

export async function quickmailGraphql({ query, variables, operationName }) {
  const response = await fetch(QUICKMAIL_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: getQuickmailApiKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables,
      operationName
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    const message =
      graphqlErrorMessage(payload) ||
      `QuickMail request failed with status ${response.status}.`;

    throw new QuickmailError(message, {
      status,
      details: payload
    });
  }

  const errorMessage = graphqlErrorMessage(payload);

  if (errorMessage) {
    throw new QuickmailError(errorMessage, {
      details: payload.errors
    });
  }

  return payload.data;
}

export async function createQuickmailLead({ workspaceId, lead }) {
  const data = await quickmailGraphql({
    operationName: "CreateQuickmailLead",
    query: `
      mutation CreateQuickmailLead($workspaceId: ID!, $leads: [LeadInputType!]!) {
        createLeads(input: { workspaceId: $workspaceId, leads: $leads }) {
          leads {
            id
            email
            fullName
            appUrl
          }
        }
      }
    `,
    variables: {
      workspaceId,
      leads: [lead]
    }
  });

  return data.createLeads.leads[0];
}

export async function listQuickmailCampaigns({ text = "", first = 50, skip = 0 } = {}) {
  const data = await quickmailGraphql({
    operationName: "ListQuickmailCampaigns",
    query: `
      query ListQuickmailCampaigns {
        workspaces(first: 100) {
          nodes {
            id
            name
            campaigns(first: 100) {
              nodes {
                id
                name
                paused
                appUrl
                leadStatus {
                  active
                  available
                  completed
                  failed
                  total
                }
              }
            }
          }
        }
      }
    `,
    variables: {}
  });

  const needle = text.trim().toLowerCase();
  const campaigns = data.workspaces.nodes.flatMap((workspace) =>
    workspace.campaigns.nodes.map((campaign) => ({
      ...campaign,
      workspaceId: workspace.id,
      workspaceName: workspace.name
    }))
  );
  const filteredCampaigns = needle
    ? campaigns.filter((campaign) => campaign.name.toLowerCase().includes(needle))
    : campaigns;

  return filteredCampaigns.slice(skip, skip + first);
}

export async function addQuickmailLeadsToCampaign({ campaignId, leadIds }) {
  const data = await quickmailGraphql({
    operationName: "AddQuickmailLeadsToCampaign",
    query: `
      mutation AddQuickmailLeadsToCampaign($campaignId: ID!, $leadIds: [String!]!) {
        addLeadsToCampaign(input: { campaignId: $campaignId, leadIds: $leadIds }) {
          leads {
            id
            email
            fullName
            appUrl
          }
          campaign {
            id
            name
            appUrl
          }
        }
      }
    `,
    variables: {
      campaignId,
      leadIds
    }
  });

  return data.addLeadsToCampaign;
}
