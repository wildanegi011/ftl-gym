import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Simple keyword-based intent detection supporting both English and Indonesian, defaulting to English
function detectIntent(text: string): { intent: string; params: Record<string, any> } {
  const lower = text.toLowerCase().trim()

  // Classes
  if (/(kelas|class|schedule|jadwal).*(hari ini|today)/i.test(lower) || /(kelas|class|schedule)/.test(lower) && !/(besok|tomorrow)/.test(lower)) {
    return { intent: "classes_today", params: {} }
  }
  if (/(kelas|class|schedule|jadwal).*(besok|tomorrow)/i.test(lower)) {
    return { intent: "classes_tomorrow", params: {} }
  }
  if (/(kelas|class|schedule|jadwal).*(minggu ini|this week)/i.test(lower)) {
    return { intent: "classes_week", params: {} }
  }

  // Trainer
  if (/(trainer|pelatih|coach|pt|personal)/i.test(lower) && /(siapa|saya|info|detail|who|my)/i.test(lower)) {
    return { intent: "my_trainer", params: {} }
  }
  if (/(sesi|session|latihan|workout).*(pt|trainer|pelatih|coach|selanjut|berikut|next)/i.test(lower)) {
    return { intent: "next_pt_session", params: {} }
  }
  if (/(sisa.*sesi|kuota|remaining|session.*left|credits)/i.test(lower)) {
    return { intent: "pt_remaining", params: {} }
  }

  // Membership
  if (/(member|keanggotaan|langganan|membership).*(sisa|expire|berapa|kapan|habis|days.*left)/i.test(lower) || /(sisa.*member|expire)/i.test(lower)) {
    return { intent: "membership_info", params: {} }
  }

  // Check-in stats
  if (/(berapa.*kali|total.*datang|kunjung|check.?in|how.*many.*times).*(bulan|month)/i.test(lower)) {
    return { intent: "checkin_count_month", params: {} }
  }
  if (/(streak|berturut|consecutive)/i.test(lower)) {
    return { intent: "checkin_streak", params: {} }
  }

  // Greeting
  if (/(halo|hai|hi|hello|hey|assalam|good|morning|afternoon|evening)/i.test(lower)) {
    return { intent: "greeting", params: {} }
  }

  // Fallback
  return { intent: "unknown", params: {} }
}

async function handleIntent(intent: string, memberId: string): Promise<string> {
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0]

  switch (intent) {
    case "greeting": {
      const hour = now.getHours()
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
      const [profile] = await sql`SELECT full_name FROM public.profiles WHERE id = ${memberId}`
      return `${greeting}, ${profile?.full_name || "Member"}! How can I help you today? You can ask me about today's classes, your trainer, next PT session, or membership status.`
    }

    case "classes_today": {
      const classes = await sql`
        SELECT c.name, c.scheduled_at, c.duration_minutes, 
               pt.full_name as trainer_name, c.capacity,
               (SELECT COUNT(*) FROM public.bookings WHERE class_id = c.id AND status = 'confirmed') as booked
        FROM public.classes c
        LEFT JOIN public.profiles pt ON c.trainer_id = pt.id
        WHERE c.scheduled_at::date = ${todayStr}::date AND c.is_active = true
        ORDER BY c.scheduled_at ASC
      `
      if (classes.length === 0) return "There are no classes scheduled for today."
      
      const list = classes.map((c: any) => {
        const time = new Date(c.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        const remaining = c.capacity - Number(c.booked)
        return `${c.name} at ${time} with ${c.trainer_name || 'instructor'}${remaining > 0 ? `, ${remaining} slots left` : ', fully booked'}`
      }).join(". ")
      
      return `Today we have ${classes.length} classes: ${list}.`
    }

    case "classes_tomorrow": {
      const classes = await sql`
        SELECT c.name, c.scheduled_at, c.duration_minutes, pt.full_name as trainer_name
        FROM public.classes c
        LEFT JOIN public.profiles pt ON c.trainer_id = pt.id
        WHERE c.scheduled_at::date = ${tomorrowStr}::date AND c.is_active = true
        ORDER BY c.scheduled_at ASC
      `
      if (classes.length === 0) return "No classes scheduled for tomorrow yet."
      
      const list = classes.map((c: any) => {
        const time = new Date(c.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        return `${c.name} at ${time} with ${c.trainer_name || 'instructor'}`
      }).join(". ")
      
      return `Tomorrow we have ${classes.length} classes: ${list}.`
    }

    case "classes_week": {
      const endWeek = new Date(now)
      endWeek.setDate(endWeek.getDate() + (7 - endWeek.getDay()))
      const endWeekStr = endWeek.toISOString().split("T")[0]
      
      const classes = await sql`
        SELECT c.name, c.scheduled_at, pt.full_name as trainer_name
        FROM public.classes c
        LEFT JOIN public.profiles pt ON c.trainer_id = pt.id
        WHERE c.scheduled_at::date >= ${todayStr}::date 
          AND c.scheduled_at::date <= ${endWeekStr}::date 
          AND c.is_active = true
        ORDER BY c.scheduled_at ASC
        LIMIT 10
      `
      if (classes.length === 0) return "No classes scheduled for this week."
      
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      const list = classes.map((c: any) => {
        const d = new Date(c.scheduled_at)
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        return `${days[d.getDay()]} ${c.name} at ${time}`
      }).join(". ")
      
      return `This week we have ${classes.length} classes: ${list}.`
    }

    case "my_trainer": {
      const [ptInfo] = await sql`
        SELECT pt_profile.full_name as pt_name, pt.bio, pt.certifications, pt.rating,
               psp.session_count, mpp.sessions_remaining
        FROM public.member_pt_packages mpp
        JOIN public.pt_session_packages psp ON mpp.package_id = psp.id
        JOIN public.personal_trainers pt ON psp.pt_id = pt.id
        JOIN public.profiles pt_profile ON pt.id = pt_profile.id
        WHERE mpp.member_id = ${memberId}
          AND mpp.payment_status = 'paid'
        ORDER BY mpp.purchased_at DESC
        LIMIT 1
      `
      if (!ptInfo) return "You do not have a registered personal trainer yet. Please select a PT package in the member application."
      
      let response = `Your personal trainer is ${ptInfo.pt_name}`
      if (ptInfo.certifications) response += `, certified in ${ptInfo.certifications}`
      if (ptInfo.rating > 0) response += `, rated ${ptInfo.rating} stars`
      response += `. Remaining session count: ${ptInfo.sessions_remaining} out of ${ptInfo.session_count} sessions.`
      return response
    }

    case "next_pt_session": {
      const [session] = await sql`
        SELECT s.scheduled_at, s.duration_minutes, s.status,
               pt_profile.full_name as pt_name
        FROM public.pt_sessions s
        JOIN public.profiles pt_profile ON s.pt_id = pt_profile.id
        WHERE s.member_id = ${memberId}
          AND s.scheduled_at > now()
          AND s.status IN ('pending', 'confirmed')
        ORDER BY s.scheduled_at ASC
        LIMIT 1
      `
      if (!session) return "You do not have any scheduled PT sessions. Please book one in the member application."
      
      const d = new Date(session.scheduled_at)
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const dateStr = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
      
      return `Your next PT session with ${session.pt_name} is scheduled on ${dateStr} at ${time}, duration ${session.duration_minutes} minutes. Status: ${session.status === 'confirmed' ? 'Confirmed' : 'Pending confirmation'}.`
    }

    case "pt_remaining": {
      const packages = await sql`
        SELECT pt_profile.full_name as pt_name, mpp.sessions_remaining, psp.session_count
        FROM public.member_pt_packages mpp
        JOIN public.pt_session_packages psp ON mpp.package_id = psp.id
        JOIN public.profiles pt_profile ON psp.pt_id = pt_profile.id
        WHERE mpp.member_id = ${memberId}
          AND mpp.payment_status = 'paid'
          AND mpp.sessions_remaining > 0
        ORDER BY mpp.purchased_at DESC
      `
      if (packages.length === 0) return "You do not have any active PT session credits right now."
      
      const list = packages.map((p: any) => `${p.pt_name}: ${p.sessions_remaining} of ${p.session_count} sessions remaining`).join(". ")
      return `Your active PT session credits: ${list}.`
    }

    case "membership_info": {
      const [membership] = await sql`
        SELECT type, status, start_date, end_date
        FROM public.memberships
        WHERE member_id = ${memberId} AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `
      if (!membership) return "You do not have an active membership at this moment. Please contact our support or administrator for activation."
      
      const endDate = membership.end_date ? new Date(membership.end_date) : null
      const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
      
      let response = `Your membership is ${membership.type?.toUpperCase()} Member, status ${membership.status === 'active' ? 'Active' : membership.status}.`
      if (daysLeft !== null && endDate) {
        response += ` Valid until ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}, with ${daysLeft} days remaining.`
      }
      return response
    }

    case "checkin_count_month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
      const [result] = await sql`
        SELECT COUNT(*) as total FROM public.checkins
        WHERE member_id = ${memberId} AND checked_in_at::date >= ${firstDay}::date
      `
      const total = Number(result?.total || 0)
      const monthName = now.toLocaleDateString('en-US', { month: 'long' })
      return `For this month of ${monthName}, you have checked in ${total} times. ${total >= 20 ? 'Incredible consistency, keep it up!' : total >= 10 ? 'Great job, keep pushing!' : 'Let\'s try to hit the gym more often!'}`
    }

    case "checkin_streak": {
      const checkins = await sql`
        SELECT DISTINCT checked_in_at::date as check_date
        FROM public.checkins
        WHERE member_id = ${memberId}
        ORDER BY check_date DESC
        LIMIT 60
      `
      
      let streak = 0
      const today = new Date(todayStr)
      for (let i = 0; i < checkins.length; i++) {
        const expected = new Date(today)
        expected.setDate(expected.getDate() - i)
        const checkDate = new Date(checkins[i].check_date).toISOString().split("T")[0]
        if (checkDate === expected.toISOString().split("T")[0]) {
          streak++
        } else {
          break
        }
      }
      
      return `Your current consecutive check-in streak: ${streak} days! ${streak >= 7 ? '🔥 Outstanding streak, keep the fire burning!' : streak >= 3 ? '💪 Superb, stay consistent!' : 'Keep visiting frequently to build a strong habit!'}`
    }

    case "unknown":
    default:
      return "Sorry, I didn't quite catch that. You can ask me about today's classes, who is your personal trainer, next scheduled PT session, remaining membership, or check-ins this month."
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { member_id, query } = body

    if (!member_id || !query) {
      return NextResponse.json({ error: "member_id and query are required" }, { status: 400 })
    }

    const { intent, params } = detectIntent(query)
    const answer = await handleIntent(intent, member_id)

    return NextResponse.json({
      success: true,
      intent,
      answer,
    })
  } catch (err: any) {
    console.error("Assistant API error:", err)
    return NextResponse.json({ error: err.message || "Failed to process question" }, { status: 500 })
  }
}
