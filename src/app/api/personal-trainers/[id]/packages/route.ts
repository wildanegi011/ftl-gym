import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { ptPackageSchema } from "@/lib/validations/pt"

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packages = await sql`
      SELECT id, pt_id, session_count, price, duration_minutes, is_active
      FROM public.pt_session_packages
      WHERE pt_id = ${id}
      ORDER BY session_count ASC
    `
    return NextResponse.json({ data: packages })
  } catch (err: any) {
    console.error("GET pt packages failed:", err)
    return NextResponse.json({ error: "Gagal memuat paket sesi PT" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = ptPackageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { session_count, price, duration_minutes } = parsed.data

    const [newPackage] = await sql`
      INSERT INTO public.pt_session_packages (pt_id, session_count, price, duration_minutes)
      VALUES (${id}, ${session_count}, ${price}, ${duration_minutes})
      RETURNING *
    `

    return NextResponse.json({ success: true, data: newPackage })
  } catch (err: any) {
    console.error("POST pt package failed:", err)
    return NextResponse.json({ error: err.message || "Gagal membuat paket sesi PT" }, { status: 500 })
  }
}
