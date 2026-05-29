import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
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

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const type = searchParams.get("type") || ""

  try {
    let query = sql`
      SELECT 
        p.id,
        p.full_name,
        p.phone,
        p.avatar_url,
        p.role,
        p.barcode,
        p.created_at,
        m.type as membership_type,
        m.status as membership_status,
        m.start_date,
        m.end_date,
        m.price as membership_price
      FROM public.profiles p
      LEFT JOIN (
        -- Select the latest membership for each profile
        SELECT DISTINCT ON (member_id) * 
        FROM public.memberships 
        ORDER BY member_id, created_at DESC
      ) m ON p.id = m.member_id
      WHERE p.role = 'member'
    `

    // Fetch all members that match
    const members = await sql`
      SELECT * FROM (${query}) AS sub
      WHERE 1=1
      ${search ? sql`AND (full_name ILIKE ${'%' + search + '%'} OR phone ILIKE ${'%' + search + '%'})` : sql``}
      ${status ? sql`AND membership_status = ${status}` : sql``}
      ${type ? sql`AND membership_type = ${type}` : sql``}
      ORDER BY created_at DESC
    `

    // Extract email from auth.users (since email is inside auth.users, and we are bypassing RLS, we can join it!)
    // Wait, let's fetch emails for these users from auth.users directly. Yes, auth.users is readable.
    const userIds = members.map((m) => m.id)
    let emailsMap: Record<string, string> = {}
    
    if (userIds.length > 0) {
      const usersData = await sql`
        SELECT id, email FROM auth.users 
        WHERE id = ANY(${userIds})
      `
      usersData.forEach((u) => {
        emailsMap[u.id] = u.email || ""
      })
    }

    const formattedMembers = members.map((m) => ({
      ...m,
      email: emailsMap[m.id] || "",
    }))

    return NextResponse.json({ data: formattedMembers })
  } catch (err) {
    console.error("API GET members failed:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = memberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { full_name, email, phone, membership_type, membership_status } = parsed.data

    // Check if email already exists in auth.users to prevent foreign key errors on profiles
    const [existingUser] = await sql`
      SELECT id FROM auth.users WHERE email = ${email} LIMIT 1
    `
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar. Gunakan email lain." }, { status: 400 })
    }

    // Create user in Auth
    const supabaseAnon = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    // Using a default temporary password
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password: "ChangeMe123!",
      options: {
        data: {
          full_name,
          role: "member",
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create user" }, { status: 400 })
    }

    const userId = authData.user.id

    // Use transaction to insert profile and membership
    const result = await sql.begin(async (sqlTrans) => {
      // Upsert profile record
      const [profile] = await sqlTrans`
        INSERT INTO public.profiles (id, full_name, phone, role)
        VALUES (${userId}, ${full_name}, ${phone}, 'member')
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
        RETURNING *
      `

      // Calculate price
      const priceMap: Record<string, number> = {
        basic: 350000,
        premium: 600000,
        vip: 900000,
      }
      const price = priceMap[membership_type] || 350000

      // Insert membership record
      const [membership] = await sqlTrans`
        INSERT INTO public.memberships (member_id, type, status, price, start_date, end_date)
        VALUES (
          ${userId}, 
          ${membership_type}, 
          ${membership_status}, 
          ${price},
          ${membership_status === "active" ? sqlTrans`CURRENT_DATE` : null},
          ${membership_status === "active" ? sqlTrans`CURRENT_DATE + INTERVAL '1 month'` : null}
        )
        RETURNING *
      `

      return { profile, membership }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.profile.id,
        full_name: result.profile.full_name,
        email,
        phone: result.profile.phone,
        role: result.profile.role,
        barcode: result.profile.barcode,
        membership_type: result.membership.type,
        membership_status: result.membership.status,
      },
    })
  } catch (err: any) {
    console.error("API POST member failed:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
