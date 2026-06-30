const fieldSeparator = "::";
const itemSeparator = "||";

export function splitCompanies(companies) {
  return companies
    ? companies
        .split(",")
        .map((company) => company.trim())
        .filter(Boolean)
    : [];
}

export function splitList(value) {
  return value
    ? value
        .split(itemSeparator)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function splitCompanyRefs(companyRefs) {
  const companies = new Map();

  splitList(companyRefs).forEach((companyRef) => {
    const [id, name, domain = "", websiteUrl = ""] = companyRef.split(fieldSeparator);

    if (id && name && !companies.has(id)) {
      companies.set(id, { id, name, domain, websiteUrl });
    }
  });

  return Array.from(companies.values());
}
