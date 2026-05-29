'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Loader2, 
  ShieldAlert, 
  Clock, 
  Users,
  Search,
  Sparkles,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export default function MemberClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // holds classId during booking action

  const fetchClasses = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/classes?active_only=true")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat jadwal kelas")
      }
      setClasses(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal mengambil data kelas studio.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const handleBooking = async (cls: any) => {
    const classId = cls.id
    setActionLoading(classId)

    // Optimistic Update: toggle booking state instantly for premium visual response
    const originalClasses = [...classes]
    const updated = classes.map(c => {
      if (c.id === classId) {
        return {
          ...c,
          is_booked: !c.is_booked,
          bookings_count: c.is_booked ? c.bookings_count - 1 : c.bookings_count + 1
        }
      }
      return c
    })
    setClasses(updated)

    try {
      const method = cls.is_booked ? "DELETE" : "POST"
      const response = await fetch(`/api/classes/${classId}/bookings`, {
        method
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memproses pendaftaran")
      }

      // Refresh data to keep accurate sync with server
      fetchClasses()
    } catch (err: any) {
      console.error(err)
      // Rollback optimistic state
      setClasses(originalClasses)
      alert(err.message || "Gagal memproses booking kelas.")
    } finally {
      setActionLoading(null)
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
            Studio Kelas FTL
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Reservasi Slot Latihan <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Kelas Studio</span> Impian Anda
          </h1>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            Ikuti sesi berkelompok seru: yoga, cardio, zumba, martial arts, dibimbing langsung oleh instruktur profesional bersertifikat.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Menyusun jadwal kelas hari ini...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchClasses} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Tidak ada jadwal kelas aktif hari ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div 
              key={cls.id}
              className="group relative rounded-3xl border border-zinc-150 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    {cls.is_booked && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Terdaftar
                      </span>
                    )}
                    <h3 className="font-bold text-zinc-950 dark:text-white text-base mt-1.5 group-hover:text-emerald-500 transition-colors">
                      {cls.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed italic">
                  "{cls.description || "Mari berolahraga bersama untuk menjaga kebugaran tubuh."}"
                </p>

                {/* Sesi details */}
                <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Setiap {cls.day_of_week}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Pukul {cls.start_time} WIB ({cls.duration_minutes} Menit)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold">{cls.bookings_count} / {cls.capacity} Slot Terisi</span>
                  </div>
                </div>

                {/* Trainer assignment details */}
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  {cls.trainer_avatar ? (
                    <img src={cls.trainer_avatar} alt={cls.trainer_name} className="w-5 h-5 rounded-full object-cover border" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[9px]">
                      {cls.trainer_name?.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">Dipandu oleh {cls.trainer_name || "Trainer"}</span>
                </div>
              </div>

              {/* Reactive Booking Action Button */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-end">
                {cls.is_booked ? (
                  <Button
                    disabled={actionLoading !== null}
                    onClick={() => handleBooking(cls)}
                    variant="outline"
                    className="rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 text-red-500 hover:bg-red-500/10 hover:border-red-500/20 gap-1.5 h-9 px-4 w-full"
                  >
                    {actionLoading === cls.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Batalkan Booking"
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled={actionLoading !== null || cls.bookings_count >= cls.capacity}
                    onClick={() => handleBooking(cls)}
                    className={`rounded-xl font-bold text-xs text-white h-9 px-4 w-full ${
                      cls.bookings_count >= cls.capacity
                        ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10"
                    }`}
                  >
                    {actionLoading === cls.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : cls.bookings_count >= cls.capacity ? (
                      "Kapasitas Penuh"
                    ) : (
                      "Booking Kelas"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
