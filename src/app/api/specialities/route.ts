import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const specialities = await sql`
      SELECT id, name, description FROM public.specialities
      ORDER BY name ASC
    `
    return NextResponse.json({ data: specialities })
  } catch (err: any) {
    console.error("API GET specialities failed:", err)
    return NextResponse.json({ error: "Gagal memuat data spesialisasi" }, { status: 500 })
  }
}
