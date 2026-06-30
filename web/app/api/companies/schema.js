export const COMPANY_FIELDS = {
  id: "id",
  name: "name",
  domain: "domain",
  linkedinCompanyUrl: "linkedinCompanyUrl",
  websiteUrl: "websiteUrl",
  description: "description",
  industry: "industry",
  location: "location",
  employeeCount: "employeeCount",
  employeeCountRange: "employeeCountRange",
  dateEnriched: "dateEnriched",
  notes: "notes",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};

export const COMPANY_FIELD_ALIASES = {
  name: ["name"],
  domain: ["domain"],
  linkedinCompanyUrl: ["linkedinCompanyUrl", "linkedin_company_url"],
  websiteUrl: ["websiteUrl", "website_url"],
  description: ["description"],
  industry: ["industry"],
  location: ["location"],
  employeeCount: ["employeeCount", "employee_count"],
  employeeCountRange: ["employeeCountRange", "employee_count_range"],
  dateEnriched: ["dateEnriched", "date_enriched"],
  notes: ["notes"]
};

export const COMPANY_REQUIRED_CREATE_FIELDS = [
  COMPANY_FIELDS.name,
  COMPANY_FIELDS.domain,
  COMPANY_FIELDS.linkedinCompanyUrl
];

export const COMPANY_FILTER_PARAMS = {
  industry: ["industry"],
  legacyIndustry: ["category"]
};

export const COMPANY_API_MESSAGES = {
  emptyPatch: "Provide at least one company field.",
  notFound: "Company not found."
};

export const COMPANY_REVALIDATION_PATHS = [
  "/",
  "/companies"
];
