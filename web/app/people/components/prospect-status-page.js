import {
  PageHeader,
  PageShell,
  PageStats
} from "@/components";
import prisma from "@/lib/prisma";
import { isLeadStatus } from "@/lib/statuses";
import { PeopleTable } from "./people-table";
import { splitCompanies } from "@/app/people/lib/people-table-data";
import {
  personTableRow,
  personTableSelect
} from "@/app/api/people/model";

async function getPeopleByStatuses(statuses) {
  const leadStatuses = statuses.filter((status) => isLeadStatus(status));

  if (!leadStatuses.length) {
    return [];
  }

  const people = await prisma.person.findMany({
    where: {
      status: {
        in: leadStatuses
      },
      positions: {
        some: {
          isCurrent: true
        }
      }
    },
    orderBy: [{ name: "asc" }],
    select: personTableSelect
  });

  return people
    .map((person) => personTableRow(person, { emptyPositionCreatedAt: "" }))
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
