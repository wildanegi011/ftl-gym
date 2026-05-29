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
    // Fetch all memberships joined with member profile and payment info
    const memberships = await sql`
      SELECT 
        m.id,
        m.member_id,
        m.type as membership_type,
        m.status,
        m.start_date,
        m.end_date,
        m.price,
        m.created_at,
        p.full_name as member_name,
        p.avatar_url as member_avatar,
        pay.status as payment_status,
        pay.invoice_url
      FROM public.memberships m
      JOIN public.profiles p ON m.member_id = p.id
      LEFT JOIN public.payments pay ON pay.reference_id = m.id AND pay.reference_type = 'membership'
      ORDER BY m.created_at DESC
    `

    // Fetch emails
    const memberIds = memberships.map((m: any) => m.member_id).filter(Boolean)
    let emailsMap: Record<string, string> = {}
    if (memberIds.length > 0) {
      const usersData = await sql`
        SELECT id, email FROM auth.users WHERE id = ANY(${memberIds})
      `
      usersData.forEach((u) => {
        emailsMap[u.id] = u.email || ""
      })
    }

    const formatted = memberships.map((m: any) => ({
      ...m,
      member_email: emailsMap[m.member_id] || "",
    }))

    return NextResponse.json({ data: formatted })
  } catch (err: any) {
    console.error("GET admin memberships failed:", err)
    return NextResponse.json({ error: "Gagal memuat data membership" }, { status: 500 })
  }
}
