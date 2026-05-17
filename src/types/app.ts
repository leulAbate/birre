export type AccountType = "depository" | "investment" | "credit" | "loan" | "other"
export type AccountSubtype = "checking" | "savings" | "credit card" | "mortgage" | "student" | string

export interface Institution {
  id: string
  plaid_item_id: string
  institution_name: string
  logo_url: string | null
  primary_color: string | null
  status: "active" | "error" | "disconnected"
  error_code: string | null
  last_synced_at: string | null
  created_at: string
}

export interface Account {
  id: string
  institution_id: string
  plaid_account_id: string
  name: string
  official_name: string | null
  type: AccountType
  subtype: AccountSubtype | null
  current_balance: number | null
  available_balance: number | null
  limit_balance: number | null
  iso_currency_code: string
  mask: string | null
  is_hidden: boolean
  institution?: Institution
}

export interface Transaction {
  id: string
  account_id: string
  plaid_transaction_id: string
  amount: number
  iso_currency_code: string
  description: string
  merchant_name: string | null
  category: string | null
  personal_finance_category: string | null
  date: string
  pending: boolean
  logo_url: string | null
  note: string | null
  account?: Account
}

export interface Budget {
  id: string
  category: string
  amount: number
  period: "monthly" | "weekly"
  color: string | null
}

export interface Goal {
  id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  target_date: string | null
  account_id: string | null
  icon: string | null
  color: string | null
  is_complete: boolean
}
