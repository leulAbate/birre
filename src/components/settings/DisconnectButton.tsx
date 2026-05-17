"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Unplug } from "lucide-react"

export default function DisconnectButton({ institutionId, name }: { institutionId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [, startTransition] = useTransition()

  async function handleDisconnect() {
    setRemoving(true)
    await fetch("/api/plaid/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institution_id: institutionId }),
    })
    setRemoving(false)
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive">
        <Unplug className="w-3.5 h-3.5" />
        Disconnect
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {name} and all its accounts and transactions from your Finance app.
              Your actual bank account is not affected — only this connection is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDisconnect}
              disabled={removing}
            >
              {removing ? "Removing…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
