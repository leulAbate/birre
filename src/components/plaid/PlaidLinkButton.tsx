"use client"

import { useCallback, useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Landmark, Loader2 } from "lucide-react"

export default function PlaidLinkButton() {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingToken, setFetchingToken] = useState(true)

  useEffect(() => {
    async function fetchToken() {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" })
      const data = await res.json()
      setLinkToken(data.link_token)
      setFetchingToken(false)
    }
    fetchToken()
  }, [])

  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    setLoading(true)
    await fetch("/api/plaid/exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token, metadata }),
    })
    setLoading(false)
    router.refresh()
  }, [router])

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  })

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || fetchingToken || loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Landmark className="w-4 h-4" />
      )}
      {loading ? "Connecting…" : "Connect a bank"}
    </Button>
  )
}
