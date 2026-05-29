'use client'

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { memberSchema, MemberInput } from "@/lib/validations/members"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, User, Mail, Phone, CreditCard, ShieldAlert } from "lucide-react"

interface MemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any | null // null means "Add New Member"
  onSuccess: () => void
}

export function MemberDialog({ open, onOpenChange, member, onSuccess }: MemberDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isEdit = !!member

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      membership_type: "basic",
      membership_status: "inactive",
    },
  })

  // Reset form when dialog opens/closes or member changes
  useEffect(() => {
    if (open) {
      setError(null)
      if (member) {
        reset({
          full_name: member.full_name || "",
          email: member.email || "",
          phone: member.phone || "",
          membership_type: member.membership_type || "basic",
          membership_status: member.membership_status || "inactive",
        })
      } else {
        reset({
          full_name: "",
          email: "",
          phone: "",
          membership_type: "basic",
          membership_status: "inactive",
        })
      }
    }
  }, [open, member, reset])

  const onSubmit = async (data: MemberInput) => {
    setLoading(true)
    setError(null)

    try {
      const url = isEdit ? `/api/members/${member.id}` : "/api/members"
      const method = isEdit ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan data member")
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
      title={isEdit ? "Edit Member Profile" : "Registrasi Member Baru"}
      description={isEdit ? "Perbarui detail profil member dan status membership aktif." : "Masukkan informasi diri member untuk membuat akun portal dan invoice membership."}
      className="sm:max-w-md bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg rounded-3xl"
    >
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in shake duration-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <ScrollArea className="h-[40vh] sm:h-[50vh] pr-2">
          <div className="space-y-4 pb-2">
          {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Nama Lengkap
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="full_name"
              placeholder="cth. Budi Utomo"
              className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
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
            Alamat Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="cth. budi@domain.com"
              disabled={isEdit} // Email generally shouldn't change for primary identity stability
              className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500 disabled:opacity-60"
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
              placeholder="cth. 08123456789"
              className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
              {...register("phone")}
            />
          </div>
          {errors.phone && (
            <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.phone.message}</p>
          )}
        </div>

        {/* Tier & Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Membership Type */}
          <div className="space-y-1.5">
            <Label htmlFor="membership_type" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Tipe Paket
            </Label>
            <div className="relative">
              <select
                id="membership_type"
                className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                {...register("membership_type")}
              >
                <option value="basic">Basic (Rp350k)</option>
                <option value="premium">Premium (Rp600k)</option>
                <option value="vip">VIP (Rp900k)</option>
              </select>
            </div>
            {errors.membership_type && (
              <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.membership_type.message}</p>
            )}
          </div>

          {/* Membership Status */}
          <div className="space-y-1.5">
            <Label htmlFor="membership_status" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Status
            </Label>
            <div className="relative">
              <select
                id="membership_status"
                className="w-full bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                {...register("membership_status")}
              >
                <option value="inactive">Inactive (Belum Lunas)</option>
                <option value="active">Active (Aktif)</option>
                <option value="suspended">Suspended (Ditangguhkan)</option>
              </select>
            </div>
            {errors.membership_status && (
              <p className="text-[10px] text-destructive font-semibold mt-0.5">{errors.membership_status.message}</p>
            )}
          </div>
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
            disabled={loading}
            className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10 min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
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
