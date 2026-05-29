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
  CheckCircle,
  Award,
  BookOpen
} from "lucide-react"
import { useAuthStore } from "@/stores/auth.store"

export default function TrainerSchedulePage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Custom filter to display only this trainer's assigned classes
  const { user } = useAuthStore()

  const fetchClasses = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/classes")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat jadwal kelas")
      }
      
      // Filter classes assigned to this trainer
      // If no user ID is resolved (e.g. storage hydr), display all as fallback
      const trainerId = user?.id
      const rawClasses = resData.data || []
      const trainerClasses = trainerId 
        ? rawClasses.filter((c: any) => c.trainer_id === trainerId)
        : rawClasses

      setClasses(trainerClasses)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal mengambil jadwal mengajar Anda.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [user])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-emerald-500" />
          Jadwal Mengajar Kelas Studio Anda
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pantau daftar jam mengajar kelas Anda hari ini, hitung kapasitas slot terisi, dan persiapkan rencana instruksi latihan berkelompok.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Menyusun jadwal mengajar Anda...</p>
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
          <p className="text-sm font-semibold text-zinc-500">Jadwal mengajar kosong.</p>
          <p className="text-xs text-zinc-400 mt-0.5">Anda belum ditugaskan mengampu kelas studio apa pun saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div 
              key={cls.id}
              className="group relative rounded-3xl border border-zinc-150 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  Mengajar
                </span>
                
                <h3 className="font-bold text-zinc-950 dark:text-white text-base mt-2 group-hover:text-emerald-500 transition-colors">
                  {cls.name}
                </h3>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {cls.description || "Tidak ada deskripsi ditulis."}
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
                    <span className="font-bold">{cls.bookings_count} / {cls.capacity} Peserta Terdaftar</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Status Kelas</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Siap Dimulai
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
