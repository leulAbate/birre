import type { Paystub, PayFrequency } from "@/lib/types";

// ──────────────────────────────────────────────────────────────
// Per-paystub totals (single template)
// ──────────────────────────────────────────────────────────────

export interface PaystubTotals {
  gross: number;
  preTaxDeductions: number;     // medical+dental+vision+hsa+fsa+other_pretax (no retirement)
  retirementPretax: number;
  taxableWages: number;         // gross - preTaxDeductions - retirementPretax
  federalWithheld: number;
  stateWithheld: number;
  socialSecurity: number;
  medicare: number;
  fica: number;                 // SS + Medicare
  retirementAftertax: number;
  otherAftertax: number;
  netPay: number;
}

export function totalsFor(paystub: Paystub): PaystubTotals {
  const gross = Number(paystub.regular_pay) + Number(paystub.bonus);
  const preTax =
    Number(paystub.medical) +
    Number(paystub.dental) +
    Number(paystub.vision) +
    Number(paystub.hsa) +
    Number(paystub.fsa) +
    Number(paystub.other_pretax);
  const retPre = Number(paystub.retirement_pretax);
  const taxable = Math.max(0, gross - preTax - retPre);
  const fed = Number(paystub.federal_withheld);
  const state = Number(paystub.state_withheld);
  const ss = Number(paystub.social_security);
  const med = Number(paystub.medicare);
  const retPost = Number(paystub.retirement_aftertax);
  const otherPost = Number(paystub.other_aftertax);
  const netPay = gross - preTax - retPre - fed - state - ss - med - retPost - otherPost;

  return {
    gross,
    preTaxDeductions: preTax,
    retirementPretax: retPre,
    taxableWages: taxable,
    federalWithheld: fed,
    stateWithheld: state,
    socialSecurity: ss,
    medicare: med,
    fica: ss + med,
    retirementAftertax: retPost,
    otherAftertax: otherPost,
    netPay,
  };
}

// ──────────────────────────────────────────────────────────────
// Template projection — the tax page's core calc
//
// Semantics: each paystub is a *template* effective from its pay_date.
// For any given pay period this year, the active template is the most
// recent paystub with pay_date <= that period's date (falling back to
// the earliest paystub for periods before any template was created).
// ──────────────────────────────────────────────────────────────

export function periodsPerYear(freq: PayFrequency): number {
  switch (freq) {
    case "weekly": return 52;
    case "biweekly": return 26;
    case "semimonthly": return 24;
    case "monthly": return 12;
  }
}

export interface YtdProjection {
  ytd: PaystubTotals;
  periodsCompleted: number;
  periodsPerYear: number;
  periodsRemaining: number;
  activeTemplate: Paystub;        // most recent template — used for remaining-period math
  activePeriodTotals: PaystubTotals;
  // Full-year projection: YTD + activeTemplate × remaining periods
  annual: PaystubTotals;
}

export interface PayPeriodEntry {
  date: string;       // ISO YYYY-MM-DD
  template: Paystub;  // template active on that date
}

/**
 * Walk the year's pay periods from Jan 1 up to asOfDate. For each
 * period, resolve which template was active and return it. Used by
 * both projectYTD (aggregate totals) and the paycheck-transaction
 * sync (create one income row per period).
 */
export function walkPayPeriods(
  paystubs: Paystub[],
  frequency: PayFrequency,
  asOfDate: Date = new Date(),
): PayPeriodEntry[] {
  if (paystubs.length === 0) return [];
  const sorted = [...paystubs].sort((a, b) => a.pay_date.localeCompare(b.pay_date));
  const year = asOfDate.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const totalPeriods = periodsPerYear(frequency);
  const daysPerPeriod = 365 / totalPeriods;
  const oneDayMs = 86_400_000;
  const entries: PayPeriodEntry[] = [];

  for (let n = 1; n <= totalPeriods; n++) {
    const periodMs = yearStart.getTime() + Math.round((n - 1) * daysPerPeriod) * oneDayMs;
    const periodDate = new Date(periodMs);
    if (periodDate > asOfDate) break;
    entries.push({ date: toIso(periodDate), template: activeAt(sorted, toIso(periodDate)) });
  }
  return entries;
}

/**
 * Walk pay periods from Jan 1 of asOfDate's year up to today, applying
 * the effective template at each period. Returns null if there are no
 * paystubs yet.
 */
export function projectYTD(
  paystubs: Paystub[],
  frequency: PayFrequency,
  asOfDate: Date = new Date(),
): YtdProjection | null {
  if (paystubs.length === 0) return null;

  const entries = walkPayPeriods(paystubs, frequency, asOfDate);
  let ytd = zeroTotals();
  for (const e of entries) ytd = addTotals(ytd, totalsFor(e.template));

  const totalPeriods = periodsPerYear(frequency);
  const periodsCompleted = entries.length;
  const sorted = [...paystubs].sort((a, b) => a.pay_date.localeCompare(b.pay_date));
  const activeTemplate = sorted[sorted.length - 1];
  const activePeriodTotals = totalsFor(activeTemplate);
  const periodsRemaining = Math.max(0, totalPeriods - periodsCompleted);
  const annual: PaystubTotals = {
    gross: ytd.gross + activePeriodTotals.gross * periodsRemaining,
    preTaxDeductions: ytd.preTaxDeductions + activePeriodTotals.preTaxDeductions * periodsRemaining,
    retirementPretax: ytd.retirementPretax + activePeriodTotals.retirementPretax * periodsRemaining,
    taxableWages: ytd.taxableWages + activePeriodTotals.taxableWages * periodsRemaining,
    federalWithheld: ytd.federalWithheld + activePeriodTotals.federalWithheld * periodsRemaining,
    stateWithheld: ytd.stateWithheld + activePeriodTotals.stateWithheld * periodsRemaining,
    socialSecurity: ytd.socialSecurity + activePeriodTotals.socialSecurity * periodsRemaining,
    medicare: ytd.medicare + activePeriodTotals.medicare * periodsRemaining,
    fica: ytd.fica + activePeriodTotals.fica * periodsRemaining,
    retirementAftertax: ytd.retirementAftertax + activePeriodTotals.retirementAftertax * periodsRemaining,
    otherAftertax: ytd.otherAftertax + activePeriodTotals.otherAftertax * periodsRemaining,
    netPay: ytd.netPay + activePeriodTotals.netPay * periodsRemaining,
  };

  return {
    ytd,
    periodsCompleted,
    periodsPerYear: totalPeriods,
    periodsRemaining,
    activeTemplate,
    activePeriodTotals,
    annual,
  };
}

function activeAt(sortedAsc: Paystub[], periodIso: string): Paystub {
  // Find latest paystub with pay_date <= periodIso. If none (period is
  // before the earliest template), fall back to earliest — this models
  // "assume the earliest template applied retroactively" for YTD.
  let active = sortedAsc[0];
  for (const p of sortedAsc) {
    if (p.pay_date <= periodIso) active = p;
    else break;
  }
  return active;
}

function zeroTotals(): PaystubTotals {
  return {
    gross: 0, preTaxDeductions: 0, retirementPretax: 0, taxableWages: 0,
    federalWithheld: 0, stateWithheld: 0, socialSecurity: 0, medicare: 0,
    fica: 0, retirementAftertax: 0, otherAftertax: 0, netPay: 0,
  };
}

function addTotals(a: PaystubTotals, b: PaystubTotals): PaystubTotals {
  return {
    gross: a.gross + b.gross,
    preTaxDeductions: a.preTaxDeductions + b.preTaxDeductions,
    retirementPretax: a.retirementPretax + b.retirementPretax,
    taxableWages: a.taxableWages + b.taxableWages,
    federalWithheld: a.federalWithheld + b.federalWithheld,
    stateWithheld: a.stateWithheld + b.stateWithheld,
    socialSecurity: a.socialSecurity + b.socialSecurity,
    medicare: a.medicare + b.medicare,
    fica: a.fica + b.fica,
    retirementAftertax: a.retirementAftertax + b.retirementAftertax,
    otherAftertax: a.otherAftertax + b.otherAftertax,
    netPay: a.netPay + b.netPay,
  };
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
