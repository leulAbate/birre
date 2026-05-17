"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: { id: string; category: string; amount: number; spent: number; color: string | null }
  onEdit: (b: any) => void
  onDelete: (id: string) => void
}) {
  const pct = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
  const remaining = budget.amount - budget.spent
  const isOver = budget.spent > budget.amount
  const isWarning = pct >= 75 && !isOver

  const barColor = isOver ? "#EF4444" : isWarning ? "#F59E0B" : "#10B981"
  const statusText = isOver
    ? `${fmt(Math.abs(remaining))} over budget`
    : `${fmt(remaining)} remaining`

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-sm">{formatCategory(budget.category)}</p>
            <p className={`text-xs mt-0.5 font-medium ${isOver ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
              {statusText}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(budget)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(budget.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold tabular-nums">{fmt(budget.spent)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">of {fmt(budget.amount)}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-right">{pct.toFixed(0)}%</p>
      </CardContent>
    </Card>
  )
}

function BudgetForm({
  open,
  onClose,
  initial,
  availableCategories,
  avgMap,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  initial: { id?: string; category: string; amount: number } | null
  availableCategories: string[]
  avgMap: Record<string, number>
  onSave: (data: { id?: string; category: string; amount: number }) => void
  saving: boolean
}) {
  const [category, setCategory] = useState(initial?.category ?? "")
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "")

  const suggestion = avgMap[category]

  function handleCategoryChange(cat: string) {
    setCategory(cat)
    // Pre-fill with 3-month average if no amount set yet
    if (!initial?.id && avgMap[cat]) {
      setAmount(avgMap[cat].toString())
    }
  }

  function handleSave() {
    if (!category || !amount || isNaN(Number(amount))) return
    onSave({ id: initial?.id, category, amount: Number(amount) })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Budget" : "Add Budget"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={handleCategoryChange} disabled={!!initial?.id}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Monthly limit</label>
              {suggestion && !initial?.id && (
                <span className="text-xs text-muted-foreground">
                  3-month avg: {fmt(suggestion)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="1"
                placeholder="500"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {suggestion && !initial?.id && (
              <p className="text-xs text-muted-foreground">
                Pre-filled based on your average — adjust as needed
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !category || !amount}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function BudgetGrid({
  budgets,
  availableCategories,
  avgMap,
}: {
  budgets: { id: string; category: string; amount: number; spent: number; color: string | null }[]
  availableCategories: string[]
  avgMap: Record<string, number>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)

  async function handleSave(data: { id?: string; category: string; amount: number }) {
    setSaving(true)
    await fetch("/api/budgets", {
      method: data.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setSaving(false)
    setFormOpen(false)
    setEditing(null)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    await fetch("/api/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setDeleteId(null)
    startTransition(() => router.refresh())
  }

  // Categories already budgeted (exclude from add dropdown)
  const budgetedCats = new Set(budgets.map((b) => b.category))
  const remaining = availableCategories.filter((c) => !budgetedCats.has(c))

  return (
    <>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl space-y-6">

          {/* Summary */}
          {budgets.length > 0 && (
            <div className="flex items-center gap-6 px-1">
              <div>
                <p className="text-xs text-muted-foreground">Total budgeted</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totalBudgeted)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total spent</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className={`text-lg font-bold tabular-nums ${totalSpent > totalBudgeted ? "text-destructive" : "text-primary"}`}>
                  {fmt(totalBudgeted - totalSpent)}
                </p>
              </div>
              <Button className="ml-auto gap-2" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="w-4 h-4" /> Add budget
              </Button>
            </div>
          )}

          {/* Budget cards */}
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-16 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No budgets yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set a monthly limit per category to start tracking your spending
                  </p>
                </div>
                <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true) }}>
                  <Plus className="w-4 h-4" /> Add your first budget
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {budgets.map((b) => (
                <BudgetCard
                  key={b.id}
                  budget={b}
                  onEdit={(b) => { setEditing(b); setFormOpen(true) }}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BudgetForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        initial={editing}
        availableCategories={editing ? availableCategories : remaining}
        avgMap={avgMap}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This won't affect your transactions, just the budget limit for this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
