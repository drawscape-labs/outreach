import { notFound } from "next/navigation";
import {
  classNames,
  DataTable,
  EmptyValue,
  ExternalAnchor,
  Link,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
  TableEmpty,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from "../../../components";
import {
  EditableLeadStatus,
  EditableQualifiedStatus
} from "../../../components/lead-field-controls";
import { PersonActions } from "../components/person-actions";
import { findQuickmailLead, getQuickmailLead, QuickmailError } from "../../../lib/quickmail";
import prisma from "../../../lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function DetailItem({ label, children, className }) {
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

function FieldValue({ value }) {
  return value ? value : <EmptyValue />;
}

function quickmailErrorPayload(error) {
  if (error instanceof QuickmailError) {
    return {
      status: "error",
      message: error.message,
      details: error.details
    };
  }

  return {
    status: "error",
    message: "Could not load QuickMail lead."
  };
}

async function loadQuickmailLead(person) {
  if (person.quickmailLeadId) {
    try {
      const lead = await getQuickmailLead({ leadId: person.quickmailLeadId });

      return {
        status: lead ? "found" : "missing",
        source: "Stored lead id",
        lead
      };
    } catch (error) {
      return {
        ...quickmailErrorPayload(error),
        source: "Stored lead id"
      };
    }
  }

  if (!person.email && !person.linkedinProfileUrl && !person.profileKey) {
    return {
      status: "not-searched",
      source: "No local identifiers",
      lead: null
    };
  }

  try {
    const matchedLead = await findQuickmailLead({
      lead: {
        email: person.email,
        linkedinId: person.linkedinProfileUrl || person.profileKey
      }
    });
    const lead = matchedLead
      ? await getQuickmailLead({ leadId: matchedLead.id }) || matchedLead
      : null;

    return {
      status: lead ? "found" : "missing",
      source: "Email / LinkedIn lookup",
      lead
    };
  } catch (error) {
    return {
      ...quickmailErrorPayload(error),
      source: "Email / LinkedIn lookup"
    };
  }
}

function QuickmailStatus({ state }) {
  if (state.status === "found") {
    return <StatusPill tone="teal">Found</StatusPill>;
  }

  if (state.status === "missing") {
    return <StatusPill tone="gray">Not found</StatusPill>;
  }

  if (state.status === "not-searched") {
    return <StatusPill tone="amber">Not searched</StatusPill>;
  }

  return <StatusPill tone="rose">Error</StatusPill>;
}

function TagsValue({ tags }) {
  const names = tags?.nodes?.map((tag) => tag.name).filter(Boolean) || [];

  if (!names.length) {
    return <EmptyValue />;
  }

  return names.join(", ");
}

function CustomProperties({ customProperties }) {
  const properties =
    customProperties?.nodes?.filter((property) => property.name || property.value) || [];

  if (!properties.length) {
    return null;
  }

  return (
    <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
      <h3 className="text-xs/5 font-medium uppercase tracking-normal text-gray-500">
        Custom properties
      </h3>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {properties.map((property) => (
          <div key={property.id || property.name}>
            <dt className="text-xs/5 font-medium text-gray-500">
              {property.name || property.id}
            </dt>
            <dd className="break-words text-sm/6 text-gray-700">
              {property.value || <EmptyValue />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function QuickmailPanel({ person, state }) {
  const lead = state.lead;

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 className="text-sm/6 font-semibold text-gray-900">QuickMail</h2>
        <QuickmailStatus state={state} />
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2">
        <DetailItem label="Lookup">
          {state.source}
        </DetailItem>
        <DetailItem label="Local lead id">
          <FieldValue value={person.quickmailLeadId} />
        </DetailItem>
        {state.status === "error" ? (
          <DetailItem label="Error" className="sm:col-span-2">
            {state.message}
          </DetailItem>
        ) : null}
        {lead ? (
          <>
            <DetailItem label="QuickMail lead id">
              <FieldValue value={lead.id} />
            </DetailItem>
            <DetailItem label="Lead">
              <ExternalAnchor href={lead.appUrl} missingLabel={lead.fullName || "Missing"}>
                {lead.fullName || "Open lead"}
              </ExternalAnchor>
            </DetailItem>
            <DetailItem label="Email">
              <FieldValue value={lead.email} />
            </DetailItem>
            <DetailItem label="LinkedIn id">
              <FieldValue value={lead.linkedinId} />
            </DetailItem>
            <DetailItem label="Title">
              <FieldValue value={lead.title} />
            </DetailItem>
            <DetailItem label="Role">
              <FieldValue value={lead.role} />
            </DetailItem>
            <DetailItem label="Phone">
              <FieldValue value={lead.phone} />
            </DetailItem>
            <DetailItem label="Language">
              <FieldValue value={lead.language} />
            </DetailItem>
            <DetailItem label="Score">
              {Number.isInteger(lead.score) ? lead.score : <EmptyValue />}
            </DetailItem>
            <DetailItem label="Tags">
              <TagsValue tags={lead.tags} />
            </DetailItem>
          </>
        ) : null}
      </dl>
      {lead ? <CustomProperties customProperties={lead.customProperties} /> : null}
    </section>
  );
}

function personFromPrisma(person) {
  return {
    id: person.id,
    profileKey: person.profile_key,
    linkedinProfileUrl: person.linkedin_profile_url,
    quickmailLeadId: person.quickmail_lead_id,
    name: person.name,
    email: person.email,
    phoneNumber: person.phone_number,
    status: person.status,
    qualified: Boolean(person.qualified),
    notes: person.notes,
    createdAt: person.created_at,
    updatedAt: person.updated_at
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
    notes: position.notes,
    companyId: position.companies.id,
    companyName: position.companies.name,
    domain: position.companies.domain,
    linkedinCompanyUrl: position.companies.linkedin_company_url,
    websiteUrl: position.companies.website_url
  };
}

function readPersonId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getPersonDetail(personId) {
  const id = readPersonId(personId);

  if (!id) {
    return null;
  }

  return prisma.people.findUnique({
    where: { id },
    select: {
      id: true,
      profile_key: true,
      linkedin_profile_url: true,
      quickmail_lead_id: true,
      name: true,
      email: true,
      phone_number: true,
      status: true,
      qualified: true,
      notes: true,
      created_at: true,
      updated_at: true,
      positions: {
        orderBy: [
          { is_current: "desc" },
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
          notes: true,
          companies: {
            select: {
              id: true,
              name: true,
              domain: true,
              linkedin_company_url: true,
              website_url: true
            }
          }
        }
      }
    }
  });
}

export default async function PersonDetailPage({ params }) {
  const { id } = await params;
  const personRecord = await getPersonDetail(id);

  if (!personRecord) {
    notFound();
  }

  const person = personFromPrisma(personRecord);
  const positions = personRecord.positions.map(positionFromPrisma);
  const quickmailState = await loadQuickmailLead(person);

  return (
    <PageShell>
      <PageHeader eyebrow="Person" title={person.name}>
        <PersonActions
          personId={person.id}
          personName={person.name}
          email={person.email}
          profileKey={person.profileKey}
          linkedinProfileUrl={person.linkedinProfileUrl}
        />
      </PageHeader>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="px-4 py-3 sm:px-5">
            <h2 className="text-sm/6 font-semibold text-gray-900">Details</h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            <DetailItem label="Status">
              <EditableLeadStatus personId={person.id} status={person.status} />
            </DetailItem>
            <DetailItem label="Qualified">
              <EditableQualifiedStatus
                personId={person.id}
                qualified={person.qualified}
              />
            </DetailItem>
            <DetailItem label="Email">
              <FieldValue value={person.email} />
            </DetailItem>
            <DetailItem label="Phone">
              <FieldValue value={person.phoneNumber} />
            </DetailItem>
            <DetailItem label="Profile key">
              <FieldValue value={person.profileKey} />
            </DetailItem>
            <DetailItem label="LinkedIn">
              <ExternalAnchor href={person.linkedinProfileUrl}>Profile</ExternalAnchor>
            </DetailItem>
            <DetailItem label="QuickMail lead id">
              <FieldValue value={person.quickmailLeadId} />
            </DetailItem>
            <DetailItem label="Notes" className="sm:col-span-2">
              <FieldValue value={person.notes} />
            </DetailItem>
          </dl>
        </section>

        <QuickmailPanel person={person} state={quickmailState} />
      </div>

      <section className="mt-10">
        <SectionHeader title="Roles" />
        <TableFrame label="Person roles table">
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeader scope="col">
                  Company
                </TableHeader>
                <TableHeader scope="col">
                  Position
                </TableHeader>
                <TableHeader scope="col" className="hidden md:table-cell">
                  Department
                </TableHeader>
                <TableHeader scope="col" className="hidden lg:table-cell">
                  Current
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.length === 0 ? (
                <TableEmpty colSpan={4}>No roles found.</TableEmpty>
              ) : (
                positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="w-full max-w-0 font-medium text-zinc-950 sm:w-auto sm:max-w-none">
                      <Link
                        className="font-medium text-teal-700 hover:text-teal-900"
                        href={`/companies/${position.companyId}`}
                      >
                        {position.companyName}
                      </Link>
                      <div className="mt-1 truncate font-normal text-gray-400 md:hidden">
                        {position.title || "No position"}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {position.title || <EmptyValue />}
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 md:table-cell">
                      {position.department || <EmptyValue />}
                    </TableCell>
                    <TableCell className="hidden text-zinc-500 lg:table-cell">
                      <StatusPill tone={position.isCurrent ? "teal" : "gray"}>
                        {position.isCurrent ? "Yes" : "No"}
                      </StatusPill>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </TableFrame>
      </section>
    </PageShell>
  );
}
