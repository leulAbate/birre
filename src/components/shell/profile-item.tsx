"use client";

import { useGhost } from "./ghost";

interface Props {
  initial: string;
  name: string;
}

export function ProfileItem({ initial, name }: Props) {
  const { on } = useGhost();

  return (
    <div className="nav-item" style={{ cursor: "default" }}>
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
      <span
        className="nav-label"
        style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {name}
      </span>
    </div>
  );
}
