import { sql } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Activity, 
  ArrowLeft, 
  CreditCard, 
  BookmarkCheck, 
  BadgeCheck, 
  HelpCircle,
  FileCheck,
  QrCode
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export const revalidate = 0 // Disable cache for live details

export default async function AdminMemberDetailPage({ params }: PageProps) {
  const { id } = await params

  // 1. Fetch profile details
  const [profile] = await sql`
    SELECT 
      p.id,
      p.full_name,
      p.phone,
      p.avatar_url,
      p.role,
      p.barcode,
      p.created_at,
      u.email
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.id = ${id} AND p.role = 'member'
    LIMIT 1
  `

  if (!profile) {
    notFound()
  }

  // 2. Fetch memberships history
  const memberships = await sql`
    SELECT * FROM public.memberships
    WHERE member_id = ${id}
    ORDER BY created_at DESC
  `

  // 3. Fetch check-in logs
  const checkins = await sql`
    SELECT 
      c.id,
      c.method,
      c.liveness_passed,
      c.checked_in_at,
      admin.full_name as checked_in_by_name
    FROM public.checkins c
    LEFT JOIN public.profiles admin ON c.checked_in_by = admin.id
    WHERE c.member_id = ${id}
    ORDER BY c.checked_in_at DESC
  `

  // 4. Fetch bookings history
  const bookings = await sql`
    SELECT 
      b.id,
      b.status,
      b.booked_at,
      c.name as class_name,
      c.scheduled_at as class_scheduled_at,
      c.duration_minutes as class_duration,
      tp.full_name as trainer_name
    FROM public.bookings b
    JOIN public.classes c ON b.class_id = c.id
    LEFT JOIN public.profiles tp ON c.trainer_id = tp.id
    WHERE b.member_id = ${id}
    ORDER BY b.booked_at DESC
  `

  // 5. Fetch payment records
  const payments = await sql`
    SELECT * FROM public.payments
    WHERE member_id = ${id}
    ORDER BY created_at DESC
  `

  const getMembershipBadge = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "vip":
        return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
      case "premium":
        return "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
      case "basic":
      default:
        return "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400"
    }
  }

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case "active":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      case "suspended":
        return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      case "inactive":
      default:
        return "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400"
    }
  }

  const getPaymentStatusBadge = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case "paid":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      case "pending":
        return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
      case "expired":
      case "failed":
        return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      case "unpaid":
      default:
        return "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400"
    }
  }

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const latestMembership = memberships[0] || null

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back button */}
      <div>
        <Link href="/admin/members">
          <Button variant="ghost" className="rounded-xl hover:bg-zinc-100 font-bold gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Member
          </Button>
        </Link>
      </div>

      {/* Main Grid: Info Sidebar & Details Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md overflow-hidden rounded-3xl">
            {/* Header / Avatar */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-6 flex flex-col items-center justify-center border-b border-zinc-100 dark:border-zinc-800/50 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-xl font-bold text-emerald-600">
                {profile.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="font-extrabold text-base text-zinc-900 dark:text-white">{profile.full_name}</h2>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono select-all">
                  ID: {profile.id.substring(0, 8)}...
                </span>
              </div>
            </div>

            {/* Profile Info */}
            <CardContent className="p-5 space-y-4 text-xs font-medium">
              <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Detail Kontak</p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{profile.email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{profile.phone || "-"}</span>
                </p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Keanggotaan Aktif</p>
                {latestMembership ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tier Paket</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getMembershipBadge(latestMembership.type)}`}>
                        {latestMembership.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Status</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(latestMembership.status)}`}>
                        {latestMembership.status}
                      </span>
                    </div>
                    {latestMembership.start_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Berlaku</span>
                        <span className="text-zinc-800 dark:text-zinc-200">
                          {new Date(latestMembership.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} &ndash; {new Date(latestMembership.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-zinc-500">Belum memiliki paket membership.</p>
                )}
              </div>

              <div className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Kiosk Barcode</p>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <QrCode className="w-4 h-4 text-zinc-400" />
                  <span className="font-mono text-[10px] bg-zinc-50 dark:bg-zinc-900 border px-2 py-0.5 rounded select-all truncate max-w-full">
                    {profile.barcode || "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Check-ins logs */}
          <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-emerald-500" />
                Riwayat Check-in Kehadiran
              </CardTitle>
              <CardDescription>Jurnal kehadiran pemindaian wajah atau barcode member di gerbang masuk.</CardDescription>
            </CardHeader>
            <CardContent>
              {checkins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-xs font-semibold">Belum ada riwayat check-in.</p>
                </div>
              ) : (
                <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-2 space-y-5">
                  {checkins.slice(0, 5).map((c) => (
                    <div key={c.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <p className="font-bold text-zinc-800 dark:text-zinc-200">
                            Check-in Sukses via <span className="text-emerald-500 font-bold uppercase">{c.method}</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Waktu: {new Date(c.checked_in_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })} @ {new Date(c.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.liveness_passed && (
                            <span className="inline-flex px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-[9px] font-bold text-violet-600 dark:text-violet-400">
                              Liveness OK
                            </span>
                          )}
                          {c.checked_in_by_name && (
                            <span className="text-[10px] text-zinc-500 italic">Oleh: {c.checked_in_by_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings */}
          <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookmarkCheck className="w-4.5 h-4.5 text-blue-500" />
                Riwayat Pemesanan Kelas Studio
              </CardTitle>
              <CardDescription>Daftar pemesanan kelas studio latihan gym terdaftar.</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <Calendar className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-xs font-semibold">Belum memiliki riwayat pemesanan kelas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3.5 bg-white/70 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl">
                      <div className="space-y-1">
                        <p className="font-bold text-xs text-zinc-900 dark:text-white">{b.class_name}</p>
                        <p className="text-[10px] text-zinc-500">
                          Instruktur: <span className="font-bold">{b.trainer_name || 'N/A'}</span> • Jadwal: Setiap {b.class_day_of_week} pukul {b.class_start_time} WIB
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        b.status === "attended" 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : b.status === "cancelled"
                          ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                      }`}>
                        {b.status === "attended" ? "Hadir" : b.status === "cancelled" ? "Batal" : "Terdaftar"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-violet-500" />
                Riwayat Transaksi & Pembayaran
              </CardTitle>
              <CardDescription>Riwayat tagihan invoice Xendit beserta status lunas terdaftar.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <CreditCard className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-xs font-semibold">Belum memiliki riwayat pembayaran.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <th className="py-2.5 px-3">Invoice ID / Tipe</th>
                        <th className="py-2.5 px-3">Jumlah</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 font-medium text-zinc-700 dark:text-zinc-300">
                      {payments.slice(0, 5).map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-3">
                            <p className="font-bold text-zinc-900 dark:text-white truncate max-w-[150px]" title={p.xendit_external_id}>
                              {p.xendit_external_id}
                            </p>
                            <p className="text-[9px] text-zinc-400 capitalize">{p.reference_type}</p>
                          </td>
                          <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                            {formatRupiah(Number(p.amount))}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getPaymentStatusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-400 text-[10px]">
                            {new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
