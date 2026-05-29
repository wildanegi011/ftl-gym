'use client'

import { useEffect, useState } from "react"
import { MemberDialog } from "@/components/features/admin/member-dialog"
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Pencil, 
  Trash2, 
  ShieldAlert, 
  Loader2, 
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any | null>(null)

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (status) params.append("status", status)
      if (type) params.append("type", type)

      const response = await fetch(`/api/members?${params.toString()}`)
      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.error || "Gagal memuat daftar member")
      }

      setMembers(resData.data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan saat memuat data.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mounts or filter changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMembers()
    }, 300) // Debounce search changes

    return () => clearTimeout(delayDebounce)
  }, [search, status, type])

  const handleAddClick = () => {
    setSelectedMember(null)
    setDialogOpen(true)
  }

  const handleEditClick = (member: any) => {
    setSelectedMember(member)
    setDialogOpen(true)
  }

  const handleDeleteClick = (member: any) => {
    setMemberToDelete(member)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!memberToDelete) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/members/${memberToDelete.id}`, {
        method: "DELETE",
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || "Gagal menghapus member")
      }

      // Refresh table
      fetchMembers()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal menghapus member.")
    } finally {
      setDeleteLoading(false)
      setMemberToDelete(null)
    }
  }

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-500" />
            Manajemen Member
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Kelola data akun member gym, langganan paket, dan verifikasi status aktif.
          </p>
        </div>
        <Button 
          onClick={handleAddClick}
          className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 gap-2 self-stretch sm:self-auto h-10 px-4"
        >
          <Plus className="w-4 h-4" />
          Registrasi Member
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau nomor telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-background/50 rounded-xl focus-visible:ring-emerald-500"
          />
        </div>

        {/* Filter Type */}
        <div className="flex w-full md:w-auto items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full md:w-[150px] bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Paket</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-[150px] bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl h-10 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Table / State view */}
      {loading && members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-2">Memuat data member...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          <Button onClick={fetchMembers} className="mt-3 rounded-xl text-xs" variant="outline">
            Coba Lagi
          </Button>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/10 dark:bg-zinc-950/10">
          <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Tidak ada member ditemukan.</p>
          <p className="text-zinc-400 text-xs mt-0.5">Silakan ganti kata kunci pencarian atau tambah member baru.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3.5 px-4">Nama / Email</th>
                <th className="py-3.5 px-4">Nomor Telepon</th>
                <th className="py-3.5 px-4">Barcode ID</th>
                <th className="py-3.5 px-4 text-center">Tipe Membership</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                  {/* Name & Email */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                        {m.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 dark:text-white truncate">{m.full_name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{m.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-4 px-4 text-zinc-600 dark:text-zinc-300 font-medium">
                    {m.phone || "-"}
                  </td>

                  {/* Barcode ID */}
                  <td className="py-4 px-4">
                    <code className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-600 dark:text-zinc-400">
                      {m.barcode ? `${m.barcode.substring(0, 8)}...` : "-"}
                    </code>
                  </td>

                  {/* Tier */}
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getMembershipBadge(m.membership_type)}`}>
                      {m.membership_type || "N/A"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(m.membership_status)}`}>
                      {m.membership_status || "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/admin/members/${m.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                          title="Lihat Detail Member"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(m)}
                        className="h-8 w-8 rounded-lg text-zinc-500 hover:text-emerald-600"
                        title="Edit Profil Member"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(m)}
                        className="h-8 w-8 rounded-lg text-zinc-500 hover:text-destructive"
                        title="Hapus Member Permanen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Member Form Dialog */}
      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={selectedMember}
        onSuccess={fetchMembers}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        itemName={memberToDelete?.full_name || ""}
        loading={deleteLoading}
      />
    </div>
  )
}
