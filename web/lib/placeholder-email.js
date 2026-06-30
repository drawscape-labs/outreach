// Deterministic placeholder email generation for prospects without known work emails.
// Keep Quickmail-safe formatting helpers here so imports can produce stable placeholder identities.
const PLACEHOLDER_EMAIL_DOMAIN = "linkedin.profile";
const MAX_EMAIL_LOCAL_PART_LENGTH = 64;

function slugifyEmailLocalPart(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function linkedinHandle(linkedinProfileUrl) {
  if (!linkedinProfileUrl) {
    return "";
  }

  try {
    const url = new URL(linkedinProfileUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const profileIndex = segments.findIndex((segment) => segment === "in");

    if (profileIndex !== -1 && segments[profileIndex + 1]) {
      return segments[profileIndex + 1];
    }

    return segments.at(-1) || "";
  } catch {
    return "";
  }
}

export function buildQuickmailPlaceholderEmail({
  personId,
  name,
  profileKey,
  linkedinProfileUrl
} = {}) {
  const personIdSuffix = personId ? `.${personId}` : "";
  const base =
    [
      slugifyEmailLocalPart(name),
      slugifyEmailLocalPart(linkedinHandle(linkedinProfileUrl)),
      slugifyEmailLocalPart(profileKey)
    ].find(Boolean) || "person";
  const maxBaseLength = Math.max(
    1,
    MAX_EMAIL_LOCAL_PART_LENGTH - personIdSuffix.length
  );
  const trimmedBase = base.slice(0, maxBaseLength).replace(/\.+$/g, "") || "person";

  return `${trimmedBase}${personIdSuffix}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}
