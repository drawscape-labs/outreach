import {
  DataTable,
  EmptyValue,
  ExternalAnchor,
  Link,
  PageHeader,
  PageShell,
  TableEmpty,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from "../../components";
import { getCompanies } from "../../lib/prospects";
import { CompanyFilters } from "./components/company-filters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const contactFilters = ["with_people", "without_people"];
const legacyIndustryParam = "category";

function firstSearchParam(searchParams, key) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function getUniqueValues(items, key) {
  return Array.from(
    new Set(items.map((item) => item[key]).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second));
}

function getFilters(searchParams, options) {
  const industry =
    firstSearchParam(searchParams, "industry") ||
    firstSearchParam(searchParams, legacyIndustryParam);
  const contacts = firstSearchParam(searchParams, "contacts");

  return {
    industry: options.industries.includes(industry) ? industry : "",
    contacts: contactFilters.includes(contacts) ? contacts : ""
  };
}

function companyMatchesFilters(company, filters) {
  const peopleCount = Number(company.peopleCount || 0);

  if (filters.industry && company.industry !== filters.industry) {
    return false;
  }

  if (filters.contacts === "with_people" && peopleCount === 0) {
    return false;
  }

  if (filters.contacts === "without_people" && peopleCount > 0) {
    return false;
  }

  return true;
}

export default async function CompaniesPage({ searchParams }) {
  const allCompanies = getCompanies();
  const options = {
    industries: getUniqueValues(allCompanies, "industry")
  };
  const filters = getFilters(await searchParams, options);
  const companies = allCompanies.filter((company) =>
    companyMatchesFilters(company, filters)
  );

  return (
    <PageShell>
      <PageHeader eyebrow="Prospecting" title="Companies" />
      <section className="mt-6">
        <CompanyFilters filters={filters} options={options} />
        <TableFrame label="Companies table">
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader scope="col">
                  Name
                </TableHeader>
                <TableHeader scope="col" className="hidden md:table-cell">
                  Domain
                </TableHeader>
                <TableHeader scope="col">
                  People
                </TableHeader>
                <TableHeader scope="col" className="hidden lg:table-cell">
                  Industry
                </TableHeader>
                <TableHeader scope="col" className="hidden xl:table-cell">
                  Location
                </TableHeader>
                <TableHeader scope="col" className="text-right">
                  Links
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.length === 0 ? (
                <TableEmpty colSpan={6}>No companies match these filters.</TableEmpty>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="w-full max-w-0 font-medium text-zinc-950 sm:w-auto sm:max-w-none">
                      <Link
                        className="text-gray-900 hover:text-teal-700"
                        href={`/companies/${company.id}`}
                      >
                        {company.name}
                      </Link>
                      <dl className="font-normal lg:hidden">
                        <dt className="sr-only">Domain</dt>
                        <dd className="mt-1 truncate text-gray-500">
                          {company.domain ? (
                            <ExternalAnchor href={company.websiteUrl || `https://${company.domain}`}>
                              {company.domain}
                            </ExternalAnchor>
                          ) : (
                            "No domain"
                          )}
                        </dd>
                        <dt className="sr-only">Industry</dt>
                        <dd className="mt-1 truncate text-gray-400">
                          {company.industry || "Industry missing"}
                        </dd>
                      </dl>
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 md:table-cell">
                      {company.domain ? (
                        <ExternalAnchor href={company.websiteUrl || `https://${company.domain}`}>
                          {company.domain}
                        </ExternalAnchor>
                      ) : (
                        <EmptyValue />
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      <span className="font-medium text-gray-900">{company.peopleCount}</span>
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 lg:table-cell">
                      {company.industry || <EmptyValue />}
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 xl:table-cell">
                      {company.location || <EmptyValue />}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <div className="flex justify-end gap-x-4">
                        <ExternalAnchor href={company.linkedinCompanyUrl}>
                          LinkedIn
                        </ExternalAnchor>
                        <ExternalAnchor href={company.websiteUrl} missingLabel="No site">
                          Website
                        </ExternalAnchor>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </TableFrame>
      </section>
    </PageShell>
  );
}
