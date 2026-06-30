import {
  classNames,
  DataTable,
  EmptyValue,
  ExternalAnchor,
  LeadStatus,
  Link,
  PersonIdentity,
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
    return [{ id: person.companyId, name: person.companyName }];
  }

  return splitCompanies(person.companies).map((name) => ({ name }));
}

function companyKey(company, index) {
  return company.id || `${company.name}-${index}`;
}

function CompanyLinks({ companies }) {
  if (!companies.length) {
    return <EmptyValue />;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-1">
      {companies.map((company, index) => (
        <span key={companyKey(company, index)}>
          {index > 0 ? <span className="text-gray-400">, </span> : null}
          {company.id ? (
            <Link
              className="font-medium text-teal-700 hover:text-teal-900"
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
      className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-teal-700"
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

export function PeopleTable({
  people,
  emptyMessage = "No people found.",
  label = "People table",
  nameHeader = "Name",
  editableStatuses = true,
  createdAtSortDirection,
  createdAtSortHref
}) {
  return (
    <TableFrame label={label}>
      <DataTable>
        <TableHead>
          <TableRow>
            <TableHeader scope="col">
              {nameHeader}
            </TableHeader>
            <TableHeader scope="col" className="hidden md:table-cell">
              Companies
            </TableHeader>
            <TableHeader scope="col">
              Position
            </TableHeader>
            <TableHeader scope="col">
              Status
            </TableHeader>
            <TableHeader scope="col">
              Qualified
            </TableHeader>
            <TableHeader
              scope="col"
              className="hidden xl:table-cell"
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
            <TableHeader scope="col" className="hidden 2xl:table-cell">
              Email
            </TableHeader>
            <TableHeader scope="col" className="hidden 2xl:table-cell">
              Phone
            </TableHeader>
            <TableHeader scope="col" className="text-right">
              LinkedIn
            </TableHeader>
            <TableHeader scope="col" className="text-right !pr-8">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {people.length === 0 ? (
            <TableEmpty colSpan={10}>{emptyMessage}</TableEmpty>
          ) : (
            people.map((person) => {
              const id = personId(person);
              const name = personName(person);
              const profileKey = personProfileKey(person);
              const linkedinProfileUrl = personLinkedInProfileUrl(person);
              const companies = companiesForPerson(person);
              const companyNames = companies.map((company) => company.name).join(", ");
              const position = positionText(person);
              const createdAt = personCreatedAt(person);
              const formattedCreatedAt = formatCreatedAt(createdAt);

              return (
                <TableRow key={person.id || person.personId}>
                  <TableCell className="w-full max-w-0 font-medium text-zinc-950 sm:w-auto sm:max-w-none">
                    <Link
                      className="block text-gray-900 hover:text-teal-800"
                      href={`/people/${id}`}
                    >
                      <PersonIdentity
                        name={name}
                        profileKey={profileKey}
                        details={[
                          {
                            label: "Position",
                            value: position,
                            missingValue: "No position"
                          },
                          {
                            label: "Companies",
                            value: companyNames,
                            missingValue: "No company mapped"
                          }
                        ]}
                      />
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-zinc-500 md:table-cell">
                    <CompanyLinks companies={companies} />
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-zinc-500">
                    {position ? (
                      <span className="font-medium text-gray-900">{position}</span>
                    ) : (
                      <EmptyValue>No position</EmptyValue>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    <StatusCell editableStatuses={editableStatuses} person={person} />
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    <QualifiedCell editableStatuses={editableStatuses} person={person} />
                  </TableCell>
                  <TableCell
                    className="hidden text-zinc-500 xl:table-cell"
                    title={createdAt || undefined}
                  >
                    {formattedCreatedAt || <EmptyValue />}
                  </TableCell>
                  <TableCell className="hidden text-zinc-500 2xl:table-cell">
                    {person.email || null}
                  </TableCell>
                  <TableCell className="hidden text-zinc-500 2xl:table-cell">
                    {person.phoneNumber || null}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <ExternalAnchor href={linkedinProfileUrl}>Profile</ExternalAnchor>
                  </TableCell>
                  <TableCell className="text-right font-medium !pr-8">
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
