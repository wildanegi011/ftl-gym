import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { classSchema } from "@/lib/validations/classes"

async function canManage() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false
    const [profile] = await sql`
      SELECT role FROM public.profiles WHERE id = ${user.id} LIMIT 1
    `
    return ["admin", "trainer"].includes(profile?.role || "")
  } catch {
    return false
  }
}

function getNextOccurrenceOfWeeklyTime(dayOfWeek: string, startTimeStr: string): Date {
  const daysMap: Record<string, number> = {
    'senin': 1, 'monday': 1,
    'selasa': 2, 'tuesday': 2,
    'rabu': 3, 'wednesday': 3,
    'kamis': 4, 'thursday': 4,
    'jumat': 5, 'friday': 5,
    'sabtu': 6, 'saturday': 6,
    'minggu': 0, 'sunday': 0
  }

  const targetDay = daysMap[dayOfWeek.toLowerCase()] ?? 1
  const [hours, minutes] = startTimeStr.split(':').map(Number)

  const now = new Date()
  
  // Set time components in local/server time
  const resultDate = new Date(now)
  resultDate.setHours(hours, minutes, 0, 0)

  // Calculate day difference
  let daysDiff = (targetDay - now.getDay() + 7) % 7
  
  // If target day is today but the time has already passed, schedule it for next week
  if (daysDiff === 0 && resultDate.getTime() < now.getTime()) {
    daysDiff = 7
  }
  
  resultDate.setDate(now.getDate() + daysDiff)
  return resultDate
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get("active_only") === "true"

    const classes = await sql`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.trainer_id,
        c.capacity,
        c.scheduled_at,
        c.day_of_week,
        c.start_time,
        c.duration_minutes,
        c.is_active,
        c.created_at,
        t_profile.full_name as trainer_name,
        t_profile.avatar_url as trainer_avatar,
        COALESCE(
          (SELECT COUNT(*)::int FROM public.bookings b WHERE b.class_id = c.id AND b.status = 'confirmed'),
          0
        ) as bookings_count,
        COALESCE(
          (SELECT EXISTS(
            SELECT 1 FROM public.bookings b 
            WHERE b.class_id = c.id AND b.member_id = ${userId} AND b.status = 'confirmed'
          )),
          false
        ) as is_booked
      FROM public.classes c
      LEFT JOIN public.profiles t_profile ON c.trainer_id = t_profile.id
      WHERE (${activeOnly} = false OR c.is_active = true)
      ORDER BY 
        CASE 
          WHEN LOWER(c.day_of_week) = 'senin' THEN 1
          WHEN LOWER(c.day_of_week) = 'selasa' THEN 2
          WHEN LOWER(c.day_of_week) = 'rabu' THEN 3
          WHEN LOWER(c.day_of_week) = 'kamis' THEN 4
          WHEN LOWER(c.day_of_week) = 'jumat' THEN 5
          WHEN LOWER(c.day_of_week) = 'sabtu' THEN 6
          WHEN LOWER(c.day_of_week) = 'minggu' THEN 7
          ELSE 8
        END ASC,
        c.start_time ASC
    `

    return NextResponse.json({ data: classes })
  } catch (err: any) {
    console.error("GET classes failed:", err)
    return NextResponse.json({ error: "Gagal memuat jadwal kelas studio" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await canManage())) {
    return NextResponse.json({ error: "Unauthorized: Admin or Trainer role required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = classSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { name, description, trainer_id, capacity, day_of_week, start_time, duration_minutes, is_active } = parsed.data

    // Check for trainer scheduling conflicts on the same day of the week
    if (trainer_id && is_active) {
      const existingClasses = await sql`
        SELECT id, name, start_time, duration_minutes 
        FROM public.classes 
        WHERE trainer_id = ${trainer_id} 
          AND LOWER(day_of_week) = LOWER(${day_of_week})
          AND is_active = true
      `

      const [newHours, newMinutes] = start_time.split(':').map(Number)
      const newStart = newHours * 60 + newMinutes
      const newEnd = newStart + duration_minutes

      for (const cls of existingClasses) {
        const [clsHours, clsMinutes] = cls.start_time.split(':').map(Number)
        const clsStart = clsHours * 60 + clsMinutes
        const clsEnd = clsStart + cls.duration_minutes

        if (newStart < clsEnd && newEnd > clsStart) {
          return NextResponse.json({ 
            error: `Trainer memiliki konflik jadwal! Instruktur ini sudah dijadwalkan mengampu kelas "${cls.name}" pada pukul ${cls.start_time} WIB (${cls.duration_minutes} menit) pada hari ${day_of_week}.` 
          }, { status: 400 })
        }
      }
    }

    // Compute scheduled_at automatically based on the recurring day and time
    const computedScheduledAt = getNextOccurrenceOfWeeklyTime(day_of_week, start_time)

    const [newClass] = await sql`
      INSERT INTO public.classes (
        name, description, trainer_id, capacity, day_of_week, start_time, scheduled_at, duration_minutes, is_active
      )
      VALUES (
        ${name}, ${description || null}, ${trainer_id || null}, ${capacity}, ${day_of_week}, ${start_time}, ${computedScheduledAt.toISOString()}, ${duration_minutes}, ${is_active}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, data: newClass })
  } catch (err: any) {
    console.error("POST class failed:", err)
    return NextResponse.json({ error: err.message || "Gagal membuat jadwal kelas studio" }, { status: 500 })
  }
}
