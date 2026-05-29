import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    // Fetch recent check-ins for admin stream
    const checkins = await sql`
      SELECT 
        c.id,
        c.method,
        c.liveness_passed,
        c.checked_in_at,
        p.full_name as member_name,
        p.avatar_url as member_avatar,
        p.membership_type
      FROM public.checkins c
      JOIN public.profiles p ON c.member_id = p.id
      ORDER BY c.checked_in_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ data: checkins })
  } catch (err: any) {
    console.error("GET checkins failed:", err)
    return NextResponse.json({ error: "Gagal memuat log check-in" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { barcode, member_id, method } = body // method: 'barcode' or 'manual'

    if (!["barcode", "manual"].includes(method)) {
      return NextResponse.json({ error: "Metode check-in tidak didukung" }, { status: 400 })
    }

    let targetMemberId = member_id

    // If barcode scan, resolve member ID from barcode string
    if (method === "barcode") {
      if (!barcode) {
        return NextResponse.json({ error: "Barcode wajib dikirim" }, { status: 452 })
      }

      const [profile] = await sql`
        SELECT 
          p.id, 
          p.full_name,
          m.status as membership_status
        FROM public.profiles p
        LEFT JOIN (
          SELECT DISTINCT ON (member_id) status, member_id
          FROM public.memberships 
          ORDER BY member_id, created_at DESC
        ) m ON p.id = m.member_id
        WHERE p.barcode = ${barcode}
        LIMIT 1
      `

      if (!profile) {
        return NextResponse.json({ error: "Member tidak terdaftar atau barcode tidak valid" }, { status: 404 })
      }

      targetMemberId = profile.id
    }

    // Fetch the profile
    const [profile] = await sql`
      SELECT 
        p.id, 
        p.full_name, 
        p.role,
        p.avatar_url,
        p.face_photo_url,
        m.status as membership_status,
        m.type as membership_type
      FROM public.profiles p
      LEFT JOIN (
        SELECT DISTINCT ON (member_id) status, type, member_id
        FROM public.memberships 
        ORDER BY member_id, created_at DESC
      ) m ON p.id = m.member_id
      WHERE p.id = ${targetMemberId}
      LIMIT 1
    `

    if (!profile) {
      return NextResponse.json({ error: "Data profil member tidak ditemukan" }, { status: 404 })
    }

    if (profile.role !== "member") {
      return NextResponse.json({ error: "Hanya akun member yang dapat melakukan check-in" }, { status: 403 })
    }

    if (profile.membership_status !== "active") {
      return NextResponse.json({ 
        error: `Check-in ditolak: Keanggotaan ${profile.full_name} sedang ${profile.membership_status?.toUpperCase() || 'INACTIVE'}` 
      }, { status: 403 })
    }

    // Check if user already checked in today (limit to once per calendar day)
    const todayStr = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const [existingCheckin] = await sql`
      SELECT id FROM public.checkins
      WHERE member_id = ${profile.id}
        AND checked_in_at::date = ${todayStr}::date
      LIMIT 1
    `

    if (existingCheckin) {
      return NextResponse.json({ 
        error: `Check-in ditolak: ${profile.full_name} sudah melakukan check-in hari ini!` 
      }, { status: 400 })
    }

    // Perform check-in insert
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const staffId = user?.id || null

    const [newCheckin] = await sql`
      INSERT INTO public.checkins (member_id, method, liveness_passed, checked_in_by)
      VALUES (${profile.id}, ${method}, true, ${staffId})
      RETURNING *
    `

    // Fetch enriched profile for kiosk display
    const todayClasses = await sql`
      SELECT c.name, c.scheduled_at, c.duration_minutes, pt.full_name as trainer_name
      FROM public.bookings b
      JOIN public.classes c ON b.class_id = c.id
      LEFT JOIN public.profiles pt ON c.trainer_id = pt.id
      WHERE b.member_id = ${profile.id}
        AND b.status = 'confirmed'
        AND c.scheduled_at::date = ${todayStr}::date
      ORDER BY c.scheduled_at ASC
    `

    const [ptInfo] = await sql`
      SELECT pt_profile.full_name as pt_name, pt_profile.avatar_url as pt_avatar,
             psp.session_count, mpp.sessions_remaining
      FROM public.member_pt_packages mpp
      JOIN public.pt_session_packages psp ON mpp.package_id = psp.id
      JOIN public.profiles pt_profile ON psp.pt_id = pt_profile.id
      WHERE mpp.member_id = ${profile.id}
        AND mpp.payment_status = 'paid'
        AND mpp.sessions_remaining > 0
      ORDER BY mpp.purchased_at DESC
      LIMIT 1
    `

    return NextResponse.json({ 
      success: true, 
      message: `Check-in Berhasil! Selamat datang di FTL Gym, ${profile.full_name}.`,
      data: {
        ...newCheckin,
        full_name: profile.full_name,
        avatar_url: profile.face_photo_url || profile.avatar_url || null,
        membership_type: profile.membership_type || null,
        classes: todayClasses || [],
        trainer: ptInfo || null,
      }
    })
  } catch (err: any) {
    console.error("POST checkin failed:", err)
    return NextResponse.json({ error: err.message || "Gagal memproses check-in" }, { status: 500 })
  }
}
