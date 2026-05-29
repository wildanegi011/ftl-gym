import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch member status and check if active
    const [member] = await sql`
      SELECT 
        p.role, 
        m.status as membership_status
      FROM public.profiles p
      LEFT JOIN (
        SELECT DISTINCT ON (member_id) status, member_id
        FROM public.memberships 
        ORDER BY member_id, created_at DESC
      ) m ON p.id = m.member_id
      WHERE p.id = ${user.id}
      LIMIT 1
    `

    if (!member || member.role !== "member") {
      return NextResponse.json({ error: "Hanya akun member yang dapat memesan kelas studio" }, { status: 403 })
    }

    if (member.membership_status !== "active") {
      return NextResponse.json({ error: "Membership Anda tidak aktif atau ditangguhkan. Silakan aktifkan langganan Anda terlebih dahulu." }, { status: 403 })
    }

    // Transaction to safely book slot and check capacity limits
    const bookingResult = await sql.begin(async (sqlTrans) => {
      // Fetch class details and lock row for update to prevent race conditions
      const [cls] = await sqlTrans`
        SELECT id, capacity, is_active 
        FROM public.classes 
        WHERE id = ${id} 
        FOR UPDATE
      `

      if (!cls) {
        throw new Error("Kelas tidak ditemukan")
      }

      if (!cls.is_active) {
        throw new Error("Kelas ini sedang tidak aktif")
      }

      // Check if already booked
      const [existingBooking] = await sqlTrans`
        SELECT id FROM public.bookings 
        WHERE class_id = ${id} AND member_id = ${user.id} AND status = 'confirmed' 
        LIMIT 1
      `

      if (existingBooking) {
        throw new Error("Anda sudah memesan kelas ini sebelumnya")
      }

      // Get count of confirmed bookings
      const [countData] = await sqlTrans`
        SELECT COUNT(*)::int as count 
        FROM public.bookings 
        WHERE class_id = ${id} AND status = 'confirmed'
      `

      if (countData.count >= cls.capacity) {
        throw new Error("Kapasitas kelas studio sudah penuh")
      }

      // Insert new booking
      const [newBooking] = await sqlTrans`
        INSERT INTO public.bookings (class_id, member_id, status)
        VALUES (${id}, ${user.id}, 'confirmed')
        RETURNING *
      `

      return newBooking
    })

    return NextResponse.json({ success: true, data: bookingResult })
  } catch (err: any) {
    console.error("POST booking failed:", err)
    return NextResponse.json({ error: err.message || "Gagal memesan kelas studio" }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete booking (or set to cancelled)
    const [deleted] = await sql`
      DELETE FROM public.bookings
      WHERE class_id = ${id} AND member_id = ${user.id} AND status = 'confirmed'
      RETURNING *
    `

    if (!deleted) {
      return NextResponse.json({ error: "Anda tidak terdaftar di kelas studio ini" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Pemesanan kelas berhasil dibatalkan" })
  } catch (err: any) {
    console.error("DELETE booking failed:", err)
    return NextResponse.json({ error: err.message || "Gagal membatalkan pemesanan kelas" }, { status: 500 })
  }
}
