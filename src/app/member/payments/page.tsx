'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Wallet, 
  Loader2, 
  ShieldAlert, 
  ExternalLink,
  DollarSign
} from "lucide-react"

export default function MemberPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/member/payments")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat transaksi")
      }
      setPayments(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal memuat riwayat transaksi Anda.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      case "expired":
        return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      case "pending":
      default:
        return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <Wallet className="w-8 h-8 text-emerald-500" />
          Riwayat Pembayaran & Invoice Anda
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pantau riwayat pembayaran invoice membership dan paket PT Anda, serta unduh bukti transaksi resmi dari Xendit.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Menyusun riwayat tagihan Anda...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchPayments} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <Wallet className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Anda belum memiliki riwayat transaksi.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-850">
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Aliran Riwayat Tagihan Anda</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-850 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Transaksi</th>
                  <th className="py-4 px-6">Total Tagihan</th>
                  <th className="py-4 px-6">Metode</th>
                  <th className="py-4 px-6">Tanggal Transaksi</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Invoice PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {payments.map((pay) => (
                  <tr key={pay.id} className="text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        pay.reference_type === "membership" 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10" 
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10"
                      }`}>
                        {pay.reference_type}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white">
                      Rp {Number(pay.amount).toLocaleString("id-ID")}
                    </td>

                    <td className="py-4 px-6 text-zinc-500 font-semibold uppercase">
                      {pay.method || "—"}
                    </td>

                    <td className="py-4 px-6 text-zinc-500">
                      {new Date(pay.created_at).toLocaleDateString("id-ID", {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(pay.status)}`}>
                        {pay.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      {pay.invoice_url ? (
                        <a 
                          href={pay.invoice_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-emerald-500 hover:text-emerald-600 hover:underline text-[10px]"
                        >
                          Buka Invoice
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
