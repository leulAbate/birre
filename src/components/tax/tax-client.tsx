"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Account, Paystub, Profile } from "@/lib/types";
import { projectYTD, totalsFor } from "@/lib/calculations/paystubs";
import { setPaycheckAccount } from "@/server/actions/paystubs";
import { PaycheckDecoder } from "./paycheck-decoder";
import { PaystubModal } from "./paystub-modal";
import { YtdSummary } from "./ytd-summary";
import { BracketViz } from "./bracket-viz";
import { TakeHomeCalculator } from "./take-home-calculator";
import { TemplateHistory } from "./template-history";

interface Props {
  profile: Profile | null;
  paystubs: Paystub[];
  year: number;
  accounts: Account[];
}

export function TaxClient({ profile, paystubs, year, accounts }: Props) {
  const router = useRouter();
  const [modalState, setModalState] = useState<
    { open: false } | { open: true; editing: Paystub | null }
  >({ open: false });
  const [savingAccount, startAccountTransition] = useTransition();

  const frequency = profile?.pay_frequency ?? "biweekly";
  const projection = projectYTD(paystubs, frequency);
  const activeTemplate = projection?.activeTemplate ?? null;
  const depositAccountId = profile?.paycheck_account_id ?? "";
  const depositableAccounts = accounts.filter(
    (a) => a.type !== "credit" && a.type !== "loan",
  );

  function handleDepositAccountChange(id: string) {
    startAccountTransition(async () => {
      await setPaycheckAccount(id || null);
    });
  }

  const currentYear = new Date().getFullYear();
  const canGoForward = year < currentYear;

  function shiftYear(direction: number) {
    router.push(`/tax?year=${year + direction}`);
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <button onClick={() => shiftYear(-1)} className="month-nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <span className="section-label" style={{ padding: "2px 6px" }}>Tax Year {year}</span>
            <button
              onClick={() => canGoForward && shiftYear(1)}
              disabled={!canGoForward}
              className="month-nav-btn"
              style={{ opacity: canGoForward ? 1 : 0.3, cursor: canGoForward ? "pointer" : "not-allowed" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>
          </div>
          <h1 className="text-2xl font-bold page-title">Tax</h1>
        </div>
        <button
          onClick={() => setModalState({ open: true, editing: null })}
          className="btn-primary flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          {paystubs.length === 0 ? "Add Paystub" : "New Paystub Version"}
        </button>
      </div>

      {/* Deposit account picker */}
      <div
        className="glass rounded-2xl px-5 py-3 flex items-center gap-3"
        style={{ flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <p className="section-label mb-0.5">Deposit paychecks to</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Each auto-generated paycheck row credits this account&apos;s balance.
          </p>
        </div>
        <select
          value={depositAccountId}
          onChange={(e) => handleDepositAccountChange(e.target.value)}
          disabled={savingAccount}
          className="modal-select"
          style={{ minWidth: 220 }}
        >
          <option value="">None (don&apos;t credit any account)</option>
          {depositableAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
        {savingAccount && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Saving…</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
        {/* LEFT */}
        <div className="space-y-4">
          <PaycheckDecoder
            paystub={activeTemplate}
            frequency={frequency}
            onEdit={(p) => setModalState({ open: true, editing: p })}
            onAdd={() => setModalState({ open: true, editing: null })}
          />
          <BracketViz
            filingStatus={profile?.filing_status ?? "single"}
            taxableYtd={projection?.ytd.taxableWages ?? 0}
            year={year}
          />
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <YtdSummary
            projection={projection}
            filingStatus={profile?.filing_status ?? "single"}
          />
          <TemplateHistory
            paystubs={paystubs}
            activeId={activeTemplate?.id ?? null}
            onEdit={(p) => setModalState({ open: true, editing: p })}
          />
          <TakeHomeCalculator profile={profile} />
        </div>
      </div>

      <PaystubModal
        open={modalState.open}
        editing={modalState.open ? modalState.editing : null}
        onClose={() => setModalState({ open: false })}
      />
    </div>
  );
}

export { totalsFor };
