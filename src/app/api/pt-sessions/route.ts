import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { ptSessionSchema } from "@/lib/validations/pt"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Determine role of current user
    const [profile] = await sql`
      SELECT role FROM public.profiles WHERE id = ${user.id} LIMIT 1
    `
    const role = profile?.role

    let sessions = []
    if (role === "pt") {
      // PT view: list sessions booked with this PT, joined with member profile
      sessions = await sql`
        SELECT 
          s.id,
          s.scheduled_at,
          s.duration_minutes,
          s.status,
          s.notes,
          s.created_at,
          s.member_id,
          m_profile.full_name as member_name,
          m_profile.phone as member_phone
        FROM public.pt_sessions s
        JOIN public.profiles m_profile ON s.member_id = m_profile.id
        WHERE s.pt_id = ${user.id}
        ORDER BY s.scheduled_at DESC
      `
    } else {
      // Member view: list sessions booked by this member, joined with PT profile
      sessions = await sql`
        SELECT 
          s.id,
          s.scheduled_at,
          s.duration_minutes,
          s.status,
          s.notes,
          s.created_at,
          pt_profile.full_name as pt_name,
          pt_profile.avatar_url as pt_avatar,
          COALESCE(
            (SELECT rating FROM public.pt_reviews WHERE session_id = s.id LIMIT 1),
            0
          ) as rated
        FROM public.pt_sessions s
        JOIN public.profiles pt_profile ON s.pt_id = pt_profile.id
        WHERE s.member_id = ${user.id}
        ORDER BY s.scheduled_at DESC
      `
    }

    // To add emails to the profiles, let's fetch emails for pt view members
    if (role === "pt" && sessions.length > 0) {
      const memberIds = sessions.map((s: any) => s.member_id).filter(Boolean)
      let emailsMap: Record<string, string> = {}
      if (memberIds.length > 0) {
        const usersData = await sql`
          SELECT id, email FROM auth.users WHERE id = ANY(${memberIds})
        `
        usersData.forEach((u) => {
          emailsMap[u.id] = u.email || ""
        })
      }
      sessions = sessions.map((s: any) => ({
        ...s,
        member_email: emailsMap[s.member_id] || s.member_email || "",
      }))
    }

    return NextResponse.json({ data: sessions })
  } catch (err: any) {
    console.error("GET pt sessions failed:", err)
    return NextResponse.json({ error: "Gagal memuat sesi latihan PT" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = ptSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { member_package_id, scheduled_at, notes } = parsed.data

    // Start transaction to verify sessions and deduct sessions remaining
    const sessionResult = await sql.begin(async (sqlTrans) => {
      // 1. Verify that the package exists, is paid, and has remaining sessions
      const [mpp] = await sqlTrans`
        SELECT mpp.*, psp.pt_id, psp.duration_minutes
        FROM public.member_pt_packages mpp
        JOIN public.pt_session_packages psp ON mpp.package_id = psp.id
        WHERE mpp.id = ${member_package_id} AND mpp.member_id = ${user.id}
        FOR UPDATE
      `

      if (!mpp) {
        throw new Error("Paket personal trainer tidak ditemukan")
      }

      if (mpp.payment_status !== "paid") {
        throw new Error("Paket personal trainer belum dibayar")
      }

      if (mpp.sessions_remaining <= 0) {
        throw new Error("Kuota sesi paket personal trainer Anda sudah habis")
      }

      // 2. Decrement the sessions remaining
      await sqlTrans`
        UPDATE public.member_pt_packages
        SET sessions_remaining = sessions_remaining - 1
        WHERE id = ${member_package_id}
      `

      // 3. Create the pt_session record
      const [newSession] = await sqlTrans`
        INSERT INTO public.pt_sessions (
          member_package_id, pt_id, member_id, scheduled_at, duration_minutes, status, notes
        )
        VALUES (
          ${member_package_id}, ${mpp.pt_id}, ${user.id}, ${scheduled_at}, ${mpp.duration_minutes}, 'pending', ${notes || null}
        )
        RETURNING *
      `

      return newSession
    })

    return NextResponse.json({ success: true, data: sessionResult })
  } catch (err: any) {
    console.error("POST pt session failed:", err)
    return NextResponse.json({ error: err.message || "Gagal menjadwalkan sesi PT" }, { status: 400 })
  }
}
