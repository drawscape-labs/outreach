import {
  PageHeader,
  PageShell,
  PageStats,
  SectionHeader
} from "../../components";
import { PeopleTable } from "./components/people-table";
import { splitCompanies } from "./lib/people-table-data";
import { getPeople } from "../../lib/prospects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function PeoplePage() {
  const people = getPeople();
  const companies = new Set(people.flatMap((person) => splitCompanies(person.companies)));
  const totalPositions = people.reduce(
    (sum, person) => sum + Number(person.positionCount || 0),
    0
  );
  const emailCount = people.filter((person) => person.email).length;
  const qualifiedCount = people.filter((person) => person.qualified).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Prospecting"
        title="People"
        description="Contacts collected from target accounts, including profile keys, mapped companies, status, and direct links."
      />

      <PageStats
        stats={[
          {
            name: "People",
            value: people.length,
            caption: people.length === 1 ? "contact" : "contacts"
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

      <section className="mt-10">
        <SectionHeader
          title="Contact List"
          description="Each contact stays connected to their source profile and the accounts where they have known roles."
        />
        <PeopleTable people={people} emptyMessage="No people found." />
      </section>
    </PageShell>
  );
}
