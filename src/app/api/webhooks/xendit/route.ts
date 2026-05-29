import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const callbackToken = req.headers.get("x-callback-token")
    const configuredToken = process.env.XENDIT_CALLBACK_TOKEN

    // Token validation check
    if (configuredToken && callbackToken !== configuredToken) {
      console.warn("Xendit Webhook Validation Failed: invalid callback token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const payload = await req.json()
    console.log("Xendit Webhook Received Payload:", payload)

    const { id: invoiceId, external_id: externalId, status, payment_method: method, amount, paid_at } = payload

    if (!invoiceId || !externalId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Process only pelunasan / paid events
    if (status === "PAID") {
      // Find the corresponding payment log
      const [payment] = await sql`
        SELECT * FROM public.payments
        WHERE xendit_invoice_id = ${invoiceId} OR xendit_external_id = ${externalId}
        LIMIT 1
      `

      if (!payment) {
        console.error("Xendit Webhook Error: payment log not found for invoice id", invoiceId)
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      if (payment.status === "paid") {
        return NextResponse.json({ success: true, message: "Payment already processed" })
      }

      // Start database transaction to update payment status and membership/package activation
      await sql.begin(async (sqlTrans) => {
        // 1. Update payment log to paid
        await sqlTrans`
          UPDATE public.payments
          SET status = 'paid', paid_at = ${paid_at || new Date().toISOString()}, method = ${method || null}
          WHERE id = ${payment.id}
        `

        if (payment.reference_type === "membership") {
          // 2a. Activate membership with proper start/end dates
          const [membership] = await sqlTrans`
            SELECT * FROM public.memberships WHERE id = ${payment.reference_id} LIMIT 1
          `

          if (membership) {
            await sqlTrans`
              UPDATE public.memberships
              SET status = 'active',
                  start_date = COALESCE(start_date, CURRENT_DATE),
                  end_date = COALESCE(end_date, CURRENT_DATE + INTERVAL '1 month')
              WHERE id = ${membership.id}
            `
          }

          // 2b. Also activate any unpaid PT packages for this member (bundled payment)
          const ptPackages = await sqlTrans`
            UPDATE public.member_pt_packages
            SET payment_status = 'paid'
            WHERE member_id = ${payment.member_id}
              AND payment_status = 'unpaid'
              AND (xendit_invoice_id = ${invoiceId} OR xendit_invoice_id IS NULL)
            RETURNING id
          `

          // 2c. Auto-confirm pending PT sessions for newly paid packages
          if (ptPackages.length > 0) {
            const pkgIds = ptPackages.map((p: any) => p.id)
            await sqlTrans`
              UPDATE public.pt_sessions
              SET status = 'confirmed'
              WHERE member_package_id = ANY(${pkgIds})
                AND status = 'pending'
            `
          }

        } else if (payment.reference_type === "pt_package") {
          // 3a. Set PT member package status to paid
          await sqlTrans`
            UPDATE public.member_pt_packages
            SET payment_status = 'paid'
            WHERE id = ${payment.reference_id}
          `

          // 3b. Auto-confirm all pending PT sessions for this package
          await sqlTrans`
            UPDATE public.pt_sessions
            SET status = 'confirmed'
            WHERE member_package_id = ${payment.reference_id}
              AND status = 'pending'
          `
        }
      })

      console.log(`Xendit Webhook Success: Activated ${payment.reference_type} package for user ID ${payment.member_id}`)
      return NextResponse.json({ success: true, message: "Webhook processed successfully" })
    }

    // Expired or failed status
    if (status === "EXPIRED") {
      await sql`
        UPDATE public.payments
        SET status = 'expired'
        WHERE xendit_invoice_id = ${invoiceId}
      `
      console.log(`Xendit Webhook: Payment log marked as expired for invoice ID ${invoiceId}`)
      return NextResponse.json({ success: true, message: "Marked as expired" })
    }

    return NextResponse.json({ success: true, message: "Status ignored" })
  } catch (err: any) {
    console.error("Xendit Webhook error handler failed:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}
