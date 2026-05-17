export function calcNetWorth(accounts: { type: string; current_balance: number | null }[]) {
  let assets = 0
  let liabilities = 0

  for (const a of accounts) {
    if (a.current_balance == null) continue
    if (a.type === "credit" || a.type === "loan") {
      liabilities += a.current_balance
    } else {
      assets += a.current_balance
    }
  }

  return { assets, liabilities, netWorth: assets - liabilities }
}
