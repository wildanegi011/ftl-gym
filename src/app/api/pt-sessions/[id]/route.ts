import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"

export async function PATCH(
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

    const body = await req.json()
    const { status } = body // 'confirmed', 'rejected', 'cancelled'

    if (!["confirmed", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 })
    }

    // Determine user role
    const [profile] = await sql`
      SELECT role FROM public.profiles WHERE id = ${user.id} LIMIT 1
    `
    const role = profile?.role

    // Fetch the session
    const [session] = await sql`
      SELECT * FROM public.pt_sessions WHERE id = ${id} LIMIT 1
    `

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 })
    }

    // Security check
    if (role === "pt" && session.pt_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Sesi ini bukan milik Anda" }, { status: 403 })
    }
    if (role === "member" && session.member_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Sesi ini bukan milik Anda" }, { status: 403 })
    }

    // In a transaction, update session status and handle session refunds if rejected/cancelled
    const updatedSession = await sql.begin(async (sqlTrans) => {
      const [currSession] = await sqlTrans`
        SELECT * FROM public.pt_sessions WHERE id = ${id} FOR UPDATE
      `

      if (currSession.status === "completed") {
        throw new Error("Sesi yang sudah selesai tidak dapat diubah statusnya")
      }

      // If transition to rejected or cancelled from a status that was not already refunded
      const isRefundNeeded = 
        (status === "rejected" || status === "cancelled") && 
        currSession.status !== "rejected" && 
        currSession.status !== "cancelled"

      if (isRefundNeeded) {
        // Refund the session token back to the member package
        await sqlTrans`
          UPDATE public.member_pt_packages
          SET sessions_remaining = sessions_remaining + 1
          WHERE id = ${currSession.member_package_id}
        `
      }

      const [updated] = await sqlTrans`
        UPDATE public.pt_sessions
        SET status = ${status}
        WHERE id = ${id}
        RETURNING *
      `

      return updated
    })

    return NextResponse.json({ success: true, data: updatedSession })
  } catch (err: any) {
    console.error("PATCH pt session failed:", err)
    return NextResponse.json({ error: err.message || "Gagal mengubah status sesi PT" }, { status: 400 })
  }
}
