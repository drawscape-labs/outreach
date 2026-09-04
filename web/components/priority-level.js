import { classNames } from "./class-names";
import { EmptyValue } from "./empty-value";
import { Badge } from "./ui/badge";
const PRIORITY_LEVELS = {
  high: {
    color: "green",
    dot: "fill-green-500 dark:fill-green-400",
    label: "High"
  },
  medium: {
    color: "yellow",
    dot: "fill-yellow-500 dark:fill-yellow-400",
    label: "Medium"
  },
  low: {
    color: "zinc",
    dot: "fill-zinc-400",
    label: "Low"
  }
};

export function formatPriorityLevel(priority) {
  const normalizedPriority = String(priority || "").trim().toLowerCase();

  return PRIORITY_LEVELS[normalizedPriority]?.label || priority || "";
}

export function PriorityLevel({ className, priority }) {
  const normalizedPriority = String(priority || "").trim().toLowerCase();
  const level = PRIORITY_LEVELS[normalizedPriority];

  if (!level) {
    return priority ? (
      <Badge color="zinc" className={classNames("whitespace-nowrap", className)}>
        {priority}
      </Badge>
    ) : (
      <EmptyValue />
    );
  }

  return (
    <Badge color={level.color} className={classNames("whitespace-nowrap", className)}>
      <svg
        viewBox="0 0 6 6"
        aria-hidden="true"
        className={classNames("size-1.5", level.dot)}
      >
        <circle r={3} cx={3} cy={3} />
      </svg>
      {level.label}
    </Badge>
  );
}
