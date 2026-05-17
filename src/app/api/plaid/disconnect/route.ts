import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { plaidClient } from "@/lib/plaid/client"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { institution_id } = await request.json()

  // Verify ownership and get access token
  const adminSupabase = await createAdminClient()
  const { data: institution } = await adminSupabase
    .from("institutions")
    .select("id, plaid_access_token, plaid_item_id")
    .eq("id", institution_id)
    .eq("user_id", user.id)
    .single()

  if (!institution) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Remove item from Plaid (revokes access)
  try {
    await plaidClient.itemRemove({ access_token: institution.plaid_access_token })
  } catch {
    // Continue even if Plaid call fails — still remove from DB
  }

  // Delete institution (cascades to accounts + transactions via FK)
  await adminSupabase.from("institutions").delete().eq("id", institution_id)

  return NextResponse.json({ success: true })
}
