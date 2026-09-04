// Shared access to the repository-level outreach strategy.
// Keep market segments, buyer personas, and positioning in outreach.config.json.
import outreachConfig from "../../outreach.config.json";

function requireArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`outreach.config.json must define a non-empty ${field} array.`);
  }

  return value;
}

function requireUniqueIds(items, field) {
  const ids = items.map((item) => item?.id).filter(Boolean);

  if (ids.length !== items.length || new Set(ids).size !== ids.length) {
    throw new Error(`outreach.config.json ${field} entries must have unique ids.`);
  }
}

const accountSegments = requireArray(
  outreachConfig.accountSegments,
  "accountSegments"
);
const contactPersonas = requireArray(
  outreachConfig.contactPersonas,
  "contactPersonas"
);
const priorityLevels = requireArray(
  outreachConfig.priority?.levels,
  "priority.levels"
);

requireUniqueIds(accountSegments, "accountSegments");
requireUniqueIds(contactPersonas, "contactPersonas");
requireUniqueIds(priorityLevels, "priority.levels");

export const OUTREACH_CONFIG = outreachConfig;
export const OUTREACH_ACCOUNT_SEGMENTS = accountSegments;
export const OUTREACH_CONTACT_PERSONAS = contactPersonas;
export const OUTREACH_PRIORITY_LEVELS = priorityLevels;
export const OUTREACH_WORKSPACE_NAME =
  outreachConfig.organization?.workspaceName ||
  outreachConfig.organization?.name ||
  "Outreach";
