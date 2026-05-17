import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncInstitution } from "@/lib/plaid/sync"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { institution_id } = body

  if (institution_id) {
    // Sync a specific institution
    const { data: institution } = await supabase
      .from("institutions")
      .select("id")
      .eq("id", institution_id)
      .eq("user_id", user.id)
      .single()

    if (!institution) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await syncInstitution(institution_id)
  } else {
    // Sync all institutions for this user
    const { data: institutions } = await supabase
      .from("institutions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")

    await Promise.all((institutions ?? []).map((i) => syncInstitution(i.id)))
  }

  return NextResponse.json({ success: true, synced_at: new Date().toISOString() })
}
