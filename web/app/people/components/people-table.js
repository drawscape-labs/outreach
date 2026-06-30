import {
  classNames,
  DataTable,
  EmptyValue,
  ExternalAnchor,
  LeadStatus,
  Link,
  QualifiedStatus,
  TableEmpty,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from "../../../components";
import {
  splitCompanies,
  splitCompanyRefs,
  splitList
} from "../lib/people-table-data";
import {
  EditableLeadStatus,
  EditableQualifiedStatus
} from "../../../components/lead-field-controls";
import { PersonActions } from "./person-actions";

function companiesForPerson(person) {
  const companyRefs = splitCompanyRefs(person.companyRefs);

  if (companyRefs.length) {
    return companyRefs;
  }

  if (person.companyId && person.companyName) {
    return [{
      id: person.companyId,
      name: person.companyName,
      domain: person.companyDomain || person.domain,
      websiteUrl: person.companyWebsiteUrl || person.websiteUrl
    }];
  }

  return splitCompanies(person.companies).map((name) => ({ name }));
}

function companyKey(company, index) {
  return company.id || `${company.name}-${index}`;
}

function CompanyLinks({ companies }) {
  if (!companies.length) {
    return <EmptyValue>No company</EmptyValue>;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {companies.map((company, index) => (
        <span key={companyKey(company, index)}>
          {index > 0 ? <span className="text-gray-400 dark:text-zinc-500">, </span> : null}
          {company.id ? (
            <Link
              className="font-medium text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
              href={`/companies/${company.id}`}
            >
              {company.name}
            </Link>
          ) : (
            company.name
          )}
        </span>
      ))}
    </span>
  );
}

function websiteDomain(value) {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(
      trimmedValue.includes("://") ? trimmedValue : `https://${trimmedValue}`
    );

    return url.hostname.replace(/^www\./, "");
  } catch {
    return trimmedValue
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }
}

function companyDomain(company) {
  return String(company.domain || "").trim() || websiteDomain(company.websiteUrl);
}

function externalWebsiteHref(value) {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  return /^https?:\/\//.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
}

function companyWebsiteHref(company) {
  const websiteHref = externalWebsiteHref(company.websiteUrl);

  if (websiteHref) {
    return websiteHref;
  }

  const domain = companyDomain(company);

  return domain ? `https://${domain}` : "";
}

function CompanyDomains({ companies }) {
  const domains = companies
    .map((company, index) => ({
      domain: companyDomain(company),
      href: companyWebsiteHref(company),
      key: companyKey(company, index)
    }))
    .filter((company) => company.domain);

  if (!domains.length) {
    return <EmptyValue>No domain</EmptyValue>;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {domains.map((company, index) => (
        <span key={company.key}>
          {index > 0 ? <span className="text-gray-400 dark:text-zinc-500">, </span> : null}
          {company.href ? (
            <ExternalAnchor href={company.href}>{company.domain}</ExternalAnchor>
          ) : (
            company.domain
          )}
        </span>
      ))}
    </span>
  );
}

function PersonStack({ id, name, position }) {
  const content = (
    <>
      <span className="block font-semibold text-gray-900 dark:text-white">
        {position || <EmptyValue>No position</EmptyValue>}
      </span>
      <span className="mt-0.5 block font-normal text-gray-600 dark:text-zinc-400">
        {name || <EmptyValue>No name</EmptyValue>}
      </span>
    </>
  );

  if (!id) {
    return content;
  }

  return (
    <Link
      className="block min-w-0 hover:text-teal-800 dark:hover:text-teal-300"
      href={`/people/${id}`}
    >
      {content}
    </Link>
  );
}

function CompanyStack({ companies }) {
  return (
    <div className="min-w-0">
      <div className="text-gray-900 dark:text-white">
        <CompanyLinks companies={companies} />
      </div>
      <div className="mt-1 text-gray-500 dark:text-zinc-400">
        <CompanyDomains companies={companies} />
      </div>
    </div>
  );
}

function ContactLine({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 break-words text-gray-600 dark:text-zinc-400">{children}</dd>
    </div>
  );
}

function ContactStack({ email, phoneNumber, linkedinProfileUrl }) {
  return (
    <dl className="min-w-0 space-y-1">
      <ContactLine label="Email">
        {email ? (
          <span className="break-all">{email}</span>
        ) : (
          <EmptyValue>No email</EmptyValue>
        )}
      </ContactLine>
      <ContactLine label="Phone">
        {phoneNumber || <EmptyValue>No phone</EmptyValue>}
      </ContactLine>
      <ContactLine label="LinkedIn">
        <ExternalAnchor href={linkedinProfileUrl} missingLabel="No LinkedIn">
          LinkedIn
        </ExternalAnchor>
      </ContactLine>
    </dl>
  );
}

function positionText(person) {
  const titles = splitList(person.currentPositionTitles);
  const title = titles.join("; ") || person.title || person.positionTitle || "";

  if (title) {
    return title;
  }

  const positionCount = Number(person.positionCount || 0);

  if (positionCount > 0) {
    return `${positionCount} ${positionCount === 1 ? "role" : "roles"}`;
  }

  return "";
}

function personId(person) {
  return person.personId || person.id;
}

function personName(person) {
  return person.personName || person.name;
}

function personProfileKey(person) {
  return person.profileKey;
}

function personLinkedInProfileUrl(person) {
  return person.linkedinProfileUrl;
}

function personCreatedAt(person) {
  return person.createdAt || person.personCreatedAt;
}

const createdAtFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

function formatCreatedAt(value) {
  if (!value) {
    return "";
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return "";
  }

  const sqliteTimestampMatch = trimmedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/
  );
  const date = sqliteTimestampMatch
    ? new Date(Date.UTC(
      Number(sqliteTimestampMatch[1]),
      Number(sqliteTimestampMatch[2]) - 1,
      Number(sqliteTimestampMatch[3]),
      Number(sqliteTimestampMatch[4] || 0),
      Number(sqliteTimestampMatch[5] || 0),
      Number(sqliteTimestampMatch[6] || 0)
    ))
    : new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return trimmedValue;
  }

  return createdAtFormatter.format(date);
}

function CreatedAtSortIndicator({ direction }) {
  return (
    <span className="inline-flex h-3 w-3 items-center justify-center" aria-hidden="true">
      <span
        className={classNames(
          "h-0 w-0 border-x-[4px] border-x-transparent",
          direction === "asc"
            ? "border-b-[5px] border-b-zinc-500"
            : "border-t-[5px] border-t-zinc-500"
        )}
      />
    </span>
  );
}

function CreatedAtHeader({ sortDirection, sortHref }) {
  if (!sortHref) {
    return "Created at";
  }

  const nextDirection = sortDirection === "asc" ? "descending" : "ascending";

  return (
    <Link
      aria-label={`Sort by created at ${nextDirection}`}
      className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-teal-700 dark:text-zinc-300 dark:hover:text-teal-300"
      href={sortHref}
    >
      <span>Created at</span>
      {sortDirection ? <CreatedAtSortIndicator direction={sortDirection} /> : null}
    </Link>
  );
}

function StatusCell({ editableStatuses, person }) {
  const id = personId(person);

  if (editableStatuses && id) {
    return <EditableLeadStatus personId={id} status={person.status} />;
  }

  return <LeadStatus status={person.status} />;
}

function QualifiedCell({ editableStatuses, person }) {
  const id = personId(person);

  if (editableStatuses && id) {
    return (
      <EditableQualifiedStatus
        personId={id}
        qualified={person.qualified}
      />
    );
  }

  return <QualifiedStatus qualified={person.qualified} />;
}

function ProgressCell({ editableStatuses, person }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <StatusCell editableStatuses={editableStatuses} person={person} />
      <QualifiedCell editableStatuses={editableStatuses} person={person} />
    </div>
  );
}

export function PeopleTable({
  people,
  emptyMessage = "No people found.",
  label = "People table",
  nameHeader = "Person",
  editableStatuses = true,
  createdAtSortDirection,
  createdAtSortHref
}) {
  return (
    <TableFrame label={label}>
      <DataTable>
        <TableHead>
          <TableRow>
            <TableHeader scope="col" className="w-[22%]">
              {nameHeader}
            </TableHeader>
            <TableHeader scope="col" className="w-[22%]">
              Company
            </TableHeader>
            <TableHeader scope="col" className="w-[26%]">
              Contact
            </TableHeader>
            <TableHeader scope="col" className="w-28">
              Progress
            </TableHeader>
            <TableHeader
              scope="col"
              className="hidden w-44 xl:table-cell"
              aria-sort={
                createdAtSortDirection
                  ? createdAtSortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              <CreatedAtHeader
                sortDirection={createdAtSortDirection}
                sortHref={createdAtSortHref}
              />
            </TableHeader>
            <TableHeader scope="col" className="text-right !pr-8">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {people.length === 0 ? (
            <TableEmpty colSpan={6}>{emptyMessage}</TableEmpty>
          ) : (
            people.map((person) => {
              const id = personId(person);
              const name = personName(person);
              const profileKey = personProfileKey(person);
              const linkedinProfileUrl = personLinkedInProfileUrl(person);
              const companies = companiesForPerson(person);
              const position = positionText(person);
              const createdAt = personCreatedAt(person);
              const formattedCreatedAt = formatCreatedAt(createdAt);

              return (
                <TableRow key={person.id || person.personId}>
                  <TableCell className="max-w-0 whitespace-normal align-top text-zinc-950 dark:text-white">
                    <PersonStack id={id} name={name} position={position} />
                  </TableCell>
                  <TableCell className="max-w-0 whitespace-normal align-top text-zinc-500 dark:text-zinc-400">
                    <CompanyStack companies={companies} />
                  </TableCell>
                  <TableCell className="max-w-0 whitespace-normal align-top text-zinc-500 dark:text-zinc-400">
                    <ContactStack
                      email={person.email}
                      phoneNumber={person.phoneNumber}
                      linkedinProfileUrl={linkedinProfileUrl}
                    />
                  </TableCell>
                  <TableCell className="whitespace-normal align-top text-zinc-500 dark:text-zinc-400">
                    <ProgressCell editableStatuses={editableStatuses} person={person} />
                  </TableCell>
                  <TableCell
                    className="hidden w-44 whitespace-nowrap align-top text-zinc-500 dark:text-zinc-400 xl:table-cell"
                    title={createdAt || undefined}
                  >
                    {formattedCreatedAt || <EmptyValue />}
                  </TableCell>
                  <TableCell className="align-top text-right font-medium !pr-8">
                    <PersonActions
                      personId={id}
                      personName={name}
                      email={person.email}
                      profileKey={profileKey}
                      linkedinProfileUrl={linkedinProfileUrl}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </DataTable>
    </TableFrame>
  );
}
