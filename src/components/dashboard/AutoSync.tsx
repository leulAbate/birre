"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// Fires a background sync when the dashboard loads.
// Won't sync again if it synced within the last 30 minutes.
const SYNC_INTERVAL_MS = 30 * 60 * 1000

export default function AutoSync() {
  const router = useRouter()
  const didSync = useRef(false)

  useEffect(() => {
    if (didSync.current) return
    didSync.current = true

    const lastSync = localStorage.getItem("last_sync")
    if (lastSync && Date.now() - Number(lastSync) < SYNC_INTERVAL_MS) return

    fetch("/api/plaid/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then((res) => {
      if (res.ok) {
        localStorage.setItem("last_sync", String(Date.now()))
        router.refresh()
      }
    }).catch(() => {})
  }, [router])

  return null
}
