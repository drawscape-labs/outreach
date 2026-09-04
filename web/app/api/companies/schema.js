export const COMPANY_FIELDS = {
  id: "id",
  name: "name",
  domain: "domain",
  linkedinCompanyUrl: "linkedinCompanyUrl",
  websiteUrl: "websiteUrl",
  description: "description",
  category: "category",
  priority: "priority",
  industry: "industry",
  location: "location",
  country: "country",
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
  category: ["category"],
  priority: ["priority"],
  industry: ["industry"],
  location: ["location"],
  country: ["country", "country_name"],
  employeeCount: ["employeeCount", "employee_count"],
  employeeCountRange: ["employeeCountRange", "employee_count_range"],
  dateEnriched: ["dateEnriched", "date_enriched"],
  notes: ["notes"]
};

export const COMPANY_REQUIRED_CREATE_FIELDS = [
  COMPANY_FIELDS.name,
  COMPANY_FIELDS.domain
];

export const COMPANY_DEFAULT_PRIORITY = "medium";

export const COMPANY_FILTER_PARAMS = {
  category: ["category"],
  domain: ["domain"],
  industry: ["industry"],
  linkedinCompanyUrl: ["linkedinCompanyUrl", "linkedin_company_url"],
  country: ["country", "country_name"],
  priority: ["priority"]
};

export const COMPANY_API_MESSAGES = {
  emptyPatch: "Provide at least one company field.",
  invalidDomain: "domain must be a valid domain or URL.",
  invalidLinkedinCompanyUrl: "linkedinCompanyUrl must be a valid LinkedIn company URL.",
  invalidPriority: "priority must be a non-empty string.",
  invalidWebsiteUrl: "websiteUrl must be a valid URL.",
  notFound: "Company not found."
};

export const COMPANY_REVALIDATION_PATHS = [
  "/",
  "/companies"
];
