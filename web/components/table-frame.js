export function TableFrame({ children, label }) {
  return (
    <div
      className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
      aria-label={label}
    >
      {children}
    </div>
  );
}
