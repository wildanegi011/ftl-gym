import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { face_embedding, liveness_passed } = body // face_embedding: array of 128 floats

    if (!face_embedding || !Array.isArray(face_embedding) || face_embedding.length !== 128) {
      return NextResponse.json({ error: "Embedding wajah tidak valid (harus array 128 float)" }, { status: 400 })
    }

    // liveness_passed is optional - smile detection on client serves as liveness check

    // 1. Perform pgvector cosine distance search in PostgreSQL
    // Convert array of floats to PostgreSQL vector literal: '[0.1, 0.2, ...]'
    const vectorLiteral = `[${face_embedding.join(",")}]`

    const [matchedMember] = await sql`
      SELECT 
        p.id, 
        p.full_name, 
        p.role, 
        m.status as membership_status,
        p.face_embedding <=> ${vectorLiteral}::vector as distance
      FROM public.profiles p
      LEFT JOIN (
        SELECT DISTINCT ON (member_id) status, member_id
        FROM public.memberships 
        ORDER BY member_id, created_at DESC
      ) m ON p.id = m.member_id
      WHERE p.face_embedding IS NOT NULL AND p.role = 'member'
      ORDER BY p.face_embedding <=> ${vectorLiteral}::vector ASC
      LIMIT 1
    `

    if (!matchedMember) {
      return NextResponse.json({ error: "Wajah Anda tidak dikenali. Silakan hubungi admin untuk pendaftaran wajah." }, { status: 404 })
    }

    // Biometric match threshold check (typically < 0.45 for cosine distance on pgvector)
    const MATCH_THRESHOLD = 0.45
    if (matchedMember.distance > MATCH_THRESHOLD) {
      return NextResponse.json({ error: "Wajah Anda tidak terdaftar dalam database kami." }, { status: 404 })
    }

    const memberId = matchedMember.id

    // 2. Check if currently blocked due to previous failures
    const [activeBlock] = await sql`
      SELECT blocked_until, reason FROM public.checkin_blocks
      WHERE member_id = ${memberId} AND blocked_until > now()
      LIMIT 1
    `

    if (activeBlock) {
      const minutesLeft = Math.ceil((new Date(activeBlock.blocked_until).getTime() - Date.now()) / 60000)
      return NextResponse.json({ 
        error: `Check-in diblokir sementara: ${activeBlock.reason || 'Terlalu banyak percobaan gagal'}. Sisa waktu blokir: ${minutesLeft} menit.` 
      }, { status: 429 })
    }

    // 3. Enforce active membership check
    if (matchedMember.membership_status !== "active") {
      return NextResponse.json({ 
        error: `Check-in ditolak: Keanggotaan ${matchedMember.full_name} sedang ${matchedMember.membership_status?.toUpperCase()}` 
      }, { status: 403 })
    }

    // 4. Enforce 1 check-in per calendar day restriction
    const todayStr = new Date().toISOString().split("T")[0]
    const [existingCheckin] = await sql`
      SELECT id FROM public.checkins
      WHERE member_id = ${memberId}
        AND checked_in_at::date = ${todayStr}::date
      LIMIT 1
    `

    if (existingCheckin) {
      return NextResponse.json({ 
        error: `Check-in ditolak: Anda sudah melakukan check-in hari ini!` 
      }, { status: 400 })
    }

    // 5. Insert successful face check-in log
    const [newCheckin] = await sql`
      INSERT INTO public.checkins (member_id, method, liveness_passed)
      VALUES (${memberId}, 'face', true)
      RETURNING *
    `

    // 6. Fetch enriched member profile for display on kiosk
    const [memberProfile] = await sql`
      SELECT p.full_name, p.avatar_url, p.face_photo_url, m.type as membership_type
      FROM public.profiles p
      LEFT JOIN (
        SELECT DISTINCT ON (member_id) type, member_id
        FROM public.memberships WHERE status = 'active'
        ORDER BY member_id, created_at DESC
      ) m ON p.id = m.member_id
      WHERE p.id = ${memberId}
    `

    // Fetch today's booked classes
    const todayClasses = await sql`
      SELECT c.name, c.scheduled_at, c.duration_minutes, pt.full_name as trainer_name
      FROM public.bookings b
      JOIN public.classes c ON b.class_id = c.id
      LEFT JOIN public.profiles pt ON c.trainer_id = pt.id
      WHERE b.member_id = ${memberId}
        AND b.status = 'confirmed'
        AND c.scheduled_at::date = ${todayStr}::date
      ORDER BY c.scheduled_at ASC
    `

    // Fetch assigned PT trainer
    const [ptInfo] = await sql`
      SELECT pt_profile.full_name as pt_name, pt_profile.avatar_url as pt_avatar,
             psp.session_count, mpp.sessions_remaining
      FROM public.member_pt_packages mpp
      JOIN public.pt_session_packages psp ON mpp.package_id = psp.id
      JOIN public.profiles pt_profile ON psp.pt_id = pt_profile.id
      WHERE mpp.member_id = ${memberId}
        AND mpp.payment_status = 'paid'
        AND mpp.sessions_remaining > 0
      ORDER BY mpp.purchased_at DESC
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      message: `Check-in Berhasil! Selamat datang di FTL Gym, ${matchedMember.full_name}.`,
      data: {
        ...newCheckin,
        full_name: memberProfile?.full_name || matchedMember.full_name,
        avatar_url: memberProfile?.face_photo_url || memberProfile?.avatar_url || null,
        membership_type: memberProfile?.membership_type || null,
        classes: todayClasses || [],
        trainer: ptInfo || null,
      }
    })
  } catch (err: any) {
    console.error("Biometric match API failed:", err)
    return NextResponse.json({ error: err.message || "Gagal memproses check-in wajah" }, { status: 500 })
  }
}
