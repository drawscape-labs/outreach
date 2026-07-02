// Helpers for reading Next.js page searchParams (values may be string, array, or missing).
export function firstSearchParam(searchParams, key) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export function positiveIntegerSearchParam(searchParams, key, fallback = 1) {
  const parsed = Number.parseInt(firstSearchParam(searchParams, key), 10);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
