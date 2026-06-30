import { classNames } from "./class-names";
import { EmptyValue } from "./empty-value";

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
          className: "text-gray-500 dark:text-zinc-400"
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
              <dd className={classNames("mt-1 truncate", detail.className || "text-gray-400 dark:text-zinc-500")}>
                {detail.value || detail.missingValue}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
