import {
  PERSON_STATUSES,
  PERSON_STATUS_TONES
} from "../app/api/people/schema";

export const LEAD_STATUSES = PERSON_STATUSES;

export const LEAD_STATUS_TONES = PERSON_STATUS_TONES;

export function isLeadStatus(status) {
  return LEAD_STATUSES.includes(status);
}
