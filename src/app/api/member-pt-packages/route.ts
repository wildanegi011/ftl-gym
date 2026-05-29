import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { createXenditInvoice } from "@/lib/xendit"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch member's purchased packages, joined with trainer profiles and package details
    const packages = await sql`
      SELECT 
        mpp.id,
        mpp.sessions_remaining,
        mpp.payment_status,
        mpp.purchased_at,
        psp.session_count,
        psp.duration_minutes,
        psp.price,
        psp.pt_id as pt_id,
        pt_profile.full_name as pt_name,
        pt_profile.avatar_url as pt_avatar,
        p.invoice_url
      FROM public.member_pt_packages mpp
      JOIN public.pt_session_packages psp ON mpp.package_id = psp.id
      JOIN public.profiles pt_profile ON psp.pt_id = pt_profile.id
      LEFT JOIN public.payments p ON p.reference_id = mpp.id AND p.reference_type = 'pt_package'
      WHERE mpp.member_id = ${user.id}
      ORDER BY mpp.purchased_at DESC
    `

    return NextResponse.json({ data: packages })
  } catch (err: any) {
    console.error("GET member pt packages failed:", err)
    return NextResponse.json({ error: "Gagal memuat paket PT Anda" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { package_id } = body

    if (!package_id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
    }

    // Fetch package details
    const [pkg] = await sql`
      SELECT psp.*, p.full_name as pt_name
      FROM public.pt_session_packages psp
      JOIN public.profiles p ON psp.pt_id = p.id
      WHERE psp.id = ${package_id} AND psp.is_active = true
      LIMIT 1
    `

    if (!pkg) {
      return NextResponse.json({ error: "Paket sesi PT tidak ditemukan atau sudah tidak aktif" }, { status: 404 })
    }

    // Fetch member profile details
    const [memberProfile] = await sql`
      SELECT full_name, phone FROM public.profiles WHERE id = ${user.id} LIMIT 1
    `

    // Generate unique external ID for Xendit
    const externalId = `pt-pkg-${user.id}-${Date.now()}`

    // Start transaction to save purchase and payment logging
    const result = await sql.begin(async (sqlTrans) => {
      // 1. Insert into member_pt_packages as unpaid
      const [mpp] = await sqlTrans`
        INSERT INTO public.member_pt_packages (member_id, package_id, sessions_remaining, payment_status)
        VALUES (${user.id}, ${package_id}, ${pkg.session_count}, 'unpaid')
        RETURNING *
      `

      // 2. Create Xendit Invoice
      const stableOrigin = req.nextUrl.origin.includes('localhost') || req.nextUrl.origin.includes('127.0.0.1')
        ? req.nextUrl.origin
        : 'https://ftl-gym.netlify.app'
      const redirectUrl = `${stableOrigin}/member/pt/packages`
      const invoice = await createXenditInvoice({
        externalId,
        amount: Number(pkg.price),
        description: `Pembelian Paket ${pkg.session_count} Sesi PT dengan ${pkg.pt_name} - FTL Gym`,
        payerEmail: user.email!,
        customerName: memberProfile?.full_name || "Member FTL Gym",
        customerPhone: memberProfile?.phone || undefined,
        successRedirectUrl: redirectUrl,
      })

      // 3. Update member_pt_packages with xendit invoice ID
      await sqlTrans`
        UPDATE public.member_pt_packages
        SET xendit_invoice_id = ${invoice.id}
        WHERE id = ${mpp.id}
      `

      // 4. Log inside public.payments
      const [payment] = await sqlTrans`
        INSERT INTO public.payments (
          member_id, reference_id, reference_type, amount, 
          xendit_invoice_id, xendit_external_id, invoice_url, status
        )
        VALUES (
          ${user.id}, ${mpp.id}, 'pt_package', ${pkg.price}, 
          ${invoice.id}, ${externalId}, ${invoice.invoiceUrl}, 'pending'
        )
        RETURNING *
      `

      return { mpp, invoiceUrl: invoice.invoiceUrl }
    })

    return NextResponse.json({ success: true, invoiceUrl: result.invoiceUrl })
  } catch (err: any) {
    console.error("POST purchase pt package failed:", err)
    return NextResponse.json({ error: err.message || "Gagal melakukan pembelian paket PT" }, { status: 500 })
  }
}
