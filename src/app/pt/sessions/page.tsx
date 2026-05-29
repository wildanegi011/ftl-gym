'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  Check, 
  X, 
  Loader2, 
  ShieldAlert,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react"

export default function PTSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // contains sessionId during update

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/pt-sessions")
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat sesi latihan")
      }
      setSessions(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal mengambil data sesi PT.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleUpdateStatus = async (sessionId: string, newStatus: string) => {
    setActionLoading(sessionId)
    try {
      const response = await fetch(`/api/pt-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal memperbarui status sesi")
      }

      fetchSessions() // reload
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal memperbarui status.")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "cancelled":
        return <XCircle className="w-5 h-5 text-zinc-400" />
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />
      case "pending":
      default:
        return <HelpCircle className="w-5 h-5 text-amber-500" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <CalendarCheck className="w-8 h-8 text-emerald-500" />
          Agenda Latihan Bersama Member
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Terima pengajuan jadwal latihan baru dari member Anda, pantau jam pertemuan latihan yang sudah disetujui, dan hubungi kontak member.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat jadwal sesi mengajar...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchSessions} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/10 dark:bg-zinc-950/10">
          <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-500">Belum ada pemesanan sesi latihan.</p>
          <p className="text-xs text-zinc-400 mt-0.5">Ketika member membeli paket sesi Anda dan menjadwalkannya, sesi tersebut akan muncul di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((sess) => (
            <div 
              key={sess.id}
              className="p-5 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-800/80 rounded-3xl shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-zinc-700 shrink-0 text-sm">
                      {sess.member_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-950 dark:text-white text-sm">{sess.member_name}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-semibold mt-0.5">
                        {sess.member_phone || "Tanpa Telepon"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(sess.status)}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                      {sess.status}
                    </span>
                  </div>
                </div>

                {/* Sesi DateTime details */}
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold">
                      {new Date(sess.scheduled_at).toLocaleString("id-ID", {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-medium">
                      Pukul {new Date(sess.scheduled_at).toLocaleTimeString("id-ID", {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} WIB ({sess.duration_minutes} Menit)
                    </span>
                  </div>
                  {sess.notes && (
                    <div className="flex items-start gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 italic">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>"{sess.notes}"</span>
                    </div>
                  )}
                </div>

                {/* Member contact direct access */}
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {sess.member_email && (
                    <a href={`mailto:${sess.member_email}`} className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </a>
                  )}
                  {sess.member_phone && (
                    <a href={`tel:${sess.member_phone}`} className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                      Hubungi
                    </a>
                  )}
                </div>
              </div>

              {/* PT Action triggers */}
              {sess.status === "pending" && (
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-end gap-2">
                  <Button
                    disabled={actionLoading !== null}
                    variant="outline"
                    onClick={() => handleUpdateStatus(sess.id, "rejected")}
                    className="rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 text-red-500 hover:bg-red-500/10 hover:border-red-500/20 gap-1.5 h-9"
                  >
                    {actionLoading === sess.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    Tolak Sesi
                  </Button>
                  <Button
                    disabled={actionLoading !== null}
                    onClick={() => handleUpdateStatus(sess.id, "confirmed")}
                    className="rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 h-9 px-4"
                  >
                    {actionLoading === sess.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Terima Sesi
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
