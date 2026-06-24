import { notFound } from "next/navigation";
import {
  classNames,
  EmptyValue,
  ExternalAnchor,
  PageHeader,
  PageShell,
  SectionHeader
} from "../../../components";
import { PeopleTable } from "../../people/components/people-table";
import { getCompany, getCompanyPositions } from "../../../lib/prospects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function CompactStat({ name, value, caption }) {
  return (
    <div className="bg-white px-4 py-3 sm:px-5">
      <dt className="text-xs/5 font-medium uppercase tracking-normal text-gray-500">
        {name}
      </dt>
      <dd className="mt-0.5 flex items-baseline gap-x-1.5">
        <span className="text-lg font-semibold text-gray-900">{value}</span>
        {caption ? (
          <span className="text-xs font-medium text-gray-500">{caption}</span>
        ) : null}
      </dd>
    </div>
  );
}

function CompanyDetailItem({ label, children, className }) {
  return (
    <div
      className={classNames(
        "min-w-0 border-t border-gray-100 px-4 py-3 sm:px-5",
        className
      )}
    >
      <dt className="text-xs/5 font-medium uppercase tracking-normal text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 break-words text-sm/6 text-gray-700">
        {children}
      </dd>
    </div>
  );
}

export default async function CompanyDetailPage({ params }) {
  const { id } = await params;
  const company = getCompany(id);

  if (!company) {
    notFound();
  }

  const positions = getCompanyPositions(id);
  const people = positions.map((position) => ({
    ...position,
    companyId: company.id,
    companyName: company.name
  }));
  const currentPeople = new Set(positions.map((position) => position.personId));
  const peopleWithEmail = positions.filter((position) => position.email).length;
  const seniorities = new Set(positions.map((position) => position.seniority).filter(Boolean));
  const stats = [
    {
      name: "People",
      value: currentPeople.size,
      caption: currentPeople.size === 1 ? "contact" : "contacts"
    },
    {
      name: "Positions",
      value: positions.length,
      caption: positions.length === 1 ? "role" : "roles"
    },
    {
      name: "Emails",
      value: peopleWithEmail,
      caption: "found"
    },
    {
      name: "Seniority bands",
      value: seniorities.size,
      caption: "known"
    }
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Company"
        title={company.name}
      />

      <section className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <dl className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
          {stats.map((stat) => (
            <CompactStat key={stat.name} {...stat} />
          ))}
        </dl>
        <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm/6 font-semibold text-gray-900">Company Details</h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <CompanyDetailItem label="Description" className="sm:col-span-2 lg:col-span-2">
            {company.description || <EmptyValue />}
          </CompanyDetailItem>
          <CompanyDetailItem label="Domain">
            {company.domain || <EmptyValue />}
          </CompanyDetailItem>
          <CompanyDetailItem label="Industry">
            {company.industry || <EmptyValue />}
          </CompanyDetailItem>
          <CompanyDetailItem label="LinkedIn">
            <ExternalAnchor href={company.linkedinCompanyUrl}>
              {company.linkedinCompanyUrl}
            </ExternalAnchor>
          </CompanyDetailItem>
          <CompanyDetailItem label="Website" className="lg:col-span-2">
            <ExternalAnchor href={company.websiteUrl}>
              {company.websiteUrl}
            </ExternalAnchor>
          </CompanyDetailItem>
          <CompanyDetailItem label="Location">
            {company.location || <EmptyValue />}
          </CompanyDetailItem>
        </dl>
      </section>

      <section className="mt-10">
        <SectionHeader title="People" />
        <PeopleTable
          people={people}
          emptyMessage="No current people mapped to this company yet."
          label="Company people table"
        />
      </section>
    </PageShell>
  );
}
