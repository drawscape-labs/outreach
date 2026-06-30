// Tiny className composition helper for React components.
// Use this for conditional class strings; keep larger styling decisions in the component or feature lib.
export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
