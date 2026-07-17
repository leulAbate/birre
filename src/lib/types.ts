// Mirror of the Supabase schema. Update when the migration changes.

export type Theme = 'light' | 'dark';
export type FilingStatus = 'single' | 'mfj' | 'hoh';
export type RetirementType = 'roth' | 'traditional';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type AccountType = 'checking' | 'savings' | 'credit' | 'brokerage' | 'cash' | 'retirement';
export type GoalStatus = 'active' | 'wishlist' | 'complete' | 'archived';
export type TxType = 'expense' | 'income' | 'transfer';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Profile {
  id: string;
  full_name: string | null;
  theme: Theme;
  filing_status: FilingStatus;
  state: string;
  annual_salary: number | null;
  pay_frequency: PayFrequency;
  retirement_pct: number;
  retirement_type: RetirementType;
  health_pct: number;
  hsa_per_paycheck: number;
  fica_exempt: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  icon: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  goal_id: string | null;
  paystub_id: string | null;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  category: string;
  note: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
}

export interface Recurring {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  frequency: RecurringFrequency;
  next_charge: string | null;
  active: boolean;
  created_at: string;
}

export interface MonthlyNote {
  id: string;
  user_id: string;
  month: string;
  content: string;
  updated_at: string;
}

export interface Paystub {
  id: string;
  user_id: string;
  pay_date: string;
  period_start: string | null;
  period_end: string | null;
  employer: string | null;
  regular_pay: number;
  bonus: number;
  hours: number | null;
  medical: number;
  dental: number;
  vision: number;
  hsa: number;
  fsa: number;
  retirement_pretax: number;
  other_pretax: number;
  federal_withheld: number;
  state_withheld: number;
  social_security: number;
  medicare: number;
  retirement_aftertax: number;
  other_aftertax: number;
  note: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────────
// Categories — shown in dropdowns and used for auto-categorization
// ──────────────────────────────────────────────────────────────
export const CATEGORIES = {
  needs: ['Rent / Mortgage', 'Utilities', 'Groceries', 'Loan Payment', 'Insurance'],
  wants: ['Eating Out', 'Subscriptions', 'Ride Share', 'Shopping', 'Entertainment', 'Misc'],
  savings: ['Savings Transfer', 'Investment', '401k', 'Roth IRA'],
  income: ['Paycheck', 'Freelance', 'Refund', 'Other Income'],
} as const;

export const ALL_CATEGORIES: string[] = [
  ...CATEGORIES.needs,
  ...CATEGORIES.wants,
  ...CATEGORIES.savings,
  ...CATEGORIES.income,
];

export const SAVINGS_CATEGORIES = new Set<string>(CATEGORIES.savings);
