'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import {
  Dumbbell,
  Plus,
  Loader2,
  ShieldAlert,
  Trash2,
  Star,
  Award,
  Wallet,
  Settings,
  XCircle,
  CheckCircle2
} from "lucide-react"

export default function AdminPTPage() {
  const [pts, setPts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Package Modal State
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [selectedPt, setSelectedPt] = useState<any | null>(null)
  const [packages, setPackages] = useState<any[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)

  // Add Package Form State
  const [sessionCount, setSessionCount] = useState<number>(8)
  const [packagePrice, setPackagePrice] = useState<string>("")
  const [packageDuration, setPackageDuration] = useState<number>(60)
  const [addLoading, setAddLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchPts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/personal-trainers")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat data personal trainer")
      }
      setPts(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan saat memuat data PT.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPts()
  }, [])

  const handleManagePackagesClick = async (pt: any) => {
    setSelectedPt(pt)
    setPackageModalOpen(true)
    setPackagesLoading(true)
    setFormError(null)
    setPackagePrice("")
    try {
      const response = await fetch(`/api/personal-trainers/${pt.id}/packages`)
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat paket sesi")
      }
      setPackages(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setFormError("Gagal memuat paket sesi PT.")
    } finally {
      setPackagesLoading(false)
    }
  }

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPt) return
    setFormError(null)
    setAddLoading(true)

    const parsedPrice = parseFloat(packagePrice)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError("Harga paket harus berupa angka positif.")
      setAddLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/personal-trainers/${selectedPt.id}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_count: sessionCount,
          price: parsedPrice,
          duration_minutes: packageDuration
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menambah paket sesi")
      }

      // Refresh packages
      setPackages(prev => [...prev, resData.data])
      setPackagePrice("")
      fetchPts() // update counts in listing
    } catch (err: any) {
      console.error(err)
      setFormError(err.message || "Gagal membuat paket.")
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-emerald-500" />
            Manajemen Personal Trainer (PT)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Kelola data Personal Trainer, biografi, rating bintang, dan konfigurasi paket harga sesi PT.
          </p>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat data personal trainer...</p>
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
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Belum ada Personal Trainer terdaftar.</p>
          <p className="text-zinc-400 text-xs mt-0.5">Daftarkan instruktur baru dengan role PT terlebih dahulu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pts.map((pt) => (
            <div
              key={pt.id}
              className="group relative rounded-3xl border border-zinc-150 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* PT Info Header */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {pt.avatar_url ? (
                      <img
                        src={pt.avatar_url}
                        alt={pt.full_name}
                        className="w-14 h-14 rounded-2xl object-cover border border-zinc-100 dark:border-zinc-850"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-zinc-400 dark:text-zinc-650" />
                      </div>
                    )}
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center ${pt.is_active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  </div>
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
                      <span className="text-[10px] text-zinc-400">•</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{pt.phone || "No Phone"}</span>
                    </div>
                  </div>
                </div>

                {/* Bio & Specs */}
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-4 line-clamp-3 italic leading-relaxed">
                  "{pt.bio || "Tidak ada biografi ditulis."}"
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
                  {pt.specialities?.length === 0 && (
                    <span className="text-[10px] text-zinc-400">Belum ada spesialisasi</span>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {pt.packages?.length || 0} Paket Aktif
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManagePackagesClick(pt)}
                  className="rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all gap-1.5 h-8"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Atur Paket Sesi
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Management Modal */}
      <ResponsiveModal
        open={packageModalOpen}
        onOpenChange={setPackageModalOpen}
        title={`Konfigurasi Paket: ${selectedPt?.full_name || ""}`}
        description="Tambahkan atau kelola paket sesi latihan khusus bagi Personal Trainer ini."
        className="sm:max-w-xl bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
      >
        <div className="space-y-6 pt-2">
          {formError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form to Add New Package */}
          <form onSubmit={handleAddPackage} className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-850 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Buat Paket Sesi Baru
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {/* Session Count */}
              <div className="space-y-1.5">
                <Label htmlFor="session_count" className="text-[10px] font-bold uppercase text-zinc-500">
                  Jumlah Sesi
                </Label>
                <select
                  id="session_count"
                  value={sessionCount}
                  onChange={(e) => setSessionCount(parseInt(e.target.value))}
                  className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={2}>2 Sesi (Uji Coba)</option>
                  <option value={8}>8 Sesi (Reguler)</option>
                  <option value={14}>14 Sesi (Kompeten)</option>
                </select>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <Label htmlFor="package_price" className="text-[10px] font-bold uppercase text-zinc-500">
                  Harga (Rupiah)
                </Label>
                <Input
                  id="package_price"
                  type="number"
                  placeholder="cth. 1800000"
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(e.target.value)}
                  className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500 text-xs"
                  required
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="package_duration" className="text-[10px] font-bold uppercase text-zinc-500">
                  Durasi / Sesi
                </Label>
                <select
                  id="package_duration"
                  value={packageDuration}
                  onChange={(e) => setPackageDuration(parseInt(e.target.value))}
                  className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={45}>45 Menit</option>
                  <option value={60}>60 Menit</option>
                  <option value={90}>90 Menit</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={addLoading}
                className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md text-xs gap-1.5 h-9"
              >
                {addLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Tambah Paket
              </Button>
            </div>
          </form>

          {/* Current Packages List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Daftar Paket Sesi Aktif
            </h4>

            {packagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-4">Belum ada paket sesi dikonfigurasi untuk PT ini.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3.5 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-950 dark:text-white">
                          {pkg.session_count} Sesi ({pkg.duration_minutes} Menit)
                        </p>
                        <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                          Rp {Number(pkg.price).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                      Aktif
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPackageModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Tutup
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  )
}
