import { plaidClient } from "./client"
import { createAdminClient } from "@/lib/supabase/server"

export async function syncInstitution(institutionId: string) {
  const supabase = await createAdminClient()

  // Fetch the institution + access token (admin client bypasses RLS)
  const { data: institution, error } = await supabase
    .from("institutions")
    .select("id, user_id, plaid_access_token, plaid_item_id, cursor")
    .eq("id", institutionId)
    .single()

  if (error || !institution) throw new Error("Institution not found")

  const accessToken = institution.plaid_access_token
  let cursor = institution.cursor ?? undefined
  let hasMore = true

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    })

    const { added, modified, removed, next_cursor, has_more } = response.data

    // Upsert added transactions
    if (added.length > 0) {
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, plaid_account_id")
        .eq("user_id", institution.user_id)

      const accountMap = new Map(accounts?.map((a) => [a.plaid_account_id, a.id]))

      const rows = added
        .map((t) => ({
          user_id: institution.user_id,
          account_id: accountMap.get(t.account_id),
          plaid_transaction_id: t.transaction_id,
          amount: t.amount,
          iso_currency_code: t.iso_currency_code ?? "USD",
          description: t.name,
          merchant_name: t.merchant_name ?? null,
          category: t.personal_finance_category?.primary ?? null,
          personal_finance_category: t.personal_finance_category?.primary ?? null,
          plaid_category: t.category ?? null,
          date: t.date,
          authorized_date: t.authorized_date ?? null,
          pending: t.pending,
          logo_url: t.logo_url ?? null,
          website: t.website ?? null,
        }))
        .filter((r) => r.account_id) // skip if account not found

      if (rows.length > 0) {
        await supabase
          .from("transactions")
          .upsert(rows, { onConflict: "plaid_transaction_id" })
      }
    }

    // Update modified transactions
    for (const t of modified) {
      await supabase
        .from("transactions")
        .update({
          amount: t.amount,
          description: t.name,
          merchant_name: t.merchant_name ?? null,
          pending: t.pending,
          category: t.personal_finance_category?.primary ?? null,
        })
        .eq("plaid_transaction_id", t.transaction_id)
        .eq("user_id", institution.user_id)
    }

    // Delete removed transactions
    if (removed.length > 0) {
      const ids = removed.map((r) => r.transaction_id)
      await supabase
        .from("transactions")
        .delete()
        .in("plaid_transaction_id", ids)
        .eq("user_id", institution.user_id)
    }

    cursor = next_cursor
    hasMore = has_more
  }

  // Save updated cursor
  await supabase
    .from("institutions")
    .update({ cursor, last_synced_at: new Date().toISOString() })
    .eq("id", institutionId)

  // Refresh account balances
  const balances = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
  })

  for (const account of balances.data.accounts) {
    await supabase
      .from("accounts")
      .update({
        current_balance: account.balances.current,
        available_balance: account.balances.available,
        limit_balance: account.balances.limit,
        updated_at: new Date().toISOString(),
      })
      .eq("plaid_account_id", account.account_id)
      .eq("user_id", institution.user_id)
  }
}
