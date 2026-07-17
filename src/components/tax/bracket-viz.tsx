"use client";

import type { FilingStatus } from "@/lib/types";
import { FEDERAL_BRACKETS_2025, STANDARD_DEDUCTION_2025 } from "@/lib/calculations/tax";
import { fmtCurrency } from "@/lib/utils";

interface Props {
  filingStatus: FilingStatus;
  taxableYtd: number;
  year: number;
}

export function BracketViz({ filingStatus, taxableYtd, year }: Props) {
  const brackets = FEDERAL_BRACKETS_2025[filingStatus];
  const stdDeduction = STANDARD_DEDUCTION_2025[filingStatus];

  // Project the taxable income for the full year if user has YTD data
  // (otherwise show brackets with no highlight)
  const projectedTaxable = taxableYtd > 0 ? taxableYtd * (12 / Math.max(1, monthsCompleted())) : 0;

  // Marginal rate based on projected taxable
  let marginalRate = brackets[0].rate;
  for (const b of brackets) {
    if (projectedTaxable > 0 && projectedTaxable > (brackets[brackets.indexOf(b) - 1]?.max ?? 0)) {
      marginalRate = b.rate;
    }
  }

  // Effective rate
  const totalTax = applyBrackets(projectedTaxable, brackets);
  const effectiveRate = projectedTaxable > 0 ? totalTax / projectedTaxable : 0;

  const filingLabel =
    filingStatus === "mfj" ? "Married Filing Jointly" :
    filingStatus === "hoh" ? "Head of Household" : "Single";

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="section-label">Federal Tax Brackets</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
            2025 · {filingLabel}
            {projectedTaxable > 0 && (
              <> · Projected taxable income {fmtCurrency(projectedTaxable)} (gross − pre-tax − std. deduction {fmtCurrency(stdDeduction)})</>
            )}
          </p>
        </div>
        {projectedTaxable > 0 && (
          <div
            style={{
              padding: "7px 14px",
              borderRadius: 10,
              background: "var(--violet-bg)",
              border: "1px solid var(--violet-border)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Effective Rate
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--violet)" }}>
              {(effectiveRate * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5" style={{ marginBottom: 16 }}>
        {brackets.map((b, i) => {
          const lastMax = i === 0 ? 0 : brackets[i - 1].max;
          const reaches = projectedTaxable > lastMax;
          const current = projectedTaxable > 0 && b.rate === marginalRate && reaches;
          const maxLabel = isFinite(b.max) ? fmtCurrency(b.max) : "+";
          return (
            <div
              key={b.rate}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: current
                  ? "var(--violet-bg)"
                  : reaches
                  ? "var(--accent-bg)"
                  : "var(--progress-bg)",
                border: `1px solid ${
                  current ? "var(--violet-border)" : reaches ? "var(--accent-border)" : "var(--border)"
                }`,
                opacity: reaches ? 1 : 0.5,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: current ? "var(--violet)" : reaches ? "var(--accent)" : "var(--text-muted)",
                  minWidth: 50,
                }}
              >
                {(b.rate * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {fmtCurrency(lastMax)} → {maxLabel}
              </span>
              {current && (
                <span
                  style={{
                    fontSize: 11,
                    marginLeft: "auto",
                    fontWeight: 600,
                    color: "var(--violet)",
                  }}
                >
                  ← Your marginal bracket
                </span>
              )}
            </div>
          );
        })}
      </div>

      {projectedTaxable > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--violet-bg)",
            border: "1px solid var(--violet-border)",
          }}
        >
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            💡 You&apos;re in the{" "}
            <strong style={{ color: "var(--violet)" }}>
              {(marginalRate * 100).toFixed(0)}% marginal bracket
            </strong>{" "}
            — but only the income above the previous bracket hits that rate. The rest falls in
            lower brackets. Total projected federal tax:{" "}
            <strong style={{ color: "var(--violet)" }}>{fmtCurrency(totalTax)}</strong> on{" "}
            {fmtCurrency(projectedTaxable)} taxable ={" "}
            <strong style={{ color: "var(--violet)" }}>{(effectiveRate * 100).toFixed(1)}% effective</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function monthsCompleted(): number {
  const now = new Date();
  return now.getMonth() + 1 + now.getDate() / 30;
}

function applyBrackets(taxable: number, brackets: Array<{ rate: number; max: number }>): number {
  let tax = 0;
  let lastMax = 0;
  for (const b of brackets) {
    if (taxable > lastMax) {
      const amountIn = Math.min(taxable, b.max) - lastMax;
      tax += amountIn * b.rate;
    }
    if (taxable <= b.max) break;
    lastMax = b.max;
  }
  return tax;
}
