import {
  PageHeader,
  PageShell,
  PageStats
} from "../../../components";
import { PeopleTable } from "./people-table";
import { splitCompanies } from "../lib/people-table-data";
import { getPeopleByStatuses } from "../../../lib/prospects";

export default function ProspectStatusPage({ statuses, title, emptyMessage }) {
  const prospects = getPeopleByStatuses(statuses);
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
