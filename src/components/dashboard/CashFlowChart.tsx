"use client"

import { useState } from "react"
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart2, TrendingUp, PieChart as PieIcon } from "lucide-react"

type ChartType = "bar" | "line" | "pie"

// Real hex colors — recharts cannot read CSS variables
const COLORS = {
  income:   "#10B981",
  spending: "#EF4444",
  pie: ["#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#EF4444"],
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function BarLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value, percent } = payload[0]
  return (
    <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{formatCategory(name)}</p>
      <p style={{ color: "#10B981" }}>{fmt(value)}</p>
      <p style={{ color: "#6B7280" }}>{(percent * 100).toFixed(1)}% of spending</p>
    </div>
  )
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

const CHART_TYPES: { type: ChartType; icon: any; label: string }[] = [
  { type: "bar",  icon: BarChart2,  label: "Bar" },
  { type: "line", icon: TrendingUp, label: "Line" },
  { type: "pie",  icon: PieIcon,    label: "Pie" },
]

export default function CashFlowChart({
  data,
  spendingByCategory,
}: {
  data: { label: string; income: number; spending: number }[]
  spendingByCategory: { category: string; amount: number }[]
}) {
  const [chartType, setChartType] = useState<ChartType>("bar")

  const pieData = spendingByCategory.map((d) => ({ name: d.category, value: d.amount }))

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {chartType === "pie" ? "Spending by Category" : "Cash Flow — Last 6 months"}
            </p>
            {chartType === "pie" && (
              <p className="text-xs text-muted-foreground mt-0.5">Where your money is going</p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {CHART_TYPES.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  chartType === type
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {chartType === "pie" ? (
          <div className="flex gap-4 items-center">
            {/* Donut chart */}
            <div style={{ width: 200, height: 200, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={<PieLabel />}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS.pie[i % COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with amounts */}
            <div className="flex-1 space-y-2 min-w-0">
              {pieData.map((d, i) => {
                const total = pieData.reduce((s, x) => s + x.value, 0)
                const pct = total > 0 ? (d.value / total) * 100 : 0
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: COLORS.pie[i % COLORS.pie.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {formatCategory(d.name)}
                    </span>
                    <span className="text-xs font-medium tabular-nums">{fmt(d.value)}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
              {pieData.length === 0 && (
                <p className="text-xs text-muted-foreground">No spending data yet</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              {chartType === "bar" ? (
                <BarChart data={data} barCategoryGap="30%" barGap={3}>
                  <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip content={<BarLineTooltip />} cursor={{ fill: "#F3F4F6", radius: 6 }} />
                  <Bar dataKey="income"   name="Income"   fill={COLORS.income}   radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spending" name="Spending" fill={COLORS.spending} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip content={<BarLineTooltip />} />
                  <Line dataKey="income"   name="Income"   type="monotone" stroke={COLORS.income}   strokeWidth={2.5} dot={{ r: 4, fill: COLORS.income,   stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line dataKey="spending" name="Spending" type="monotone" stroke={COLORS.spending} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.spending, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>

            <div className="flex items-center gap-4 mt-3 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLORS.income }} /> Income
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLORS.spending }} /> Spending
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
