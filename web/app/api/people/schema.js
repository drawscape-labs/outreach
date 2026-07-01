export const PERSON_STATUS = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  converted: "Converted"
};

export const PERSON_STATUSES = [
  PERSON_STATUS.new,
  PERSON_STATUS.contacted,
  PERSON_STATUS.replied,
  PERSON_STATUS.converted
];

export const PERSON_STATUS_DEFAULT = PERSON_STATUS.new;

export const PERSON_STATUS_TONES = {
  [PERSON_STATUS.new]: "gray",
  [PERSON_STATUS.contacted]: "blue",
  [PERSON_STATUS.replied]: "emerald",
  [PERSON_STATUS.converted]: "amber"
};

export const PERSON_STATUS_BUCKETS = {
  contacted: [
    PERSON_STATUS.contacted,
    PERSON_STATUS.replied,
    PERSON_STATUS.converted
  ],
  replied: [
    PERSON_STATUS.replied,
    PERSON_STATUS.converted
  ],
  converted: [
    PERSON_STATUS.converted
  ]
};

export const PERSON_DEFAULTS = {
  qualified: false,
  status: PERSON_STATUS_DEFAULT
};

export const PERSON_FIELDS = {
  id: "id",
  profileKey: "profileKey",
  linkedinProfileUrl: "linkedinProfileUrl",
  quickmailLeadId: "quickmailLeadId",
  name: "name",
  email: "email",
  phoneNumber: "phoneNumber",
  status: "status",
  qualified: "qualified",
  notes: "notes",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};

export const PERSON_FIELD_ALIASES = {
  profileKey: ["profileKey", "profile_key"],
  linkedinProfileUrl: ["linkedinProfileUrl", "linkedin_profile_url"],
  quickmailLeadId: ["quickmailLeadId", "quickmail_lead_id"],
  name: ["name"],
  email: ["email"],
  phoneNumber: ["phoneNumber", "phone_number"],
  status: ["status"],
  qualified: ["qualified"],
  notes: ["notes"]
};

export const PERSON_REQUIRED_CREATE_FIELDS = [
  PERSON_FIELDS.profileKey,
  PERSON_FIELDS.name
];

export const PERSON_FILTER_PARAMS = {
  companyId: ["companyId", "company_id"],
  companyIndustry: ["industry", "companyIndustry", "company_industry"],
  email: ["email"],
  emailAddress: ["emailAddress", "email_address", "exactEmail", "exact_email"],
  linkedin: ["linkedin", "linkedinProfile", "linkedin_profile"],
  linkedinProfileUrl: ["linkedinProfileUrl", "linkedin_profile_url"],
  profileKey: ["profileKey", "profile_key"],
  qualified: ["qualified"],
  quickmailLeadId: ["quickmailLeadId", "quickmail_lead_id", "leadId", "lead_id"],
  status: ["status"]
};

export const PERSON_QUALIFIED_FILTER_VALUES = ["yes", "no"];

export const PERSON_EMAIL_FILTER_VALUES = ["has", "missing"];

export const PERSON_LINKEDIN_FILTER_VALUES = ["has", "missing"];

export const PERSON_API_MESSAGES = {
  emptyPatch: "Provide at least one person field.",
  invalidEmail: "email must be a valid email address.",
  invalidEmailFilter: "Invalid email filter.",
  invalidLinkedinFilter: "Invalid LinkedIn filter.",
  invalidLinkedinProfileUrl: "linkedinProfileUrl must be a valid LinkedIn profile URL.",
  invalidPhoneNumber: "phoneNumber must be a valid phone number.",
  invalidProfileKey: "profileKey must be in/handle, pub/handle, or email/address.",
  invalidQuickmailLeadId: "quickmailLeadId must be a valid QuickMail lead id.",
  invalidStatus: "Invalid status.",
  notFound: "Person not found."
};

export const PERSON_REVALIDATION_PATHS = [
  "/",
  "/people",
  "/companies",
  "/contacted",
  "/replied",
  "/converted"
];
