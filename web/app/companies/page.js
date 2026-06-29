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
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious
} from "../../components/ui/pagination";
import { getCompanies } from "../../lib/prospects";
import { CompanyFilters } from "./components/company-filters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const companiesPerPage = 25;
const contactFilters = ["with_people", "without_people"];
const legacyIndustryParam = "category";

function CountPill({ label, tone = "gray", value }) {
  const count = Number(value || 0);
  const tones = {
    amber: "bg-amber-400/20 text-amber-700",
    blue: "bg-blue-500/15 text-blue-700",
    emerald: "bg-emerald-500/15 text-emerald-700",
    gray: "bg-zinc-600/10 text-zinc-700"
  };

  if (count === 0) {
    return null;
  }

  return (
    <span
      title={label}
      aria-label={`${label}: ${count}`}
      className={`inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${tones[tone]}`}
    >
      {count}
    </span>
  );
}

function PeoplePills({ company }) {
  return (
    <div className="inline-flex items-center gap-2">
      <CountPill label="People" value={company.peopleCount} />
      <CountPill
        label="Contacted"
        tone="blue"
        value={company.contactedCount}
      />
      <CountPill
        label="Replied"
        tone="emerald"
        value={company.repliedCount}
      />
      <CountPill
        label="Converted"
        tone="amber"
        value={company.convertedCount}
      />
    </div>
  );
}

function formatHeadcount(company) {
  if (company.employeeCount !== null && company.employeeCount !== undefined && company.employeeCount !== "") {
    return Number(company.employeeCount).toLocaleString();
  }

  return company.employeeCountRange || "";
}

function firstSearchParam(searchParams, key) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function positiveIntegerSearchParam(searchParams, key, fallback = 1) {
  const parsed = Number.parseInt(firstSearchParam(searchParams, key), 10);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
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

function pageHref(filters, page) {
  const params = new URLSearchParams();

  if (filters.industry) {
    params.set("industry", filters.industry);
  }

  if (filters.contacts) {
    params.set("contacts", filters.contacts);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/companies?${queryString}` : "/companies";
}

function paginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 2) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages - 1) {
    pages.add(currentPage + 1);
  }

  const sortedPages = Array.from(pages).sort((first, second) => first - second);

  return sortedPages.flatMap((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (previousPage && page - previousPage > 1) {
      return ["gap", page];
    }

    return [page];
  });
}

function CompaniesPagination({
  currentPage,
  filters,
  pageSize,
  totalCount,
  totalPages
}) {
  if (totalCount === 0) {
    return null;
  }

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalCount);
  const pages = paginationPages(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-zinc-600">
        Showing{" "}
        <span className="font-medium text-zinc-900">{firstItem}</span>
        {" "}to{" "}
        <span className="font-medium text-zinc-900">{lastItem}</span>
        {" "}of{" "}
        <span className="font-medium text-zinc-900">{totalCount}</span>
      </p>
      {totalPages > 1 ? (
        <Pagination className="w-full sm:w-auto">
          <PaginationPrevious
            href={currentPage > 1 ? pageHref(filters, currentPage - 1) : null}
          />
          <PaginationList>
            {pages.map((page, index) =>
              page === "gap" ? (
                <PaginationGap key={`gap-${index}`} />
              ) : (
                <PaginationPage
                  key={page}
                  href={pageHref(filters, page)}
                  current={page === currentPage}
                >
                  {page}
                </PaginationPage>
              )
            )}
          </PaginationList>
          <PaginationNext
            href={currentPage < totalPages ? pageHref(filters, currentPage + 1) : null}
          />
        </Pagination>
      ) : null}
    </div>
  );
}

export default async function CompaniesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const allCompanies = getCompanies();
  const options = {
    industries: getUniqueValues(allCompanies, "industry")
  };
  const filters = getFilters(resolvedSearchParams, options);
  const companies = allCompanies.filter((company) =>
    companyMatchesFilters(company, filters)
  );
  const totalPages = Math.max(1, Math.ceil(companies.length / companiesPerPage));
  const requestedPage = positiveIntegerSearchParam(resolvedSearchParams, "page");
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * companiesPerPage;
  const paginatedCompanies = companies.slice(pageStart, pageStart + companiesPerPage);

  return (
    <PageShell fullWidth>
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
                <TableHeader scope="col">
                  People
                </TableHeader>
                <TableHeader scope="col" className="hidden lg:table-cell">
                  Industry
                </TableHeader>
                <TableHeader scope="col" className="hidden 2xl:table-cell">
                  Headcount
                </TableHeader>
                <TableHeader scope="col" className="hidden 2xl:table-cell">
                  Location
                </TableHeader>
                <TableHeader scope="col" className="hidden text-right sm:table-cell">
                  Links
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCompanies.length === 0 ? (
                <TableEmpty colSpan={6}>No companies match these filters.</TableEmpty>
              ) : (
                paginatedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="w-full max-w-0 font-medium text-zinc-950 sm:w-auto sm:max-w-none">
                      <div className="min-w-0">
                        <Link
                          className="text-gray-900 hover:text-teal-700"
                          href={`/companies/${company.id}`}
                        >
                          {company.name}
                        </Link>
                        <div className="mt-1 truncate text-sm font-normal text-gray-500">
                          {company.domain ? (
                            <ExternalAnchor href={company.websiteUrl || `https://${company.domain}`}>
                              {company.domain}
                            </ExternalAnchor>
                          ) : (
                            "No domain"
                          )}
                        </div>
                      </div>
                      <dl className="font-normal lg:hidden">
                        <dt className="sr-only">Industry</dt>
                        <dd className="mt-1 truncate text-gray-400">
                          {company.industry || "Industry missing"}
                        </dd>
                        <dt className="sr-only">Headcount</dt>
                        <dd className="mt-1 truncate text-gray-400">
                          {formatHeadcount(company)}
                        </dd>
                        <dt className="sr-only">Links</dt>
                        <dd className="mt-2 flex gap-x-3 sm:hidden">
                          <ExternalAnchor href={company.linkedinCompanyUrl}>
                            LinkedIn
                          </ExternalAnchor>
                          <ExternalAnchor href={company.websiteUrl} missingLabel="No site">
                            Website
                          </ExternalAnchor>
                        </dd>
                      </dl>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      <PeoplePills company={company} />
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 lg:table-cell">
                      {company.industry || <EmptyValue />}
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 2xl:table-cell">
                      {formatHeadcount(company)}
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 2xl:table-cell">
                      {company.location || <EmptyValue />}
                    </TableCell>
                    <TableCell className="hidden text-right font-medium sm:table-cell">
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
          <CompaniesPagination
            currentPage={currentPage}
            filters={filters}
            pageSize={companiesPerPage}
            totalCount={companies.length}
            totalPages={totalPages}
          />
        </TableFrame>
      </section>
    </PageShell>
  );
}
