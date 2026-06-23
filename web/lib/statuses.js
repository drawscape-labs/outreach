export const LEAD_STATUSES = Object.freeze(["New", "Contacted", "Replied"]);

export const LEAD_STATUS_TONES = Object.freeze({
  New: "gray",
  Contacted: "blue",
  Replied: "emerald"
});

export function isLeadStatus(status) {
  return LEAD_STATUSES.includes(status);
}
