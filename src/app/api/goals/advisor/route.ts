import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messages } = await request.json()

  // Fetch user's real financial context
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0]

  const [{ data: accounts }, { data: transactions }, { data: goals }] = await Promise.all([
    supabase.from("accounts").select("name, type, subtype, current_balance").eq("user_id", user.id),
    supabase.from("transactions").select("amount, category, date").eq("user_id", user.id).gte("date", threeMonthsAgo),
    supabase.from("goals").select("name, target_amount, current_amount, target_date").eq("user_id", user.id),
  ])

  // Summarise finances for Claude
  const totalAssets = (accounts ?? [])
    .filter((a) => a.type !== "credit" && a.type !== "loan")
    .reduce((s, a) => s + (a.current_balance ?? 0), 0)

  const monthlyIncome = (transactions ?? [])
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0) / 3

  const monthlySpending = (transactions ?? [])
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0) / 3

  const monthlySurplus = monthlyIncome - monthlySpending

  // Spending by category
  const catMap: Record<string, number> = {}
  for (const t of transactions ?? []) {
    if (t.amount <= 0 || !t.category) continue
    catMap[t.category] = (catMap[t.category] ?? 0) + t.amount / 3
  }
  const topCategories = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([cat, amt]) => `${cat.replace(/_/g, " ")}: $${amt.toFixed(0)}/mo`)

  const systemPrompt = `You are a friendly personal finance advisor inside a finance tracking app.
You have access to the user's real financial data:

FINANCIAL SNAPSHOT:
- Total savings/assets: $${totalAssets.toFixed(0)}
- Average monthly income (last 3 months): $${monthlyIncome.toFixed(0)}
- Average monthly spending (last 3 months): $${monthlySpending.toFixed(0)}
- Monthly surplus available to save: $${monthlySurplus.toFixed(0)}
- Top spending categories: ${topCategories.join(", ")}
- Existing goals: ${goals?.length ? goals.map((g) => `${g.name} ($${g.current_amount}/$${g.target_amount})`).join(", ") : "none"}

Your job is to help the user set realistic, achievable savings goals. When they describe a goal:
1. Suggest a realistic target amount if they're unsure
2. Calculate how long it will realistically take based on their ACTUAL surplus ($${monthlySurplus.toFixed(0)}/mo)
3. Suggest a monthly savings amount that fits their budget
4. Give brief, practical tips based on their actual spending patterns
5. At the end of your response, if you have enough info to create the goal, output a JSON block like this (and nothing after it):

\`\`\`goal
{
  "name": "Goal name",
  "description": "Short description",
  "target_amount": 10000,
  "monthly_savings": 500,
  "months_to_goal": 20,
  "target_date": "2026-12-01",
  "icon": "🏠",
  "color": "#10B981"
}
\`\`\`

Keep responses concise and conversational. Use real numbers from their data. Don't be preachy.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Parse goal JSON if present
  const goalMatch = text.match(/```goal\n([\s\S]*?)\n```/)
  let goalData = null
  if (goalMatch) {
    try { goalData = JSON.parse(goalMatch[1]) } catch {}
  }

  return NextResponse.json({ text, goalData })
}
