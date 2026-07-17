"use client";

import { useState, useTransition } from "react";
import type { Account, TxType } from "@/lib/types";
import { ALL_CATEGORIES } from "@/lib/types";
import { autoCategorize } from "@/lib/calculations/categorize";
import { addTransactionsBulk, type TransactionInput } from "@/server/actions/transactions";

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

interface ParsedRow {
  date: string;
  description: string;
  amount: string;
  category: string;
  type: TxType;
}

export function CsvImportModal({ open, onClose, accounts }: Props) {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  function handleClose() {
    setRows([]);
    setAccountId("");
    setError(null);
    setStep("upload");
    onClose();
  }

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("Couldn't parse any rows. Expected columns: date, description, amount [, category, type]");
        return;
      }
      setRows(parsed);
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    }
  }

  function update(idx: number, field: keyof ParsedRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleImport() {
    setError(null);
    const valid: TransactionInput[] = [];
    for (const r of rows) {
      const amt = parseFloat(r.amount);
      if (!r.description.trim() || !amt || !r.category) continue;
      valid.push({
        date: r.date,
        description: r.description.trim(),
        amount: Math.abs(amt),
        type: r.type,
        category: r.category,
        account_id: accountId || null,
      });
    }
    if (valid.length === 0) {
      setError("No complete rows to import. Each row needs date, description, amount, category.");
      return;
    }
    startTransition(async () => {
      const res = await addTransactionsBulk(valid);
      if (res.error) {
        setError(res.error);
        return;
      }
      handleClose();
    });
  }

  return (
    <div
      className={"modal-overlay" + (open ? " open" : "")}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal-panel" style={{ width: 760, maxWidth: "95vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-label mb-1">CSV Import</p>
            <h2 className="text-xl font-bold page-title" style={{ color: "var(--text-primary)" }}>
              Import Transactions
            </h2>
          </div>
          <button onClick={handleClose} className="btn-ghost" style={{ padding: "6px 10px" }}>✕</button>
        </div>

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg mb-4"
            style={{ background: "var(--over-bg)", color: "var(--over)", border: "1px solid var(--over-border)" }}
          >
            {error}
          </div>
        )}

        {step === "upload" ? (
          <>
            <div
              style={{
                border: "2px dashed var(--border)",
                borderRadius: 16,
                padding: "32px 20px",
                textAlign: "center",
                background: "var(--progress-bg)",
              }}
            >
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                Drop a CSV file here, or
              </p>
              <label className="btn-primary" style={{ display: "inline-block", cursor: "pointer" }}>
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
              Expected columns (in any order):{" "}
              <code style={{ fontFamily: "monospace", color: "var(--accent)" }}>
                date, description, amount
              </code>
              . Optional: <code style={{ fontFamily: "monospace" }}>category, type, note</code>.
              Negative amounts are treated as expenses unless the type column says otherwise.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <label className="modal-label" style={{ marginBottom: 0 }}>
                Import to account:
              </label>
              <select className="modal-select" value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ flex: 1 }}>
                <option value="">None / mixed</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {rows.length} row{rows.length === 1 ? "" : "s"} found. Review and edit before importing.
            </p>

            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th>Amount</Th>
                    <Th>Category</Th>
                    <Th>Type</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <Td><CompactInput type="date" value={row.date} onChange={(v) => update(i, "date", v)} /></Td>
                      <Td><CompactInput type="text" value={row.description} onChange={(v) => update(i, "description", v)} /></Td>
                      <Td><CompactInput type="number" value={row.amount} onChange={(v) => update(i, "amount", v)} /></Td>
                      <Td>
                        <CompactSelect value={row.category} onChange={(v) => update(i, "category", v)}>
                          <option value="">…</option>
                          {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </CompactSelect>
                      </Td>
                      <Td>
                        <CompactSelect value={row.type} onChange={(v) => update(i, "type", v as TxType)}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="transfer">Transfer</option>
                        </CompactSelect>
                      </Td>
                      <Td>
                        <button
                          onClick={() => removeRow(i)}
                          style={{
                            width: 24, height: 24, borderRadius: 6, border: "none",
                            background: "transparent", color: "var(--text-muted)", cursor: "pointer",
                          }}
                          title="Skip row"
                        >
                          ✕
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr className="modal-divider" />

            <div className="flex gap-3">
              <button onClick={() => setStep("upload")} className="btn-ghost flex-1">Back</button>
              <button onClick={handleImport} disabled={pending} className="btn-primary flex-1">
                {pending ? "Importing…" : `Import ${rows.length} transaction${rows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CSV parsing
// ──────────────────────────────────────────────────────────────
function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());

  const idx = {
    date: findCol(headers, ["date", "transaction date", "posted date"]),
    description: findCol(headers, ["description", "merchant", "name", "memo", "details"]),
    amount: findCol(headers, ["amount", "value", "debit", "credit"]),
    category: findCol(headers, ["category"]),
    type: findCol(headers, ["type", "transaction type"]),
  };

  if (idx.date === -1 || idx.description === -1 || idx.amount === -1) {
    throw new Error(
      "CSV must have columns named date, description, and amount (case-insensitive)."
    );
  }

  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const rawAmount = parseFloat((cells[idx.amount] ?? "").replace(/[^0-9.\-]/g, ""));
    const isNeg = rawAmount < 0;
    const amount = Math.abs(rawAmount);
    const description = cells[idx.description] ?? "";
    const csvCategory = idx.category >= 0 ? cells[idx.category] : "";
    const csvType = idx.type >= 0 ? cells[idx.type]?.toLowerCase() : "";
    const type: TxType =
      csvType === "income" || csvType === "credit" ? "income" :
      csvType === "transfer" ? "transfer" :
      isNeg ? "expense" : "expense";
    const category =
      csvCategory && ALL_CATEGORIES.includes(csvCategory)
        ? csvCategory
        : autoCategorize(description) ?? "";

    return {
      date: normalizeDate(cells[idx.date] ?? ""),
      description,
      amount: amount.toFixed(2),
      category,
      type,
    };
  }).filter((r) => r.date && r.description && parseFloat(r.amount) > 0);
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.indexOf(c);
    if (i >= 0) return i;
  }
  return -1;
}

function normalizeDate(raw: string): string {
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // MM/DD/YYYY or M/D/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, mo, d, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Fall back to Date parsing
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

// Reuse table cell helpers from bulk modal
function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--text-muted)",
        padding: "0 8px 8px", textAlign: "left", borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "5px 4px", verticalAlign: "middle" }}>{children}</td>;
}
function CompactInput({ type, value, onChange }: { type: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "7px 10px", borderRadius: 9,
        border: "1px solid var(--border)", background: "var(--progress-bg)",
        color: "var(--text-primary)", fontSize: 13, outline: "none",
      }}
    />
  );
}
function CompactSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "7px 10px", borderRadius: 9,
        border: "1px solid var(--border)", background: "var(--progress-bg)",
        color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}
