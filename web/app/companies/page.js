import {
  classNames,
  DataTable,
  EmptyValue,
  ExternalAnchor,
  formatPriorityLevel,
  Link,
  PageHeader,
  PageShell,
  PriorityLevel,
  TableEmpty,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from "@/components";
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious
} from "@/components/ui/pagination";
import { formatDate } from "@/lib/format-date";
import {
  firstSearchParam,
  positiveIntegerSearchParam
} from "@/lib/search-params";
import { CompanyFilters } from "./components/company-filters";
import {
  listCompanyCategories,
  listCompanyIndustries,
  listCompanyPriorities,
  listCompanyTablePage
} from "@/app/api/companies/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const companiesPerPage = 25;
const contactFilters = ["with_people", "without_people"];

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

function getSort(searchParams) {
  const sort = firstSearchParam(searchParams, "sort");
  const direction = firstSearchParam(searchParams, "direction").toLowerCase() === "asc"
    ? "asc"
    : "desc";

  if (sort === "created_at" || sort === "priority") {
    return { direction, sort };
  }

  return { direction: "asc", sort: "name" };
}

function getFilters(searchParams, options) {
  const category = firstSearchParam(searchParams, "category");
  const industry = firstSearchParam(searchParams, "industry");
  const priority = firstSearchParam(searchParams, "priority");
  const contacts = firstSearchParam(searchParams, "contacts");

  return {
    category: options.categories.some((option) => option.value === category)
      ? category
      : "",
    industry: options.industries.includes(industry) ? industry : "",
    priority: options.priorities.some((option) => option.value === priority)
      ? priority
      : "",
    contacts: contactFilters.includes(contacts) ? contacts : ""
  };
}

function addFiltersToParams(params, filters) {
  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.industry) {
    params.set("industry", filters.industry);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.contacts) {
    params.set("contacts", filters.contacts);
  }
}

function addSortToParams(params, sort) {
  if (sort.sort === "name") {
    return;
  }

  params.set("sort", sort.sort);
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

function prioritySortHref(filters, sort) {
  const params = new URLSearchParams();
  const nextDirection = sort.sort === "priority" && sort.direction === "desc"
    ? "asc"
    : "desc";

  addFiltersToParams(params, filters);
  params.set("sort", "priority");
  params.set("direction", nextDirection);

  return `/companies?${params.toString()}`;
}

function SortIndicator({ direction }) {
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
      {isSorted ? <SortIndicator direction={sort.direction} /> : null}
    </Link>
  );
}

function PriorityHeader({ filters, sort }) {
  const isSorted = sort.sort === "priority";
  const nextDirection = isSorted && sort.direction === "desc"
    ? "ascending"
    : "descending";

  return (
    <Link
      aria-label={`Sort by priority ${nextDirection}`}
      className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-teal-700 dark:text-zinc-300 dark:hover:text-teal-300"
      href={prioritySortHref(filters, sort)}
    >
      <span>Priority</span>
      {isSorted ? <SortIndicator direction={sort.direction} /> : null}
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
  const [categories, priorities, industries] = await Promise.all([
    listCompanyCategories(),
    listCompanyPriorities(),
    listCompanyIndustries()
  ]);
  const options = {
    categories: categories.map((category) => ({
      label: category,
      value: category
    })),
    priorities: priorities.map((priority) => ({
      label: formatPriorityLevel(priority),
      value: priority
    })),
    industries
  };
  const filters = getFilters(resolvedSearchParams, options);
  const {
    companies,
    currentPage,
    totalCount,
    totalPages
  } = await listCompanyTablePage(filters, sort, {
    page: positiveIntegerSearchParam(resolvedSearchParams, "page"),
    pageSize: companiesPerPage
  });

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
                <TableHeader
                  scope="col"
                  className="hidden lg:table-cell"
                  aria-sort={
                    sort.sort === "priority"
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <PriorityHeader filters={filters} sort={sort} />
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
                <TableHeader scope="col" className="hidden xl:table-cell">
                  Country
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
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.length === 0 ? (
                <TableEmpty colSpan={9}>No companies match these filters.</TableEmpty>
              ) : (
                companies.map((company) => {
                  const formattedCreatedAt = formatDate(company.createdAt);

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
                            {company.category || "Category missing"}
                          </dd>
                          <dt className="sr-only">Priority</dt>
                          <dd className="mt-2">
                            <PriorityLevel priority={company.priority} />
                          </dd>
                          <dt className="sr-only">Industry</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {company.industry || "Industry missing"}
                          </dd>
                          <dt className="sr-only">Country</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {company.country || ""}
                          </dd>
                          <dt className="sr-only">Headcount</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {formatHeadcount(company)}
                          </dd>
                          <dt className="sr-only">Created</dt>
                          <dd className="mt-1 truncate text-gray-400 dark:text-zinc-500">
                            {formattedCreatedAt || "Created date missing"}
                          </dd>
                        </dl>
                      </TableCell>
                      <TableCell className="text-zinc-500 dark:text-zinc-400">
                        <PeoplePills company={company} />
                      </TableCell>
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 lg:table-cell">
                        {company.category || <EmptyValue />}
                      </TableCell>
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 lg:table-cell">
                        <PriorityLevel priority={company.priority} />
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
                      <TableCell className="hidden text-zinc-500 dark:text-zinc-400 xl:table-cell">
                        {company.country || ""}
                      </TableCell>
                      <TableCell
                        className="hidden text-zinc-500 dark:text-zinc-400 xl:table-cell"
                        title={company.createdAt || undefined}
                      >
                        {formattedCreatedAt || <EmptyValue />}
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
            totalCount={totalCount}
            totalPages={totalPages}
          />
        </TableFrame>
      </section>
    </PageShell>
  );
}
