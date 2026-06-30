export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="border-b border-gray-200 pb-6 dark:border-white/10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-sm/6 font-semibold uppercase tracking-normal text-teal-700 dark:text-teal-400">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl/8 font-semibold text-gray-900 dark:text-white sm:text-3xl/9">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm/6 text-gray-600 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}
