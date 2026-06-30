"use client";

import {useRouter} from "next/navigation";

import {Link} from "@/components/ui/link";
import {Select} from "@/components/ui/select";

export type TertiaryNavigationItem = {
  badge?: number | string | null;
  current?: boolean;
  href: string;
  label: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function hasVisibleBadge(badge: TertiaryNavigationItem["badge"]) {
  return badge != null && String(badge).trim() !== "0";
}

function getItemSelectLabel(item: TertiaryNavigationItem) {
  return hasVisibleBadge(item.badge)
    ? `${item.label} (${item.badge})`
    : item.label;
}

export function TertiaryNavigation({
  ariaLabel = "Sections",
  className,
  items,
}: {
  ariaLabel?: string;
  className?: string;
  items: TertiaryNavigationItem[];
}) {
  const router = useRouter();
  const selectedItem = items.find((item) => item.current) ?? items[0];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:hidden">
        <Select
          aria-label={ariaLabel}
          value={selectedItem?.href ?? ""}
          onChange={(event) => router.push(event.target.value)}
        >
          {items.map((item) => (
            <option key={item.href} value={item.href}>
              {getItemSelectLabel(item)}
            </option>
          ))}
        </Select>
      </div>
      <div className="hidden sm:block">
        <nav className="flex overflow-x-auto border-b border-gray-200 py-4 dark:border-white/10">
          <ul
            role="list"
            className="flex min-w-full flex-none gap-x-8 px-1 text-sm/6 font-semibold text-gray-500 dark:text-zinc-400"
          >
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={classNames(
                    item.current ? "text-indigo-600 dark:text-indigo-400" : "hover:text-gray-700 dark:hover:text-zinc-200",
                    "inline-flex items-center gap-2 whitespace-nowrap"
                  )}
                >
                  <span>{item.label}</span>
                  {hasVisibleBadge(item.badge) ? (
                    <span
                      className={classNames(
                        item.current
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"
                          : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-300",
                        "rounded-full px-2.5 py-0.5 text-xs font-medium"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
