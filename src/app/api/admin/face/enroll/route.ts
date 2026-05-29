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

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { member_id, face_embedding, avatar_url } = body

    if (!member_id) {
      return NextResponse.json({ error: "Member ID wajib dikirim" }, { status: 400 })
    }

    if (!face_embedding || !Array.isArray(face_embedding) || face_embedding.length !== 128) {
      return NextResponse.json({ error: "Embedding wajah tidak valid (harus array 128 float)" }, { status: 400 })
    }

    // Convert array of floats to PostgreSQL vector literal format: '[0.1, 0.2, ...]'
    const vectorLiteral = `[${face_embedding.join(",")}]`

    // Update member's face embedding baseline and optionally their avatar image URL
    const [updated] = await sql`
      UPDATE public.profiles
      SET 
        face_embedding = ${vectorLiteral}::vector,
        avatar_url = COALESCE(${avatar_url || null}, avatar_url)
      WHERE id = ${member_id}
      RETURNING id, full_name
    `

    if (!updated) {
      return NextResponse.json({ error: "Profil member tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Pendaftaran Biometrik Wajah ${updated.full_name} Berhasil! Wajah telah disimpan sebagai baseline.` 
    })
  } catch (err: any) {
    console.error("Biometric enrollment API failed:", err)
    return NextResponse.json({ error: err.message || "Gagal mendaftarkan biometrik wajah" }, { status: 500 })
  }
}
