import { NextResponse } from "next/server"
import { plaidClient } from "@/lib/plaid/client"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { syncInstitution } from "@/lib/plaid/sync"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { public_token, metadata } = await request.json()

  // Exchange public_token for access_token — happens server-side only
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token,
  })

  const { access_token, item_id } = exchangeResponse.data

  // Fetch institution details from Plaid
  const institutionResponse = await plaidClient.institutionsGetById({
    institution_id: metadata.institution.institution_id,
    country_codes: ["US"] as any,
    options: { include_optional_metadata: true },
  })

  const inst = institutionResponse.data.institution

  // Store institution + access token (admin client, never returned to browser)
  const adminSupabase = await createAdminClient()
  const { data: institution, error } = await adminSupabase
    .from("institutions")
    .insert({
      user_id: user.id,
      plaid_item_id: item_id,
      plaid_access_token: access_token,
      institution_id: inst.institution_id,
      institution_name: inst.name,
      logo_url: inst.logo ? `data:image/png;base64,${inst.logo}` : null,
      primary_color: inst.primary_color ?? null,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Store accounts
  const accountsResponse = await plaidClient.accountsGet({ access_token })
  const accountRows = accountsResponse.data.accounts.map((a) => ({
    user_id: user.id,
    institution_id: institution.id,
    plaid_account_id: a.account_id,
    name: a.name,
    official_name: a.official_name ?? null,
    type: a.type,
    subtype: a.subtype ?? null,
    current_balance: a.balances.current,
    available_balance: a.balances.available,
    limit_balance: a.balances.limit,
    iso_currency_code: a.balances.iso_currency_code ?? "USD",
    mask: a.mask ?? null,
  }))

  await adminSupabase.from("accounts").insert(accountRows)

  // Kick off initial transaction sync
  await syncInstitution(institution.id)

  // Only return the institution UUID — access_token stays server-side
  return NextResponse.json({ success: true, institution_id: institution.id })
}
