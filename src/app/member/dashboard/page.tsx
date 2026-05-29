import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Calendar, CreditCard, Activity, Check, ShieldCheck, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DynamicQRCode } from "@/components/features/member/DynamicQRCode"

interface PageProps {
  searchParams: Promise<{ payment_success?: string }>
}

export default async function MemberDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const isPaymentSuccess = params.payment_success === 'true'

  // Get current authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // Get profile data for name and barcode
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, barcode, role')
    .eq('id', user.id)
    .single()

  const fullName = profile?.full_name || 'Member'
  const barcode = profile?.barcode || user.id // Fallback to user ID if barcode not set yet

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {isPaymentSuccess && (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Pembayaran Berhasil!</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5">Selamat bergabung di FTL Gym. Akun dan membership Anda sekarang sudah aktif.</p>
            </div>
          </div>
        </div>
      )}

      {/* Title Header with user's name */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            Halo, {fullName.split(' ')[0]}!
          </h1>
          <p className="text-zinc-500 mt-1 text-sm font-semibold">Berikut adalah ringkasan kebugaran harian Anda.</p>
        </div>
      </div>

      {/* QR Code and Member Access card */}
      <Card className="border border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-950/[0.05] shadow-lg shadow-emerald-500/5 backdrop-blur-md rounded-3xl overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Kiosk Mandiri</span>
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-1.5 justify-center md:justify-start">
              <span>Gate Entry QR Code</span>
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
              Gunakan QR Code dinamis dan terenkripsi ini untuk melakukan pemindaian check-in cepat melalui kamera kiosk di pintu masuk gym.
            </p>
          </div>
          <div className="w-full md:w-auto shrink-0 min-w-[200px]">
            <DynamicQRCode barcode={barcode} fullName={fullName} />
          </div>
        </div>
      </Card>

      {/* Original Daily Fitness Summary grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border-zinc-150 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Status Membership</CardTitle>
            <Dumbbell className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">AKTIF</div>
            <p className="text-xs text-zinc-500 mt-1">
              Paket Member Premium
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-zinc-150 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Kelas Studio</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">2 Terdaftar</div>
            <p className="text-xs text-zinc-500 mt-1">
              Sesi terdekat besok 08:00 WIB
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-zinc-150 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Sisa Sesi PT</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">5 Pertemuan</div>
            <p className="text-xs text-zinc-500 mt-1">
              Rencanakan latihan Anda segera
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-zinc-150 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Tagihan Berikut</CardTitle>
            <CreditCard className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">Rp 500.000</div>
            <p className="text-xs text-zinc-500 mt-1">
              Jatuh tempo pada 25 Juni 2026
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
