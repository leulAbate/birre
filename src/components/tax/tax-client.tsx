"use client";

import { useState } from "react";
import type { Paystub, Profile } from "@/lib/types";
import { projectYTD, totalsFor } from "@/lib/calculations/paystubs";
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
}

export function TaxClient({ profile, paystubs, year }: Props) {
  const [modalState, setModalState] = useState<
    { open: false } | { open: true; editing: Paystub | null }
  >({ open: false });

  const frequency = profile?.pay_frequency ?? "biweekly";
  const projection = projectYTD(paystubs, frequency);
  const activeTemplate = projection?.activeTemplate ?? null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-1">Tax Year {year}</p>
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
