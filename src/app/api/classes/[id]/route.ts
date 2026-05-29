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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canManage())) {
    return NextResponse.json({ error: "Unauthorized: Admin or Trainer role required" }, { status: 403 })
  }

  try {
    const { id } = await params
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
          AND id != ${id}
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

    const [updatedClass] = await sql`
      UPDATE public.classes
      SET 
        name = ${name},
        description = ${description || null},
        trainer_id = ${trainer_id || null},
        capacity = ${capacity},
        day_of_week = ${day_of_week},
        start_time = ${start_time},
        scheduled_at = ${computedScheduledAt.toISOString()},
        duration_minutes = ${duration_minutes},
        is_active = ${is_active}
      WHERE id = ${id}
      RETURNING *
    `

    if (!updatedClass) {
      return NextResponse.json({ error: "Jadwal kelas tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updatedClass })
  } catch (err: any) {
    console.error("PATCH class failed:", err)
    return NextResponse.json({ error: err.message || "Gagal memperbarui jadwal kelas studio" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canManage())) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 })
  }

  try {
    const { id } = await params
    const [deleted] = await sql`
      DELETE FROM public.classes
      WHERE id = ${id}
      RETURNING *
    `

    if (!deleted) {
      return NextResponse.json({ error: "Jadwal kelas tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Jadwal kelas berhasil dihapus" })
  } catch (err: any) {
    console.error("DELETE class failed:", err)
    return NextResponse.json({ error: err.message || "Gagal menghapus jadwal kelas studio" }, { status: 500 })
  }
}
