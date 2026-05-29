'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Loader2, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react"

export default function MemberSubscriptionPage() {
  const [membership, setMembership] = useState<any | null>(null)
  const [subscription, setSubscription] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Package buying selection
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium" | "vip">("premium")
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "quarterly" | "annual">("monthly")

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/subscriptions")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat status langganan")
      }
      setMembership(resData.data?.membership || null)
      setSubscription(resData.data?.subscription || null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal mengambil data langganan.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubscribe = async () => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedPlan, interval: selectedInterval })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memproses langganan baru")
      }

      if (resData.invoiceUrl) {
        window.location.href = resData.invoiceUrl
      } else {
        throw new Error("Tautan pembayaran Xendit tidak ditemukan.")
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal memproses langganan.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSub = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan perpanjangan otomatis subscription Anda? Akses keanggotaan Anda tetap aktif hingga akhir masa periode berjalan.")) return
    setActionLoading(true)
    try {
      const response = await fetch("/api/subscriptions", {
        method: "PATCH"
      })
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal membatalkan langganan")
      }
      alert("Subscription Anda berhasil dibatalkan secara terjadwal. Anda tidak akan ditagih pada siklus berikutnya.")
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal membatalkan langganan.")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <FileText className="w-8 h-8 text-emerald-500" />
          Status Membership & Langganan Anda
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pantau status keanggotaan gym Anda, masa aktif benefit plan, kelola perpanjangan otomatis, atau ubah pilihan keanggotaan Anda.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memeriksa status keanggotaan Anda...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchData} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active subscription card info */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Kontrak Langganan Aktif</h2>

            {!membership || membership.status === "inactive" ? (
              <div className="p-6 bg-white border border-dashed border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-3xl text-center space-y-4 shadow-sm">
                <XCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Membership Tidak Aktif</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Anda belum berlangganan atau masa tenggang membership Anda telah habis. Pilih paket langganan di sebelah untuk mengaktifkan kembali.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden space-y-5">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                
                <div className="flex justify-between items-center">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    FTL Member
                  </span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">{subscription?.interval}</span>
                </div>

                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tipe Paket</p>
                  <h3 className="text-2xl font-black tracking-tight text-emerald-400 uppercase mt-0.5">
                    {membership.type} Plan
                  </h3>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Mulai Aktif</span>
                    <span className="font-bold text-white">
                      {new Date(membership.start_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Berlaku Hingga</span>
                    <span className="font-bold text-white">
                      {new Date(membership.end_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Status Billing</span>
                    <span className={`font-bold ${subscription?.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {subscription?.status === "active" ? "Auto-Renew" : "Manual Expire"}
                    </span>
                  </div>
                </div>

                {subscription?.status === "active" && (
                  <Button
                    disabled={actionLoading}
                    onClick={handleCancelSub}
                    className="w-full mt-4 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-750 text-red-400 hover:text-red-500 border border-zinc-700/60"
                  >
                    Batalkan Perpanjangan Otomatis
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Upgrade / Register plan selection */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Pilih Paket Membership</h2>

            <div className="p-6 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-3xl shadow-sm space-y-6">
              {/* Plan selectors */}
              <div className="grid grid-cols-3 gap-3">
                {["basic", "premium", "vip"].map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setSelectedPlan(plan as any)}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      selectedPlan === plan
                        ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase">{plan}</span>
                  </button>
                ))}
              </div>

              {/* Interval selectors */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-zinc-400">Pilih Siklus Penagihan</span>
                <div className="grid grid-cols-3 gap-3">
                  {["monthly", "quarterly", "annual"].map((intv) => (
                    <button
                      key={intv}
                      type="button"
                      onClick={() => setSelectedInterval(intv as any)}
                      className={`p-3 rounded-2xl border text-center transition-all text-xs font-semibold ${
                        selectedInterval === intv
                          ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                      }`}
                    >
                      <span className="capitalize">{intv}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price display & pay */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Estimasi Biaya</p>
                  <p className="text-xl font-black text-emerald-500 mt-1">
                    {selectedPlan === "basic" && selectedInterval === "monthly" && "Rp 350.000"}
                    {selectedPlan === "basic" && selectedInterval === "quarterly" && "Rp 900.000"}
                    {selectedPlan === "basic" && selectedInterval === "annual" && "Rp 3.000.000"}
                    {selectedPlan === "premium" && selectedInterval === "monthly" && "Rp 500.000"}
                    {selectedPlan === "premium" && selectedInterval === "quarterly" && "Rp 1.350.000"}
                    {selectedPlan === "premium" && selectedInterval === "annual" && "Rp 4.800.000"}
                    {selectedPlan === "vip" && selectedInterval === "monthly" && "Rp 800.000"}
                    {selectedPlan === "vip" && selectedInterval === "quarterly" && "Rp 2.100.000"}
                    {selectedPlan === "vip" && selectedInterval === "annual" && "Rp 7.200.000"}
                  </p>
                </div>

                <Button
                  disabled={actionLoading}
                  onClick={handleSubscribe}
                  className="rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10 gap-1.5 h-10 px-5"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aktifkan Langganan"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
