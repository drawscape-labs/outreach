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
import prisma from "../../../lib/prisma";
import { CompanyActions } from "../components/company-actions";
import {
  companyDetail,
  companyDetailSelect
} from "../../api/companies/model";
import { personFromCompanyPosition } from "../../api/people/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function CompanyDetailItem({ label, children, className }) {
  return (
    <div
      className={classNames(
        "min-w-0 py-2.5 first:pt-3 last:pb-3",
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

function CompanyDetailColumn({ children, className }) {
  return (
    <dl
      className={classNames(
        "min-w-0 divide-y divide-gray-100 px-4 sm:px-5",
        className
      )}
    >
      {children}
    </dl>
  );
}

function FieldValue({ value }) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return <EmptyValue />;
  }

  return value;
}

function formatHeadcount(company) {
  if (company.employeeCount !== null && company.employeeCount !== undefined && company.employeeCount !== "") {
    return Number(company.employeeCount).toLocaleString();
  }

  return company.employeeCountRange || "";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

function formatDate(value) {
  if (!value) {
    return "";
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return "";
  }

  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Date.UTC(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    ))
    : new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return trimmedValue;
  }

  return dateFormatter.format(date);
}

function firstSearchParam(searchParams, key) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function getCodexLaunchStatus(searchParams) {
  const state = firstSearchParam(searchParams, "codexStatus");

  if (!state) {
    return null;
  }

  return {
    state,
    pid: firstSearchParam(searchParams, "codexPid"),
    message: firstSearchParam(searchParams, "codexMessage")
  };
}

function readCompanyId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getCompanyDetail(companyId) {
  const id = readCompanyId(companyId);

  if (!id) {
    return null;
  }

  return prisma.company.findUnique({
    where: { id },
    select: companyDetailSelect
  });
}

export default async function CompanyDetailPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const companyRecord = await getCompanyDetail(id);

  if (!companyRecord) {
    notFound();
  }

  const company = companyDetail(companyRecord);
  const people = companyRecord.positions.map((position) =>
    personFromCompanyPosition(position, company)
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Company"
        title={company.name}
      >
        <CompanyActions
          company={company}
          people={people}
          launchStatus={getCodexLaunchStatus(resolvedSearchParams)}
        />
      </PageHeader>

      <section className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <div className="px-4 py-3 sm:px-5">
          <h2 className="text-sm/6 font-semibold text-gray-900">Company Details</h2>
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <CompanyDetailColumn>
            <CompanyDetailItem label="Description">
              <FieldValue value={company.description} />
            </CompanyDetailItem>
          </CompanyDetailColumn>

          <CompanyDetailColumn>
            <CompanyDetailItem label="Domain">
              <FieldValue value={company.domain} />
            </CompanyDetailItem>
            <CompanyDetailItem label="Website">
              <ExternalAnchor href={company.websiteUrl}>
                {company.domain || company.websiteUrl || "Website"}
              </ExternalAnchor>
            </CompanyDetailItem>
          </CompanyDetailColumn>

          <CompanyDetailColumn>
            <CompanyDetailItem label="Industry">
              <FieldValue value={company.industry} />
            </CompanyDetailItem>
            <CompanyDetailItem label="Location">
              <FieldValue value={company.location} />
            </CompanyDetailItem>
          </CompanyDetailColumn>

          <CompanyDetailColumn>
            <CompanyDetailItem label="Headcount">
              <FieldValue value={formatHeadcount(company)} />
            </CompanyDetailItem>
            <CompanyDetailItem label="LinkedIn">
              <ExternalAnchor href={company.linkedinCompanyUrl}>
                Company profile
              </ExternalAnchor>
            </CompanyDetailItem>
            <CompanyDetailItem label="Date Enriched">
              <FieldValue value={formatDate(company.dateEnriched)} />
            </CompanyDetailItem>
          </CompanyDetailColumn>
        </div>
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
