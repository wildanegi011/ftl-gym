'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal"
import { 
  Calendar, 
  Plus, 
  Loader2, 
  ShieldAlert, 
  Trash2, 
  Edit2, 
  Users, 
  Clock,
  Sparkles,
  Search,
  Grid,
  CalendarRange
} from "lucide-react"

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<any | null>(null)
  
  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<any | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Form State
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [trainerId, setTrainerId] = useState("")
  const [capacity, setCapacity] = useState<number>(20)
  const [dayOfWeek, setDayOfWeek] = useState("Senin")
  const [startTime, setStartTime] = useState("09:00")
  const [duration, setDuration] = useState<number>(60)
  const [isActive, setIsActive] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("calendar") // Default to calendar view for maximum "WOW" effect!

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch classes
      const clsResponse = await fetch("/api/classes")
      const clsData = await clsResponse.json()
      if (!clsResponse.ok) throw new Error(clsData.error || "Gagal memuat jadwal kelas")
      setClasses(clsData.data || [])

      // Fetch all trainers to pick from
      const trnResponse = await fetch("/api/trainers")
      const trnData = await trnResponse.json()
      // Note: we can filter to display only class trainers (role = 'trainer') or let them pick pt too
      if (trnResponse.ok) {
        setTrainers(trnData.data || [])
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal mengambil data jadwal.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenAddModal = () => {
    setSelectedClass(null)
    setName("")
    setDescription("")
    setTrainerId("")
    setCapacity(20)
    setDayOfWeek("Senin")
    setStartTime("09:00")
    setDuration(60)
    setIsActive(true)
    setFormError(null)
    setModalOpen(true)
  }

  const handleOpenEditModal = (cls: any) => {
    setSelectedClass(cls)
    setName(cls.name)
    setDescription(cls.description || "")
    setTrainerId(cls.trainer_id || "")
    setCapacity(cls.capacity)
    setDayOfWeek(cls.day_of_week || "Senin")
    setStartTime(cls.start_time || "09:00")
    setDuration(cls.duration_minutes)
    setIsActive(cls.is_active)
    setFormError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    const url = selectedClass ? `/api/classes/${selectedClass.id}` : "/api/classes"
    const method = selectedClass ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          trainer_id: trainerId || null,
          capacity,
          day_of_week: dayOfWeek,
          start_time: startTime,
          duration_minutes: duration,
          is_active: isActive
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan jadwal kelas")
      }

      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      setFormError(err.message || "Gagal memproses form.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleOpenDeleteModal = (cls: any) => {
    setClassToDelete(cls)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/classes/${classToDelete.id}`, {
        method: "DELETE"
      })
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menghapus jadwal kelas")
      }
      setDeleteModalOpen(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal menghapus jadwal kelas.")
    } finally {
      setDeleteLoading(false)
      setClassToDelete(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <Calendar className="w-8 h-8 text-emerald-500" />
            Manajemen Jadwal Kelas Studio
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Jadwalkan kelas kebugaran berkelompok, atur batas kapasitas, dan tugaskan Instruktur pengampu kelas.
          </p>
        </div>
        <Button
          onClick={handleOpenAddModal}
          className="rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 text-xs gap-1.5 h-10 px-5"
        >
          <Plus className="w-4 h-4" />
          Buat Jadwal Kelas
        </Button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between bg-zinc-150/40 dark:bg-zinc-900/40 p-1 rounded-2xl max-w-[280px] border border-zinc-200/40 dark:border-zinc-800/40">
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all duration-300 ${
            viewMode === "calendar"
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          Google Kalender
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all duration-300 ${
            viewMode === "grid"
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          Daftar Sesi
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat jadwal kelas studio...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchData} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Jadwal kelas kosong.</p>
          <p className="text-zinc-400 text-xs mt-0.5">Mulai jadwalkan kelas studio pertama Anda dengan menekan tombol diatas.</p>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="overflow-x-auto rounded-3xl border border-zinc-200/50 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl shadow-sm">
          <table className="w-full border-collapse text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-250 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-zinc-400 w-24 text-center border-r border-zinc-200/50 dark:border-zinc-800/60">
                  Jam
                </th>
                {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => {
                  const isToday = day.toLowerCase() === ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()].toLowerCase();
                  return (
                    <th 
                      key={day} 
                      className={`p-4 text-xs font-black uppercase tracking-wider text-center border-r border-zinc-200/50 dark:border-zinc-800/60 last:border-r-0 ${
                        isToday 
                          ? "text-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" 
                          : "text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {day}
                      {isToday && <span className="block text-[8px] font-black tracking-widest text-emerald-500 mt-0.5 uppercase">Hari Ini</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map((hour) => (
                <tr 
                  key={hour} 
                  className="border-b border-zinc-200/40 dark:border-zinc-800/30 hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 last:border-b-0"
                >
                  {/* Hour Label */}
                  <td className="p-3 text-[11px] font-black text-zinc-400 dark:text-zinc-500 text-center bg-zinc-50/20 dark:bg-zinc-900/10 border-r border-zinc-200/50 dark:border-zinc-800/60 select-none">
                    {hour}
                  </td>
                  {/* Days cells */}
                  {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => {
                    const cellClasses = classes.filter(cls => 
                      cls.day_of_week.toLowerCase() === day.toLowerCase() && 
                      parseInt(cls.start_time.split(':')[0]) === parseInt(hour.split(':')[0])
                    )
                    const isToday = day.toLowerCase() === ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()].toLowerCase();

                    return (
                      <td 
                        key={day} 
                        className={`p-2 border-r border-zinc-200/40 dark:border-zinc-800/30 last:border-r-0 align-top relative min-h-[95px] h-[95px] w-[13%] transition-colors duration-200 group/cell ${
                          isToday ? "bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]" : ""
                        }`}
                      >
                        {cellClasses.length > 0 ? (
                          <div className="space-y-1.5">
                            {cellClasses.map((cls) => (
                              <div
                                key={cls.id}
                                onClick={() => handleOpenEditModal(cls)}
                                className={`group/card relative p-2 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                  cls.is_active
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 shadow-sm shadow-emerald-500/5"
                                    : "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                                }`}
                              >
                                <p className="font-extrabold text-[10px] leading-tight truncate text-zinc-900 dark:text-white group-hover/card:text-emerald-600 dark:group-hover/card:text-emerald-400">{cls.name}</p>
                                <div className="flex items-center justify-between mt-1 text-[9px] font-bold opacity-80 gap-1 text-zinc-500 dark:text-zinc-400">
                                  <span className="truncate">{cls.start_time}</span>
                                  <span className="font-black shrink-0">{cls.bookings_count}/{cls.capacity}</span>
                                </div>
                                <p className="text-[8px] opacity-75 mt-0.5 truncate italic font-bold text-zinc-400 dark:text-zinc-500">{cls.trainer_name || 'N/A'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedClass(null)
                              setName("")
                              setDescription("")
                              setTrainerId("")
                              setCapacity(20)
                              setDayOfWeek(day)
                              setStartTime(hour)
                              setDuration(60)
                              setIsActive(true)
                              setFormError(null)
                              setModalOpen(true)
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 group-hover/cell:opacity-100 flex items-center justify-center transition-all duration-300 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]"
                          >
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-white dark:bg-zinc-900 px-2 py-1 rounded-xl shadow-sm border border-emerald-500/10 transform scale-95 group-hover/cell:scale-100 transition-all duration-300">
                              <Plus className="w-2.5 h-2.5 font-black" />
                              Jadwalkan
                            </span>
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${cls.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                      {cls.is_active ? 'Aktif' : 'Draft'}
                    </span>
                    <h3 className="font-bold text-zinc-950 dark:text-white text-base mt-2 group-hover:text-emerald-500 transition-colors">
                      {cls.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {cls.description || "Tidak ada deskripsi ditulis."}
                </p>

                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Setiap {cls.day_of_week}, {cls.start_time} WIB
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Durasi {cls.duration_minutes} Menit</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold">{cls.bookings_count} / {cls.capacity} Peserta</span>
                  </div>
                </div>

                {/* Trainer assignment details */}
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium">Instruktur:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {cls.trainer_name || "Tanpa Instruktur"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEditModal(cls)}
                  className="rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all gap-1 h-8"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDeleteModal(cls)}
                  className="rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 text-red-500 hover:bg-red-500/10 hover:border-red-500/20 gap-1 h-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Responsive Class Dialog/Drawer Form */}
      <ResponsiveModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={selectedClass ? "Ubah Jadwal Kelas" : "Buat Jadwal Kelas Studio"}
        description="Lengkapi detail kelas studio untuk diterbitkan pada agenda latihan member."
        className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Class Name */}
          <div className="space-y-1.5">
            <Label htmlFor="class_name" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Nama Kelas Studio
            </Label>
            <Input
              id="class_name"
              placeholder="cth. Yoga Vinyasa, Zumba Dance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="class_desc" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Deskripsi Singkat
            </Label>
            <Input
              id="class_desc"
              placeholder="cth. Latihan peregangan tubuh & relaksasi pikiran."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Hari (Day of Week) */}
            <div className="space-y-1.5">
              <Label htmlFor="day_of_week" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Hari Jadwal Kelas
              </Label>
              <select
                id="day_of_week"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
              </select>
            </div>

            {/* Jam Mulai (Start Time) */}
            <div className="space-y-1.5">
              <Label htmlFor="start_time" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Jam Kelas Dimulai
              </Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
                required
              />
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Maksimal Kapasitas
              </Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Durasi (Menit)
              </Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Trainer assignment picker */}
          <div className="space-y-1.5">
            <Label htmlFor="trainer_id" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Pilih Instruktur
            </Label>
            <select
              id="trainer_id"
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Pilih Instruktur Pengampu --</option>
              {trainers.map((trn) => (
                <option key={trn.id} value={trn.id}>{trn.full_name} ({trn.role})</option>
              ))}
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
            />
            <Label htmlFor="is_active" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Terbitkan Jadwal Kelas Studio (Aktif)
            </Label>
          </div>

          <div className="flex justify-end pt-4 gap-2 border-t border-zinc-100 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={formLoading}
              className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white min-w-[100px]"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Simpan"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Hapus Jadwal Kelas Studio"
        itemName={classToDelete?.name}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  )
}
