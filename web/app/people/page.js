import Link from "next/link";
import {
  EmptyValue,
  ExternalAnchor,
  PageHeader,
  PageShell,
  PageStats,
  PersonIdentity,
  SectionHeader,
  TableEmpty,
  TableFrame,
  tableCellClass,
  tableCellFirstClass,
  tableCellLastClass,
  tableHeaderClass,
  tableHeaderFirstClass,
  tableHeaderLastClass
} from "../components";
import { EditableLeadStatus, EditableQualifiedStatus } from "../lead-field-controls";
import { PersonActions } from "../person-actions";
import { getPeople } from "../../lib/prospects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fieldSeparator = "::";
const itemSeparator = "||";

function splitCompanies(companies) {
  return companies
    ? companies
        .split(",")
        .map((company) => company.trim())
        .filter(Boolean)
    : [];
}

function splitList(value) {
  return value
    ? value
        .split(itemSeparator)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function splitCompanyRefs(companyRefs) {
  const companies = new Map();

  splitList(companyRefs).forEach((companyRef) => {
    const [id, name] = companyRef.split(fieldSeparator);

    if (id && name && !companies.has(id)) {
      companies.set(id, { id, name });
    }
  });

  return Array.from(companies.values());
}

function CompanyLinks({ companies }) {
  if (!companies.length) {
    return <EmptyValue />;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {companies.map((company, index) => (
        <span key={company.id}>
          {index > 0 ? <span className="text-gray-400">, </span> : null}
          <Link
            className="font-medium text-teal-700 hover:text-teal-900"
            href={`/companies/${company.id}`}
          >
            {company.name}
          </Link>
        </span>
      ))}
    </span>
  );
}

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
        <TableFrame label="People table">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th scope="col" className={tableHeaderFirstClass}>
                Name
              </th>
              <th scope="col" className={`${tableHeaderClass} hidden md:table-cell`}>
                Companies
              </th>
              <th scope="col" className={tableHeaderClass}>
                Position
              </th>
              <th scope="col" className={tableHeaderClass}>
                Status
              </th>
              <th scope="col" className={tableHeaderClass}>
                Qualified
              </th>
              <th scope="col" className={`${tableHeaderClass} hidden lg:table-cell`}>
                Email
              </th>
              <th scope="col" className={`${tableHeaderClass} text-right`}>
                LinkedIn
              </th>
              <th scope="col" className={tableHeaderLastClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
            {people.length === 0 ? (
              <TableEmpty colSpan={8}>No people found.</TableEmpty>
            ) : (
              people.map((person) => {
                const personCompanies = splitCompanyRefs(person.companyRefs);
                const positionTitles = splitList(person.currentPositionTitles);
                const positionTitle = positionTitles.join("; ");

                return (
                  <tr key={person.id}>
                    <td className={tableCellFirstClass}>
                      <PersonIdentity
                        name={person.name}
                        profileKey={person.profileKey}
                        details={[
                          {
                            label: "Position",
                            value: positionTitle,
                            missingValue: "No position"
                          },
                          {
                            label: "Companies",
                            value: personCompanies.map((company) => company.name).join(", "),
                            missingValue: "No company mapped"
                          }
                        ]}
                      />
                    </td>
                    <td className={`${tableCellClass} hidden md:table-cell`}>
                      <CompanyLinks companies={personCompanies} />
                    </td>
                    <td className={tableCellClass}>
                      {positionTitle ? (
                        <span className="font-medium text-gray-900">{positionTitle}</span>
                      ) : (
                        <EmptyValue>No position</EmptyValue>
                      )}
                    </td>
                    <td className={tableCellClass}>
                      <EditableLeadStatus personId={person.id} status={person.status} />
                    </td>
                    <td className={tableCellClass}>
                      <EditableQualifiedStatus
                        personId={person.id}
                        qualified={person.qualified}
                      />
                    </td>
                    <td className={`${tableCellClass} hidden lg:table-cell`}>
                      {person.email || <EmptyValue />}
                    </td>
                    <td className={`${tableCellClass} text-right font-medium`}>
                      <ExternalAnchor href={person.linkedinProfileUrl}>Profile</ExternalAnchor>
                    </td>
                    <td className={tableCellLastClass}>
                      <PersonActions
                        personId={person.id}
                        personName={person.name}
                        email={person.email}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </TableFrame>
      </section>
    </PageShell>
  );
}
