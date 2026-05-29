import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { createXenditInvoice } from "@/lib/xendit"

const PRICE_LIST = {
  basic: {
    monthly: 350000,
    quarterly: 900000,
    annual: 3000000,
  },
  premium: {
    monthly: 500000,
    quarterly: 1350000,
    annual: 4800000,
  },
  vip: {
    monthly: 800000,
    quarterly: 2100000,
    annual: 7200000,
  },
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current active membership and subscription details
    const [membership] = await sql`
      SELECT * FROM public.memberships
      WHERE member_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const [subscription] = await sql`
      SELECT * FROM public.subscriptions
      WHERE member_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    return NextResponse.json({ data: { membership, subscription } })
  } catch (err: any) {
    console.error("GET subscriptions failed:", err)
    return NextResponse.json({ error: "Gagal memuat data langganan" }, { status: 500 })
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
    const { type, interval } = body // type: 'basic' | 'premium' | 'vip', interval: 'monthly' | 'quarterly' | 'annual'

    if (!["basic", "premium", "vip"].includes(type) || !["monthly", "quarterly", "annual"].includes(interval)) {
      return NextResponse.json({ error: "Tipe membership atau interval tidak valid" }, { status: 400 })
    }

    // Resolve price
    const price = PRICE_LIST[type as keyof typeof PRICE_LIST][interval as "monthly" | "quarterly" | "annual"]

    // Fetch member details
    const [memberProfile] = await sql`
      SELECT full_name, phone FROM public.profiles WHERE id = ${user.id} LIMIT 1
    `

    // Generate unique external ID for Xendit
    const externalId = `sub-${user.id}-${Date.now()}`

    // Calculate dates
    const startDate = new Date()
    const endDate = new Date()
    if (interval === "monthly") endDate.setMonth(endDate.getMonth() + 1)
    else if (interval === "quarterly") endDate.setMonth(endDate.getMonth() + 3)
    else if (interval === "annual") endDate.setFullYear(endDate.getFullYear() + 1)

    const result = await sql.begin(async (sqlTrans) => {
      // 1. Insert into public.memberships as inactive
      const [newMembership] = await sqlTrans`
        INSERT INTO public.memberships (member_id, type, status, start_date, end_date, price)
        VALUES (${user.id}, ${type}, 'inactive', ${startDate}, ${endDate}, ${price})
        RETURNING *
      `

      // 2. Insert into public.subscriptions as active (paused/waiting for payment)
      const [newSubscription] = await sqlTrans`
        INSERT INTO public.subscriptions (member_id, membership_type, interval, status, next_billing_date)
        VALUES (${user.id}, ${type}, ${interval}, 'active', ${endDate})
        RETURNING *
      `

      // 3. Create Xendit Invoice
      const stableOrigin = req.nextUrl.origin.includes('localhost') || req.nextUrl.origin.includes('127.0.0.1')
        ? req.nextUrl.origin
        : 'https://ftl-gym.netlify.app'
      const redirectUrl = `${stableOrigin}/member/subscription`
      const invoice = await createXenditInvoice({
        externalId,
        amount: price,
        description: `Langganan Membership ${type.toUpperCase()} (${interval.toUpperCase()}) - FTL Gym`,
        payerEmail: user.email!,
        customerName: memberProfile?.full_name || "Member FTL Gym",
        customerPhone: memberProfile?.phone || undefined,
        successRedirectUrl: redirectUrl,
      })

      // 4. Log inside public.payments
      await sqlTrans`
        INSERT INTO public.payments (
          member_id, reference_id, reference_type, amount, 
          xendit_invoice_id, xendit_external_id, invoice_url, status
        )
        VALUES (
          ${user.id}, ${newMembership.id}, 'membership', ${price}, 
          ${invoice.id}, ${externalId}, ${invoice.invoiceUrl}, 'pending'
        )
      `

      return { invoiceUrl: invoice.invoiceUrl }
    })

    return NextResponse.json({ success: true, invoiceUrl: result.invoiceUrl })
  } catch (err: any) {
    console.error("POST subscription failed:", err)
    return NextResponse.json({ error: err.message || "Gagal membuat langganan baru" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Cancel subscription (scheduled cancellation at the end of period)
    const [updated] = await sql`
      UPDATE public.subscriptions
      SET status = 'cancelled'
      WHERE member_id = ${user.id} AND status = 'active'
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json({ error: "Tidak ada langganan aktif yang dapat dibatalkan" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated, message: "Langganan berhasil dibatalkan secara terjadwal" })
  } catch (err: any) {
    console.error("PATCH subscription failed:", err)
    return NextResponse.json({ error: err.message || "Gagal membatalkan langganan" }, { status: 500 })
  }
}
