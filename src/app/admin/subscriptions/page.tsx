'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Loader2, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  CreditCard,
  Calendar
} from "lucide-react"

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/subscriptions")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat daftar langganan")
      }
      setSubs(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal memuat laporan langganan.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubs()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      case "inactive":
        return "bg-zinc-150 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700"
      case "suspended":
      default:
        return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      case "pending":
        return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
      case "expired":
      case "failed":
        return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      default:
        return "bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-850 dark:border-zinc-800"
    }
  }

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(num)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <FileText className="w-8 h-8 text-emerald-500" />
          Manajemen Kontrak Membership
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pantau status kontrak langganan member, paket membership aktif, status invoice Xendit, dan masa berlaku keanggotaan.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Menyusun ringkasan kontrak membership...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchSubs} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Belum ada kontrak membership.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Membership Aktif</p>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                  {subs.filter(s => s.status === "active").length} Member
                </h3>
              </div>
            </div>

            <div className="p-5 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Draft / Belum Aktif</p>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                  {subs.filter(s => s.status !== "active").length} Member
                </h3>
              </div>
            </div>
          </div>

          {/* Table List */}
          <div className="bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-850">
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Daftar Kontrak Berlangganan</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-850 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Member</th>
                    <th className="py-4 px-6">Tipe Paket</th>
                    <th className="py-4 px-6">Masa Berlaku</th>
                    <th className="py-4 px-6">Harga</th>
                    <th className="py-4 px-6">Status Pembayaran</th>
                    <th className="py-4 px-6">Status Membership</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                  {subs.map((sub) => (
                    <tr key={sub.id} className="text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-zinc-900 dark:text-white">{sub.member_name}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{sub.member_email}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                          {sub.membership_type}
                        </span>
                      </td>

                      <td className="py-4 px-6 font-semibold text-zinc-600 dark:text-zinc-350">
                        <div className="flex flex-col gap-0.5">
                          <span>Mulai: {formatDate(sub.start_date)}</span>
                          <span className="text-[10px] text-zinc-400">Selesai: {formatDate(sub.end_date)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-bold text-zinc-700 dark:text-zinc-300">
                        {formatRupiah(Number(sub.price))}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getPaymentBadge(sub.payment_status || "pending")}`}>
                            {sub.payment_status || "pending"}
                          </span>
                          {sub.invoice_url && (
                            <a 
                              href={sub.invoice_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 hover:text-emerald-500 transition-colors"
                              title="Buka Invoice Xendit"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
