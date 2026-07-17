"use client";

import { useState, useTransition } from "react";
import { saveMonthlyNote } from "@/server/actions/notes";

interface Props {
  monthStart: string; // YYYY-MM-01
  initialContent: string;
}

export function NotesField({ monthStart, initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function handleBlur() {
    if (content === initialContent) return;
    startTransition(async () => {
      await saveMonthlyNote(monthStart, content);
      setSavedAt(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    });
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="How did the month feel? What went well? What to change next month?"
        rows={4}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--progress-bg)",
          color: "var(--text-primary)",
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.6,
          minHeight: 80,
        }}
      />
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {pending ? "Saving…" : savedAt ? `Saved at ${savedAt}` : "Saves automatically when you click away"}
      </p>
    </div>
  );
}
