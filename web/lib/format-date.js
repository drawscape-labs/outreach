// Display formatting for SQLite timestamps and other date-ish strings.
// Empty values render as "", unparseable values fall back to the trimmed original.
import { parseSqliteTimestamp } from "./date-json";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

function formatWith(formatter, value) {
  if (!value) {
    return "";
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return "";
  }

  const date = parseSqliteTimestamp(trimmedValue) || new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return trimmedValue;
  }

  return formatter.format(date);
}

export function formatDate(value) {
  return formatWith(dateFormatter, value);
}

export function formatDateTime(value) {
  return formatWith(dateTimeFormatter, value);
}
