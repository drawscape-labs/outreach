import {
  classNames,
  DataTable,
  EmptyValue,
  ExternalAnchor,
  LeadStatus,
  Link,
  TableEmpty,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow
} from "@/components";
import {
  splitCompanies,
  splitCompanyRefs,
  splitList
} from "@/app/people/lib/people-table-data";
import { formatDate } from "@/lib/format-date";
import { EditableLeadStatus } from "@/components/lead-field-controls";
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

function CompanyCell({ companies }) {
  if (!companies.length) {
    return <EmptyValue>No company</EmptyValue>;
  }

  return (
    <div
      className="truncate"
      title={companies.map((company) => company.name).join(", ")}
    >
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
    </div>
  );
}

function PersonNameCell({ id, name }) {
  if (!name) {
    return <EmptyValue>No name</EmptyValue>;
  }

  if (!id) {
    return <span className="block truncate" title={name}>{name}</span>;
  }

  return (
    <Link
      className="block truncate text-gray-600 hover:text-teal-800 dark:text-zinc-400 dark:hover:text-teal-300"
      href={`/people/${id}`}
      title={name}
    >
      {name}
    </Link>
  );
}

function PositionCell({ position }) {
  if (!position) {
    return <EmptyValue>No position</EmptyValue>;
  }

  return (
    <span
      className="block truncate font-semibold text-gray-900 dark:text-white"
      title={position}
    >
      {position}
    </span>
  );
}

function EmailCell({ email }) {
  if (!email) {
    return <EmptyValue>No email</EmptyValue>;
  }

  return (
    <Link
      className="block truncate text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
      href={`mailto:${email}`}
      title={email}
    >
      {email}
    </Link>
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
            <TableHeader scope="col" className="w-52">
              Position
            </TableHeader>
            <TableHeader scope="col" className="w-32">
              {nameHeader}
            </TableHeader>
            <TableHeader scope="col" className="w-44">
              Company
            </TableHeader>
            <TableHeader scope="col" className="w-44">
              Email
            </TableHeader>
            <TableHeader scope="col" className="hidden w-20 2xl:table-cell">
              LinkedIn
            </TableHeader>
            <TableHeader scope="col" className="w-28">
              Status
            </TableHeader>
            <TableHeader
              scope="col"
              className="hidden w-px whitespace-nowrap 2xl:table-cell"
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
            <TableHeader scope="col" className="w-px whitespace-nowrap text-right !pr-8">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {people.length === 0 ? (
            <TableEmpty colSpan={8}>{emptyMessage}</TableEmpty>
          ) : (
            people.map((person) => {
              const id = personId(person);
              const name = personName(person);
              const profileKey = personProfileKey(person);
              const linkedinProfileUrl = personLinkedInProfileUrl(person);
              const companies = companiesForPerson(person);
              const position = positionText(person);
              const createdAt = personCreatedAt(person);
              const formattedCreatedAt = formatDate(createdAt);

              return (
                <TableRow key={person.id || person.personId}>
                  <TableCell className="w-52 max-w-52 align-middle">
                    <PositionCell position={position} />
                  </TableCell>
                  <TableCell className="w-32 max-w-32 align-middle">
                    <PersonNameCell id={id} name={name} />
                  </TableCell>
                  <TableCell className="w-44 max-w-44 align-middle text-zinc-500 dark:text-zinc-400">
                    <CompanyCell companies={companies} />
                  </TableCell>
                  <TableCell className="w-44 max-w-44 align-middle text-zinc-500 dark:text-zinc-400">
                    <EmailCell email={person.email} />
                  </TableCell>
                  <TableCell className="hidden w-20 align-middle text-zinc-500 dark:text-zinc-400 2xl:table-cell">
                    <ExternalAnchor href={linkedinProfileUrl} missingLabel="No LinkedIn">
                      LinkedIn
                    </ExternalAnchor>
                  </TableCell>
                  <TableCell className="w-28 align-middle text-zinc-500 dark:text-zinc-400">
                    <StatusCell editableStatuses={editableStatuses} person={person} />
                  </TableCell>
                  <TableCell
                    className="hidden w-px whitespace-nowrap align-middle text-zinc-500 dark:text-zinc-400 2xl:table-cell"
                    title={createdAt || undefined}
                  >
                    {formattedCreatedAt || <EmptyValue />}
                  </TableCell>
                  <TableCell className="w-px whitespace-nowrap align-middle text-right font-medium !pr-8">
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
