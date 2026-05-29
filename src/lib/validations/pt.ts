import { z } from "zod"

export const ptSessionSchema = z.object({
  member_package_id: z.string().uuid("Package ID harus berupa UUID yang valid"),
  scheduled_at: z.string().min(1, "Waktu sesi wajib diisi"),
  notes: z.string().max(200, "Catatan maksimal 200 karakter").optional().or(z.literal("")),
})

export const ptPackageSchema = z.object({
  session_count: z.number().int().min(1, "Sesi minimal 1 kali"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  duration_minutes: z.number().int().min(15, "Durasi minimal 15 menit").default(60),
})

export const ptReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating minimal 1").max(5, "Rating maksimal 5"),
  comment: z.string().max(300, "Komentar maksimal 300 karakter").optional().or(z.literal("")),
})

export type PTSessionInput = z.infer<typeof ptSessionSchema>
export type PTPackageInput = z.infer<typeof ptPackageSchema>
export type PTReviewInput = z.infer<typeof ptReviewSchema>
