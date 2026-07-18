"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface GhostCtxValue {
  on: boolean;
  mult: number;
  toggle: () => void;
}

const GhostCtx = createContext<GhostCtxValue>({ on: false, mult: 1.5, toggle: () => {} });

export function GhostProvider({ children }: { children: React.ReactNode }) {
  // Default ON: privacy-first. Users who want real numbers turn it off
  // per-session with the sidebar toggle.
  const [on, setOn] = useState(true);
  const [mult, setMult] = useState(1.5);

  useEffect(() => {
    let m = parseFloat(sessionStorage.getItem("_gm") || "");
    if (!m || m < 1.2 || m > 3) {
      m = 1.3 + Math.random() * 1.0;
      sessionStorage.setItem("_gm", String(m));
    }
    setMult(m);
    const stored = sessionStorage.getItem("_go");
    setOn(stored === "0" ? false : true);
  }, []);

  function toggle() {
    setOn((prev) => {
      const next = !prev;
      sessionStorage.setItem("_go", next ? "1" : "0");
      return next;
    });
  }

  return <GhostCtx.Provider value={{ on, mult, toggle }}>{children}</GhostCtx.Provider>;
}

export function useGhost() {
  return useContext(GhostCtx);
}

/**
 * Wrap a money-shaped string so it gets randomized when ghost mode is on.
 * Skips strings containing % (those are ratios, not amounts).
 * Examples: "$5,120", "−$3,814", "+$1,306", "~$4,189", "$45.20/hr"
 */
export function G({ children }: { children: string }) {
  const { on, mult } = useGhost();
  return <>{on ? fakeVal(children, mult) : children}</>;
}

function fakeVal(t: string, mult: number): string {
  if (!t || t.includes("%")) return t;
  if (t.includes(" / ")) return t.split(" / ").map((p) => fakeVal(p.trim(), mult)).join(" / ");
  const ap = t.startsWith("~");
  const s = ap ? t.slice(1) : t;
  const neg = s.startsWith("−") || s.startsWith("-");
  const pos = s.startsWith("+");
  const hr = s.endsWith("/hr");
  const mo = s.endsWith("/mo");
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (!n) return t;
  const f = n * mult;
  const has$ = s.includes("$");
  const hasDec = /\.\d{2}/.test(s);
  const fmt = has$
    ? "$" +
      (hasDec
        ? f.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        : Math.round(f).toLocaleString())
    : Math.round(f).toLocaleString();
  return (ap ? "~" : "") + (neg ? "−" : pos ? "+" : "") + fmt + (hr ? "/hr" : mo ? "/mo" : "");
}
