export function TableFrame({ children, label }) {
  return (
    <div
      className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 dark:bg-zinc-900 dark:ring-white/10"
      aria-label={label}
    >
      {children}
    </div>
  );
}
