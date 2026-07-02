"use client";

import { useEffect, useState } from "react";
import { classNames } from "./class-names";
import { Switch } from "./ui/switch";

function prefersDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readInitialTheme() {
  const storedTheme = window.localStorage.getItem("theme");

  if (storedTheme === "dark") {
    return true;
  }

  if (storedTheme === "light") {
    return false;
  }

  return prefersDarkMode();
}

function applyTheme(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeToggle({ className, showLabel = false }) {
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialTheme = readInitialTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    applyTheme(initialTheme);
    // Theme lives in localStorage/matchMedia, which the server can't read, so
    // the state has to sync once after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsDark(initialTheme);
    setIsReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    function handleSystemThemeChange(event) {
      if (window.localStorage.getItem("theme")) {
        return;
      }

      applyTheme(event.matches);
      setIsDark(event.matches);
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  function handleChange(nextIsDark) {
    window.localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    applyTheme(nextIsDark);
    setIsDark(nextIsDark);
  }

  return (
    <div className={classNames("items-center gap-2", className)}>
      {showLabel ? (
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Dark
        </span>
      ) : null}
      <Switch
        aria-label="Toggle dark mode"
        checked={isDark}
        color="teal"
        className={isReady ? undefined : "opacity-0"}
        onChange={handleChange}
      />
    </div>
  );
}
