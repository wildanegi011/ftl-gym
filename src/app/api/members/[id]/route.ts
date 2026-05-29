import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { memberSchema } from "@/lib/validations/members"

// Helper to check if current user is admin
async function isAdmin() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) return false

    const [profile] = await sql`
      SELECT role FROM public.profiles 
      WHERE id = ${user.id} 
      LIMIT 1
    `
    return profile?.role === "admin"
  } catch (err) {
    console.error("Auth check failed:", err)
    return false
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { id } = await params

  try {
    // 1. Fetch profile with direct SQL join
    const [profile] = await sql`
      SELECT 
        p.id,
        p.full_name,
        p.phone,
        p.avatar_url,
        p.role,
        p.barcode,
        p.created_at,
        u.email
      FROM public.profiles p
      JOIN auth.users u ON p.id = u.id
      WHERE p.id = ${id}
      LIMIT 1
    `

    if (!profile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // 2. Fetch membership history (sorted by latest)
    const memberships = await sql`
      SELECT * FROM public.memberships
      WHERE member_id = ${id}
      ORDER BY created_at DESC
    `

    // 3. Fetch checkins history (join checked_in_by profile if available)
    const checkins = await sql`
      SELECT 
        c.id,
        c.method,
        c.liveness_passed,
        c.checked_in_at,
        admin.full_name as checked_in_by_name
      FROM public.checkins c
      LEFT JOIN public.profiles admin ON c.checked_in_by = admin.id
      WHERE c.member_id = ${id}
      ORDER BY c.checked_in_at DESC
    `

    // 4. Fetch booking history
    const bookings = await sql`
      SELECT 
        b.id,
        b.status,
        b.booked_at,
        c.name as class_name,
        c.day_of_week as class_day_of_week,
        c.start_time as class_start_time,
        c.scheduled_at as class_scheduled_at,
        c.duration_minutes as class_duration
      FROM public.bookings b
      JOIN public.classes c ON b.class_id = c.id
      WHERE b.member_id = ${id}
      ORDER BY b.booked_at DESC
    `

    // 5. Fetch payment records
    const payments = await sql`
      SELECT * FROM public.payments
      WHERE member_id = ${id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      data: {
        profile,
        memberships,
        checkins,
        bookings,
        payments,
      },
    })
  } catch (err: any) {
    console.error(`API GET member ${id} failed:`, err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = memberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { full_name, email, phone, membership_type, membership_status } = parsed.data

    // Use transaction to perform updates
    const result = await sql.begin(async (sqlTrans) => {
      // 1. Check if profile exists
      const [existingProfile] = await sqlTrans`
        SELECT id FROM public.profiles WHERE id = ${id} LIMIT 1
      `
      if (!existingProfile) {
        throw new Error("Profile not found")
      }

      // 2. Update auth.users email
      await sqlTrans`
        UPDATE auth.users
        SET email = ${email}
        WHERE id = ${id}
      `

      // 3. Update profiles table
      const [profile] = await sqlTrans`
        UPDATE public.profiles
        SET full_name = ${full_name}, phone = ${phone}
        WHERE id = ${id}
        RETURNING *
      `

      // 4. Update or Insert membership
      // Check if they have an existing membership
      const [existingMembership] = await sqlTrans`
        SELECT * FROM public.memberships 
        WHERE member_id = ${id} 
        ORDER BY created_at DESC 
        LIMIT 1
      `

      const priceMap: Record<string, number> = {
        basic: 350000,
        premium: 600000,
        vip: 900000,
      }
      const price = priceMap[membership_type] || 350000

      let membership
      if (existingMembership) {
        // Update the latest membership
        const [updatedMembership] = await sqlTrans`
          UPDATE public.memberships
          SET 
            type = ${membership_type}, 
            status = ${membership_status}, 
            price = ${price},
            start_date = ${membership_status === "active" ? (existingMembership.start_date || sqlTrans`CURRENT_DATE`) : existingMembership.start_date},
            end_date = ${membership_status === "active" ? (existingMembership.end_date || sqlTrans`CURRENT_DATE + INTERVAL '1 month'`) : existingMembership.end_date}
          WHERE id = ${existingMembership.id}
          RETURNING *
        `
        membership = updatedMembership
      } else {
        // Insert new membership
        const [insertedMembership] = await sqlTrans`
          INSERT INTO public.memberships (member_id, type, status, price, start_date, end_date)
          VALUES (
            ${id}, 
            ${membership_type}, 
            ${membership_status}, 
            ${price},
            ${membership_status === "active" ? sqlTrans`CURRENT_DATE` : null},
            ${membership_status === "active" ? sqlTrans`CURRENT_DATE + INTERVAL '1 month'` : null}
          )
          RETURNING *
        `
        membership = insertedMembership
      }

      return { profile, membership }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.profile.id,
        full_name: result.profile.full_name,
        email,
        phone: result.profile.phone,
        membership_type: result.membership.type,
        membership_status: result.membership.status,
      },
    })
  } catch (err: any) {
    console.error(`API PATCH member ${id} failed:`, err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { id } = await params

  try {
    // Delete user from auth.users (cascades to profiles, memberships, etc. thanks to foreign key constraint with cascade delete)
    const result = await sql`
      DELETE FROM auth.users
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Member fully deleted successfully" })
  } catch (err: any) {
    console.error(`API DELETE member ${id} failed:`, err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
