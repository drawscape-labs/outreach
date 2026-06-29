import { QUICKMAIL_OPERATION_NAMES } from "./quickmail-operation-names";

export { QUICKMAIL_OPERATION_NAMES };

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

function readPositiveInteger(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function quickmailOperationPayload(operationName, rawVariables = {}) {
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
