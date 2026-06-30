function parseSqliteTimestamp(value) {
  const match = String(value).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?)?$/
  );

  if (!match) {
    return null;
  }

  return new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  ));
}

export function toJsonDate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const date = parseSqliteTimestamp(text) || new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toISOString();
}
