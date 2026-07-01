export const POSITION_FIELDS = {
  id: "id",
  companyId: "companyId",
  personId: "personId",
  title: "title",
  department: "department",
  seniority: "seniority",
  startDate: "startDate",
  endDate: "endDate",
  isCurrent: "isCurrent",
  notes: "notes",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};

export const POSITION_FIELD_ALIASES = {
  companyId: ["companyId", "company_id"],
  personId: ["personId", "person_id"],
  title: ["title"],
  department: ["department"],
  seniority: ["seniority"],
  startDate: ["startDate", "start_date"],
  endDate: ["endDate", "end_date"],
  isCurrent: ["isCurrent", "is_current"],
  notes: ["notes"]
};

export const POSITION_FILTER_PARAMS = {
  companyId: POSITION_FIELD_ALIASES.companyId,
  isCurrent: ["isCurrent", "is_current", "current"],
  personId: POSITION_FIELD_ALIASES.personId
};

export const POSITION_REQUIRED_CREATE_FIELDS = [
  POSITION_FIELDS.companyId,
  POSITION_FIELDS.personId
];

export const POSITION_DEFAULTS = {
  isCurrent: true
};

export const POSITION_API_MESSAGES = {
  duplicateRole: "A position for that company, person, title, and start date already exists.",
  emptyPatch: "Provide at least one position field.",
  foreignKey: "Related company or person was not found.",
  notFound: "Position not found."
};

export const POSITION_REVALIDATION_PATHS = [
  "/",
  "/people",
  "/companies",
  "/contacted",
  "/replied",
  "/converted"
];
