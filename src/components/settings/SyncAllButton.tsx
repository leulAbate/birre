"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface Props {
  institutionId?: string
  label?: string
  variant?: "default" | "outline"
}

export default function SyncAllButton({ institutionId, label = "Sync now", variant = "default" }: Props) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [, startTransition] = useTransition()

  async function handleSync() {
    setSyncing(true)
    await fetch("/api/plaid/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(institutionId ? { institution_id: institutionId } : {}),
    })
    setSyncing(false)
    startTransition(() => router.refresh())
  }

  return (
    <Button variant={variant} size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing…" : label}
    </Button>
  )
}
