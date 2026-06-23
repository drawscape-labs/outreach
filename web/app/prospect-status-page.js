import {
  EmptyValue,
  ExternalAnchor,
  LeadStatus,
  PageHeader,
  PageShell,
  PageStats,
  PersonIdentity,
  QualifiedStatus,
  TableEmpty,
  TableFrame,
  tableCellClass,
  tableCellFirstClass,
  tableCellLastClass,
  tableHeaderClass,
  tableHeaderFirstClass,
  tableHeaderLastClass
} from "./components";
import { PersonActions } from "./person-actions";
import { getPeopleByStatuses } from "../lib/prospects";

function splitCompanies(companies) {
  return companies
    ? companies
        .split(",")
        .map((company) => company.trim())
        .filter(Boolean)
    : [];
}

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

      <TableFrame label={`${title} table`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className={tableHeaderFirstClass}>
                Prospect
              </th>
              <th scope="col" className={`${tableHeaderClass} hidden md:table-cell`}>
                Companies
              </th>
              <th scope="col" className={tableHeaderClass}>
                Positions
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
            {prospects.length === 0 ? (
              <TableEmpty colSpan={8}>{emptyMessage}</TableEmpty>
            ) : (
              prospects.map((prospect) => {
                const prospectCompanies = splitCompanies(prospect.companies);

                return (
                  <tr key={prospect.id}>
                    <td className={tableCellFirstClass}>
                      <PersonIdentity
                        name={prospect.name}
                        profileKey={prospect.profileKey}
                        details={[
                          {
                            label: "Companies",
                            value: prospectCompanies.join(", "),
                            missingValue: "No company mapped"
                          }
                        ]}
                      />
                    </td>
                    <td className={`${tableCellClass} hidden md:table-cell`}>
                      {prospectCompanies.length ? (
                        prospectCompanies.join(", ")
                      ) : (
                        <EmptyValue />
                      )}
                    </td>
                    <td className={tableCellClass}>
                      <span className="font-medium text-gray-900">
                        {prospect.positionCount}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <LeadStatus status={prospect.status} />
                    </td>
                    <td className={tableCellClass}>
                      <QualifiedStatus qualified={prospect.qualified} />
                    </td>
                    <td className={`${tableCellClass} hidden lg:table-cell`}>
                      {prospect.email || <EmptyValue />}
                    </td>
                    <td className={`${tableCellClass} text-right font-medium`}>
                      <ExternalAnchor href={prospect.linkedinProfileUrl}>
                        Profile
                      </ExternalAnchor>
                    </td>
                    <td className={tableCellLastClass}>
                      <PersonActions
                        personId={prospect.id}
                        personName={prospect.name}
                        email={prospect.email}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableFrame>
    </PageShell>
  );
}
