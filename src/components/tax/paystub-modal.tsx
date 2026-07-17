"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import type { Paystub } from "@/lib/types";
import { createPaystub, deletePaystub, updatePaystub, type PaystubInput } from "@/server/actions/paystubs";

interface Props {
  open: boolean;
  editing: Paystub | null;
  onClose: () => void;
}

interface FormState {
  pay_date: string;
  period_start: string;
  period_end: string;
  employer: string;
  regular_pay: string;
  bonus: string;
  hours: string;
  medical: string;
  dental: string;
  vision: string;
  hsa: string;
  fsa: string;
  retirement_pretax: string;
  other_pretax: string;
  federal_withheld: string;
  state_withheld: string;
  social_security: string;
  medicare: string;
  retirement_aftertax: string;
  other_aftertax: string;
  note: string;
}

type FormKey = keyof FormState;

// Numeric field keys used both in the extraction schema and the form.
const NUMERIC_KEYS = [
  "regular_pay", "bonus", "hours",
  "medical", "dental", "vision", "hsa", "fsa",
  "retirement_pretax", "other_pretax",
  "federal_withheld", "state_withheld", "social_security", "medicare",
  "retirement_aftertax", "other_aftertax",
] as const;

function blank(): FormState {
  return {
    pay_date: today(),
    period_start: "",
    period_end: "",
    employer: "",
    regular_pay: "",
    bonus: "",
    hours: "",
    medical: "",
    dental: "",
    vision: "",
    hsa: "",
    fsa: "",
    retirement_pretax: "",
    other_pretax: "",
    federal_withheld: "",
    state_withheld: "",
    social_security: "",
    medicare: "",
    retirement_aftertax: "",
    other_aftertax: "",
    note: "",
  };
}

function fromPaystub(p: Paystub): FormState {
  return {
    pay_date: p.pay_date,
    period_start: p.period_start ?? "",
    period_end: p.period_end ?? "",
    employer: p.employer ?? "",
    regular_pay: stringOrEmpty(p.regular_pay),
    bonus: stringOrEmpty(p.bonus),
    hours: p.hours !== null ? String(p.hours) : "",
    medical: stringOrEmpty(p.medical),
    dental: stringOrEmpty(p.dental),
    vision: stringOrEmpty(p.vision),
    hsa: stringOrEmpty(p.hsa),
    fsa: stringOrEmpty(p.fsa),
    retirement_pretax: stringOrEmpty(p.retirement_pretax),
    other_pretax: stringOrEmpty(p.other_pretax),
    federal_withheld: stringOrEmpty(p.federal_withheld),
    state_withheld: stringOrEmpty(p.state_withheld),
    social_security: stringOrEmpty(p.social_security),
    medicare: stringOrEmpty(p.medicare),
    retirement_aftertax: stringOrEmpty(p.retirement_aftertax),
    other_aftertax: stringOrEmpty(p.other_aftertax),
    note: p.note ?? "",
  };
}

function stringOrEmpty(n: number | string): string {
  const num = Number(n);
  return num === 0 ? "" : String(num);
}

interface ExtractResponse {
  fields?: Partial<Record<FormKey, string | number>>;
  missing?: FormKey[];
  error?: string;
}

export function PaystubModal({ open, editing, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(editing ? fromPaystub(editing) : blank());
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [missing, setMissing] = useState<Set<FormKey>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractInfo, setExtractInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setForm(editing ? fromPaystub(editing) : blank());
      setError(null);
      setConfirmDelete(false);
      setMissing(new Set());
      setExtractInfo(null);
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMissing((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    setExtractInfo(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/paystub/extract", { method: "POST", body: fd });
      const data = (await res.json()) as ExtractResponse;
      if (!res.ok || data.error) {
        setError(data.error ?? `Extraction failed (${res.status})`);
        return;
      }

      const fields = data.fields ?? {};
      const missingKeys = new Set<FormKey>(data.missing ?? []);

      setForm((prev) => {
        const next: FormState = { ...prev };
        for (const [key, value] of Object.entries(fields) as [FormKey, string | number][]) {
          if (value === null || value === undefined) continue;
          next[key] = typeof value === "number" ? String(value) : value;
        }
        return next;
      });
      setMissing(missingKeys);
      const filled = Object.keys(fields).length;
      const missCount = missingKeys.size;
      setExtractInfo(
        `Filled ${filled} field${filled === 1 ? "" : "s"} from PDF` +
          (missCount > 0 ? ` · ${missCount} need review` : ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setExtracting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const regular = parseFloat(form.regular_pay) || 0;
    const bonus = parseFloat(form.bonus) || 0;
    if (regular + bonus <= 0) {
      setError("Enter at least a Regular Pay or Bonus amount");
      return;
    }
    if (!form.pay_date) {
      setError("Pay date is required");
      return;
    }

    const payload: PaystubInput = {
      pay_date: form.pay_date,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      employer: form.employer.trim() || null,
      regular_pay: regular,
      bonus: bonus,
      hours: form.hours ? parseFloat(form.hours) : null,
      medical: parseFloat(form.medical) || 0,
      dental: parseFloat(form.dental) || 0,
      vision: parseFloat(form.vision) || 0,
      hsa: parseFloat(form.hsa) || 0,
      fsa: parseFloat(form.fsa) || 0,
      retirement_pretax: parseFloat(form.retirement_pretax) || 0,
      other_pretax: parseFloat(form.other_pretax) || 0,
      federal_withheld: parseFloat(form.federal_withheld) || 0,
      state_withheld: parseFloat(form.state_withheld) || 0,
      social_security: parseFloat(form.social_security) || 0,
      medicare: parseFloat(form.medicare) || 0,
      retirement_aftertax: parseFloat(form.retirement_aftertax) || 0,
      other_aftertax: parseFloat(form.other_aftertax) || 0,
      note: form.note.trim() || null,
    };

    startTransition(async () => {
      const res = editing ? await updatePaystub(editing.id, payload) : await createPaystub(payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    startTransition(async () => {
      await deletePaystub(editing.id);
      onClose();
    });
  }

  function inputClass(key: FormKey): string {
    return missing.has(key) ? "modal-input flag-missing" : "modal-input";
  }

  return (
    <div
      className={"modal-overlay" + (open ? " open" : "")}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-panel"
        style={{ width: 560, maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-label mb-1">{editing ? "Edit" : "Add"} Paystub</p>
            <h2 className="text-xl font-bold page-title" style={{ color: "var(--text-primary)" }}>
              Pay Period Details
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg mb-4"
            style={{ background: "var(--over-bg)", color: "var(--over)", border: "1px solid var(--over-border)" }}
          >
            {error}
          </div>
        )}

        {/* PDF upload — only for new paystubs */}
        {!editing && (
          <div
            className="mb-4 p-3 rounded-lg"
            style={{ background: "var(--violet-bg)", border: "1px solid var(--violet-border)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--violet)" }}>
                  Upload paystub PDF (optional)
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {extracting
                    ? "Reading your paystub…"
                    : extractInfo ?? "Auto-fills the form. You review before saving."}
                </p>
              </div>
              <label className="btn-ghost" style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                {extracting ? "Working…" : "Choose PDF"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFile}
                  disabled={extracting}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Period */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pay Date" flagged={missing.has("pay_date")}>
              <input type="date" className={inputClass("pay_date")} value={form.pay_date} onChange={(e) => set("pay_date", e.target.value)} required />
            </Field>
            <Field label="Period Start" flagged={missing.has("period_start")}>
              <input type="date" className={inputClass("period_start")} value={form.period_start} onChange={(e) => set("period_start", e.target.value)} />
            </Field>
            <Field label="Period End" flagged={missing.has("period_end")}>
              <input type="date" className={inputClass("period_end")} value={form.period_end} onChange={(e) => set("period_end", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="modal-label">
                Employer {missing.has("employer") && <MissingBadge />}
              </label>
              <input type="text" className={inputClass("employer")} placeholder="e.g. Acme Inc." value={form.employer} onChange={(e) => set("employer", e.target.value)} />
            </div>
            <Field label="Hours" flagged={missing.has("hours")}>
              <input type="number" step="0.01" className={inputClass("hours")} value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="80" />
            </Field>
          </div>

          {/* Earnings */}
          <SectionLabel>Earnings</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {numField("Regular Pay ($)", "regular_pay", form, set, missing)}
            {numField("Bonus ($)", "bonus", form, set, missing)}
          </div>

          {/* Pre-Tax Deductions */}
          <SectionLabel>Pre-Tax Deductions</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {numField("Medical", "medical", form, set, missing)}
            {numField("Dental", "dental", form, set, missing)}
            {numField("Vision", "vision", form, set, missing)}
            {numField("HSA", "hsa", form, set, missing)}
            {numField("FSA", "fsa", form, set, missing)}
            {numField("Traditional 401(k)", "retirement_pretax", form, set, missing)}
            {numField("Other Pre-Tax", "other_pretax", form, set, missing)}
          </div>

          {/* Taxes Withheld */}
          <SectionLabel>Taxes Withheld</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {numField("Federal Income", "federal_withheld", form, set, missing)}
            {numField("State Income", "state_withheld", form, set, missing)}
            {numField("Social Security", "social_security", form, set, missing, "0.00 (leave 0 if exempt)")}
            {numField("Medicare", "medicare", form, set, missing, "0.00 (leave 0 if exempt)")}
          </div>

          {/* After-Tax */}
          <SectionLabel>After-Tax Deductions</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {numField("Roth 401(k)", "retirement_aftertax", form, set, missing)}
            {numField("Other After-Tax", "other_aftertax", form, set, missing)}
          </div>

          <Field label="Note (optional)">
            <input type="text" className="modal-input" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Any context for this paystub…" />
          </Field>

          <hr className="modal-divider" />

          <div className="flex gap-3">
            {editing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-ghost"
                style={{
                  color: confirmDelete ? "var(--over)" : "var(--text-secondary)",
                  borderColor: confirmDelete ? "var(--over-border)" : "var(--border)",
                }}
              >
                {confirmDelete ? "Click again to confirm" : "Delete"}
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn-ghost flex-1">
                Cancel
              </button>
            )}
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : editing ? "Save Changes" : "Save Paystub"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Compact helper for a numeric field with missing-flag support.
function numField(
  label: string,
  key: (typeof NUMERIC_KEYS)[number],
  form: FormState,
  set: <K extends FormKey>(k: K, v: FormState[K]) => void,
  missing: Set<FormKey>,
  placeholder = "0.00",
) {
  return (
    <Field label={label} flagged={missing.has(key)}>
      <input
        type="number"
        step="0.01"
        className={missing.has(key) ? "modal-input flag-missing" : "modal-input"}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}

function Field({ label, children, flagged }: { label: string; children: React.ReactNode; flagged?: boolean }) {
  return (
    <div>
      <label className="modal-label">
        {label} {flagged && <MissingBadge />}
      </label>
      {children}
    </div>
  );
}

function MissingBadge() {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 6,
        background: "var(--warn-bg, rgba(250,204,21,0.15))",
        color: "var(--warn, #eab308)",
        border: "1px solid var(--warn-border, rgba(234,179,8,0.35))",
        marginLeft: 6,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      review
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="section-label"
      style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}
    >
      {children}
    </p>
  );
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
