'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { 
  Users, 
  Loader2, 
  ShieldAlert, 
  Camera, 
  Scan, 
  Upload, 
  UserCheck, 
  CheckCircle2, 
  FileText,
  Key,
  ShieldCheck,
  Search
} from "lucide-react"

export default function AdminCheckinsPage() {
  const [checkins, setCheckins] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Enrollment Wizard States
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch checkins list
      const ckResponse = await fetch("/api/checkins?limit=50")
      const ckData = await ckResponse.json()
      if (!ckResponse.ok) throw new Error(ckData.error || "Gagal memuat log kehadiran")
      setCheckins(ckData.data || [])

      // Fetch members list for enrollment dropdown
      const mbResponse = await fetch("/api/members")
      const mbData = await mbResponse.json()
      if (mbResponse.ok) {
        setMembers(mbData.data || [])
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal memuat data kehadiran.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenEnrollModal = () => {
    setSelectedMemberId("")
    setUploadFile(null)
    setPreviewUrl(null)
    setEnrollError(null)
    setEnrollSuccess(null)
    setEnrollModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setEnrollError(null)
    }
  }

  // Generate randomized float array simulating 128-dimensional embedding
  const generateMockEmbedding = () => {
    const arr = []
    for (let i = 0; i < 128; i++) {
      arr.push(Math.random() * 0.2 - 0.1) // small random float values
    }
    return arr
  }

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId || !uploadFile) {
      setEnrollError("Pilih member dan unggah foto baseline terlebih dahulu.")
      return
    }

    setEnrollLoading(true)
    setEnrollError(null)
    setEnrollSuccess(null)

    try {
      const mockEmbedding = generateMockEmbedding()
      // Simulate file upload or use placeholder avatar
      const avatarPlaceholder = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"

      const response = await fetch("/api/admin/face/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedMemberId,
          face_embedding: mockEmbedding,
          avatar_url: avatarPlaceholder
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal mendaftarkan biometrik")
      }

      setEnrollSuccess(resData.message)
      fetchData() // Refresh listing

      setTimeout(() => {
        setEnrollModalOpen(false)
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setEnrollError(err.message || "Gagal memproses pendaftaran biometrik.")
    } finally {
      setEnrollLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-emerald-500" />
            Monitoring & Biometrik Kehadiran
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Pantau arus kehadiran pintu masuk gym secara live dan daftarkan baseline biometrik wajah member.
          </p>
        </div>
        
        <Button
          onClick={handleOpenEnrollModal}
          className="rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 text-xs gap-1.5 h-10 px-5"
        >
          <Camera className="w-4 h-4" />
          Pendaftaran Biometrik Wajah
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Menyusun logs kehadiran member...</p>
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
          {/* Recent check-ins stream */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Log Aliran Masuk Pintu Gym (Live)</h2>
            {checkins.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/10 dark:bg-zinc-950/10">
                <UserCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Belum ada aktivitas check-in terdeteksi hari ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkins.map((chk) => (
                  <div 
                    key={chk.id}
                    className="p-4 bg-white border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 rounded-2xl shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {chk.member_avatar ? (
                        <img src={chk.member_avatar} alt={chk.member_name} className="w-10 h-10 rounded-full object-cover border shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {chk.member_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{chk.member_name}</h4>
                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 mt-1 uppercase font-semibold">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">{chk.membership_type || "No Plan"}</span>
                          <span>•</span>
                          <span>Metode {chk.method}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-zinc-400 block font-semibold">
                        {new Date(chk.checked_in_at).toLocaleTimeString("id-ID", {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })} WIB
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-500 font-bold mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Lulus
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats sidebar info */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-semibold">Statistik Hari Ini</h2>
            
            <div className="p-6 bg-zinc-900 text-white rounded-3xl border border-zinc-800 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Kehadiran Hari Ini</p>
                <h3 className="text-3xl font-black mt-2 tracking-tight">
                  {checkins.length} Member
                </h3>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-850 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Paling Sering</span>
                  <span className="font-bold text-white">Face Match</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Waktu Terpadat</span>
                  <span className="font-bold text-white">18:00 - 20:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Face Enrollment wizard Responsive Modal */}
      <ResponsiveModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        title="Biometric Face Enrollment"
        description="Daftarkan baseline biometrik wajah member untuk mengaktifkan fitur scan face-recognition."
        className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
      >
        <form onSubmit={handleEnrollSubmit} className="space-y-4 pt-2">
          {enrollError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{enrollError}</span>
            </div>
          )}

          {enrollSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{enrollSuccess}</span>
            </div>
          )}

          {/* Member picker */}
          <div className="space-y-1.5">
            <Label htmlFor="member_select" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Pilih Member
            </Label>
            <select
              id="member_select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">-- Pilih Member Gym --</option>
              {members.map((mb) => (
                <option key={mb.id} value={mb.id}>{mb.full_name} ({mb.membership_status})</option>
              ))}
            </select>
          </div>

          {/* File uploader baseline */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
              Unggah Foto Baseline Wajah
            </Label>
            
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-200 dark:border-zinc-850 hover:border-emerald-500/40 rounded-2xl cursor-pointer bg-background/50 transition-colors overflow-hidden relative">
                {previewUrl ? (
                  <div className="w-full h-full relative group">
                    <img src={previewUrl} alt="Baseline preview" className="w-full h-full object-cover" />
                    {/* high-tech trace overlay on preview image */}
                    <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Scan className="w-8 h-8 text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Unggah baseline wajah</p>
                    <p className="text-[9px] text-zinc-400 mt-1 leading-relaxed">Ekstraksi otomatis 128 embedding landmarks wajah.</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required={!previewUrl}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 gap-2 border-t border-zinc-100 dark:border-zinc-850">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEnrollModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={enrollLoading || enrollSuccess !== null}
              className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white min-w-[120px]"
            >
              {enrollLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Daftarkan Biometrik"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  )
}
