"use client"

import * as React from "react"
import { ResponsiveModal } from "./responsive-modal"
import { Button } from "./button"
import { ShieldAlert, Loader2 } from "lucide-react"

interface DeleteConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  title?: string
  description?: string
  itemName: string
  loading?: boolean
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Konfirmasi Hapus",
  description = "Apakah Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan.",
  itemName,
  loading = false,
}: DeleteConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="sm:max-w-[420px]"
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div className="text-xs font-bold leading-normal">
            Menghapus: <span className="underline">{itemName}</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl font-bold h-10 text-xs px-4"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl font-bold h-10 text-xs px-4 gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Hapus Permanen
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
