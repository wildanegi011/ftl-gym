'use server'

import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

export async function login(state: any, formData: FormData) {
  const supabase = await createClient()

  const data = Object.fromEntries(formData.entries())
  const parsed = loginSchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Invalid form data', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  // Fetch profile to redirect based on role
  let redirectPath = '/member/dashboard'
  if (authData?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
    
    const role = profile?.role || 'member'
    redirectPath = role === 'admin' 
      ? '/admin' 
      : role === 'trainer' 
      ? '/trainer/schedule' 
      : role === 'pt' 
      ? '/pt/sessions' 
      : '/member/dashboard'
  }

  revalidatePath('/', 'layout')
  redirect(redirectPath)
}

export async function register(state: any, formData: FormData) {
  const supabase = await createClient()

  const data = Object.fromEntries(formData.entries())
  const parsed = registerSchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Invalid form data', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        role: 'member', // default role
      }
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  if (authData.user) {
    // Insert into profiles (often handled by Supabase Trigger, but we can do it manually if no trigger exists)
    // For this implementation, we assume a trigger isn't set up yet or we do it explicitly.
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      role: 'member',
    })

    if (profileError) {
      console.error('Failed to create profile:', profileError)
      // We don't fail the registration, but log it
    }

    // Insert initial membership selection
    const { error: membershipError } = await supabase.from('memberships').insert({
      member_id: authData.user.id,
      type: parsed.data.membership_type,
      status: 'inactive', // inactive until paid
      price: parsed.data.membership_type === 'vip' ? 1000000 : parsed.data.membership_type === 'premium' ? 500000 : 250000,
    })
    
    if (membershipError) {
      console.error('Failed to create membership:', membershipError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/?registered=true')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) return { error: 'Email is required' }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

import { createXenditInvoice } from '@/lib/xendit'

export async function completeRegistration(data: { membership_type: string, pt_id?: string, pt_package_id?: string, full_name: string, phone: string, face_photo?: string, face_descriptor?: number[] }) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Upload face photo if provided — use service role client to bypass storage RLS
  let facePhotoUrl: string | undefined
  if (data.face_photo) {
    try {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )

      const base64Data = data.face_photo.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const filePath = `${user.id}.jpg`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('face_photos')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error('Failed to upload face photo:', uploadError.message)
      } else {
        const { data: urlData } = supabaseAdmin.storage.from('face_photos').getPublicUrl(filePath)
        facePhotoUrl = urlData.publicUrl
      }
    } catch (err) {
      console.error('Error processing face photo:', err)
    }
  }

  // Upsert profile (use raw SQL to also handle face_embedding vector type which PostgREST can't set)
  try {
    // Use real face descriptor from client if available, otherwise generate mock
    const hasFacePhoto = !!data.face_photo
    
    if (hasFacePhoto) {
      const embedding = (data.face_descriptor && data.face_descriptor.length === 128)
        ? data.face_descriptor
        : Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1)
      const vectorLiteral = `[${embedding.join(",")}]`

      await sql`
        INSERT INTO public.profiles (id, full_name, phone, role, avatar_url, face_photo_url, face_embedding)
        VALUES (
          ${user.id}, 
          ${data.full_name}, 
          ${data.phone}, 
          'member', 
          ${facePhotoUrl || null},
          ${facePhotoUrl || null},
          ${vectorLiteral}::vector
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
          face_photo_url = COALESCE(EXCLUDED.face_photo_url, public.profiles.face_photo_url),
          face_embedding = EXCLUDED.face_embedding
      `
    } else {
      await sql`
        INSERT INTO public.profiles (id, full_name, phone, role)
        VALUES (${user.id}, ${data.full_name}, ${data.phone}, 'member')
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone
      `
    }
  } catch (profileErr) {
    console.error('Failed to upsert profile with face embedding:', profileErr)
    return { error: 'Failed to update profile' }
  }

  // Calculate pricing
  const priceMap: Record<string, number> = {
    basic: 350000,
    premium: 600000,
    vip: 900000,
  }
  const membershipPrice = priceMap[data.membership_type] || 350000

  // 1. Insert membership with status inactive
  const { data: membership, error: membershipError } = await supabase.from('memberships').insert({
    member_id: user.id,
    type: data.membership_type,
    status: 'inactive', // inactive until paid
    price: membershipPrice,
  }).select('id').single()

  if (membershipError || !membership) {
    console.error('Failed to create membership:', membershipError)
    return { error: 'Failed to create membership' }
  }

  let totalAmount = membershipPrice
  let ptPackageIdCreated: string | null = null

  // 2. Fetch PT package details and insert member_pt_packages if provided
  if (data.pt_package_id) {
    const { data: ptPkg, error: ptPkgError } = await supabase
      .from('pt_session_packages')
      .select('price, session_count')
      .eq('id', data.pt_package_id)
      .single()

    if (ptPkgError || !ptPkg) {
      console.error('Failed to fetch PT package details:', ptPkgError)
      return { error: 'Failed to fetch personal trainer package details' }
    }

    const trainerPrice = Number(ptPkg.price)
    totalAmount += trainerPrice

    // Insert as unpaid package
    const { data: memberPtPkg, error: memberPtPkgError } = await supabase.from('member_pt_packages').insert({
      member_id: user.id,
      package_id: data.pt_package_id,
      sessions_remaining: ptPkg.session_count,
      payment_status: 'unpaid',
    }).select('id').single()

    if (memberPtPkgError || !memberPtPkg) {
      console.error('Failed to create member PT package:', memberPtPkgError)
      return { error: 'Failed to register trainer package' }
    }

    ptPackageIdCreated = memberPtPkg.id
  }

  // Generate Xendit Invoice
  const externalId = `inv-${user.id}-${Date.now()}`
  let invoice: { id: string; invoiceUrl: string }

  try {
    invoice = await createXenditInvoice({
      externalId,
      amount: totalAmount,
      description: `FTL Gym - ${data.membership_type.toUpperCase()} Membership Registration ${data.pt_package_id ? '+ PT Package' : ''}`,
      payerEmail: user.email || '',
      customerName: data.full_name,
      customerPhone: data.phone,
      successRedirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ftl-gym.netlify.app'}/member/dashboard?payment_success=true`,
    })
  } catch (err: any) {
    console.error('Xendit creation error:', err)
    return { error: 'Failed to create Xendit invoice. Please try again.' }
  }

  // 3. Save xendit_invoice_id back to member_pt_packages if created (use raw SQL to bypass RLS)
  if (ptPackageIdCreated) {
    await sql`
      UPDATE public.member_pt_packages
      SET xendit_invoice_id = ${invoice.id}
      WHERE id = ${ptPackageIdCreated}
    `
  }

  // 4. Record Payment in the payments table
  const { error: paymentError } = await supabase.from('payments').insert({
    member_id: user.id,
    reference_id: membership.id,
    reference_type: 'membership',
    amount: totalAmount,
    xendit_invoice_id: invoice.id,
    xendit_external_id: externalId,
    status: 'pending',
    invoice_url: invoice.invoiceUrl,
  })

  if (paymentError) {
    console.error('Failed to record payment in DB:', paymentError)
    // We don't fail the registration here, but return the URL since Xendit invoice is already active
  }

  return { success: true, invoiceUrl: invoice.invoiceUrl }
}

