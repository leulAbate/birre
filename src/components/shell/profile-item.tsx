"use client";

import { useTransition } from "react";
import { useGhost } from "./ghost";
import { signOut } from "@/server/actions/auth";

interface Props {
  initial: string;
  name: string;
}

export function ProfileItem({ initial, name }: Props) {
  const { on, toggle } = useGhost();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <div className="nav-item" style={{ marginBottom: 4, cursor: "default" }}>
      <div className="nav-icon">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: on ? "rgba(167,139,250,0.18)" : "var(--sidebar-active-bg)",
            color: on ? "var(--violet)" : "var(--sidebar-active)",
            transition: "background 0.25s, color 0.25s",
          }}
        >
          {initial}
        </div>
      </div>
      <span className="nav-label" style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        title="Privacy mode"
        className="nav-label"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          color: on ? "var(--violet)" : "var(--sidebar-icon)",
          transition: "color 0.15s",
          opacity: 0,
        }}
      >
        {on ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSignOut();
        }}
        disabled={pending}
        title="Sign out"
        className="nav-label"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          color: "var(--sidebar-icon)",
          transition: "color 0.15s",
          opacity: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
        </svg>
      </button>
    </div>
  );
}
