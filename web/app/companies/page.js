import Link from "next/link";
import {
  EmptyValue,
  ExternalAnchor,
  PageHeader,
  PageShell,
  PageStats,
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
import { getCompanies } from "../../lib/prospects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function CompaniesPage() {
  const companies = getCompanies();
  const totals = companies.reduce(
    (accumulator, company) => ({
      people: accumulator.people + Number(company.peopleCount || 0),
      websites: accumulator.websites + (company.websiteUrl ? 1 : 0)
    }),
    { people: 0, websites: 0 }
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Prospecting"
        title="Companies"
        description="A focused account list for mapping decision makers, open roles, and the outbound path into each company."
      />

      <PageStats
        stats={[
          {
            name: "Companies",
            value: companies.length,
            caption: companies.length === 1 ? "account" : "accounts"
          },
          {
            name: "Mapped people",
            value: totals.people,
            caption: totals.people === 1 ? "contact" : "contacts"
          },
          {
            name: "Websites",
            value: totals.websites,
            caption: "found"
          }
        ]}
      />

      <section className="mt-10">
        <SectionHeader
          title="Company Pipeline"
          description="Accounts are ordered alphabetically with the core enrichment fields and outbound links close at hand."
        />
        <TableFrame label="Companies table">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th scope="col" className={tableHeaderFirstClass}>
                Name
              </th>
              <th scope="col" className={`${tableHeaderClass} hidden md:table-cell`}>
                Domain
              </th>
              <th scope="col" className={tableHeaderClass}>
                People
              </th>
              <th scope="col" className={`${tableHeaderClass} hidden lg:table-cell`}>
                Industry
              </th>
              <th scope="col" className={`${tableHeaderClass} hidden xl:table-cell`}>
                Location
              </th>
              <th scope="col" className={tableHeaderLastClass}>
                Links
              </th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
            {companies.length === 0 ? (
              <TableEmpty colSpan={6}>No companies found.</TableEmpty>
            ) : (
              companies.map((company) => (
                <tr key={company.id}>
                  <td className={tableCellFirstClass}>
                    <Link
                      className="text-gray-900 hover:text-teal-700"
                      href={`/companies/${company.id}`}
                    >
                      {company.name}
                    </Link>
                    <dl className="font-normal lg:hidden">
                      <dt className="sr-only">Domain</dt>
                      <dd className="mt-1 truncate text-gray-500">
                        {company.domain ? (
                          <ExternalAnchor href={company.websiteUrl || `https://${company.domain}`}>
                            {company.domain}
                          </ExternalAnchor>
                        ) : (
                          "No domain"
                        )}
                      </dd>
                      <dt className="sr-only">Industry</dt>
                      <dd className="mt-1 truncate text-gray-400">
                        {company.industry || "Industry missing"}
                      </dd>
                    </dl>
                  </td>
                  <td className={`${tableCellClass} hidden md:table-cell`}>
                    {company.domain ? (
                      <ExternalAnchor href={company.websiteUrl || `https://${company.domain}`}>
                        {company.domain}
                      </ExternalAnchor>
                    ) : (
                      <EmptyValue />
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <span className="font-medium text-gray-900">{company.peopleCount}</span>
                  </td>
                  <td className={`${tableCellClass} hidden lg:table-cell`}>
                    {company.industry || <EmptyValue />}
                  </td>
                  <td className={`${tableCellClass} hidden xl:table-cell`}>
                    {company.location || <EmptyValue />}
                  </td>
                  <td className={tableCellLastClass}>
                    <div className="flex justify-end gap-x-4">
                      <ExternalAnchor href={company.linkedinCompanyUrl}>
                        LinkedIn
                      </ExternalAnchor>
                      <ExternalAnchor href={company.websiteUrl} missingLabel="No site">
                        Website
                      </ExternalAnchor>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </TableFrame>
      </section>
    </PageShell>
  );
}
