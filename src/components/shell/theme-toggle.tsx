"use client";

import { useEffect, useState } from "react";

/**
 * Toggles between light and dark themes.
 * Sets data-theme on <html> immediately for instant switching,
 * and persists in a cookie so SSR matches on next request.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Read initial value from the html element (set by server via cookie).
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    // 1 year cookie. Path=/ so it applies everywhere.
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  const isDark = theme === "dark";
  return (
    <button onClick={toggle} className="nav-item" style={{ marginBottom: 4 }}>
      <div className="nav-icon">
        <span style={{ fontSize: 14 }}>{isDark ? "☀️" : "🌙"}</span>
      </div>
      <span className="nav-label">{isDark ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}
