import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { ptReviewSchema } from "@/lib/validations/pt"

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

    const body = await req.json()
    const parsed = ptReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { rating, comment } = parsed.data

    // Fetch the session
    const [session] = await sql`
      SELECT * FROM public.pt_sessions WHERE id = ${id} AND member_id = ${user.id} LIMIT 1
    `

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau Anda tidak berhak mengulas sesi ini" }, { status: 404 })
    }

    // Check if already reviewed
    const [existingReview] = await sql`
      SELECT id FROM public.pt_reviews WHERE session_id = ${id} LIMIT 1
    `
    if (existingReview) {
      return NextResponse.json({ error: "Sesi ini sudah diulas sebelumnya" }, { status: 400 })
    }

    // Insert review and recalculate PT aggregate rating in a transaction
    await sql.begin(async (sqlTrans) => {
      // 1. Insert review
      await sqlTrans`
        INSERT INTO public.pt_reviews (session_id, member_id, pt_id, rating, comment)
        VALUES (${id}, ${user.id}, ${session.pt_id}, ${rating}, ${comment || null})
      `

      // 2. Calculate new average rating
      const [avgData] = await sqlTrans`
        SELECT AVG(rating)::numeric(3,2) as new_rating
        FROM public.pt_reviews
        WHERE pt_id = ${session.pt_id}
      `

      const newRating = avgData?.new_rating || rating

      // 3. Update personal trainer aggregate rating
      await sqlTrans`
        UPDATE public.personal_trainers
        SET rating = ${newRating}
        WHERE id = ${session.pt_id}
      `
    })

    return NextResponse.json({ success: true, message: "Ulasan berhasil disimpan" })
  } catch (err: any) {
    console.error("POST pt review failed:", err)
    return NextResponse.json({ error: err.message || "Gagal menyimpan ulasan" }, { status: 500 })
  }
}
