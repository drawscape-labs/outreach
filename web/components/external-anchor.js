import { EmptyValue } from "./empty-value";
import { Link } from "./ui/link";

export function ExternalAnchor({ href, children, missingLabel = "Missing" }) {
  if (!href) {
    return <EmptyValue>{missingLabel}</EmptyValue>;
  }

  return (
    <Link
      className="font-medium text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </Link>
  );
}
