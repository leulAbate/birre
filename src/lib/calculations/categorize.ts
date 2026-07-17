/**
 * Simple rule-based auto-categorization. Matches against the description.
 * Returns null when nothing matches; the user can pick manually.
 *
 * Add merchants here as we discover them. Order matters — first match wins.
 */
const RULES: Array<{ match: RegExp; category: string }> = [
  // Income
  { match: /paycheck|payroll|direct deposit|salary/i, category: "Paycheck" },
  { match: /refund|reimbursement/i, category: "Refund" },

  // Needs — housing/utilities
  { match: /rent|mortgage|landlord/i, category: "Rent / Mortgage" },
  { match: /electric|water|gas bill|internet|comcast|xfinity|verizon|att|t-mobile/i, category: "Utilities" },
  { match: /insurance|geico|progressive|state farm|allstate/i, category: "Insurance" },
  { match: /sallie mae|nelnet|navient|loan payment/i, category: "Loan Payment" },

  // Needs — groceries
  { match: /trader joe|whole foods|kroger|publix|aldi|safeway|costco|walmart grocery/i, category: "Groceries" },

  // Wants — food/dining
  { match: /starbucks|dunkin|chipotle|mcdonald|uber eats|doordash|grubhub|chick.?fil.?a|restaurant|cafe|pizza/i, category: "Eating Out" },

  // Wants — transport
  { match: /uber|lyft|taxi/i, category: "Ride Share" },

  // Wants — subscriptions
  { match: /netflix|spotify|hulu|disney|hbo|apple|google|amazon prime|youtube premium|patreon/i, category: "Subscriptions" },

  // Wants — shopping/entertainment
  { match: /amazon|target(?!.*grocery)|ebay|etsy/i, category: "Shopping" },
  { match: /movie|theater|cinema|concert|ticket/i, category: "Entertainment" },

  // Savings
  { match: /savings transfer|to savings|sav\b/i, category: "Savings Transfer" },
  { match: /401\s?k/i, category: "401k" },
  { match: /roth|ira/i, category: "Roth IRA" },
  { match: /vanguard|fidelity|schwab|robinhood/i, category: "Investment" },
];

export function autoCategorize(description: string): string | null {
  for (const rule of RULES) {
    if (rule.match.test(description)) return rule.category;
  }
  return null;
}
