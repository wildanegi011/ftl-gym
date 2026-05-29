import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Dumbbell, Calendar, CreditCard, Activity, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { sql } from "@/lib/db"
import Link from "next/link"

export const revalidate = 0 // Disable cache for live stats

export default async function AdminDashboardPage() {
  // Fetch real metrics from DB
  const [totalMembersQuery] = await sql`
    SELECT count(*)::int as count FROM public.profiles WHERE role = 'member'
  `
  const [activeMembersQuery] = await sql`
    SELECT count(*)::int as count FROM public.memberships WHERE status = 'active'
  `
  const [totalTrainersQuery] = await sql`
    SELECT count(*)::int as count FROM public.profiles WHERE role = 'trainer'
  `
  const [totalRevenueQuery] = await sql`
    SELECT COALESCE(sum(amount), 0)::numeric as sum FROM public.payments WHERE status = 'paid'
  `

  const totalMembers = totalMembersQuery?.count || 0
  const activeMembers = activeMembersQuery?.count || 0
  const totalTrainers = totalTrainersQuery?.count || 0
  const totalRevenue = Number(totalRevenueQuery?.sum || 0)

  // Fetch monthly revenue for last 6 months
  const revenueStats = await sql`
    SELECT 
      TO_CHAR(created_at, 'Mon') as month,
      COALESCE(sum(amount), 0)::numeric as revenue
    FROM public.payments
    WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `

  // Fetch active memberships tier distribution
  const tierStats = await sql`
    SELECT 
      type,
      count(*)::int as count
    FROM public.memberships
    WHERE status = 'active'
    GROUP BY type
  `

  const basicCount = tierStats.find((t: any) => t.type === 'basic')?.count || 0
  const premiumCount = tierStats.find((t: any) => t.type === 'premium')?.count || 0
  const vipCount = tierStats.find((t: any) => t.type === 'vip')?.count || 0
  const totalTiers = basicCount + premiumCount + vipCount

  // Fetch recent check-ins
  const recentCheckins = await sql`
    SELECT 
      c.id,
      c.method,
      c.checked_in_at,
      p.full_name,
      p.avatar_url
    FROM public.checkins c
    JOIN public.profiles p ON c.member_id = p.id
    ORDER BY c.checked_in_at DESC
    LIMIT 5
  `

  const daysIndonesian = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const todayDayName = daysIndonesian[new Date().getDay()]

  // Fetch today's classes based on recurring weekly day
  const classesToday = await sql`
    SELECT 
      c.id,
      c.name,
      c.capacity,
      c.day_of_week,
      c.start_time,
      p.full_name as trainer_name
    FROM public.classes c
    LEFT JOIN public.profiles p ON c.trainer_id = p.id
    WHERE LOWER(c.day_of_week) = LOWER(${todayDayName}) AND c.is_active = true
    ORDER BY c.start_time ASC
  `

  // Format currency
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Welcome & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            Admin Console
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            Ringkasan data operasional FTL Gym real-time hari ini.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Members */}
        <Card className="border border-zinc-100 dark:border-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Member Aktif</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{activeMembers}</div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <span>Dari total {totalMembers} member terdaftar</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Trainers */}
        <Card className="border border-zinc-100 dark:border-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Instruktur Kelas</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Dumbbell className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalTrainers}</div>
            <p className="text-xs text-zinc-500 mt-1">Mengelola jadwal & program latihan</p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="border border-zinc-100 dark:border-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Pendapatan</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatRupiah(totalRevenue)}</div>
            <p className="text-xs text-zinc-500 mt-1">Akumulasi pembayaran invoice lunas</p>
          </CardContent>
        </Card>

        {/* Today's Checkins */}
        <Card className="border border-zinc-100 dark:border-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Check-in Hari Ini</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{recentCheckins.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Check-in terdaftar beberapa jam terakhir</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card className="border border-zinc-100 dark:border-zinc-900 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Tren Pendapatan Bulanan
            </CardTitle>
            <CardDescription>Laporan grafik akumulasi pembayaran lunas 6 bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-zinc-500 text-xs">Belum ada data pendapatan bulanan.</p>
              </div>
            ) : (
              <div className="h-48 flex items-end justify-between gap-4 pt-6 px-2">
                {revenueStats.map((r: any, idx: number) => {
                  const val = Number(r.revenue)
                  const maxRevenue = Math.max(...revenueStats.map((item: any) => Number(item.revenue)), 1000000)
                  const pct = Math.max(10, Math.min(100, (val / maxRevenue) * 100))
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      {/* Tooltip on hover */}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm shrink-0">
                        {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `Rp ${(val / 1000).toFixed(0)}k`}
                      </span>
                      {/* Bar */}
                      <div 
                        style={{ height: `${pct}%` }} 
                        className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 dark:from-emerald-600 dark:to-teal-500 rounded-t-lg transition-all duration-500 group-hover:scale-x-105 group-hover:shadow-lg group-hover:shadow-emerald-500/20 cursor-pointer min-h-[8px]" 
                      />
                      {/* Label */}
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 mt-1">
                        {r.month}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership Tier Distribution */}
        <Card className="border border-zinc-100 dark:border-zinc-900 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Proporsi Keanggotaan Aktif
            </CardTitle>
            <CardDescription>Rasio persebaran tier paket membership yang terdaftar aktif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {totalTiers === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-zinc-500 text-xs">Belum ada keanggotaan terdaftar aktif.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual stacked bar */}
                <div className="h-3.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden flex">
                  {basicCount > 0 && (
                    <div 
                      style={{ width: `${(basicCount / totalTiers) * 100}%` }} 
                      className="h-full bg-zinc-400 hover:opacity-90 transition-opacity" 
                      title={`Basic: ${basicCount} Member`}
                    />
                  )}
                  {premiumCount > 0 && (
                    <div 
                      style={{ width: `${(premiumCount / totalTiers) * 100}%` }} 
                      className="h-full bg-blue-500 hover:opacity-90 transition-opacity" 
                      title={`Premium: ${premiumCount} Member`}
                    />
                  )}
                  {vipCount > 0 && (
                    <div 
                      style={{ width: `${(vipCount / totalTiers) * 100}%` }} 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-90 transition-opacity" 
                      title={`VIP: ${vipCount} Member`}
                    />
                  )}
                </div>

                {/* Tier details list */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs border-b border-zinc-50 dark:border-zinc-900 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">Basic Tier</span>
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {basicCount} Member <span className="text-[10px] text-zinc-400 font-semibold ml-1">({((basicCount / totalTiers) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-zinc-50 dark:border-zinc-900 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">Premium Tier</span>
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {premiumCount} Member <span className="text-[10px] text-zinc-400 font-semibold ml-1">({((premiumCount / totalTiers) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">VIP Tier</span>
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {vipCount} Member <span className="text-[10px] text-zinc-400 font-semibold ml-1">({((vipCount / totalTiers) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2 border border-zinc-100 dark:border-zinc-900 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Jadwal Kelas Hari Ini
            </CardTitle>
            <CardDescription>
              Daftar sesi studio training terjadwal untuk hari ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classesToday.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-sm font-semibold">Tidak ada kelas studio untuk hari ini.</p>
                <p className="text-zinc-400 text-xs mt-0.5">Jadwal dapat dibuat di menu Kelas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {classesToday.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white/70 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl transition-all duration-200 hover:border-zinc-200">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-2">
                        <span>Instruktur: <span className="font-bold text-zinc-700 dark:text-zinc-300">{c.trainer_name || 'N/A'}</span></span>
                        <span>•</span>
                        <span>Maks: {c.capacity} member</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {c.start_time} WIB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-zinc-100 dark:border-zinc-900 bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Aktivitas Check-in
            </CardTitle>
            <CardDescription>
              Daftar kehadiran member terbaru di pintu masuk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <Activity className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2 animate-pulse" />
                <p className="text-zinc-500 text-sm font-semibold">Belum ada check-in hari ini.</p>
                <p className="text-zinc-400 text-xs mt-0.5">Tampilan akan diperbarui saat member memindai barcode / wajah.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCheckins.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/40">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{c.full_name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(c.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      c.method === "face" 
                        ? "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400" 
                        : c.method === "barcode"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                    }`}>
                      {c.method}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Navigasi Admin</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/members" className="group p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">Manajemen Member &rarr;</h3>
            <p className="text-xs text-zinc-500 mt-1">Daftar member, aktivasi paket membership, detail riwayat latihan & pembayaran.</p>
          </Link>
          <Link href="/admin/trainers" className="group p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-500/40 hover:shadow-lg transition-all duration-300">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white group-hover:text-blue-500 transition-colors">Manajemen Trainer &rarr;</h3>
            <p className="text-xs text-zinc-500 mt-1">Kelola data instruktur, spesialisasi, biografi kelas, dan status keaktifan.</p>
          </Link>
          <Link href="/admin/classes" className="group p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white group-hover:text-violet-500 transition-colors">Manajemen Kelas &rarr;</h3>
            <p className="text-xs text-zinc-500 mt-1">Kelola kelas studio, batasan kapasitas, jadwal latihan berkala, dan keikutsertaan.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
