export function PageShell({ children, fullWidth = false }) {
  const widthClass = fullWidth ? "w-full" : "mx-auto max-w-7xl";

  return (
    <main className={`${widthClass} px-4 py-8 sm:px-6 lg:px-8`}>
      {children}
    </main>
  );
}
