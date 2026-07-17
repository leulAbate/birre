import type { FilingStatus, PayFrequency } from "@/lib/types";

// 2025 IRS marginal federal income tax brackets.
// Source: IRS Rev. Proc. 2024-40. Update when 2026 brackets publish.
export const FEDERAL_BRACKETS_2025: Record<FilingStatus, Array<{ rate: number; max: number }>> = {
  single: [
    { rate: 0.10, max: 11925 },
    { rate: 0.12, max: 48475 },
    { rate: 0.22, max: 103350 },
    { rate: 0.24, max: 197300 },
    { rate: 0.32, max: 250525 },
    { rate: 0.35, max: 626350 },
    { rate: 0.37, max: Infinity },
  ],
  mfj: [
    { rate: 0.10, max: 23850 },
    { rate: 0.12, max: 96950 },
    { rate: 0.22, max: 206700 },
    { rate: 0.24, max: 394600 },
    { rate: 0.32, max: 501050 },
    { rate: 0.35, max: 751600 },
    { rate: 0.37, max: Infinity },
  ],
  hoh: [
    { rate: 0.10, max: 17000 },
    { rate: 0.12, max: 64850 },
    { rate: 0.22, max: 103350 },
    { rate: 0.24, max: 197300 },
    { rate: 0.32, max: 250525 },
    { rate: 0.35, max: 626350 },
    { rate: 0.37, max: Infinity },
  ],
};

export const STANDARD_DEDUCTION_2025: Record<FilingStatus, number> = {
  single: 15000,
  mfj: 30000,
  hoh: 22500,
};

// Approximate state tax (flat rates). Add more states as needed.
// Source: state revenue dept publications, 2025 rates.
const STATE_FLAT_RATES: Record<string, number> = {
  GA: 0.0549,
  NC: 0.0425,
  IL: 0.0495,
  PA: 0.0307,
  TX: 0,
  FL: 0,
  WA: 0,
  NV: 0,
  TN: 0,
  WY: 0,
  AK: 0,
  SD: 0,
  NH: 0,
};

const SS_WAGE_BASE_2025 = 168600;
const SS_RATE = 0.062;
const MEDICARE_RATE = 0.0145;

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export interface TaxInputs {
  annualSalary: number;
  filingStatus: FilingStatus;
  state: string;
  payFrequency: PayFrequency;
  retirementPct: number;      // 0..100
  retirementType: "roth" | "traditional";
  healthPct: number;          // 0..100, pre-tax
  hsaPerPaycheck: number;
  ficaExempt: boolean;        // e.g., govt or some research roles
}

export interface TaxBreakdown {
  // Per paycheck
  gross: number;
  retirement: number;
  health: number;
  hsa: number;
  federalWithholding: number;
  stateWithholding: number;
  socialSecurity: number;
  medicare: number;
  takeHome: number;
  // Annualized
  annualGross: number;
  annualTakeHome: number;
  // Effective rates
  effectiveFederalRate: number;
  marginalRate: number;
}

export function computeTakeHome(inputs: TaxInputs): TaxBreakdown {
  const annualGross = inputs.annualSalary;
  const periods = PERIODS_PER_YEAR[inputs.payFrequency];
  const grossPerPaycheck = annualGross / periods;

  const annualRetirement = annualGross * (inputs.retirementPct / 100);
  const retirementPerPaycheck = annualRetirement / periods;
  const annualHealth = annualGross * (inputs.healthPct / 100);
  const healthPerPaycheck = annualHealth / periods;
  const annualHsa = inputs.hsaPerPaycheck * periods;

  // Traditional 401(k) is pre-tax; Roth is post-tax.
  const preTaxRetirement = inputs.retirementType === "traditional" ? annualRetirement : 0;
  const taxableIncome = Math.max(
    0,
    annualGross - preTaxRetirement - annualHealth - annualHsa - STANDARD_DEDUCTION_2025[inputs.filingStatus]
  );

  const { tax: federalTax, marginalRate } = applyBrackets(
    taxableIncome,
    FEDERAL_BRACKETS_2025[inputs.filingStatus]
  );
  const federalPerPaycheck = federalTax / periods;

  const stateRate = STATE_FLAT_RATES[inputs.state.toUpperCase()] ?? 0.05; // 5% default for unknown states
  const stateTax = taxableIncome * stateRate;
  const statePerPaycheck = stateTax / periods;

  // FICA is on gross minus pre-tax health & HSA; Roth contributions still subject.
  const ficaBase = annualGross - annualHealth - annualHsa;
  const ssTax = inputs.ficaExempt ? 0 : Math.min(ficaBase, SS_WAGE_BASE_2025) * SS_RATE;
  const medicareTax = inputs.ficaExempt ? 0 : ficaBase * MEDICARE_RATE;
  const ssPerPaycheck = ssTax / periods;
  const medicarePerPaycheck = medicareTax / periods;

  const takeHome =
    grossPerPaycheck -
    retirementPerPaycheck -
    healthPerPaycheck -
    inputs.hsaPerPaycheck -
    federalPerPaycheck -
    statePerPaycheck -
    ssPerPaycheck -
    medicarePerPaycheck;

  const annualTakeHome = takeHome * periods;
  const effectiveFederalRate = annualGross > 0 ? federalTax / annualGross : 0;

  return {
    gross: grossPerPaycheck,
    retirement: retirementPerPaycheck,
    health: healthPerPaycheck,
    hsa: inputs.hsaPerPaycheck,
    federalWithholding: federalPerPaycheck,
    stateWithholding: statePerPaycheck,
    socialSecurity: ssPerPaycheck,
    medicare: medicarePerPaycheck,
    takeHome,
    annualGross,
    annualTakeHome,
    effectiveFederalRate,
    marginalRate,
  };
}

function applyBrackets(
  taxable: number,
  brackets: Array<{ rate: number; max: number }>
): { tax: number; marginalRate: number } {
  let tax = 0;
  let lastMax = 0;
  let marginalRate = brackets[0].rate;

  for (const b of brackets) {
    if (taxable > lastMax) {
      const amountInBracket = Math.min(taxable, b.max) - lastMax;
      tax += amountInBracket * b.rate;
      marginalRate = b.rate;
    }
    if (taxable <= b.max) break;
    lastMax = b.max;
  }
  return { tax, marginalRate };
}
