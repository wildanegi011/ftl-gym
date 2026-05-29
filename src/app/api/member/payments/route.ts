import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch this member's payments
    const payments = await sql`
      SELECT 
        id,
        reference_id,
        reference_type,
        amount,
        xendit_invoice_id,
        xendit_external_id,
        method,
        status,
        paid_at,
        invoice_url,
        created_at
      FROM public.payments
      WHERE member_id = ${user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ data: payments })
  } catch (err: any) {
    console.error("GET member payments failed:", err)
    return NextResponse.json({ error: "Gagal memuat riwayat pembayaran Anda" }, { status: 500 })
  }
}
