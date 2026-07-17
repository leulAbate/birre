"use client";

import { useState, useTransition } from "react";
import type { FilingStatus, PayFrequency, Profile, RetirementType } from "@/lib/types";
import { computeTakeHome } from "@/lib/calculations/tax";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { updateTaxProfile } from "@/server/actions/profile";

interface Props {
  profile: Profile | null;
}

export function TakeHomeCalculator({ profile }: Props) {
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);

  const [annualSalary, setAnnualSalary] = useState(profile?.annual_salary?.toString() ?? "");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(profile?.filing_status ?? "single");
  const [state, setState] = useState(profile?.state ?? "GA");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>(profile?.pay_frequency ?? "biweekly");
  const [retirementPct, setRetirementPct] = useState(profile?.retirement_pct?.toString() ?? "0");
  const [retirementType, setRetirementType] = useState<RetirementType>(profile?.retirement_type ?? "roth");
  const [healthPct, setHealthPct] = useState(profile?.health_pct?.toString() ?? "0");
  const [hsaPerPaycheck, setHsaPerPaycheck] = useState(profile?.hsa_per_paycheck?.toString() ?? "0");
  const [ficaExempt, setFicaExempt] = useState(profile?.fica_exempt ?? false);

  const salaryNum = parseFloat(annualSalary) || 0;
  const breakdown =
    salaryNum > 0
      ? computeTakeHome({
          annualSalary: salaryNum,
          filingStatus,
          state,
          payFrequency,
          retirementPct: parseFloat(retirementPct) || 0,
          retirementType,
          healthPct: parseFloat(healthPct) || 0,
          hsaPerPaycheck: parseFloat(hsaPerPaycheck) || 0,
          ficaExempt,
        })
      : null;

  function handleSave() {
    startTransition(async () => {
      const res = await updateTaxProfile({
        annual_salary: salaryNum || null,
        filing_status: filingStatus,
        state,
        pay_frequency: payFrequency,
        retirement_pct: parseFloat(retirementPct) || 0,
        retirement_type: retirementType,
        health_pct: parseFloat(healthPct) || 0,
        hsa_per_paycheck: parseFloat(hsaPerPaycheck) || 0,
        fica_exempt: ficaExempt,
      });
      if (!res.error) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
      }
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="section-label">Take-Home Calculator</p>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, marginBottom: 16 }}>
        What-if: raise, new job, different state — uses real 2025 federal brackets
      </p>

      <div className="space-y-3">
        <Field label="Annual Salary ($)">
          <input
            type="number"
            value={annualSalary}
            onChange={(e) => setAnnualSalary(e.target.value)}
            placeholder="e.g. 87380"
            className="modal-input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Filing Status">
            <select className="modal-select" value={filingStatus} onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}>
              <option value="single">Single</option>
              <option value="mfj">Married Filing Jointly</option>
              <option value="hoh">Head of Household</option>
            </select>
          </Field>
          <Field label="State">
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              placeholder="GA"
              maxLength={2}
              className="modal-input"
            />
          </Field>
        </div>

        <Field label="Pay Frequency">
          <select className="modal-select" value={payFrequency} onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}>
            <option value="weekly">Weekly (52/yr)</option>
            <option value="biweekly">Biweekly (26/yr)</option>
            <option value="semimonthly">Semimonthly (24/yr)</option>
            <option value="monthly">Monthly (12/yr)</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Retirement %">
            <input
              type="number"
              step="0.1"
              value={retirementPct}
              onChange={(e) => setRetirementPct(e.target.value)}
              className="modal-input"
            />
          </Field>
          <Field label="Type">
            <select className="modal-select" value={retirementType} onChange={(e) => setRetirementType(e.target.value as RetirementType)}>
              <option value="roth">Roth (after-tax)</option>
              <option value="traditional">Traditional (pre-tax)</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Health %">
            <input
              type="number"
              step="0.1"
              value={healthPct}
              onChange={(e) => setHealthPct(e.target.value)}
              className="modal-input"
            />
          </Field>
          <Field label="HSA / Paycheck ($)">
            <input
              type="number"
              step="0.01"
              value={hsaPerPaycheck}
              onChange={(e) => setHsaPerPaycheck(e.target.value)}
              className="modal-input"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ficaExempt}
            onChange={(e) => setFicaExempt(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            FICA exempt (e.g. F-1, J-1 visa)
          </span>
        </label>

        <button onClick={handleSave} disabled={pending} className="btn-primary w-full">
          {pending ? "Saving…" : savedFlash ? "Saved ✓" : "Save Profile"}
        </button>
      </div>

      {breakdown && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 16 }}>
          <p className="section-label mb-2">Estimated Per-Paycheck</p>
          <Row label="Gross" value={fmtCurrency(breakdown.gross, { decimals: true })} />
          <Row label={retirementType === "roth" ? "Roth 401(k)" : "Traditional 401(k)"} value={`−${fmtCurrency(breakdown.retirement, { decimals: true })}`} muted />
          <Row label="Health" value={`−${fmtCurrency(breakdown.health, { decimals: true })}`} muted />
          <Row label="HSA" value={`−${fmtCurrency(breakdown.hsa, { decimals: true })}`} muted />
          <Row label="Federal" value={`−${fmtCurrency(breakdown.federalWithholding, { decimals: true })}`} muted />
          <Row label={`State (${state})`} value={`−${fmtCurrency(breakdown.stateWithholding, { decimals: true })}`} muted />
          {!ficaExempt && (
            <Row label="SS / Medicare" value={`−${fmtCurrency(breakdown.socialSecurity + breakdown.medicare, { decimals: true })}`} muted />
          )}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
            <Row label="Take Home" value={fmtCurrency(breakdown.takeHome, { decimals: true })} bold accent />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Annualized: <G>{fmtCurrency(breakdown.annualTakeHome)}</G> · Effective federal{" "}
            {(breakdown.effectiveFederalRate * 100).toFixed(1)}% · Marginal{" "}
            {(breakdown.marginalRate * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="modal-label">{label}</label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span style={{ fontSize: 13, color: muted ? "var(--text-secondary)" : "var(--text-primary)", fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: bold ? 700 : 600,
          color: accent ? "var(--accent)" : muted ? "var(--text-secondary)" : "var(--text-primary)",
        }}
        className={bold ? "accent-num" : ""}
      >
        <G>{value}</G>
      </span>
    </div>
  );
}
