import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"

async function isAdmin() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false
    const [profile] = await sql`
      SELECT role FROM public.profiles WHERE id = ${user.id} LIMIT 1
    `
    return profile?.role === "admin"
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
  }

  try {
    // Fetch all payments joined with member profile
    const payments = await sql`
      SELECT 
        pay.id,
        pay.member_id,
        pay.reference_id,
        pay.reference_type,
        pay.amount,
        pay.xendit_invoice_id,
        pay.xendit_external_id,
        pay.method,
        pay.status,
        pay.paid_at,
        pay.invoice_url,
        pay.created_at,
        m_profile.full_name as member_name,
        m_profile.avatar_url as member_avatar
      FROM public.payments pay
      JOIN public.profiles m_profile ON pay.member_id = m_profile.id
      ORDER BY pay.created_at DESC
    `

    // Extract emails from auth.users
    const memberIds = payments.map((p: any) => p.member_id).filter(Boolean)
    let emailsMap: Record<string, string> = {}
    if (memberIds.length > 0) {
      const usersData = await sql`
        SELECT id, email FROM auth.users WHERE id = ANY(${memberIds})
      `
      usersData.forEach((u) => {
        emailsMap[u.id] = u.email || ""
      })
    }

    const formattedPayments = payments.map((p: any) => ({
      ...p,
      member_email: emailsMap[p.member_id] || "",
    }))

    return NextResponse.json({ data: formattedPayments })
  } catch (err: any) {
    console.error("GET admin payments failed:", err)
    return NextResponse.json({ error: "Gagal memuat daftar riwayat pembayaran" }, { status: 500 })
  }
}
