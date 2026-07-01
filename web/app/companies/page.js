import {
  classNames,
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
import prisma from "../../lib/prisma";
import { CompanyFilters } from "./components/company-filters";
import {
  companyListSelect,
  companyTableRow
} from "../api/companies/model";
import {
  COMPANY_CATEGORIES,
  COMPANY_CATEGORY_LABELS
} from "../api/companies/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const companiesPerPage = 25;
const contactFilters = ["with_people", "without_people"];

const createdDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

function CountPill({ label, tone = "gray", value }) {
  const count = Number(value || 0);
  const tones = {
    amber: "bg-amber-400/20 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    blue: "bg-blue-500/15 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    gray: "bg-zinc-600/10 text-zinc-700 dark:bg-white/10 dark:text-zinc-300"
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

function formatCategory(category) {
  return COMPANY_CATEGORY_LABELS[category] || category;
}

function formatCreatedAt(value) {
  if (!value) {
    return "";
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return "";
  }

  const sqliteTimestampMatch = trimmedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/
  );
  const date = sqliteTimestampMatch
    ? new Date(Date.UTC(
      Number(sqliteTimestampMatch[1]),
      Number(sqliteTimestampMatch[2]) - 1,
      Number(sqliteTimestampMatch[3]),
      Number(sqliteTimestampMatch[4] || 0),
      Number(sqliteTimestampMatch[5] || 0),
      Number(sqliteTimestampMatch[6] || 0)
    ))
    : new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return trimmedValue;
  }

  return createdDateFormatter.format(date);
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

function getSort(searchParams) {
  const sort = firstSearchParam(searchParams, "sort");
  const direction = firstSearchParam(searchParams, "direction").toLowerCase() === "asc"
    ? "asc"
    : "desc";

  if (sort === "created_at") {
    return { direction, sort };
  }

  return { direction: "asc", sort: "name" };
}

async function getCompanies(sort) {
  const orderBy = sort.sort === "created_at"
    ? [
        { createdAt: sort.direction },
        { id: sort.direction },
        { name: "asc" }
      ]
    : [{ name: "asc" }, { id: "asc" }];
  const companies = await prisma.company.findMany({
    orderBy,
    select: companyListSelect
  });

  return companies.map(companyTableRow);
}

function getUniqueValues(items, key) {
  return Array.from(
    new Set(items.map((item) => item[key]).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second));
}

function getFilters(searchParams, options) {
  const category = firstSearchParam(searchParams, "category");
  const industry = firstSearchParam(searchParams, "industry");
  const contacts = firstSearchParam(searchParams, "contacts");

  return {
    category: options.categories.some((option) => option.value === category)
      ? category
      : "",
    industry: options.industries.includes(industry) ? industry : "",
    contacts: contactFilters.includes(contacts) ? contacts : ""
  };
}

function companyMatchesFilters(company, filters) {
  const peopleCount = Number(company.peopleCount || 0);

  if (filters.category && company.category !== filters.category) {
    return false;
  }

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

function addFiltersToParams(params, filters) {
  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.industry) {
    params.set("industry", filters.industry);
  }

  if (filters.contacts) {
    params.set("contacts", filters.contacts);
  }
}

function addSortToParams(params, sort) {
  if (sort.sort !== "created_at") {
    return;
  }

  params.set("sort", "created_at");
  params.set("direction", sort.direction);
}

function pageHref(filters, sort, page) {
  const params = new URLSearchParams();

  addFiltersToParams(params, filters);
  addSortToParams(params, sort);

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/companies?${queryString}` : "/companies";
}

function createdSortHref(filters, sort) {
  const params = new URLSearchParams();
  const nextDirection = sort.sort === "created_at" && sort.direction === "desc"
    ? "asc"
    : "desc";

  addFiltersToParams(params, filters);
  params.set("sort", "created_at");
  params.set("direction", nextDirection);

  return `/companies?${params.toString()}`;
}

function CreatedSortIndicator({ direction }) {
  return (
    <span className="inline-flex h-3 w-3 items-center justify-center" aria-hidden="true">
      <span
        className={classNames(
          "h-0 w-0 border-x-[4px] border-x-transparent",
          direction === "asc"
            ? "border-b-[5px] border-b-zinc-500"
            : "border-t-[5px] border-t-zinc-500"
        )}
      />
    </span>
  );
}

function CreatedHeader({ filters, sort }) {
  const isSorted = sort.sort === "created_at";
  const nextDirection = isSorted && sort.direction === "desc"
    ? "ascending"
    : "descending";

  return (
    <Link
      aria-label={`Sort by created ${nextDirection}`}
      className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-teal-700 dark:text-zinc-300 dark:hover:text-teal-300"
      href={createdSortHref(filters, sort)}
    >
      <span>Created</span>
      {isSorted ? <CreatedSortIndicator direction={sort.direction} /> : null}
    </Link>
  );
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
  sort,
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
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Showing{" "}
        <span className="font-medium text-zinc-900 dark:text-white">{firstItem}</span>
        {" "}to{" "}
        <span className="font-medium text-zinc-900 dark:text-white">{lastItem}</span>
        {" "}of{" "}
        <span className="font-medium text-zinc-900 dark:text-white">{totalCount}</span>
      </p>
      {totalPages > 1 ? (
        <Pagination className="w-full sm:w-auto">
          <PaginationPrevious
            href={currentPage > 1 ? pageHref(filters, sort, currentPage - 1) : null}
          />
          <PaginationList>
            {pages.map((page, index) =>
              page === "gap" ? (
                <PaginationGap key={`gap-${index}`} />
              ) : (
                <PaginationPage
                  key={page}
                  href={pageHref(filters, sort, page)}
                  current={page === currentPage}
                >
                  {page}
                </PaginationPage>
              )
            )}
          </PaginationList>
          <PaginationNext
            href={currentPage < totalPages ? pageHref(filters, sort, currentPage + 1) : null}
          />
        </Pagination>
      ) : null}
    </div>
  );
}

export default async function CompaniesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const sort = getSort(resolvedSearchParams);
  const allCompanies = await getCompanies(sort);
  const options = {
    categories: COMPANY_CATEGORIES.map((category) => ({
      label: formatCategory(category),
      value: category
    })),
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
                  Category
                </TableHeader>
                <TableHeader scope="col" className="hidden xl:table-cell">
                  Industry
                </TableHeader>
                <TableHeader scope="col" className="hidden 2xl:table-cell">
                  Headcount
                </TableHeader>
                <TableHeader scope="col" className="hidden 2xl:table-cell">
                  Location
                </TableHeader>
                <TableHeader
                  scope="col"
                  className="hidden xl:table-cell"
                  aria-sort={
                    sort.sort === "created_at"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <CreatedHeader filters={filters} sort={sort} />
                </TableHeader>
                <TableHeader scope="col" className="hidden text-right sm:table-cell">
                  Links
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCompanies.length === 0 ? (
                <TableEmpty colSpan={8}>No companies match these filters.</TableEmpty>
              ) : (
                paginatedCompanies.map((company) => {
                  const formattedCreatedAt = formatCreatedAt(company.createdAt);

                  return (
                    <TableRow key={company.id}>
                      <TableCell className="w-full max-w-0 font-medium text-zinc-950 dark:text-white sm:w-auto sm:max-w-none">
                        <div className="min-w-0">
                          <Link
                            className="text-gray-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300"
                            href={`/companies/${company.id}`}
                          >
                            {company.name}
                          </Link>
                          <div className="mt-1 truncate text-sm font-normal text-gray-500 dark:text-zinc-400">
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
                          <dt className="sr-only">Category</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {company.category ? formatCategory(company.category) : "Category missing"}
                          </dd>
                          <dt className="sr-only">Industry</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {company.industry || "Industry missing"}
                          </dd>
                          <dt className="sr-only">Headcount</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {formatHeadcount(company)}
                          </dd>
                          <dt className="sr-only">Created</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {formattedCreatedAt || "Created date missing"}
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
                      <TableCell className="text-zinc-500 dark:text-zinc-400">
                        <PeoplePills company={company} />
                      </TableCell>
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 lg:table-cell">
                        {company.category ? formatCategory(company.category) : <EmptyValue />}
                      </TableCell>
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 xl:table-cell">
                        {company.industry || <EmptyValue />}
                      </TableCell>
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 2xl:table-cell">
                        {formatHeadcount(company)}
                      </TableCell>
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 2xl:table-cell">
                        {company.location || <EmptyValue />}
                      </TableCell>
                      <TableCell
                        className="hidden text-zinc-500 dark:text-zinc-400 xl:table-cell"
                        title={company.createdAt || undefined}
                      >
                        {formattedCreatedAt || <EmptyValue />}
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
                  );
                })
              )}
            </TableBody>
          </DataTable>
          <CompaniesPagination
            currentPage={currentPage}
            filters={filters}
            pageSize={companiesPerPage}
            sort={sort}
            totalCount={companies.length}
            totalPages={totalPages}
          />
        </TableFrame>
      </section>
    </PageShell>
  );
}
