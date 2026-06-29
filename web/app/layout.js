import "./styles.css";
import { Link } from "../components";
import { QueryProvider } from "../components/query-provider";

export const metadata = {
  title: "Drawscape Outreach",
  description: "Prospecting database for companies and people",
  icons: {
    icon: "/icon.png"
  }
};

const navigation = [
  { name: "Companies", href: "/companies" },
  { name: "People", href: "/people" },
  { name: "Contacted", href: "/contacted" },
  { name: "Replied", href: "/replied" },
  { name: "Converted", href: "/converted" }
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:flex sm:h-16 sm:items-center sm:justify-between sm:gap-x-6 sm:px-6 lg:px-8">
            <Link className="flex h-16 shrink-0 items-center gap-x-3" href="/">
              <span className="grid size-9 place-items-center rounded-md bg-teal-700 text-sm font-semibold text-white shadow-sm">
                D
              </span>
              <span className="text-sm font-semibold text-gray-900 sm:text-base">
                Drawscape Outreach
              </span>
            </Link>
            <nav
              className="flex items-center justify-between gap-x-1 border-t border-gray-100 py-2 sm:h-16 sm:justify-end sm:border-t-0 sm:py-0"
              aria-label="Main navigation"
            >
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  className="rounded-md px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:px-3 sm:text-sm"
                  href={item.href}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
