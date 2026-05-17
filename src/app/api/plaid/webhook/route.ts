import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { syncInstitution } from "@/lib/plaid/sync"

export async function POST(request: Request) {
  const body = await request.json()
  const { webhook_type, webhook_code, item_id } = body

  if (webhook_type === "TRANSACTIONS") {
    if (
      webhook_code === "SYNC_UPDATES_AVAILABLE" ||
      webhook_code === "INITIAL_UPDATE" ||
      webhook_code === "HISTORICAL_UPDATE"
    ) {
      const supabase = await createAdminClient()
      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("plaid_item_id", item_id)
        .single()

      if (institution) {
        await syncInstitution(institution.id)
      }
    }
  }

  if (webhook_type === "ITEM" && webhook_code === "ERROR") {
    const supabase = await createAdminClient()
    await supabase
      .from("institutions")
      .update({ status: "error", error_code: body.error?.error_code ?? "UNKNOWN" })
      .eq("plaid_item_id", item_id)
  }

  return NextResponse.json({ received: true })
}
