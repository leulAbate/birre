import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import SyncAllButton from "@/components/settings/SyncAllButton"
import DisconnectButton from "@/components/settings/DisconnectButton"
import Link from "next/link"
import { Landmark, RefreshCw, Shield, User, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react"

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: institutions } = await supabase
    .from("institutions")
    .select("*, accounts(id, name, type, subtype, mask, current_balance)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })

  const totalAccounts = institutions?.reduce((s, i) => s + (i.accounts?.length ?? 0), 0) ?? 0
  const lastSynced = institutions
    ?.map((i) => i.last_synced_at)
    .filter(Boolean)
    .sort()
    .pop() ?? null

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Manage your account and connections" />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-6">

          {/* Profile */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Account</p>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Member since {new Date(user?.created_at ?? "").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data sync</p>
            <Card>
              <CardContent className="pt-4 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sync all accounts</p>
                      <p className="text-xs text-muted-foreground">
                        Last synced: {timeAgo(lastSynced)} · {totalAccounts} accounts connected
                      </p>
                    </div>
                  </div>
                  <SyncAllButton />
                </div>
                <Separator />
                <div className="flex items-start gap-3 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <p>
                    Syncing fetches your latest transactions and balances from Plaid.
                    Your credentials are never stored — Plaid handles all bank authentication.
                    Access is <span className="font-medium text-foreground">read-only</span>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connected banks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Connected banks</p>
              <Link href="/settings/connections" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                + Add account <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {!institutions || institutions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-10 text-center gap-3">
                  <Landmark className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No banks connected</p>
                  <Link href="/settings/connections" className="text-sm text-primary hover:underline">
                    Connect your first account
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {institutions.map((inst: any) => (
                  <Card key={inst.id}>
                    <CardContent className="pt-4 pb-4">
                      {/* Institution header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {inst.logo_url ? (
                            <img src={inst.logo_url} alt={inst.institution_name} className="w-8 h-8 rounded-lg object-contain" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <Landmark className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold">{inst.institution_name}</p>
                              {inst.status === "active"
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                : <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {inst.accounts?.length ?? 0} accounts · Last synced {timeAgo(inst.last_synced_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SyncAllButton institutionId={inst.id} label="Sync" variant="outline" />
                          <DisconnectButton institutionId={inst.id} name={inst.institution_name} />
                        </div>
                      </div>

                      {/* Account list */}
                      <div className="space-y-1 pl-11">
                        {inst.accounts?.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-muted-foreground">
                              {a.name}{a.mask ? ` ••${a.mask}` : ""} · <span className="capitalize">{a.subtype ?? a.type}</span>
                            </span>
                            <span className="font-medium tabular-nums">
                              {a.current_balance != null
                                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(a.current_balance)
                                : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Security note */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Security</p>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3 text-sm">
                  {[
                    { icon: "🔒", text: "Bank credentials are never stored — handled entirely by Plaid" },
                    { icon: "👁️", text: "Read-only access — no ability to move money or make transfers" },
                    { icon: "🛡️", text: "Your data is encrypted and protected with Row Level Security" },
                    { icon: "🔑", text: "Access tokens are stored server-side only, never exposed to the browser" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-start gap-3">
                      <span className="text-base shrink-0">{icon}</span>
                      <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
