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

export const COMPANY_CATEGORIES = ["aircraft", "automotive", "yacht"];
export const COMPANY_PRIORITIES = ["high", "medium", "low"];

export const COMPANY_CATEGORY_LABELS = {
  aircraft: "Aircraft",
  automotive: "Automotive",
  yacht: "Yacht"
};

export const COMPANY_PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

export const COMPANY_FILTER_PARAMS = {
  category: ["category"],
  domain: ["domain"],
  industry: ["industry"],
  linkedinCompanyUrl: ["linkedinCompanyUrl", "linkedin_company_url"],
  priority: ["priority"]
};

export const COMPANY_API_MESSAGES = {
  emptyPatch: "Provide at least one company field.",
  invalidCategory: "category must be aircraft, automotive, or yacht.",
  invalidDomain: "domain must be a valid domain or URL.",
  invalidLinkedinCompanyUrl: "linkedinCompanyUrl must be a valid LinkedIn company URL.",
  invalidPriority: "priority must be high, medium, or low.",
  invalidWebsiteUrl: "websiteUrl must be a valid URL.",
  notFound: "Company not found."
};

export const COMPANY_REVALIDATION_PATHS = [
  "/",
  "/companies"
];
