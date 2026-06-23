import { LEAD_STATUS_TONES } from "../lib/statuses";

export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const tableHeaderClass =
  "px-3 py-3.5 text-left text-sm font-semibold text-gray-900";
export const tableHeaderFirstClass =
  "py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6";
export const tableHeaderLastClass =
  "py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-6";
export const tableCellClass = "px-3 py-4 text-sm text-gray-500";
export const tableCellFirstClass =
  "w-full max-w-0 py-4 pr-3 pl-4 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6";
export const tableCellLastClass =
  "py-4 pr-4 pl-3 text-right text-sm font-medium sm:pr-6";

const pillTones = {
  amber: {
    dot: "fill-amber-500",
    style: "bg-amber-50 text-amber-800 ring-amber-600/20"
  },
  blue: {
    dot: "fill-blue-500",
    style: "bg-blue-50 text-blue-700 ring-blue-700/10"
  },
  emerald: {
    dot: "fill-emerald-500",
    style: "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
  },
  gray: {
    dot: "fill-gray-400",
    style: "bg-gray-50 text-gray-600 ring-gray-500/10"
  },
  rose: {
    dot: "fill-rose-500",
    style: "bg-rose-50 text-rose-700 ring-rose-600/20"
  },
  teal: {
    dot: "fill-teal-500",
    style: "bg-teal-50 text-teal-700 ring-teal-600/20"
  }
};

export function PageShell({ children }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}

export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="border-b border-gray-200 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-sm/6 font-semibold uppercase tracking-normal text-teal-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl/8 font-semibold text-gray-900 sm:text-3xl/9">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm/6 text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}

export function PageStats({ stats }) {
  if (!stats?.length) {
    return null;
  }

  const gridClass =
    stats.length === 1
      ? "sm:grid-cols-1"
      : stats.length === 2
        ? "sm:grid-cols-2"
      : stats.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <dl
      className={classNames(
        "mt-6 grid grid-cols-1 overflow-hidden rounded-lg bg-gray-200 shadow-sm ring-1 ring-gray-200",
        gridClass
      )}
    >
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white px-4 py-5 sm:p-6">
          <dt className="text-sm/6 font-medium text-gray-500">{stat.name}</dt>
          <dd className="mt-1 flex items-baseline gap-x-2">
            <span className="text-2xl font-semibold text-gray-900">
              {stat.value}
            </span>
            {stat.caption ? (
              <span className="text-sm font-medium text-gray-500">
                {stat.caption}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeader({ title, description }) {
  return (
    <div className="sm:flex sm:items-center">
      <div className="sm:flex-auto">
        <h2 className="text-base/7 font-semibold text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm/6 text-gray-600">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function TableFrame({ children, label }) {
  return (
    <div className="mt-6 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div
            className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
            aria-label={label}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonIdentity({
  name,
  profileKey,
  details = [],
  detailsClassName = "md:hidden"
}) {
  const secondaryDetails = [
    profileKey
      ? {
          label: "Profile key",
          value: profileKey,
          className: "text-gray-500"
        }
      : null,
    ...details
  ].filter((detail) => {
    if (!detail) {
      return false;
    }

    const value = detail.value || detail.missingValue;
    return value !== undefined && value !== null && value !== "";
  });

  return (
    <>
      {name || <EmptyValue />}
      {secondaryDetails.length ? (
        <dl className={classNames("font-normal", detailsClassName)}>
          {secondaryDetails.map((detail) => (
            <div key={detail.label}>
              <dt className="sr-only">{detail.label}</dt>
              <dd className={classNames("mt-1 truncate", detail.className || "text-gray-400")}>
                {detail.value || detail.missingValue}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}

export function StatusPill({ children, tone = "gray" }) {
  const palette = pillTones[tone] || pillTones.gray;

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
        palette.style
      )}
    >
      <svg viewBox="0 0 6 6" aria-hidden="true" className={classNames("size-1.5", palette.dot)}>
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children}
    </span>
  );
}

export function LeadStatus({ status }) {
  if (!status) {
    return <EmptyValue />;
  }

  return (
    <StatusPill tone={LEAD_STATUS_TONES[status] || "gray"}>
      {status}
    </StatusPill>
  );
}

export function QualifiedStatus({ qualified }) {
  return (
    <StatusPill tone={qualified ? "teal" : "gray"}>
      {qualified ? "Yes" : "No"}
    </StatusPill>
  );
}

export function EmptyValue({ children = "Missing" }) {
  return <span className="text-gray-400">{children}</span>;
}

export function ExternalAnchor({ href, children, missingLabel = "Missing" }) {
  if (!href) {
    return <EmptyValue>{missingLabel}</EmptyValue>;
  }

  return (
    <a
      className="font-medium text-teal-700 hover:text-teal-900"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

export function TableEmpty({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm font-medium text-gray-500">
        {children}
      </td>
    </tr>
  );
}
