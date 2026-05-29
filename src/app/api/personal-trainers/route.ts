import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get("active_only") === "true"

    // Fetch all personal trainers (role = 'pt')
    // and join their bios, rating, specialties, and session packages
    const query = sql`
      SELECT 
        p.id,
        p.full_name,
        p.phone,
        p.avatar_url,
        p.role,
        p.created_at,
        pt.bio,
        pt.certifications,
        pt.rating,
        pt.is_active,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
            FROM public.trainer_specialities ts
            JOIN public.specialities s ON ts.speciality_id = s.id
            WHERE ts.trainer_id = p.id
          ),
          '[]'::json
        ) as specialities,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', pk.id, 'session_count', pk.session_count, 'price', pk.price, 'duration_minutes', pk.duration_minutes, 'is_active', pk.is_active))
            FROM public.pt_session_packages pk
            WHERE pk.pt_id = p.id AND (${activeOnly} = false OR pk.is_active = true)
          ),
          '[]'::json
        ) as packages
      FROM public.profiles p
      JOIN public.personal_trainers pt ON p.id = pt.id
      WHERE p.role = 'pt'
        AND (${activeOnly} = false OR pt.is_active = true)
      ORDER BY pt.rating DESC, p.full_name ASC
    `

    const trainers = await query

    return NextResponse.json({ data: trainers })
  } catch (err: any) {
    console.error("API GET personal-trainers failed:", err)
    return NextResponse.json({ error: err.message || "Gagal memuat data personal trainer" }, { status: 500 })
  }
}
