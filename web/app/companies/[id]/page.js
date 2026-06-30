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

function companyFromPrisma(company) {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    linkedinCompanyUrl: company.linkedin_company_url,
    websiteUrl: company.website_url,
    description: company.description,
    industry: company.industry,
    location: company.location,
    employeeCount: company.employee_count,
    employeeCountRange: company.employee_count_range,
    dateEnriched: company.date_enriched,
    notes: company.notes
  };
}

function positionFromPrisma(position) {
  return {
    id: position.id,
    title: position.title,
    department: position.department,
    seniority: position.seniority,
    startDate: position.start_date,
    endDate: position.end_date,
    isCurrent: position.is_current,
    positionCreatedAt: position.created_at,
    notes: position.notes,
    personId: position.people.id,
    personName: position.people.name,
    profileKey: position.people.profile_key,
    linkedinProfileUrl: position.people.linkedin_profile_url,
    createdAt: position.people.created_at,
    email: position.people.email,
    phoneNumber: position.people.phone_number,
    status: position.people.status,
    qualified: Boolean(position.people.qualified)
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

  return prisma.companies.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      domain: true,
      linkedin_company_url: true,
      website_url: true,
      description: true,
      industry: true,
      location: true,
      employee_count: true,
      employee_count_range: true,
      date_enriched: true,
      notes: true,
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
          department: true,
          seniority: true,
          start_date: true,
          end_date: true,
          is_current: true,
          created_at: true,
          notes: true,
          people: {
            select: {
              id: true,
              name: true,
              profile_key: true,
              linkedin_profile_url: true,
              created_at: true,
              email: true,
              phone_number: true,
              status: true,
              qualified: true
            }
          }
        }
      }
    }
  });
}

export default async function CompanyDetailPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const companyRecord = await getCompanyDetail(id);

  if (!companyRecord) {
    notFound();
  }

  const company = companyFromPrisma(companyRecord);
  const people = companyRecord.positions.map((position) => ({
    ...positionFromPrisma(position),
    companyId: company.id,
    companyName: company.name,
    companyDomain: company.domain,
    companyWebsiteUrl: company.websiteUrl
  }));

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
