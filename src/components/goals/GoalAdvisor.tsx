"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Sparkles, CheckCircle2, Loader2 } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const STARTERS = [
  "I want to buy a house but not sure how much to save",
  "Help me build a 6-month emergency fund",
  "I want to take a trip to Japan next year",
  "I'm thinking about buying a car — what's realistic?",
]

interface Message {
  role: "user" | "assistant"
  content: string
}

interface GoalPreview {
  name: string
  description: string
  target_amount: number
  monthly_savings: number
  months_to_goal: number
  target_date: string
  icon: string
  color: string
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user"
  // Strip the goal JSON block from display
  const display = msg.content.replace(/```goal[\s\S]*?```/g, "").trim()

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center mr-2 mt-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        }`}
      >
        {display}
      </div>
    </div>
  )
}

function GoalPreviewCard({
  goal,
  onConfirm,
  saving,
}: {
  goal: GoalPreview
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <div className="mx-9 mt-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-primary">Goal ready to create</p>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${goal.color}20` }}
        >
          {goal.icon}
        </div>
        <div>
          <p className="font-semibold text-sm">{goal.name}</p>
          {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-background rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Target</p>
          <p className="font-bold text-sm tabular-nums">{fmt(goal.target_amount)}</p>
        </div>
        <div className="bg-background rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Per month</p>
          <p className="font-bold text-sm tabular-nums">{fmt(goal.monthly_savings)}</p>
        </div>
        <div className="bg-background rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Timeline</p>
          <p className="font-bold text-sm">{goal.months_to_goal}mo</p>
        </div>
      </div>
      <Button className="w-full gap-2" onClick={onConfirm} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {saving ? "Creating…" : "Create this goal"}
      </Button>
    </div>
  )
}

export default function GoalAdvisor({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [goalPreview, setGoalPreview] = useState<GoalPreview | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Reset when opened
  useEffect(() => {
    if (open) {
      setMessages([])
      setInput("")
      setGoalPreview(null)
    }
  }, [open])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: "user", content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setLoading(true)
    setGoalPreview(null)

    const res = await fetch("/api/goals/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    })
    const data = await res.json()

    setMessages([...next, { role: "assistant", content: data.text }])
    if (data.goalData) setGoalPreview(data.goalData)
    setLoading(false)
  }

  async function handleCreateGoal() {
    if (!goalPreview) return
    setSaving(true)
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: goalPreview.name,
        description: goalPreview.description,
        target_amount: goalPreview.target_amount,
        current_amount: 0,
        target_date: goalPreview.target_date,
        icon: goalPreview.icon,
        color: goalPreview.color,
      }),
    })
    setSaving(false)
    onClose()
    startTransition(() => router.refresh())
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Goal Advisor
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Describe your goal — I'll use your real finances to make it achievable
          </p>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center pt-4">
                What do you want to save for?
              </p>
              <div className="grid grid-cols-1 gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-foreground/80"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <MessageBubble msg={msg} />
              {/* Show goal preview after the last assistant message that has one */}
              {msg.role === "assistant" && i === messages.length - 1 && goalPreview && (
                <GoalPreviewCard
                  goal={goalPreview}
                  onConfirm={handleCreateGoal}
                  saving={saving}
                />
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border/60 shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your goal…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || loading} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
