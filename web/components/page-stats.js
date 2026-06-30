import { classNames } from "./class-names";

export function PageStats({ stats }) {
  if (!stats?.length) {
    return null;
  }

  const gridClass =
    stats.length === 1
      ? "sm:grid-cols-1"
      : stats.length === 2
        ? "sm:grid-cols-2"
      : stats.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <dl
      className={classNames(
        "mt-6 grid grid-cols-1 overflow-hidden rounded-lg bg-gray-200 shadow-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10",
        gridClass
      )}
    >
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white px-4 py-5 dark:bg-zinc-900 sm:p-6">
          <dt className="text-sm/6 font-medium text-gray-500 dark:text-zinc-400">{stat.name}</dt>
          <dd className="mt-1 flex items-baseline gap-x-2">
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stat.value}
            </span>
            {stat.caption ? (
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                {stat.caption}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
