"use client";

import type { FilingStatus } from "@/lib/types";
import type { YtdProjection } from "@/lib/calculations/paystubs";
import { FEDERAL_BRACKETS_2025, STANDARD_DEDUCTION_2025 } from "@/lib/calculations/tax";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  projection: YtdProjection | null;
  filingStatus: FilingStatus;
}

export function YtdSummary({ projection, filingStatus }: Props) {
  if (!projection) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="section-label mb-2">Year-to-Date Summary</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Add a paystub to see YTD totals and projected refund / owed.
        </p>
      </div>
    );
  }

  const { ytd, periodsCompleted, periodsPerYear, annual, activeTemplate } = projection;

  const projectedTaxable = Math.max(0, annual.gross - annual.preTaxDeductions - annual.retirementPretax - STANDARD_DEDUCTION_2025[filingStatus]);
  const projectedFederalLiability = applyBrackets(projectedTaxable, filingStatus);
  const refundOrOwed = annual.federalWithheld - projectedFederalLiability;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="section-label">Year-to-Date Summary</p>
        <span
          style={{
            fontSize: 10,
            padding: "2px 9px",
            borderRadius: 99,
            background: "var(--ok-bg)",
            border: "1px solid var(--ok-border)",
            color: "var(--accent)",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {periodsCompleted} / {periodsPerYear} periods
        </span>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
        Projected from your active template ({activeTemplate.pay_date})
      </p>

      <Row label="Gross Earnings" value={fmtCurrency(ytd.gross)} />
      {ytd.preTaxDeductions > 0 && (
        <Row label="Pre-Tax Deductions" sub="Medical · Dental · HSA · FSA · etc." value={`−${fmtCurrency(ytd.preTaxDeductions)}`} color="var(--accent)" />
      )}
      {ytd.retirementPretax > 0 && (
        <Row label="Traditional 401(k)" sub="Pre-tax · reduces taxable income" value={`−${fmtCurrency(ytd.retirementPretax)}`} color="var(--accent)" />
      )}
      {ytd.retirementAftertax > 0 && (
        <Row label="Roth 401(k)" sub="After-tax · does not reduce taxable income" value={`−${fmtCurrency(ytd.retirementAftertax)}`} color="var(--text-secondary)" />
      )}
      <Row label="Federal Tax Withheld" value={`−${fmtCurrency(ytd.federalWithheld)}`} color="var(--over)" />
      <Row label="State Tax Withheld" value={`−${fmtCurrency(ytd.stateWithheld)}`} color="var(--over)" />
      {ytd.fica > 0 ? (
        <Row label="Social Security / Medicare" value={`−${fmtCurrency(ytd.fica)}`} color="var(--over)" />
      ) : (
        <Row label="Social Security / Medicare" value="Exempt" tag />
      )}

      <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0" }} />

      <Row
        label="Est. Annual Federal Liability"
        sub={`2025 brackets · projected taxable $${Math.round(projectedTaxable).toLocaleString()}`}
        value={fmtCurrency(projectedFederalLiability)}
        bold
      />
      <Row
        label="Projected Withholding"
        sub={`Full ${periodsPerYear} periods at current template`}
        value={fmtCurrency(annual.federalWithheld)}
        bold
      />
      <RefundRow refundOrOwed={refundOrOwed} />

      {Math.abs(refundOrOwed) > 1000 && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--ok-bg)",
            border: "1px solid var(--ok-border)",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--accent)" }}>
            {refundOrOwed > 0
              ? `Over-withholding by ~${fmtCurrency(refundOrOwed)}. That's an interest-free loan to the IRS. Use the AI assistant to get a W-4 adjustment walkthrough.`
              : `You may owe ~${fmtCurrency(-refundOrOwed)} at filing. Consider increasing withholding via a new W-4.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  sub,
  value,
  color,
  bold,
  tag,
}: {
  label: string;
  sub?: string;
  value: string;
  color?: string;
  bold?: boolean;
  tag?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between"
      style={{
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: "var(--text-primary)" }}>
          {label}
        </p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sub}</p>}
      </div>
      {tag ? (
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{value}</span>
      ) : (
        <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: color ?? "var(--text-primary)" }}>
          <G>{value}</G>
        </span>
      )}
    </div>
  );
}

function RefundRow({ refundOrOwed }: { refundOrOwed: number }) {
  const isRefund = refundOrOwed >= 0;
  return (
    <div
      className="flex items-start justify-between"
      style={{ padding: "8px 0" }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Est. Balance at Filing
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
          Withholding minus liability
        </p>
      </div>
      <span
        style={{
          padding: "4px 11px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          background: isRefund ? "var(--ok-bg)" : "var(--over-bg)",
          color: isRefund ? "var(--accent)" : "var(--over)",
          border: `1px solid ${isRefund ? "var(--ok-border)" : "var(--over-border)"}`,
        }}
      >
        <G>{`~${fmtCurrency(Math.abs(refundOrOwed))} ${isRefund ? "refund" : "owed"}`}</G>
      </span>
    </div>
  );
}

function applyBrackets(taxable: number, filing: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS_2025[filing];
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
