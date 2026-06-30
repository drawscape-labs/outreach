import {
  PageHeader,
  PageShell,
  PageStats
} from "../../../components";
import prisma from "../../../lib/prisma";
import { isLeadStatus } from "../../../lib/statuses";
import { PeopleTable } from "./people-table";
import { splitCompanies } from "../lib/people-table-data";

function personFromPrisma(person) {
  const currentPositions = person.positions || [];
  const companies = new Map();
  const titles = [];

  currentPositions.forEach((position) => {
    if (position.title) {
      titles.push(position.title);
    }

    if (position.companies && !companies.has(position.companies.id)) {
      companies.set(position.companies.id, position.companies);
    }
  });

  return {
    id: person.id,
    profileKey: person.profile_key,
    linkedinProfileUrl: person.linkedin_profile_url,
    name: person.name,
    createdAt: person.created_at,
    email: person.email,
    phoneNumber: person.phone_number,
    status: person.status,
    qualified: Boolean(person.qualified),
    positionCreatedAt: currentPositions[0]?.created_at || "",
    positionCount: currentPositions.length,
    companies: Array.from(companies.values()).map((company) => company.name).join(","),
    companyRefs: Array.from(companies.values())
      .map((company) => [
        company.id,
        company.name,
        company.domain || "",
        company.website_url || ""
      ].join("::"))
      .join("||"),
    currentPositionTitles: titles.join("||")
  };
}

async function getPeopleByStatuses(statuses) {
  const leadStatuses = statuses.filter((status) => isLeadStatus(status));

  if (!leadStatuses.length) {
    return [];
  }

  const people = await prisma.people.findMany({
    where: {
      status: {
        in: leadStatuses
      },
      positions: {
        some: {
          is_current: 1
        }
      }
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      profile_key: true,
      linkedin_profile_url: true,
      name: true,
      created_at: true,
      email: true,
      phone_number: true,
      status: true,
      qualified: true,
      positions: {
        where: {
          is_current: 1
        },
        orderBy: [
          { created_at: "desc" },
          { id: "desc" }
        ],
        select: {
          id: true,
          title: true,
          created_at: true,
          companies: {
            select: {
              id: true,
              name: true,
              domain: true,
              website_url: true
            }
          }
        }
      }
    }
  });

  return people
    .map(personFromPrisma)
    .sort((first, second) => {
      const createdCompare = String(second.positionCreatedAt || "").localeCompare(
        String(first.positionCreatedAt || "")
      );

      if (createdCompare !== 0) {
        return createdCompare;
      }

      return first.name.localeCompare(second.name);
    });
}

export default async function ProspectStatusPage({ statuses, title, emptyMessage }) {
  const prospects = await getPeopleByStatuses(statuses);
  const companies = new Set(
    prospects.flatMap((prospect) => splitCompanies(prospect.companies))
  );
  const totalPositions = prospects.reduce(
    (sum, prospect) => sum + Number(prospect.positionCount || 0),
    0
  );
  const qualifiedCount = prospects.filter((prospect) => prospect.qualified).length;

  return (
    <PageShell>
      <PageHeader eyebrow="Prospecting" title={title} />

      <PageStats
        stats={[
          {
            name: "People",
            value: prospects.length,
            caption: prospects.length === 1 ? "contact" : "contacts"
          },
          {
            name: "Companies",
            value: companies.size,
            caption: "represented"
          },
          {
            name: "Positions",
            value: totalPositions,
            caption: totalPositions === 1 ? "role" : "roles"
          },
          {
            name: "Qualified",
            value: qualifiedCount,
            caption: "contacts"
          }
        ]}
      />

      <PeopleTable
        people={prospects}
        emptyMessage={emptyMessage}
        label={`${title} table`}
        nameHeader="Prospect"
      />
    </PageShell>
  );
}
