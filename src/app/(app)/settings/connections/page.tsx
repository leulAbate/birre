import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import PlaidLinkButton from "@/components/plaid/PlaidLinkButton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Landmark, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

export default async function ConnectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: institutions } = await supabase
    .from("institutions")
    .select("*, accounts(id, name, type, subtype, current_balance, mask)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Bank Connections"
        description="Connect your accounts via Plaid — read-only access only"
        action={<PlaidLinkButton />}
      />

      <div className="p-8 max-w-2xl space-y-4">
        {!institutions || institutions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Landmark className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No banks connected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your first account to start tracking your finances
                </p>
              </div>
              <PlaidLinkButton />
            </CardContent>
          </Card>
        ) : (
          institutions.map((inst: any) => (
            <Card key={inst.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  {inst.logo_url ? (
                    <img src={inst.logo_url} alt={inst.institution_name} className="w-9 h-9 rounded-lg object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{inst.institution_name}</p>
                      {inst.status === "active" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inst.last_synced_at
                        ? `Last synced ${new Date(inst.last_synced_at).toLocaleDateString()}`
                        : "Never synced"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {inst.accounts?.map((account: any) => (
                    <div key={account.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{account.name}</span>
                        {account.mask && (
                          <span className="text-xs text-muted-foreground">••{account.mask}</span>
                        )}
                        <Badge variant="secondary" className="text-xs capitalize">
                          {account.subtype ?? account.type}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {account.current_balance != null
                          ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(account.current_balance)
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
