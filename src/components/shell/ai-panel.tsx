"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

interface PageConfig {
  subtitle: string;
  contextPill: string;
  prompts: string[];
  placeholder: string;
}

const PAGE_CONFIG: Record<string, PageConfig> = {
  "/dashboard": {
    subtitle: "Dashboard · your finances at a glance",
    contextPill: "Dashboard · current month",
    prompts: [
      "Why did I spend more this month?",
      "Am I on track to hit my savings goals?",
      "What subscriptions should I cut?",
      "Break down my spending by category",
    ],
    placeholder: "Ask about your finances…",
  },
  "/transactions": {
    subtitle: "Transactions · find patterns in your spending",
    contextPill: "Current month transactions",
    prompts: [
      "Biggest spending categories this month?",
      "Any unusual charges?",
      "How much did I spend on food?",
      "Show me my recurring expenses",
    ],
    placeholder: "Ask about your transactions…",
  },
  "/review": {
    subtitle: "Review · monthly performance breakdown",
    contextPill: "Current month review",
    prompts: [
      "What drove spending up vs last month?",
      "How do I improve my Review score?",
      "Break down my savings rate trend",
      "What should I focus on next month?",
    ],
    placeholder: "Ask about this month…",
  },
  "/plans": {
    subtitle: "Plans · goal progress and savings pace",
    contextPill: "Active goals",
    prompts: [
      "Am I on track for all my goals?",
      "Should I prioritize Emergency Fund?",
      "What's my realistic monthly savings capacity?",
      "How can I reach goals faster?",
    ],
    placeholder: "Ask about your goals…",
  },
  "/tax": {
    subtitle: "Tax · W-4, withholding, and deductions",
    contextPill: "2026 YTD tax data",
    prompts: [
      "How do I adjust my W-4 to stop over-withholding?",
      "Explain my effective vs marginal rate",
      "Should I switch to Traditional 401(k)?",
      "What deductions might I be missing?",
    ],
    placeholder: "Ask about your taxes…",
  },
};

const DEFAULT_CONFIG: PageConfig = {
  subtitle: "Your AI finance assistant",
  contextPill: "Birr'e AI",
  prompts: ["Summarize my financial health", "What should I focus on this month?"],
  placeholder: "Ask about your finances…",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiPanel() {
  const pathname = usePathname();
  const cfg = PAGE_CONFIG[pathname] ?? DEFAULT_CONFIG;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function selectPrompt(p: string) {
    setInput(p);
  }

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;

    const pageId = pathname.replace(/^\//, "");
    const nextMessages: Message[] = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageId, messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => res.statusText);
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errText}` }]);
        setThinking(false);
        return;
      }

      // Stream the response into a growing assistant message
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantBuf = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantBuf += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: assistantBuf };
          return next;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ask Birr'e AI"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 300,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "var(--violet)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open
            ? "0 4px 16px rgba(167,139,250,0.2)"
            : "0 8px 32px rgba(167,139,250,0.4)",
          transform: open ? "rotate(90deg) scale(0.9)" : "",
          transition: "transform 0.25s, box-shadow 0.25s",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </button>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: open ? 0 : -400,
          width: 380,
          height: "100vh",
          zIndex: 299,
          background: "var(--bg-card-solid)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--violet-bg)",
                border: "1px solid var(--violet-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--violet)">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                Birr&apos;e AI
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{cfg.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 18,
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {cfg.prompts.map((p) => (
            <button key={p} onClick={() => selectPrompt(p)} className="ai-prompt-chip">
              {p}
            </button>
          ))}
        </div>

        <div
          ref={messagesRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              style={{
                fontSize: 11,
                padding: "4px 14px",
                borderRadius: 99,
                background: "var(--progress-bg)",
                color: "var(--text-muted)",
              }}
            >
              {cfg.contextPill}
            </span>
          </div>

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}

          {thinking && <TypingDots />}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={cfg.placeholder}
              rows={1}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--progress-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={send}
              disabled={thinking}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1px solid var(--violet-border)",
                background: "var(--violet-bg)",
                color: "var(--violet)",
                cursor: thinking ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: thinking ? 0.5 : 1,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--violet)">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
            Claude reads the live numbers on this page to answer.
          </p>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "84%",
            padding: "9px 13px",
            borderRadius: "13px 13px 3px 13px",
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{content}</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <AiAvatar />
      <div
        style={{
          maxWidth: "88%",
          padding: "10px 14px",
          borderRadius: "3px 13px 13px 13px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>{content}</p>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <AiAvatar />
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "3px 13px 13px 13px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--text-muted)",
              animation: `typing 1.2s infinite ${delay}s`,
              display: "inline-block",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AiAvatar() {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        background: "var(--violet-bg)",
        border: "1px solid var(--violet-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--violet)">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    </div>
  );
}
