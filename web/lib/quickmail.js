import "server-only";

import fs from "node:fs";
import path from "node:path";

const QUICKMAIL_GRAPHQL_ENDPOINT = "https://api.quickmail.com/v2/graphql";

let localEnvCache;

const QUICKMAIL_OPERATION_NAMES = {
  getLead: "GetQuickmailLead",
  listCampaigns: "ListQuickmailCampaigns",
  searchLeads: "SearchQuickmailLeads"
};

const QUICKMAIL_OPERATIONS = {
  [QUICKMAIL_OPERATION_NAMES.searchLeads]: {
    query: `
      query SearchQuickmailLeads($text: String!, $first: Int!) {
        leads(text: $text, first: $first) {
          nodes {
            id
            email
            firstName
            lastName
            fullName
            title
            role
            phone
            linkedinId
            language
            appUrl
          }
        }
      }
    `,
    variables(rawVariables) {
      const text =
        typeof rawVariables?.text === "string" ? rawVariables.text.trim() : "";
      const first = readPositiveInteger(rawVariables?.first, 25);

      if (!text) {
        return { error: "text is required." };
      }

      if (!first || first > 100) {
        return { error: "first must be between 1 and 100." };
      }

      return {
        variables: {
          text,
          first
        }
      };
    }
  },
  [QUICKMAIL_OPERATION_NAMES.getLead]: {
    query: `
      query GetQuickmailLead($id: ID!) {
        lead(id: $id) {
          id
          email
          firstName
          lastName
          fullName
          title
          role
          phone
          linkedinId
          score
          language
          appUrl
          tags(first: 20) {
            nodes {
              id
              name
            }
          }
          customProperties(first: 50) {
            nodes {
              id
              name
              value
            }
          }
        }
      }
    `,
    variables(rawVariables) {
      const id = typeof rawVariables?.id === "string" ? rawVariables.id.trim() : "";

      if (!id) {
        return { error: "id is required." };
      }

      return {
        variables: {
          id
        }
      };
    }
  },
  [QUICKMAIL_OPERATION_NAMES.listCampaigns]: {
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
    variables() {
      return { variables: {} };
    }
  }
};

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

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeQuickmailLinkedinId(value) {
  const input = typeof value === "string" ? value.trim() : "";

  if (!input) {
    return "";
  }

  const profileKeyMatch = input.match(/^(?:in|pub)\/([^/?#]+)/i);

  if (profileKeyMatch) {
    return profileKeyMatch[1].toLowerCase();
  }

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "linkedin.com") {
      const segments = url.pathname.split("/").filter(Boolean);
      const profileIndex = segments.findIndex((segment) =>
        ["in", "pub"].includes(segment.toLowerCase())
      );

      if (profileIndex !== -1 && segments[profileIndex + 1]) {
        return segments[profileIndex + 1].toLowerCase();
      }
    }
  } catch {
    // Non-URL LinkedIn ids are accepted by QuickMail.
  }

  return input.replace(/^\/+|\/+$/g, "").toLowerCase();
}

function leadSearchTerms(lead) {
  return uniqueValues([
    normalizeQuickmailLinkedinId(lead?.linkedinId),
    normalizeEmail(lead?.email)
  ]);
}

function leadMatchesLinkedinId(candidate, lead) {
  const candidateLinkedinId = normalizeQuickmailLinkedinId(candidate?.linkedinId);
  const leadLinkedinId = normalizeQuickmailLinkedinId(lead?.linkedinId);

  return Boolean(
    candidateLinkedinId &&
      leadLinkedinId &&
      candidateLinkedinId === leadLinkedinId
  );
}

function leadMatchesEmail(candidate, lead) {
  const candidateEmail = normalizeEmail(candidate?.email);
  const leadEmail = normalizeEmail(lead?.email);

  return Boolean(candidateEmail && leadEmail && candidateEmail === leadEmail);
}

function duplicateLeadError(error) {
  if (!(error instanceof QuickmailError)) {
    return false;
  }

  const details = Array.isArray(error.details)
    ? error.details.map((detail) => detail?.message).filter(Boolean)
    : [];
  const message = [error.message, ...details].join(" ");

  return /already exists|duplicate/i.test(message);
}

function readPositiveInteger(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function quickmailOperationPayload(operationName, rawVariables = {}) {
  const operation =
    typeof operationName === "string"
      ? QUICKMAIL_OPERATIONS[operationName.trim()]
      : null;

  if (!operation) {
    return { error: "Unsupported QuickMail operation." };
  }

  const variableResult = operation.variables(rawVariables);

  if (variableResult.error) {
    return { error: variableResult.error };
  }

  return {
    operationName: operationName.trim(),
    query: operation.query,
    variables: variableResult.variables
  };
}

function readQuickmailOperation(operationName, variables) {
  const payload = quickmailOperationPayload(operationName, variables);

  if (payload.error) {
    throw new QuickmailError(payload.error, {
      status: 400
    });
  }

  return payload;
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

export async function searchQuickmailLeads({ text, first = 25 }) {
  const queryText = typeof text === "string" ? text.trim() : "";

  if (!queryText) {
    return [];
  }

  const data = await quickmailGraphql(
    readQuickmailOperation(QUICKMAIL_OPERATION_NAMES.searchLeads, {
      text: queryText,
      first
    })
  );

  return data.leads.nodes;
}

export async function getQuickmailLead({ leadId }) {
  const id = typeof leadId === "string" ? leadId.trim() : "";

  if (!id) {
    return null;
  }

  const data = await quickmailGraphql(
    readQuickmailOperation(QUICKMAIL_OPERATION_NAMES.getLead, {
      id
    })
  );

  return data.lead;
}

export async function findQuickmailLead({ lead }) {
  const candidatesById = new Map();

  for (const text of leadSearchTerms(lead)) {
    const candidates = await searchQuickmailLeads({ text });

    for (const candidate of candidates) {
      if (candidate?.id) {
        candidatesById.set(candidate.id, candidate);
      }
    }
  }

  const exactMatches = uniqueValues(
    Array.from(candidatesById.values())
      .filter(
        (candidate) =>
          leadMatchesLinkedinId(candidate, lead) || leadMatchesEmail(candidate, lead)
      )
      .map((candidate) => candidate.id)
  ).map((id) => candidatesById.get(id));

  if (exactMatches.length > 1) {
    throw new QuickmailError("Multiple QuickMail leads match this contact.", {
      status: 409,
      details: exactMatches.map((candidate) => ({
        id: candidate.id,
        email: candidate.email,
        linkedinId: candidate.linkedinId,
        appUrl: candidate.appUrl
      }))
    });
  }

  return exactMatches[0] || null;
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

export async function createOrReuseQuickmailLead({ workspaceId, lead }) {
  const existingLead = await findQuickmailLead({ lead });

  if (existingLead) {
    return {
      action: "reused",
      lead: existingLead
    };
  }

  try {
    return {
      action: "created",
      lead: await createQuickmailLead({ workspaceId, lead })
    };
  } catch (error) {
    if (duplicateLeadError(error)) {
      const duplicateLead = await findQuickmailLead({ lead });

      if (duplicateLead) {
        return {
          action: "reused",
          lead: duplicateLead
        };
      }
    }

    throw error;
  }
}

export async function listQuickmailCampaigns({ text = "", first = 50, skip = 0 } = {}) {
  const data = await quickmailGraphql(
    readQuickmailOperation(QUICKMAIL_OPERATION_NAMES.listCampaigns)
  );

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
