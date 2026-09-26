/**
 * Build the system prompt for the AI assistant, scoped to the page the user
 * is currently on. Each builder pulls the live numbers they need from Supabase
 * and serializes them into the prompt so Claude answers grounded in real data.
 *
 * The AI is meant to see everything the user sees on the page — not just what
 * they type — so builders serialize the same shapes the page renders.
 *
 * Add a new page: add a key to PageId, implement a builder, register it below.
 */
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getGoals, getPaystubs, getProfile, getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary, topExpenses } from "@/lib/calculations/summary";
import { computeGoalProgress } from "@/lib/calculations/goals";
import { computePulseScore, computePulseInsights } from "@/lib/calculations/pulse";
import { projectYTD } from "@/lib/calculations/paystubs";
import { fmtCurrency } from "@/lib/utils";
import type { Budget, Recurring, Transaction } from "@/lib/types";

export type PageId = "dashboard" | "transactions" | "review" | "plans" | "tax";

// In-memory cache: rebuilding the page context hits Supabase several times
// per request, and during a chat the same context stays valid across
// consecutive messages. 30s TTL is short enough that a transaction added
// mid-conversation flushes in on the next message.
const CACHE_TTL_MS = 30_000;
const contextCache = new Map<string, { data: string; expiresAt: number }>();

const BASE_INSTRUCTIONS = `
You are Birr'e AI, a personal finance assistant embedded in the user's own finance app.
You have access to the user's real numbers, included in the system prompt below.

Rules:
- Be specific. Cite actual numbers from the data. Never invent values.
- Be direct and useful. Skip pleasantries.
- Don't just repeat the data back — answer the question, then reference numbers as evidence.
- If the user asks something the data doesn't contain, say so briefly (in one line).
- Keep responses to 2–4 short paragraphs unless the user explicitly asks for more.
- The user is looking at the CURRENT PAGE section below; assume they can see those numbers already.
`;

export async function buildSystemPrompt(page: PageId, userId: string): Promise<string> {
  const key = `${userId}:${page}`;
  const now = Date.now();
  const cached = contextCache.get(key);
  let data: string;
  if (cached && cached.expiresAt > now) {
    data = cached.data;
  } else {
    data = await PAGE_BUILDERS[page]();
    contextCache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
  }
  return `${BASE_INSTRUCTIONS}\n\nCURRENT PAGE: ${page}\n\nPAGE DATA:\n${data}`;
}

/** Called after mutations that make cached context stale (transaction save,
 *  budget change, etc.) so the next AI call rebuilds. */
export function invalidateAiContext(userId?: string) {
  if (!userId) {
    contextCache.clear();
    return;
  }
  for (const k of contextCache.keys()) {
    if (k.startsWith(`${userId}:`)) contextCache.delete(k);
  }
}

// ──────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────

async function loadTrend(monthsBack: number, includeByCategory = true) {
  const supabase = await createClient();
  const now = new Date();
  const out: Array<{
    label: string;
    ym: string;
    income: number;
    expense: number;
    saved: number;
    savingsRate: number;
    byCategory?: Record<string, number>;
  }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = monthRange(d.getFullYear(), d.getMonth());
    const { data } = await supabase
      .from("transactions")
      .select("amount, type, category")
      .gte("date", start)
      .lte("date", end);
    const rows = (data ?? []) as Array<Pick<Transaction, "amount" | "type" | "category">>;
    const summary = computeMonthSummary(
      rows.map((r) => ({
        ...r,
        id: "", user_id: "", account_id: null, to_account_id: null,
        goal_id: null, paystub_id: null, date: "", description: "",
        note: null, created_at: "",
      })),
    );
    const savingsRate = summary.income > 0 ? (summary.saved / summary.income) * 100 : 0;
    out.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      income: summary.income,
      expense: summary.expense,
      saved: summary.saved,
      savingsRate,
      ...(includeByCategory ? { byCategory: Object.fromEntries(summary.byCategory) } : {}),
    });
  }
  return out;
}

function accountLines(accounts: Awaited<ReturnType<typeof getAccounts>>) {
  if (accounts.length === 0) return "  (none)";
  return accounts
    .map((a) => `  - ${a.name} (${a.type}): ${fmtCurrency(Number(a.balance))}`)
    .join("\n");
}

function budgetLines(bp: ReturnType<typeof computeBudgetProgress>) {
  if (bp.length === 0) return "  (none)";
  return bp
    .map(
      (b) =>
        `  - ${b.category}: ${fmtCurrency(b.spent)} / ${fmtCurrency(b.budgeted)} (${b.percent.toFixed(0)}%${
          b.percent > 100 ? ", OVER" : ""
        })`,
    )
    .join("\n");
}

function categoryLines(byCategory: Map<string, number>) {
  const entries = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "  (none)";
  return entries.map(([cat, amt]) => `  - ${cat}: ${fmtCurrency(amt)}`).join("\n");
}

function trendLines(
  trend: Array<{ label: string; ym: string; income: number; expense: number; saved: number; savingsRate: number }>,
) {
  return trend
    .map(
      (t) =>
        `  - ${t.label} ${t.ym.slice(0, 4)}: income ${fmtCurrency(t.income)}, spent ${fmtCurrency(
          t.expense,
        )}, saved ${fmtCurrency(t.saved)} (${t.savingsRate.toFixed(1)}%)`,
    )
    .join("\n");
}

// ──────────────────────────────────────────────────────────────
// Per-page data serializers
// ──────────────────────────────────────────────────────────────

async function dashboardContext(): Promise<string> {
  const now = new Date();
  const { start } = monthRange(now.getFullYear(), now.getMonth());
  const supabase = await createClient();
  const [accounts, txs, allTxs, goals, budgetsRes, recurringRes, trend] = await Promise.all([
    getAccounts(),
    getTransactions({ monthStart: start, monthEnd: monthRange(now.getFullYear(), now.getMonth()).end }),
    getTransactions(),
    getGoals(),
    supabase.from("budgets").select("*"),
    supabase.from("recurring").select("*").eq("active", true),
    loadTrend(6, false),
  ]);
  const summary = computeMonthSummary(txs);
  const budgets = (budgetsRes.data ?? []) as Budget[];
  const recurring = (recurringRes.data ?? []) as Recurring[];
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const top = topExpenses(txs, 5);
  const insights = computePulseInsights(summary, budgetProgress, trend);
  const activeGoals = goals
    .filter((g) => g.status === "active")
    .map((g) => computeGoalProgress(g, allTxs));

  const netWorth = accounts.reduce(
    (s, a) => s + (a.type === "credit" ? -1 : 1) * Number(a.balance),
    0,
  );
  const loanBalance = accounts
    .filter((a) => a.type === "credit")
    .reduce((s, a) => s + Number(a.balance), 0);

  return `
CURRENT MONTH: ${start.slice(0, 7)}

TOP STAT CARDS:
  Free to Spend: computed from wants budget - wants spent
  Total Spent: ${fmtCurrency(summary.expense)} (${summary.income > 0 ? ((summary.expense / summary.income) * 100).toFixed(0) : 0}% of income)
  Loan Balance: ${fmtCurrency(loanBalance)}
  Net Worth: ${fmtCurrency(netWorth)} across ${accounts.length} accounts

Income this month: ${fmtCurrency(summary.income)}
Saved this month: ${fmtCurrency(summary.saved)}
Net this month: ${fmtCurrency(summary.net)}

Accounts:
${accountLines(accounts)}

Budgets (Category Breakdown):
${budgetLines(budgetProgress)}

Category totals this month:
${categoryLines(summary.byCategory)}

Top expenses this month:
${top.length
  ? top.map((t) => `  - ${t.date} ${t.description} (${t.category}): ${fmtCurrency(Number(t.amount))}`).join("\n")
  : "  (none)"}

Recurring subscriptions:
${recurring.length
  ? recurring.map((r) => `  - ${r.name} (${r.category}, ${r.frequency}): ${fmtCurrency(Number(r.amount))}`).join("\n")
  : "  (none)"}

Active plans/goals (${activeGoals.length}):
${activeGoals.length
  ? activeGoals
      .map((p) => `  - ${p.goal.icon} ${p.goal.name}: ${fmtCurrency(p.saved)}/${fmtCurrency(Number(p.goal.target_amount))} (${p.percent.toFixed(0)}%, ${p.onTrack})`)
      .join("\n")
  : "  (none)"}

Spending trend (last 6 months):
${trendLines(trend)}

Pulse insight tiles currently shown:
${insights.length
  ? insights.map((i) => `  - [${i.tone}] ${i.title} — ${i.detail}`).join("\n")
  : "  (none)"}
`.trim();
}

async function transactionsContext(): Promise<string> {
  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth());
  const supabase = await createClient();
  const [txs, accounts, budgetsRes] = await Promise.all([
    getTransactions({ monthStart: start, monthEnd: end }),
    getAccounts(),
    supabase.from("budgets").select("*"),
  ]);
  const summary = computeMonthSummary(txs);
  const budgets = (budgetsRes.data ?? []) as Budget[];
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const lines = txs
    .slice(0, 40)
    .map((t) => {
      const acc = t.account_id ? accountById[t.account_id] : "";
      return `  - ${t.date} ${t.description} (${t.category}, ${t.type}${acc ? `, ${acc}` : ""}): ${fmtCurrency(Number(t.amount))}`;
    })
    .join("\n");

  return `
CURRENT MONTH: ${start.slice(0, 7)}
Total transactions: ${txs.length}
Income: ${fmtCurrency(summary.income)} · Expenses: ${fmtCurrency(summary.expense)} · Saved: ${fmtCurrency(summary.saved)}

Transactions (up to 40, newest first):
${lines || "  (none)"}

Category totals this month:
${categoryLines(summary.byCategory)}

Budgets (Category view shows these):
${budgetLines(budgetProgress)}

Accounts:
${accountLines(accounts)}
`.trim();
}

async function reviewContext(): Promise<string> {
  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth());
  const supabase = await createClient();
  const [txs, budgetsRes, trend] = await Promise.all([
    getTransactions({ monthStart: start, monthEnd: end }),
    supabase.from("budgets").select("*"),
    loadTrend(4, true),
  ]);
  const summary = computeMonthSummary(txs);
  const budgets = (budgetsRes.data ?? []) as Budget[];
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const pulse = computePulseScore(summary, budgetProgress);
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const budgetUsedPct = totalBudget > 0 ? (summary.expense / totalBudget) * 100 : 0;

  // MoM diff for last vs prev
  const prev = trend[trend.length - 2];
  const cur = trend[trend.length - 1];
  let momLines = "  (need at least 2 months of data)";
  if (prev && cur) {
    const cats = new Set<string>([
      ...Object.keys(prev.byCategory ?? {}),
      ...Object.keys(cur.byCategory ?? {}),
    ]);
    const diffs = Array.from(cats)
      .map((cat) => ({
        cat,
        cur: cur.byCategory?.[cat] ?? 0,
        prev: prev.byCategory?.[cat] ?? 0,
      }))
      .filter((r) => r.cur > 0 || r.prev > 0)
      .map((r) => ({ ...r, diff: r.cur - r.prev }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 6);
    momLines = diffs
      .map((r) => `  - ${r.cat}: ${fmtCurrency(r.cur)} vs ${fmtCurrency(r.prev)} last month (${r.diff >= 0 ? "+" : ""}${fmtCurrency(r.diff)})`)
      .join("\n") || "  (no significant moves)";
  }

  // Category sparkline data
  const topCats = cur?.byCategory
    ? Object.entries(cur.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c)
    : [];
  const sparkLines = topCats
    .map((cat) => {
      const seq = trend.map((t) => fmtCurrency(t.byCategory?.[cat] ?? 0)).join(" → ");
      return `  - ${cat}: ${seq}`;
    })
    .join("\n");

  return `
CURRENT MONTH: ${start.slice(0, 7)}

Summary strip:
  Income: ${fmtCurrency(summary.income)}
  Total Spent: ${fmtCurrency(summary.expense)}
  Saved: ${fmtCurrency(summary.saved)}
  Budget Used: ${totalBudget > 0 ? budgetUsedPct.toFixed(0) + "%" : "—"}

Pulse score: ${pulse.total}/100 (Grade ${pulse.grade})
  - Savings rate: ${pulse.breakdown.savingsRate}/40 (${pulse.savingsRate.toFixed(1)}% saved)
  - Cash flow: ${pulse.breakdown.cashFlow}/20
  - Budget adherence: ${pulse.breakdown.budgetAdherence}/30 (${budgetProgress.filter((b) => b.percent > 100).length} categories over budget)
  - Diversity: ${pulse.breakdown.diversityBonus}/10

Goal vs Actual (budgets):
${budgetLines(budgetProgress)}

${trend.length}-month trend (Total Spending Last N Months):
${trendLines(trend)}

Category sparklines (last ${trend.length} months, top categories):
${sparkLines || "  (no data)"}

Savings Rate Trend:
${trend.map((t) => `  - ${t.label} ${t.ym.slice(0, 4)}: ${t.savingsRate.toFixed(1)}%`).join("\n")}

Month-over-month diff (${prev?.label ?? "prev"} → ${cur?.label ?? "cur"}):
${momLines}
`.trim();
}

async function plansContext(): Promise<string> {
  const [goals, allTxs] = await Promise.all([getGoals(), getTransactions()]);
  const progress = goals.map((g) => computeGoalProgress(g, allTxs));
  const active = progress.filter((p) => p.goal.status === "active");
  const wishlist = progress.filter((p) => p.goal.status === "wishlist");

  const summarize = (p: (typeof progress)[number]) => {
    const target = fmtCurrency(Number(p.goal.target_amount));
    const saved = fmtCurrency(p.saved);
    const monthly = p.monthlyNeeded !== null ? fmtCurrency(p.monthlyNeeded) + "/mo" : "—";
    const date = p.goal.target_date ?? "no deadline";
    const contribs = p.contributions.length
      ? ` [${p.contributions.length} contribution${p.contributions.length === 1 ? "" : "s"}]`
      : "";
    return `  - ${p.goal.icon} ${p.goal.name}: ${saved}/${target} (${p.percent.toFixed(0)}%, ${p.onTrack}, ${monthly} needed, target ${date})${contribs}`;
  };

  return `
Active Goals (${active.length}):
${active.length ? active.map(summarize).join("\n") : "  (none)"}

Wishlist (${wishlist.length}):
${wishlist.length ? wishlist.map(summarize).join("\n") : "  (none)"}

Notes: Wishlist goals have no deadline. Contributions come from transactions tagged with a goal_id.
`.trim();
}

async function taxContext(): Promise<string> {
  const year = new Date().getFullYear();
  const [profile, paystubs] = await Promise.all([
    getProfile(),
    getPaystubs({ yearStart: `${year}-01-01` }),
  ]);

  const profileLine = profile
    ? `Filing: ${profile.filing_status} · State: ${profile.state} · Pay: ${profile.pay_frequency} · Retirement contribution: ${profile.retirement_pct}% (${profile.retirement_type})`
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
  Regular pay: ${fmtCurrency(Number(activeTemplate.regular_pay))}
  Bonus: ${fmtCurrency(Number(activeTemplate.bonus))}
  Medical: ${fmtCurrency(Number(activeTemplate.medical))}
  Dental: ${fmtCurrency(Number(activeTemplate.dental))}
  HSA: ${fmtCurrency(Number(activeTemplate.hsa))}
  401(k) pretax: ${fmtCurrency(Number(activeTemplate.retirement_pretax))}
  401(k) aftertax (Roth): ${fmtCurrency(Number(activeTemplate.retirement_aftertax))}
  Federal withheld: ${fmtCurrency(Number(activeTemplate.federal_withheld))}
  State withheld: ${fmtCurrency(Number(activeTemplate.state_withheld))}

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
