import "./styles.css";
import Script from "next/script";
import { Link } from "@/components";
import { QueryProvider } from "@/components/query-provider";
import { ThemeToggle } from "@/components/theme-toggle";
const appName = process.env.OUTREACH_APP_NAME?.trim() || "Outreach";

export const metadata = {
  title: appName,
  description: "Prospecting database for companies and people",
  icons: {
    icon: "/icon.png"
  }
};

const navigation = [
  { name: "Companies", href: "/companies" },
  { name: "People", href: "/people" },
  { name: "Campaigns", href: "/campaigns" },
  { name: "Skills", href: "/skills" }
];

const themeScript = `
  (function() {
    try {
      var theme = window.localStorage.getItem("theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var isDark = theme === "dark" || (!theme && prefersDark);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch (_) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-none">
          <div className="mx-auto max-w-7xl px-4 sm:flex sm:h-16 sm:items-center sm:justify-between sm:gap-x-6 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-x-4">
              <Link className="flex min-w-0 shrink-0 items-center gap-x-3" href="/">
                <span className="grid size-9 place-items-center rounded-md bg-teal-700 text-sm font-semibold text-white shadow-sm dark:bg-teal-500 dark:text-zinc-950">
                  {appName.charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
                  {appName}
                </span>
              </Link>
              <ThemeToggle className="flex sm:hidden" />
            </div>
            <div className="flex items-center justify-between gap-x-3 border-t border-gray-100 py-2 dark:border-white/10 sm:h-16 sm:border-t-0 sm:py-0">
              <nav
                className="flex min-w-0 flex-1 items-center gap-x-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Main navigation"
              >
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    className="shrink-0 rounded-md px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white sm:px-3 sm:text-sm"
                    href={item.href}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <ThemeToggle className="hidden sm:flex" showLabel />
            </div>
          </div>
        </header>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
