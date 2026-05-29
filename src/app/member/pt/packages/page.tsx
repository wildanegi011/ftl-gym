'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { 
  Dumbbell, 
  Loader2, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquarePlus
} from "lucide-react"

export default function MemberPTPackagesPage() {
  const [packages, setPackages] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scheduling Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null)
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Rating Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [reviewLoading, setReviewLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch packages
      const pkgResponse = await fetch("/api/member-pt-packages")
      const pkgData = await pkgResponse.json()
      if (!pkgResponse.ok) throw new Error(pkgData.error || "Gagal memuat kuota paket")
      setPackages(pkgData.data || [])

      // Fetch booked sessions
      const sessResponse = await fetch("/api/pt-sessions")
      const sessData = await sessResponse.json()
      if (!sessResponse.ok) throw new Error(sessData.error || "Gagal memuat daftar sesi")
      setSessions(sessData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal mengambil data PT.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenScheduleModal = (pkg: any) => {
    setSelectedPackage(pkg)
    setScheduledAt("")
    setNotes("")
    setScheduleModalOpen(true)
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackage || !scheduledAt) return
    setScheduleLoading(true)

    try {
      const response = await fetch("/api/pt-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_package_id: selectedPackage.id,
          scheduled_at: new Date(scheduledAt).toISOString(),
          notes
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menjadwalkan sesi")
      }

      setScheduleModalOpen(false)
      fetchData() // refresh packages & sessions lists
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal memesan sesi latihan.")
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleOpenReviewModal = (session: any) => {
    setSelectedSession(session)
    setRating(5)
    setComment("")
    setReviewModalOpen(true)
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSession) return
    setReviewLoading(true)

    try {
      const response = await fetch(`/api/pt-sessions/${selectedSession.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan ulasan")
      }

      setReviewModalOpen(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal mengulas sesi.")
    } finally {
      setReviewLoading(false)
    }
  }

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case "confirmed":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      case "rejected":
        return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      case "cancelled":
        return "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
      case "completed":
        return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
      case "pending":
      default:
        return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <Dumbbell className="w-8 h-8 text-emerald-500" />
          Sesi Latihan Personal Trainer Anda
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pantau kuota sisa sesi PT Anda, pesan reservasi tanggal pertemuan, dan berikan penilaian ulasan performa PT.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat data sesi & kuota PT...</p>
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
          {/* Left Column: Sisa Kuota Paket */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Kuota Sesi PT Aktif</h2>
            {packages.filter(p => p.payment_status === "paid").length === 0 ? (
              <div className="p-6 bg-white border border-dashed border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-3xl text-center space-y-3">
                <Dumbbell className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-xs text-zinc-500">Anda belum memiliki paket PT berbayar yang aktif.</p>
                <Button onClick={() => window.location.href = "/member/pt"} className="rounded-xl text-xs bg-emerald-500 text-white font-bold h-9">
                  Beli Paket Sesi
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {packages.map((pkg) => (
                  <div 
                    key={pkg.id}
                    className="p-5 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-4">
                      {pkg.pt_avatar ? (
                        <img src={pkg.pt_avatar} alt={pkg.pt_name} className="w-11 h-11 rounded-xl object-cover border" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                          {pkg.pt_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-zinc-950 dark:text-white text-sm">{pkg.pt_name}</h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Membeli {pkg.session_count} Sesi • {pkg.duration_minutes} Menit</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl flex justify-between items-center">
                      <span className="text-xs text-zinc-500 font-semibold">Sisa Kuota Sesi</span>
                      <span className="text-lg font-black text-emerald-500">{pkg.sessions_remaining} Sesi</span>
                    </div>

                    <Button
                      disabled={pkg.sessions_remaining <= 0}
                      onClick={() => handleOpenScheduleModal(pkg)}
                      className="mt-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white h-10 w-full"
                    >
                      Jadwalkan Sesi Baru
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Unpaid pending invoices */}
            {packages.filter(p => p.payment_status === "unpaid").length > 0 && (
              <div className="space-y-3 pt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Pembayaran Tertunda</h2>
                {packages.filter(p => p.payment_status === "unpaid").map((pkg) => (
                  <div key={pkg.id} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Sesi PT dengan {pkg.pt_name}</p>
                      <p className="text-[10px] text-zinc-500">Rp {Number(pkg.price).toLocaleString("id-ID")}</p>
                    </div>
                    {pkg.invoice_url && (
                      <Button
                        onClick={() => window.location.href = pkg.invoice_url}
                        className="rounded-xl text-[10px] font-bold bg-amber-500 text-white h-8 hover:bg-amber-600"
                      >
                        Bayar Sekarang
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Daftar Pertemuan */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Jadwal Pertemuan</h2>
            {sessions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/10 dark:bg-zinc-950/10">
                <Calendar className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Belum ada jadwal latihan terdaftar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div 
                    key={sess.id}
                    className="p-4.5 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-2xl shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          Latihan PT dengan {sess.pt_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(sess.scheduled_at).toLocaleString("id-ID", {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} ({sess.duration_minutes} Menit)</span>
                        </div>
                        {sess.notes && (
                          <p className="text-[10px] text-zinc-400 italic mt-1 truncate">"{sess.notes}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(sess.status)}`}>
                        {sess.status}
                      </span>

                      {/* Review triggers for completed sessions */}
                      {sess.status === "completed" && sess.rated === 0 && (
                        <Button
                          onClick={() => handleOpenReviewModal(sess)}
                          size="sm"
                          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] gap-1 px-3.5 h-8 shadow-sm"
                        >
                          <MessageSquarePlus className="w-3 h-3" />
                          Ulas Sesi
                        </Button>
                      )}

                      {sess.status === "completed" && sess.rated > 0 && (
                        <div className="flex items-center text-amber-500 gap-0.5 text-xs font-bold px-2">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{sess.rated}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduling Modal */}
      <ResponsiveModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        title="Jadwalkan Sesi Latihan"
        description={`Mengajukan tanggal & jam pertemuan sesi PT baru dengan ${selectedPackage?.pt_name || ""}.`}
        className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
          {/* Datetime selection */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_at" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Pilih Tanggal & Jam Latihan
            </Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Catatan / Fokus Latihan (Opsional)
            </Label>
            <Input
              id="notes"
              placeholder="cth. Ingin fokus latihan otot dada"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-4 gap-2 border-t border-zinc-100 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={scheduleLoading}
              className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white min-w-[100px]"
            >
              {scheduleLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Pesan Sesi"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Review Modal */}
      <ResponsiveModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        title="Beri Penilaian Personal Trainer"
        description={`Bagikan pengalaman latihan Anda bersama ${selectedSession?.pt_name || ""}.`}
        className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
          {/* Star selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
              Skala Rating Bintang
            </Label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 hover:scale-110 transition-transform ${star <= rating ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-800'}`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <Label htmlFor="comment" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Tulis Komentar / Ulasan
            </Label>
            <textarea
              id="comment"
              rows={3}
              placeholder="Sangat komunikatif, gerakannya terstruktur dan memotivasi sekali!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={300}
            />
          </div>

          <div className="flex justify-end pt-4 gap-2 border-t border-zinc-100 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={reviewLoading}
              className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white min-w-[100px]"
            >
              {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Kirim Ulasan"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  )
}
