export interface CreateInvoiceParams {
  externalId: string
  amount: number
  description: string
  payerEmail: string
  customerName: string
  customerPhone?: string
  successRedirectUrl: string
}

export async function createXenditInvoice(params: CreateInvoiceParams) {
  const apiKey = process.env.XENDIT_API_KEY
  if (!apiKey) {
    throw new Error('XENDIT_API_KEY is not configured in env')
  }

  // Base64 encode API key with empty password (format: username:password)
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64')

  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: params.externalId,
      amount: params.amount,
      description: params.description,
      payer_email: params.payerEmail,
      customer: {
        given_names: params.customerName,
        mobile_number: params.customerPhone || undefined,
      },
      success_redirect_url: params.successRedirectUrl,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Xendit Invoice Creation Failed:', errorText)
    throw new Error(`Failed to create Xendit invoice: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    id: data.id as string,
    invoiceUrl: data.invoice_url as string,
    externalId: data.external_id as string,
    status: data.status as string,
  }
}
