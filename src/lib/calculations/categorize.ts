/**
 * Simple rule-based auto-categorization. Matches against the description.
 * Returns null when nothing matches; the user can pick manually.
 *
 * Add merchants here as we discover them. Order matters — first match wins.
 */
const RULES: Array<{ match: RegExp; category: string }> = [
  // Income
  { match: /paycheck|payroll|direct deposit|salary/i, category: "Paycheck" },
  { match: /refund|reimbursement|freelance/i, category: "Other Income" },

  // Needs
  { match: /rent|mortgage|landlord|electric|water|gas bill|internet|comcast|xfinity|verizon|at&t|att|t-mobile|insurance|geico|progressive|state farm|allstate/i, category: "Rent & Utilities" },
  { match: /sallie mae|nelnet|navient|loan/i, category: "Loan Payments" },
  { match: /trader joe|whole foods|kroger|publix|aldi|safeway|costco|walmart grocery|grocery/i, category: "Groceries" },

  // Wants
  { match: /starbucks|dunkin|chipotle|mcdonald|uber eats|doordash|grubhub|chick.?fil.?a|restaurant|cafe|pizza/i, category: "Eating Out" },
  { match: /uber|lyft|taxi/i, category: "Ride Share" },

  // Savings
  { match: /savings|invest|401\s?k|roth|ira|vanguard|fidelity|schwab|robinhood/i, category: "Savings & Investments" },

  // Everything else falls through to null → user picks "Misc" or another.
];

export function autoCategorize(description: string): string | null {
  for (const rule of RULES) {
    if (rule.match.test(description)) return rule.category;
  }
  return null;
}
