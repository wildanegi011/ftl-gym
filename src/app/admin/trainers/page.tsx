'use client'

import { useEffect, useState } from "react"
import { TrainerDialog } from "@/components/features/admin/trainer-dialog"
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal"
import { Button } from "@/components/ui/button"
import {
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  Loader2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Award,
  Star
} from "lucide-react"

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null)

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [trainerToDelete, setTrainerToDelete] = useState<any | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchTrainers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/trainers")
      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat daftar instruktur")
      }

      setTrainers(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan saat memuat data instruktur.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrainers()
  }, [])

  const handleAddClick = () => {
    setSelectedTrainer(null)
    setDialogOpen(true)
  }

  const handleEditClick = (trainer: any) => {
    setSelectedTrainer(trainer)
    setDialogOpen(true)
  }

  const handleDeleteClick = (trainer: any) => {
    setTrainerToDelete(trainer)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!trainerToDelete) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/members/${trainerToDelete.id}`, {
        method: "DELETE",
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menghapus instruktur")
      }

      fetchTrainers()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal menghapus instruktur.")
    } finally {
      setDeleteLoading(false)
      setTrainerToDelete(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-emerald-500" />
            Manajemen Instruktur
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Kelola profil instruktur kelas studio gym, spesialisasi, biografi, dan status keaktifannya.
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 text-xs gap-1.5 h-10 px-5"
        >
          <Plus className="w-4 h-4" />
          Registrasi Instruktur
        </Button>
      </div>

      {/* Main UI */}
      {loading && trainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat data instruktur...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchTrainers} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : trainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <Dumbbell className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2 animate-bounce duration-3000" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Belum ada instruktur terdaftar.</p>
          <p className="text-zinc-400 text-xs mt-0.5">Daftarkan instruktur pertama Anda untuk memulai kelas studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-3xl border border-zinc-150 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              {/* Profile Card Info */}
              <div>
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {t.avatar_url ? (
                      <img
                        src={t.avatar_url}
                        alt={t.full_name}
                        className="w-14 h-14 rounded-2xl object-cover border border-zinc-100 dark:border-zinc-850 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                        <UserIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-650" />
                      </div>
                    )}
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center ${t.is_active !== false ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-950 dark:text-white text-base truncate flex items-center gap-1.5">
                      {t.full_name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold ml-1 text-zinc-800 dark:text-zinc-200">
                        {Number(t.rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trainer Bio */}
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-4 line-clamp-3 italic leading-relaxed">
                  "{t.bio || "Siap membimbing kelas latihan dengan instruksi yang menyenangkan dan enerjik."}"
                </p>

                {/* Certifications */}
                {t.certifications && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {(typeof t.certifications === 'string'
                      ? t.certifications.split(',')
                      : Array.isArray(t.certifications)
                        ? t.certifications
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

                {/* Specialities */}
                <div className="mt-4 flex flex-wrap gap-1">
                  {t.specialities && t.specialities.length > 0 ? (
                    t.specialities.map((spec: any) => (
                      <span
                        key={spec.id}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
                      >
                        <Award className="w-2.5 h-2.5 shrink-0" />
                        {spec.name}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/10">
                      <Award className="w-2.5 h-2.5 shrink-0" />
                      Instruktur
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="mt-4 pt-3 border-t border-dashed border-zinc-150 dark:border-zinc-800/60 space-y-1 text-[11px] text-zinc-500 font-medium">
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{t.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{t.phone || "-"}</span>
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  {t.is_active !== false ? "Status: Aktif" : "Status: Non-aktif"}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(t)}
                    className="rounded-xl font-bold border-zinc-200 dark:border-zinc-800 text-xs px-3 h-8 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(t)}
                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Hapus Instruktur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trainer Form Dialog */}
      <TrainerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trainer={selectedTrainer}
        onSuccess={fetchTrainers}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        itemName={trainerToDelete?.full_name || ""}
        loading={deleteLoading}
      />
    </div>
  )
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
