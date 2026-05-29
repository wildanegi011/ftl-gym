'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import {
  Dumbbell,
  Loader2,
  ShieldAlert,
  Star,
  Award,
  Wallet,
  Phone,
  ArrowRight,
  Sparkles
} from "lucide-react"

export default function MemberPTPage() {
  const [pts, setPts] = useState<any[]>([])
  const [memberPackages, setMemberPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Booking details modal
  const [selectedPt, setSelectedPt] = useState<any | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null) // contains packageId if purchasing

  const fetchPts = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ptRes, pkgRes] = await Promise.all([
        fetch("/api/personal-trainers?active_only=true"),
        fetch("/api/member-pt-packages")
      ])
      
      const ptData = await ptRes.json()
      const pkgData = await pkgRes.json()

      if (!ptRes.ok) {
        throw new Error(ptData.error || "Gagal memuat katalog PT")
      }
      if (!pkgRes.ok) {
        throw new Error(pkgData.error || "Gagal memuat paket PT Anda")
      }

      setPts(ptData.data || [])
      setMemberPackages(pkgData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal memuat data personal trainer.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPts()
  }, [])

  const handleOpenBookingModal = (pt: any) => {
    setSelectedPt(pt)
    setBookingModalOpen(true)
  }

  const handlePurchasePackage = async (packageId: string) => {
    setPurchaseLoading(packageId)
    try {
      const response = await fetch("/api/member-pt-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memproses transaksi")
      }

      if (resData.invoiceUrl) {
        // Redirect member to Xendit payment checkout
        window.location.href = resData.invoiceUrl
      } else {
        throw new Error("Tautan pembayaran tidak diterima.")
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal memproses pembayaran paket PT.")
    } finally {
      setPurchaseLoading(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 md:p-8 text-white shadow-xl border border-zinc-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Layanan Premium PT
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Tingkatkan Performa Latihan Bersama <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Personal Trainer</span> Ahli
          </h1>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            Dapatkan bimbingan gerakan presisi, rencana latihan adaptif, dan motivasi ekstra untuk mencapai target kebugaran Anda secara optimal.
          </p>
        </div>
      </div>

      {/* PT Catalogue */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat katalog Personal Trainer...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchPts} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : pts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <Dumbbell className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Tidak ada Personal Trainer aktif saat ini.</p>
          <p className="text-zinc-400 text-xs mt-0.5">Silakan hubungi administrator gym untuk info ketersediaan PT.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pts.map((pt) => {
            const activePkg = memberPackages.find(
              (pkg) => pkg.pt_id === pt.id && Number(pkg.sessions_remaining) > 0 && pkg.payment_status === "paid"
            )

            return (
              <div
                key={pt.id}
                className={`group relative rounded-3xl border bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between ${
                  activePkg 
                    ? "border-emerald-500/50 shadow-md shadow-emerald-500/5 dark:shadow-emerald-950/10" 
                    : "border-zinc-150 dark:border-zinc-800/80"
                }`}
              >
                <div>
                  {/* Floating "Active Trainer" Badge */}
                  {activePkg && (
                    <div className="absolute -top-3 left-6 z-10 px-3 py-1 rounded-full bg-emerald-500 text-white dark:text-zinc-950 text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-md shadow-emerald-500/20">
                      <Sparkles className="w-3 h-3 fill-current animate-pulse" />
                      Trainer Anda • {activePkg.sessions_remaining} Sesi
                    </div>
                  )}

                  {/* PT Info Header */}
                  <div className="flex items-start gap-4">
                    {pt.avatar_url ? (
                      <img
                        src={pt.avatar_url}
                        alt={pt.full_name}
                        className="w-14 h-14 rounded-2xl object-cover border border-zinc-100 dark:border-zinc-850 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                        <Dumbbell className="w-6 h-6 text-zinc-400 dark:text-zinc-650" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-zinc-950 dark:text-white text-base truncate flex items-center gap-1.5">
                        {pt.full_name}
                        {pt.rating >= 4.5 && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-xs font-bold ml-1 text-zinc-800 dark:text-zinc-200">{Number(pt.rating).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio & Specs */}
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-4 line-clamp-3 italic leading-relaxed">
                    "{pt.bio || "Siap membantu Anda mendapatkan tubuh ideal dengan latihan terarah."}"
                  </p>

                  {pt.certifications && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {(typeof pt.certifications === 'string'
                        ? pt.certifications.split(',')
                        : Array.isArray(pt.certifications)
                          ? pt.certifications
                          : []
                      ).map((cert: any, idx: number) => {
                        const trimmed = String(cert).trim()
                        if (!trimmed) return null
                        return (
                          <span key={idx} className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <Award className="w-3 h-3 text-amber-500 shrink-0" />
                            {trimmed}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1">
                    {pt.specialities && pt.specialities.map((s: any) => (
                      <span key={s.id} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Package Select Trigger */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                  <div className="shrink-0">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Harga Mulai Dari</p>
                    <p className="text-sm font-black text-emerald-500 mt-0.5">
                      {pt.packages && pt.packages.length > 0
                        ? `Rp ${Math.min(...pt.packages.map((pk: any) => Number(pk.price))).toLocaleString("id-ID")}`
                        : "Hubungi Admin"
                      }
                    </p>
                  </div>
                  
                  {activePkg ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Button
                        type="button"
                        onClick={() => window.location.href = "/member/pt/packages"}
                        className="rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10 gap-1 h-9 px-3 shrink-0"
                      >
                        Jadwalkan
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button
                        disabled={!pt.packages || pt.packages.length === 0}
                        onClick={() => handleOpenBookingModal(pt)}
                        variant="outline"
                        className="rounded-xl font-bold text-[10px] border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 h-9 px-2 text-zinc-700 dark:text-zinc-300 shrink-0"
                      >
                        Beli Lagi
                      </Button>
                    </div>
                  ) : (
                    <Button
                      disabled={!pt.packages || pt.packages.length === 0}
                      onClick={() => handleOpenBookingModal(pt)}
                      className="rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10 gap-1 h-9 px-4 shrink-0"
                    >
                      Pilih Paket
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Package Purchase Modal */}
      <ResponsiveModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        title={`Pilih Paket Latihan: ${selectedPt?.full_name || ""}`}
        description="Pilih salah satu paket sesi latihan terakreditasi di bawah. Transaksi pelunasan didukung penuh secara otomatis oleh invoice Xendit."
        className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
      >
        <div className="space-y-4 pt-2">
          {/* Packages List */}
          <div className="space-y-3">
            {selectedPt?.packages && selectedPt.packages.map((pkg: any) => (
              <div
                key={pkg.id}
                className="p-4 bg-zinc-50 border border-zinc-150 dark:bg-zinc-900/40 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                      {pkg.session_count} Sesi Pertemuan
                    </h4>
                    <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                      Rp {Number(pkg.price).toLocaleString("id-ID")}
                    </p>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      Durasi {pkg.duration_minutes} Menit per sesi
                    </span>
                  </div>
                </div>

                <Button
                  disabled={purchaseLoading !== null}
                  onClick={() => handlePurchasePackage(pkg.id)}
                  className="rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white gap-1.5 h-9"
                >
                  {purchaseLoading === pkg.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wallet className="w-3.5 h-3.5" />
                  )}
                  Beli
                </Button>
              </div>
            ))}
            {(!selectedPt?.packages || selectedPt.packages.length === 0) && (
              <p className="text-xs text-zinc-400 italic text-center py-4">PT ini belum mengonfigurasi paket sesi.</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBookingModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Batal
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  )
}
