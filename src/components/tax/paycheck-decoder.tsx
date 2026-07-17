"use client";

import type { Paystub, PayFrequency } from "@/lib/types";
import { totalsFor } from "@/lib/calculations/paystubs";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  paystub: Paystub | null;
  frequency: PayFrequency;
  onEdit: (p: Paystub) => void;
  onAdd: () => void;
}

const FREQ_LABEL: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  semimonthly: "Semi-monthly",
  monthly: "Monthly",
};

export function PaycheckDecoder({ paystub, frequency, onEdit, onAdd }: Props) {
  if (!paystub) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="section-label mb-2">Paycheck Decoder</p>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Upload your first paystub PDF to auto-fill the details. This becomes your template — the app reuses it every {FREQ_LABEL[frequency].toLowerCase()} pay period. Upload a new one whenever the numbers change.
        </p>
        <button onClick={onAdd} className="btn-primary">
          Add your first paystub
        </button>
      </div>
    );
  }

  const t = totalsFor(paystub);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">Active Paystub Template</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Applied to every {FREQ_LABEL[frequency].toLowerCase()} period since {fmtDate(paystub.pay_date)}
          </p>
        </div>
        <button
          onClick={() => onEdit(paystub)}
          className="text-xs font-medium"
          style={{ color: "var(--accent)" }}
        >
          Edit
        </button>
      </div>

      {/* Header strip */}
      <div
        className="flex justify-between items-start pb-4 mb-1"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          {paystub.employer && (
            <p style={{ fontSize: 15, fontWeight: 700 }}>{paystub.employer}</p>
          )}
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {paystub.period_start && paystub.period_end ? (
              <>Period: {fmtDate(paystub.period_start)}–{fmtDate(paystub.period_end)} · </>
            ) : null}
            Pay Date: {fmtDate(paystub.pay_date)}
          </p>
        </div>
        {paystub.hours !== null && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Hours</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{Number(paystub.hours).toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Earnings */}
      <Section title="Earnings">
        {paystub.regular_pay > 0 && (
          <Line label="Regular Pay" value={`+${fmtCurrency(Number(paystub.regular_pay), { decimals: true })}`} />
        )}
        {paystub.bonus > 0 && (
          <Line label="Bonus" value={`+${fmtCurrency(Number(paystub.bonus), { decimals: true })}`} />
        )}
      </Section>

      {/* Pre-Tax */}
      {hasAny(paystub, ["medical", "dental", "vision", "hsa", "fsa", "retirement_pretax", "other_pretax"]) && (
        <Section title="Pre-Tax Deductions">
          {paystub.medical > 0 && <Line label="Medical Insurance" value={fmt(-paystub.medical)} muted />}
          {paystub.dental > 0 && <Line label="Dental Insurance" value={fmt(-paystub.dental)} muted />}
          {paystub.vision > 0 && <Line label="Vision Insurance" value={fmt(-paystub.vision)} muted />}
          {paystub.hsa > 0 && <Line label="HSA Contribution" value={fmt(-paystub.hsa)} muted />}
          {paystub.fsa > 0 && <Line label="FSA Contribution" value={fmt(-paystub.fsa)} muted />}
          {paystub.retirement_pretax > 0 && (
            <Line label="Traditional 401(k)" badge="pre-tax" value={fmt(-paystub.retirement_pretax)} muted />
          )}
          {paystub.other_pretax > 0 && (
            <Line label="Other Pre-Tax" value={fmt(-paystub.other_pretax)} muted />
          )}
        </Section>
      )}

      {/* Taxable wages sub */}
      <div
        className="flex justify-between mt-3 py-2 px-3 rounded-lg"
        style={{ background: "var(--progress-bg)", border: "1px solid var(--border)" }}
      >
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
          Taxable Wages
        </span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          <G>{fmtCurrency(t.taxableWages, { decimals: true })}</G>
        </span>
      </div>

      {/* Taxes withheld */}
      <Section title="Taxes Withheld">
        {paystub.federal_withheld > 0 && (
          <Line label="Federal Income Tax" value={fmt(-paystub.federal_withheld)} muted />
        )}
        {paystub.state_withheld > 0 && (
          <Line label="State Income Tax" value={fmt(-paystub.state_withheld)} muted />
        )}
        {paystub.social_security === 0 && paystub.medicare === 0 ? (
          <Line label="Social Security / Medicare" value="Exempt" tag />
        ) : (
          <>
            {paystub.social_security > 0 && (
              <Line label="Social Security" value={fmt(-paystub.social_security)} muted />
            )}
            {paystub.medicare > 0 && (
              <Line label="Medicare" value={fmt(-paystub.medicare)} muted />
            )}
          </>
        )}
      </Section>

      {/* After-tax */}
      {(paystub.retirement_aftertax > 0 || paystub.other_aftertax > 0) && (
        <Section title="After-Tax Deductions">
          {paystub.retirement_aftertax > 0 && (
            <Line label="Roth 401(k)" badge="after-tax" value={fmt(-paystub.retirement_aftertax)} muted />
          )}
          {paystub.other_aftertax > 0 && (
            <Line label="Other After-Tax" value={fmt(-paystub.other_aftertax)} muted />
          )}
        </Section>
      )}

      {/* Net pay */}
      <div
        className="flex justify-between items-center pt-4 mt-3"
        style={{ borderTop: "2px solid var(--border)" }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>Net Pay (Take-Home)</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>
          <G>{fmtCurrency(t.netPay, { decimals: true })}</G>
        </span>
      </div>
    </div>
  );
}

function hasAny<K extends keyof Paystub>(p: Paystub, keys: K[]): boolean {
  return keys.some((k) => Number(p[k]) > 0);
}

function fmt(n: number): string {
  return (n < 0 ? "−" : "") + fmtCurrency(Math.abs(n), { decimals: true });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <p
        className="section-label"
        style={{ marginTop: 14, marginBottom: 4, color: "var(--text-secondary)" }}
      >
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </>
  );
}

function Line({
  label,
  value,
  badge,
  muted,
  tag,
}: {
  label: string;
  value: string;
  badge?: string;
  muted?: boolean;
  tag?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
        {label}
        {badge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 6,
              background: "var(--violet-bg)",
              color: "var(--violet)",
              border: "1px solid var(--violet-border)",
              marginLeft: 8,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: tag ? 12 : 13,
          fontWeight: 600,
          color: tag ? "var(--text-muted)" : muted ? "var(--text-secondary)" : "var(--text-primary)",
        }}
      >
        {tag ? value : <G>{value}</G>}
      </span>
    </div>
  );
}
