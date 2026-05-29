import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { sql } from "@/lib/db"
import { trainerSchema } from "@/lib/validations/trainers"

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

// Server-side Base64 Avatar Uploader helper
async function uploadAvatarServer(userId: string, base64Data: string): Promise<string | null> {
  try {
    // Parse base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return null
    }
    const contentType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')
    const fileExt = contentType.split('/').pop() || 'png'
    const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`

    // Create supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Ensure bucket exists
    try {
      await supabaseAdmin.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/*']
      })
    } catch (_) {}

    // Upload file
    const { error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      })

    if (error) {
      console.error("Server-side storage upload failed:", error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath)
    return urlData.publicUrl
  } catch (err) {
    console.error("uploadAvatarServer error:", err)
    return null
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  try {
    // Fetch all profiles from public.personal_trainers directly and join profiles with specialities aggregated
    const trainers = await sql`
      SELECT 
        p.id,
        p.full_name,
        p.phone,
        p.avatar_url,
        p.role,
        p.created_at,
        t.bio,
        t.certifications,
        t.rating,
        t.is_active,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
            FROM public.trainer_specialities ts
            JOIN public.specialities s ON ts.speciality_id = s.id
            WHERE ts.trainer_id = t.id
          ),
          '[]'::json
        ) as specialities
      FROM public.personal_trainers t
      JOIN public.profiles p ON t.id = p.id
      ORDER BY p.created_at DESC
    `

    // Extract emails from auth.users
    const userIds = trainers.map((t) => t.id)
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

    const formattedTrainers = trainers.map((t) => ({
      ...t,
      email: emailsMap[t.id] || "",
    }))

    return NextResponse.json({ data: formattedTrainers })
  } catch (err: any) {
    console.error("API GET trainers failed:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { avatar_base64, ...rest } = body
    const parsed = trainerSchema.safeParse(rest)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { full_name, email, phone, specialities, bio, certifications, is_active } = parsed.data

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

    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password: "ChangeMe123!",
      options: {
        data: {
          full_name,
          role: "pt",
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create user in Auth" }, { status: 400 })
    }

    const userId = authData.user.id

    // Upload avatar if provided
    let avatarUrl = null
    if (avatar_base64) {
      avatarUrl = await uploadAvatarServer(userId, avatar_base64)
    }

    // Insert into profiles, personal_trainers, and specialties in a transaction
    const result = await sql.begin(async (sqlTrans) => {
      const [profile] = await sqlTrans`
        INSERT INTO public.profiles (id, full_name, phone, role, avatar_url)
        VALUES (${userId}, ${full_name}, ${phone || null}, 'pt', ${avatarUrl})
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, avatar_url = EXCLUDED.avatar_url
        RETURNING *
      `

      const [trainer] = await sqlTrans`
        INSERT INTO public.personal_trainers (id, bio, certifications, is_active)
        VALUES (${userId}, ${bio}, ${certifications || null}, ${is_active})
        ON CONFLICT (id) DO UPDATE
        SET bio = EXCLUDED.bio, certifications = EXCLUDED.certifications, is_active = EXCLUDED.is_active
        RETURNING *
      `

      // Insert specialties relations
      if (specialities && specialities.length > 0) {
        for (const specId of specialities) {
          await sqlTrans`
            INSERT INTO public.trainer_specialities (trainer_id, speciality_id)
            VALUES (${userId}, ${specId})
            ON CONFLICT (trainer_id, speciality_id) DO NOTHING
          `
        }
      }

      return { profile, trainer }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.profile.id,
        full_name: result.profile.full_name,
        email,
        phone: result.profile.phone,
        avatar_url: result.profile.avatar_url,
        specialities,
        bio: result.trainer.bio,
        certifications: result.trainer.certifications,
        is_active: result.trainer.is_active,
      },
    })
  } catch (err: any) {
    console.error("API POST trainer failed:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, avatar_url, avatar_base64, ...rest } = body
    
    if (!id) {
      return NextResponse.json({ error: "Trainer ID is required" }, { status: 400 })
    }

    const parsed = trainerSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { full_name, email, phone, specialities, bio, certifications, is_active } = parsed.data

    let finalAvatarUrl = avatar_url || null
    if (avatar_base64) {
      const uploadedUrl = await uploadAvatarServer(id, avatar_base64)
      if (uploadedUrl) {
        finalAvatarUrl = uploadedUrl
      }
    }

    const result = await sql.begin(async (sqlTrans) => {
      // Check if profile exists
      const [existingProfile] = await sqlTrans`
        SELECT id FROM public.profiles WHERE id = ${id} LIMIT 1
      `
      if (!existingProfile) {
        throw new Error("Trainer profile not found")
      }

      // Update email in auth.users
      await sqlTrans`
        UPDATE auth.users
        SET email = ${email}
        WHERE id = ${id}
      `

      // Update public.profiles
      const [profile] = await sqlTrans`
        UPDATE public.profiles
        SET 
          full_name = ${full_name}, 
          phone = ${phone || null},
          avatar_url = ${finalAvatarUrl}
        WHERE id = ${id}
        RETURNING *
      `

      // Update public.personal_trainers
      const [trainer] = await sqlTrans`
        INSERT INTO public.personal_trainers (id, bio, certifications, is_active)
        VALUES (${id}, ${bio}, ${certifications || null}, ${is_active})
        ON CONFLICT (id) DO UPDATE
        SET bio = EXCLUDED.bio, certifications = EXCLUDED.certifications, is_active = EXCLUDED.is_active
        RETURNING *
      `

      // Clear existing specialities and insert new ones
      await sqlTrans`
        DELETE FROM public.trainer_specialities
        WHERE trainer_id = ${id}
      `

      if (specialities && specialities.length > 0) {
        for (const specId of specialities) {
          await sqlTrans`
            INSERT INTO public.trainer_specialities (trainer_id, speciality_id)
            VALUES (${id}, ${specId})
            ON CONFLICT (trainer_id, speciality_id) DO NOTHING
          `
        }
      }

      return { profile, trainer }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.profile.id,
        full_name: result.profile.full_name,
        email,
        phone: result.profile.phone,
        avatar_url: result.profile.avatar_url,
        specialities,
        bio: result.trainer.bio,
        certifications: result.trainer.certifications,
        is_active: result.trainer.is_active,
      },
    })
  } catch (err: any) {
    console.error("API PATCH trainer failed:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
