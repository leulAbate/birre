/**
 * Build the system prompt for the AI assistant, scoped to the page the user
 * is currently on. Each builder pulls the live numbers they need from Supabase
 * and serializes them into the prompt so Claude answers grounded in real data.
 *
 * Add a new page: add a key to PageId, implement a builder, register it below.
 */
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getGoals, getPaystubs, getProfile, getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary, topExpenses } from "@/lib/calculations/summary";
import { computeGoalProgress } from "@/lib/calculations/goals";
import { computePulseScore } from "@/lib/calculations/pulse";
import { projectYTD } from "@/lib/calculations/paystubs";
import { fmtCurrency } from "@/lib/utils";
import type { Budget } from "@/lib/types";

export type PageId = "dashboard" | "transactions" | "review" | "plans" | "tax";

const BASE_INSTRUCTIONS = `
You are Birr'e AI, a personal finance assistant embedded in the user's own finance app.
You have access to the user's real numbers, included in the system prompt below.
Rules:
- Be specific. Cite actual numbers from the data. Don't invent values.
- Be direct and useful. Skip pleasantries.
- Don't repeat the data back — answer the question, then refer to numbers as evidence.
- If the user asks something the data doesn't contain, say so briefly.
- Keep responses to 2–4 short paragraphs unless the user asks for more.
`;

export async function buildSystemPrompt(page: PageId): Promise<string> {
  const data = await PAGE_BUILDERS[page]();
  return `${BASE_INSTRUCTIONS}\n\nCURRENT PAGE: ${page}\n\nUSER DATA:\n${data}`;
}

// ──────────────────────────────────────────────────────────────
// Per-page data serializers
// ──────────────────────────────────────────────────────────────

async function dashboardContext(): Promise<string> {
  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth());
  const supabase = await createClient();
  const [accounts, txs, budgetsRes] = await Promise.all([
    getAccounts(),
    getTransactions({ monthStart: start, monthEnd: end }),
    supabase.from("budgets").select("*"),
  ]);
  const summary = computeMonthSummary(txs);
  const budgets = (budgetsRes.data ?? []) as Budget[];
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const top = topExpenses(txs, 5);

  const netWorth = accounts.reduce((s, a) => s + (a.type === "credit" ? -1 : 1) * Number(a.balance), 0);
  const accountLines = accounts.length
    ? accounts.map((a) => `  - ${a.name} (${a.type}): ${fmtCurrency(Number(a.balance))}`).join("\n")
    : "  (none)";
  const budgetLines = budgetProgress.length
    ? budgetProgress
        .map((b) => `  - ${b.category}: ${fmtCurrency(b.spent)} / ${fmtCurrency(b.budgeted)} (${b.percent.toFixed(0)}%)`)
        .join("\n")
    : "  (none)";
  const topLines = top.length
    ? top.map((t) => `  - ${t.date} ${t.description} (${t.category}): ${fmtCurrency(Number(t.amount))}`).join("\n")
    : "  (none)";

  return `
CURRENT MONTH: ${start.slice(0, 7)}
Net worth: ${fmtCurrency(netWorth)}
Income this month: ${fmtCurrency(summary.income)}
Expenses this month: ${fmtCurrency(summary.expense)}
Saved this month: ${fmtCurrency(summary.saved)}
Net this month: ${fmtCurrency(summary.net)}

Accounts:
${accountLines}

Budgets:
${budgetLines}

Top expenses:
${topLines}
`.trim();
}

async function transactionsContext(): Promise<string> {
  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth());
  const txs = await getTransactions({ monthStart: start, monthEnd: end });
  const summary = computeMonthSummary(txs);
  const lines = txs
    .slice(0, 30)
    .map((t) => `  - ${t.date} ${t.description} (${t.category}, ${t.type}): ${fmtCurrency(Number(t.amount))}`)
    .join("\n");
  return `
CURRENT MONTH: ${start.slice(0, 7)}
Total transactions: ${txs.length}
Income: ${fmtCurrency(summary.income)} · Expenses: ${fmtCurrency(summary.expense)} · Saved: ${fmtCurrency(summary.saved)}

Recent transactions (up to 30):
${lines || "  (none)"}

Category totals:
${[...summary.byCategory.entries()]
  .map(([cat, amt]) => `  - ${cat}: ${fmtCurrency(amt)}`)
  .join("\n") || "  (none)"}
`.trim();
}

async function reviewContext(): Promise<string> {
  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth());
  const supabase = await createClient();
  const [txs, budgetsRes] = await Promise.all([
    getTransactions({ monthStart: start, monthEnd: end }),
    supabase.from("budgets").select("*"),
  ]);
  const summary = computeMonthSummary(txs);
  const budgetProgress = computeBudgetProgress((budgetsRes.data ?? []) as Budget[], summary.byCategory);
  const pulse = computePulseScore(summary, budgetProgress);

  return `
CURRENT MONTH: ${start.slice(0, 7)}
Pulse score: ${pulse.total}/100 (Grade ${pulse.grade})
  - Savings rate: ${pulse.breakdown.savingsRate}/40 (${pulse.savingsRate.toFixed(0)}% saved)
  - Cash flow: ${pulse.breakdown.cashFlow}/20
  - Budget adherence: ${pulse.breakdown.budgetAdherence}/30 (${budgetProgress.filter((b) => b.percent > 100).length} over budget)
  - Diversity: ${pulse.breakdown.diversityBonus}/10

Income: ${fmtCurrency(summary.income)} · Spent: ${fmtCurrency(summary.expense)} · Saved: ${fmtCurrency(summary.saved)}

Budgets:
${budgetProgress
  .map((b) => `  - ${b.category}: ${fmtCurrency(b.spent)} / ${fmtCurrency(b.budgeted)} (${b.percent.toFixed(0)}%)`)
  .join("\n") || "  (none)"}
`.trim();
}

async function plansContext(): Promise<string> {
  const [goals, allTxs] = await Promise.all([getGoals(), getTransactions()]);
  const progress = goals.map((g) => computeGoalProgress(g, allTxs));

  return `
${progress.length} goal${progress.length === 1 ? "" : "s"}:
${progress
  .map((p) => {
    const target = fmtCurrency(Number(p.goal.target_amount));
    const saved = fmtCurrency(p.saved);
    const monthly = p.monthlyNeeded !== null ? fmtCurrency(p.monthlyNeeded) + "/mo" : "—";
    const date = p.goal.target_date ?? "no deadline";
    return `  - ${p.goal.icon} ${p.goal.name}: ${saved}/${target} (${p.percent.toFixed(0)}%, ${p.onTrack}, ${monthly} needed, target ${date})`;
  })
  .join("\n") || "  (none)"}
`.trim();
}

async function taxContext(): Promise<string> {
  const year = new Date().getFullYear();
  const [profile, paystubs] = await Promise.all([
    getProfile(),
    getPaystubs({ yearStart: `${year}-01-01` }),
  ]);

  const profileLine = profile
    ? `Filing: ${profile.filing_status} · State: ${profile.state} · Pay: ${profile.pay_frequency}`
    : "Profile not set.";

  if (paystubs.length === 0) {
    return `
${profileLine}

User has not added any paystubs yet for ${year}. Paystubs on the Tax page work as reusable templates — the user uploads one paystub PDF, it becomes the active template, and the app auto-projects YTD tax numbers assuming that template applies every pay period. Suggest they upload one to unlock YTD/refund answers.
`.trim();
  }

  const proj = projectYTD(paystubs, profile?.pay_frequency ?? "biweekly");
  if (!proj) {
    return `${profileLine}\n\nPaystubs on file but projection could not be computed.`;
  }
  const { ytd, annual, activeTemplate, periodsCompleted, periodsPerYear } = proj;

  const templateLines = paystubs
    .slice()
    .sort((a, b) => b.pay_date.localeCompare(a.pay_date))
    .map((p) => `  - Effective ${p.pay_date}${p.employer ? ` · ${p.employer}` : ""}`)
    .join("\n");

  return `
${profileLine}

TEMPLATES ON FILE (${paystubs.length}):
${templateLines}

ACTIVE TEMPLATE (${activeTemplate.pay_date}${activeTemplate.employer ? `, ${activeTemplate.employer}` : ""}):
  Regular pay: ${fmtCurrency(Number(activeTemplate.regular_pay), { decimals: true })}
  Bonus: ${fmtCurrency(Number(activeTemplate.bonus), { decimals: true })}
  Federal withheld: ${fmtCurrency(Number(activeTemplate.federal_withheld), { decimals: true })}
  State withheld: ${fmtCurrency(Number(activeTemplate.state_withheld), { decimals: true })}

PROJECTED YTD (${periodsCompleted} of ${periodsPerYear} periods completed):
  Gross earnings: ${fmtCurrency(ytd.gross)}
  Pre-tax deductions: ${fmtCurrency(ytd.preTaxDeductions)}
  Traditional 401(k): ${fmtCurrency(ytd.retirementPretax)}
  Roth 401(k): ${fmtCurrency(ytd.retirementAftertax)}
  Taxable wages: ${fmtCurrency(ytd.taxableWages)}
  Federal withheld: ${fmtCurrency(ytd.federalWithheld)}
  State withheld: ${fmtCurrency(ytd.stateWithheld)}
  SS / Medicare: ${ytd.fica > 0 ? fmtCurrency(ytd.fica) : "Exempt"}
  Net take-home YTD: ${fmtCurrency(ytd.netPay)}

PROJECTED FULL YEAR (assuming active template continues):
  Gross: ${fmtCurrency(annual.gross)}
  Traditional 401(k): ${fmtCurrency(annual.retirementPretax)}
  Roth 401(k): ${fmtCurrency(annual.retirementAftertax)}
  Federal withheld: ${fmtCurrency(annual.federalWithheld)}
  Net take-home: ${fmtCurrency(annual.netPay)}
`.trim();
}

const PAGE_BUILDERS: Record<PageId, () => Promise<string>> = {
  dashboard: dashboardContext,
  transactions: transactionsContext,
  review: reviewContext,
  plans: plansContext,
  tax: taxContext,
};
