import { createClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { revalidatePath } from "next/cache"
import { 
  User, 
  Phone, 
  Mail, 
  QrCode, 
  ShieldCheck, 
  Activity, 
  Save, 
  Fingerprint,
  Calendar
} from "lucide-react"
import QRCode from "qrcode"
import { redirect } from "next/navigation"

export const revalidate = 0 // Disable cache for live profile details

// Next.js Server Action inside the same file for premium efficiency
async function handleUpdateProfile(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect("/login")
  }

  const fullName = formData.get("full_name") as string
  const phone = formData.get("phone") as string

  // Simple server-side validation
  if (!fullName || fullName.length < 2) {
    return
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone,
    })
    .eq("id", user.id)

  if (error) {
    console.error("Failed to update profile:", error)
    return
  }

  revalidatePath("/member/profile")
}

export default async function MemberProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect("/login")
  }

  // Fetch profile details
  const [profile] = await sql`
    SELECT id, full_name, phone, barcode, avatar_url, role, created_at
    FROM public.profiles
    WHERE id = ${user.id}
    LIMIT 1
  `

  if (!profile) {
    return redirect("/login")
  }

  // Fetch active membership
  const [membership] = await sql`
    SELECT type, status, start_date, end_date
    FROM public.memberships
    WHERE member_id = ${user.id} AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `

  // Generate QR Code data URL server-side
  let qrCodeDataUrl = ""
  if (profile.barcode) {
    try {
      qrCodeDataUrl = await QRCode.toDataURL(profile.barcode, {
        margin: 2,
        width: 300,
        color: {
          dark: "#09090b", // zinc-950
          light: "#ffffff",
        },
      })
    } catch (err) {
      console.error("QR Code generation failed:", err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <Fingerprint className="w-8 h-8 text-emerald-500" />
          Diri & Keanggotaan
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Perbarui informasi kontak pribadi dan gunakan barcode akses masuk pintu gym.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Check-in QR Card */}
        <Card className="md:col-span-2 border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5 text-center border-b border-zinc-100 dark:border-zinc-800/50">
            <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center justify-center gap-2">
              <QrCode className="w-4.5 h-4.5 text-emerald-500" />
              Check-in Digital Card
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Pindai QR ini di scanner check-in FTL Gym.</p>
          </div>

          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
            {qrCodeDataUrl ? (
              <div className="p-3 bg-white border border-zinc-100 rounded-3xl shadow-sm hover:scale-[1.01] transition-transform duration-300">
                <img
                  src={qrCodeDataUrl}
                  alt="Check-in QR Code"
                  className="w-48 h-48 rounded-2xl"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 rounded-2xl">
                Gagal memuat QR
              </div>
            )}

            <div className="text-center space-y-1">
              <code className="text-xs bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-xl font-mono text-zinc-600 dark:text-zinc-400 tracking-wider">
                {profile.barcode || "Belum Dibuat"}
              </code>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>ID Akses Terverifikasi</span>
              </p>
            </div>
          </CardContent>

          {/* Membership Status Footer */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-zinc-500">Status Membership</span>
              {membership ? (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {membership.type} Active
                </span>
              ) : (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider border bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400">
                  Expired / Inactive
                </span>
              )}
            </div>
            {membership && membership.end_date && (
              <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Berlaku s.d. {new Date(membership.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              </p>
            )}
          </div>
        </Card>

        {/* Profile Settings Form */}
        <Card className="md:col-span-3 border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-emerald-500" />
              Pengaturan Profil Personal
            </CardTitle>
            <CardDescription>Sesuaikan data diri dan nomor kontak aktif Anda.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <form action={handleUpdateProfile} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={profile.full_name || ""}
                    required
                    placeholder="Masukkan nama lengkap Anda"
                    className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1.5 opacity-70">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Alamat Email (Tidak Dapat Diganti)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    disabled
                    value={user.email || ""}
                    className="pl-9 h-10 bg-background/30 rounded-xl cursor-not-allowed"
                  />
                </div>
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
                    name="phone"
                    defaultValue={profile.phone || ""}
                    placeholder="Masukkan nomor telepon aktif"
                    className="pl-9 h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full rounded-xl font-bold bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:scale-[0.99] transition-all duration-200 shadow-md gap-2"
                >
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
