import {
  formatPriorityLevel,
  PageHeader,
  PageShell,
  SectionHeader
} from "../../components";
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious
} from "../../components/ui/pagination";
import { isLeadStatus } from "../../lib/statuses";
import { PeopleTable } from "./components/people-table";
import { PeopleFilters } from "./components/people-filters";
import {
  listPeopleTablePage
} from "../api/people/model";
import {
  COMPANY_CATEGORIES,
  COMPANY_CATEGORY_LABELS,
  COMPANY_PRIORITIES
} from "../api/companies/schema";
import {
  PERSON_EMAIL_FILTER_VALUES,
  PERSON_FILTER_PARAMS,
  PERSON_LINKEDIN_FILTER_VALUES,
  PERSON_QUALIFIED_FILTER_VALUES
} from "../api/people/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const peoplePerPage = 100;

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

function createdAtSort(searchParams) {
  return {
    direction: firstSearchParam(searchParams, "direction").toLowerCase() === "asc"
      ? "asc"
      : "desc",
    sort: "created_at"
  };
}

function peopleOrderBy(sort) {
  if (sort.sort === "created_at") {
    return [
      { createdAt: sort.direction },
      { id: sort.direction },
      { name: "asc" }
    ];
  }

  return [{ createdAt: "desc" }, { id: "desc" }];
}

function getFirstSearchParam(searchParams, keys) {
  for (const key of keys) {
    const value = firstSearchParam(searchParams, key);

    if (value) {
      return value;
    }
  }

  return "";
}

function getFilters(searchParams, options) {
  const status = firstSearchParam(searchParams, "status");
  const qualified = firstSearchParam(searchParams, "qualified");
  const email = firstSearchParam(searchParams, "email");
  const linkedin = getFirstSearchParam(
    searchParams,
    PERSON_FILTER_PARAMS.linkedin
  );
  const category = getFirstSearchParam(
    searchParams,
    PERSON_FILTER_PARAMS.companyCategory
  );
  const priority = getFirstSearchParam(
    searchParams,
    PERSON_FILTER_PARAMS.companyPriority
  );

  return {
    status: isLeadStatus(status) ? status : "",
    qualified: PERSON_QUALIFIED_FILTER_VALUES.includes(qualified) ? qualified : "",
    email: PERSON_EMAIL_FILTER_VALUES.includes(email) ? email : "",
    linkedin: PERSON_LINKEDIN_FILTER_VALUES.includes(linkedin) ? linkedin : "",
    category: options.categories.some((option) => option.value === category)
      ? category
      : "",
    priority: options.priorities.some((option) => option.value === priority)
      ? priority
      : ""
  };
}

function addFiltersToParams(params, filters) {
  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.qualified) {
    params.set("qualified", filters.qualified);
  }

  if (filters.email) {
    params.set("email", filters.email);
  }

  if (filters.linkedin) {
    params.set("linkedin", filters.linkedin);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }
}

function addSortToParams(params, sort) {
  if (sort.direction !== "asc") {
    return;
  }

  params.set("sort", "created_at");
  params.set("direction", sort.direction);
}

function sortHref(sort, filters) {
  const params = new URLSearchParams();
  const nextDirection = sort.direction === "asc" ? "desc" : "asc";

  addFiltersToParams(params, filters);
  params.set("sort", "created_at");
  params.set("direction", nextDirection);

  return `/people?${params.toString()}`;
}

function filtersToSearchParams(filters) {
  const params = new URLSearchParams();

  addFiltersToParams(params, filters);

  return params;
}

function pageHref(filters, sort, page) {
  const params = new URLSearchParams();

  addFiltersToParams(params, filters);
  addSortToParams(params, sort);

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/people?${queryString}` : "/people";
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

function PeoplePagination({
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
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

export default async function PeoplePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const sort = createdAtSort(resolvedSearchParams);
  const options = {
    categories: COMPANY_CATEGORIES.map((category) => ({
      label: COMPANY_CATEGORY_LABELS[category] || category,
      value: category
    })),
    priorities: COMPANY_PRIORITIES.map((priority) => ({
      label: formatPriorityLevel(priority),
      value: priority
    }))
  };
  const filters = getFilters(resolvedSearchParams, options);
  const {
    currentPage,
    people,
    totalCount,
    totalPages
  } = await listPeopleTablePage(filtersToSearchParams(filters), {
    orderBy: peopleOrderBy(sort),
    page: positiveIntegerSearchParam(resolvedSearchParams, "page"),
    pageSize: peoplePerPage
  });

  return (
    <PageShell fullWidth>
      <PageHeader
        eyebrow="Prospecting"
        title="People"
      />

      <section className="mt-6">
        <SectionHeader title="Contact List" />
        <div className="mt-4">
          <PeopleFilters filters={filters} options={options} />
        </div>
        <PeopleTable
          people={people}
          emptyMessage="No people found."
          createdAtSortDirection={sort.direction}
          createdAtSortHref={sortHref(sort, filters)}
        />
        <PeoplePagination
          currentPage={currentPage}
          filters={filters}
          pageSize={peoplePerPage}
          sort={sort}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </section>
    </PageShell>
  );
}
