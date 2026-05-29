'use client'

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { trainerSchema, TrainerInput } from "@/lib/validations/trainers"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { Loader2, User, Mail, Phone, BookOpen, Star, Upload, Trash, ShieldAlert, Plus, X } from "lucide-react"

interface TrainerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainer: any | null // null means "Add New Trainer"
  onSuccess: () => void
}

export function TrainerDialog({ open, onOpenChange, trainer, onSuccess }: TrainerDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!trainer

  const [certList, setCertList] = useState<string[]>([])
  const [newCert, setNewCert] = useState("")

  const [specialitiesList, setSpecialitiesList] = useState<any[]>([])

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const res = await fetch("/api/specialities")
        const json = await res.json()
        setSpecialitiesList(json.data || [])
      } catch (err) {
        console.error("Gagal memuat spesialisasi", err)
      }
    }
    fetchSpecs()
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TrainerInput>({
    resolver: zodResolver(trainerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      specialities: [],
      bio: "",
      certifications: "",
      is_active: true,
    },
  })

  const selectedSpecs = watch("specialities") || []

  const handleSpecToggle = (specId: string) => {
    const nextSpecs = selectedSpecs.includes(specId)
      ? selectedSpecs.filter(id => id !== specId)
      : [...selectedSpecs, specId]
    setValue("specialities", nextSpecs, { shouldValidate: true })
  }

  // Reset form when dialog opens/closes or trainer changes
  useEffect(() => {
    if (open) {
      setError(null)
      setSelectedFile(null)
      setNewCert("")
      if (trainer) {
        setPreviewUrl(trainer.avatar_url || null)
        const certsArr = typeof trainer.certifications === 'string'
          ? trainer.certifications.split(',').map((c: string) => c.trim()).filter(Boolean)
          : Array.isArray(trainer.certifications)
          ? trainer.certifications.map((c: any) => String(c).trim()).filter(Boolean)
          : []
        setCertList(certsArr)
        reset({
          full_name: trainer.full_name || "",
          email: trainer.email || "",
          phone: trainer.phone || "",
          specialities: trainer.specialities?.map((s: any) => s.id || s) || [],
          bio: trainer.bio || "",
          certifications: typeof trainer.certifications === 'string'
            ? trainer.certifications
            : Array.isArray(trainer.certifications)
            ? trainer.certifications.join(', ')
            : "",
          is_active: trainer.is_active !== false,
        })
      } else {
        setPreviewUrl(null)
        setCertList([])
        reset({
          full_name: "",
          email: "",
          phone: "",
          specialities: [],
          bio: "",
          certifications: "",
          is_active: true,
        })
      }
    }
  }, [open, trainer, reset])

  const addCertification = () => {
    const trimmed = newCert.trim()
    if (!trimmed) return
    if (certList.includes(trimmed)) {
      setNewCert("")
      return
    }
    const updatedList = [...certList, trimmed]
    setCertList(updatedList)
    setValue("certifications", updatedList.join(", "), { shouldValidate: true })
    setNewCert("")
  }

  const removeCertification = (idxToRemove: number) => {
    const updatedList = certList.filter((_, idx) => idx !== idxToRemove)
    setCertList(updatedList)
    setValue("certifications", updatedList.join(", "), { shouldValidate: true })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setPreviewUrl(trainer?.avatar_url || null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const onSubmit = async (data: TrainerInput) => {
    setLoading(true)
    setError(null)

    try {
      let avatarBase64 = ""
      if (selectedFile) {
        avatarBase64 = await fileToBase64(selectedFile)
      }

      if (isEdit) {
        const response = await fetch("/api/trainers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            id: trainer.id,
            avatar_url: previewUrl,
            avatar_base64: avatarBase64,
          }),
        })

        const resData = await response.json()
        if (!response.ok) {
          throw new Error(resData.error || "Gagal memperbarui data instruktur")
        }
      } else {
        const response = await fetch("/api/trainers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            avatar_base64: avatarBase64,
          }),
        })

        const resData = await response.json()
        if (!response.ok) {
          throw new Error(resData.error || "Gagal membuat akun instruktur")
        }
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan koneksi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Profile Instruktur" : "Tambah Instruktur Baru"}
      description={isEdit ? "Perbarui riwayat spesialisasi, biografi singkat, dan status keaktifan." : "Daftarkan akun instruktur kelas studio baru beserta spesialisasi keterampilannya."}
      className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
    >
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in shake duration-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <ScrollArea className="h-[50vh] sm:h-[60vh] pr-2">
          <div className="space-y-4 pb-2">
          {/* Avatar Photo Upload UI */}
        <div className="flex flex-col items-center justify-center space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {previewUrl ? (
            <div className="relative group w-20 h-20 rounded-2xl overflow-hidden shadow-md">
              <img
                src={previewUrl}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 gap-1.5">
                <button
                  type="button"
                  onClick={triggerFileSelect}
                  className="w-7 h-7 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:scale-105"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  className="w-7 h-7 bg-destructive rounded-lg flex items-center justify-center text-white hover:scale-105"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={triggerFileSelect}
              className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:border-zinc-300 hover:text-zinc-500 transition-colors"
            >
              <Upload className="w-5 h-5" />
            </button>
          )}
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {previewUrl ? "Foto profil terpilih" : "Unggah Foto Profil"}
          </span>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Nama Lengkap
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="full_name"
              placeholder="cth. Coach Roni"
              className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-blue-500"
              {...register("full_name")}
            />
          </div>
          {errors.full_name && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Email Instruktur
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="cth. roni@ftlgym.com"
              disabled={isEdit}
              className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-blue-500 disabled:opacity-60"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Nomor Telepon
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              placeholder="cth. 08..."
              className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-blue-500 text-xs"
              {...register("phone")}
            />
          </div>
          {errors.phone && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.phone.message}</p>
          )}
        </div>

        {/* Specialties Checkboxes */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex justify-between">
            <span>Spesialisasi Instruktur</span>
            <span className="text-[10px] text-blue-500 font-extrabold uppercase tracking-wide">
              (Pilih minimal 1)
            </span>
          </Label>
          
          <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 border border-zinc-100 dark:border-zinc-800/60 p-2.5 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/10 scrollbar-thin">
            {specialitiesList.map((spec) => {
              const isSelected = selectedSpecs.includes(spec.id)
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => handleSpecToggle(spec.id)}
                  className={`flex items-center text-left gap-2 p-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-500 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span className="truncate">{spec.name}</span>
                </button>
              )
            })}
          </div>
          {errors.specialities && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.specialities.message}</p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Biografi Instruktur
          </Label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea
              id="bio"
              rows={3}
              placeholder="Ceritakan singkat latar belakang keahlian, sertifikasi, atau pencapaian..."
              className="w-full min-h-[80px] pl-9 pr-3 py-2 bg-background/50 rounded-xl border border-input focus-visible:ring-blue-500 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              {...register("bio")}
            />
          </div>
          {errors.bio && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.bio.message}</p>
          )}
        </div>

        {/* Certifications */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Sertifikasi & Lisensi
          </Label>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Star className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="cth. NASM-CPT, RYT-200, Lisensi CPR"
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCertification()
                  }
                }}
                className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-blue-500 text-xs"
              />
            </div>
            <Button
              type="button"
              onClick={addCertification}
              className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold gap-1 flex items-center shrink-0 shadow-md shadow-blue-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Button>
          </div>

          {/* Render Certifications List as dismissal badges */}
          {certList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              {certList.map((cert, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                >
                  <Star className="w-3 h-3 text-amber-500 shrink-0 fill-current" />
                  {cert}
                  <button 
                    type="button" 
                    onClick={() => removeCertification(index)} 
                    className="hover:text-red-500 dark:hover:text-red-400 transition-colors ml-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-400 italic">Belum ada sertifikasi ditambahkan.</p>
          )}

          {/* Hidden input field for react-hook-form schema to capture validation */}
          <input type="hidden" {...register("certifications")} />
          {errors.certifications && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.certifications.message}</p>
          )}
        </div>

        {/* Status Keaktifan */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="is_active"
            className="rounded border-zinc-300 text-blue-500 focus:ring-blue-500 w-4 h-4"
            {...register("is_active")}
          />
          <Label htmlFor="is_active" className="text-xs font-bold text-zinc-600 cursor-pointer">
            Instruktur Aktif (Dapat Diberikan Jadwal Kelas)
          </Label>
        </div>
      </div>
    </ScrollArea>

    <div className="flex justify-end pt-4 gap-2 border-t border-zinc-150 dark:border-zinc-800/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-zinc-200 dark:border-zinc-800 font-bold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || uploadingImage}
            className="rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/10 min-w-[100px]"
          >
            {loading || uploadingImage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadingImage ? "Uploading..." : "Saving..."}
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
