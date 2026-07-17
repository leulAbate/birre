"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { ProfileItem } from "./profile-item";

interface Props {
  userInitial: string;
  userName: string;
}

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    path: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  },
  {
    href: "/transactions",
    label: "Transactions",
    path: "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  },
  {
    href: "/review",
    label: "Review",
    path: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z",
  },
  {
    href: "/plans",
    label: "Plans",
    path: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
  },
  {
    href: "/tax",
    label: "Tax",
    path: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  },
];

export function Sidebar({ userInitial, userName }: Props) {
  const pathname = usePathname();

  return (
    <aside id="sidebar">
      <div className="nav-logo">
        <div className="nav-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              fill="var(--sidebar-active)"
            />
          </svg>
        </div>
        <span className="nav-logo-text">Birr&apos;e</span>
      </div>

      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={cn("nav-item", active && "active")}>
            <div className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d={item.path} />
              </svg>
            </div>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}

      <div className="nav-spacer" />

      <ThemeToggle />
      <ProfileItem initial={userInitial} name={userName} />
    </aside>
  );
}
