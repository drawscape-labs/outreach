import {
  PageHeader,
  PageShell,
  SectionHeader
} from "../../components";
import prisma from "../../lib/prisma";
import { isLeadStatus } from "../../lib/statuses";
import { PeopleTable } from "./components/people-table";
import { PeopleFilters } from "./components/people-filters";
import {
  personTableRow,
  personTableSelect
} from "../api/people/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function firstSearchParam(searchParams, key) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
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

async function getPeople(sort) {
  const people = await prisma.person.findMany({
    where: {
      positions: {
        some: {
          isCurrent: true
        }
      }
    },
    orderBy: peopleOrderBy(sort),
    select: personTableSelect
  });

  return people.map(personTableRow);
}

function getFilters(searchParams) {
  const status = firstSearchParam(searchParams, "status");
  const qualified = firstSearchParam(searchParams, "qualified");
  const email = firstSearchParam(searchParams, "email");

  return {
    status: isLeadStatus(status) ? status : "",
    qualified: ["yes", "no"].includes(qualified) ? qualified : "",
    email: ["has", "missing"].includes(email) ? email : ""
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
}

function sortHref(sort, filters) {
  const params = new URLSearchParams();
  const nextDirection = sort.direction === "asc" ? "desc" : "asc";

  addFiltersToParams(params, filters);
  params.set("sort", "created_at");
  params.set("direction", nextDirection);

  return `/people?${params.toString()}`;
}

function hasEmail(person) {
  return Boolean(String(person.email || "").trim());
}

function personMatchesFilters(person, filters) {
  if (filters.status && person.status !== filters.status) {
    return false;
  }

  if (filters.qualified === "yes" && !person.qualified) {
    return false;
  }

  if (filters.qualified === "no" && person.qualified) {
    return false;
  }

  if (filters.email === "has" && !hasEmail(person)) {
    return false;
  }

  if (filters.email === "missing" && hasEmail(person)) {
    return false;
  }

  return true;
}

export default async function PeoplePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const sort = createdAtSort(resolvedSearchParams);
  const filters = getFilters(resolvedSearchParams);
  const people = (await getPeople(sort)).filter((person) =>
    personMatchesFilters(person, filters)
  );

  return (
    <PageShell fullWidth>
      <PageHeader
        eyebrow="Prospecting"
        title="People"
      />

      <section className="mt-6">
        <SectionHeader title="Contact List" />
        <div className="mt-4">
          <PeopleFilters filters={filters} />
        </div>
        <PeopleTable
          people={people}
          emptyMessage="No people found."
          createdAtSortDirection={sort.direction}
          createdAtSortHref={sortHref(sort, filters)}
        />
      </section>
    </PageShell>
  );
}
