import { z } from "zod"

export const trainerSchema = z.object({
  full_name: z.string().min(2, "Nama minimal terdiri dari 2 karakter").max(100, "Nama terlalu panjang"),
  email: z.string().email("Format email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^(\+62|62|0)[0-9]+$/, "Nomor telepon harus berupa format Indonesia yang valid")
    .optional()
    .or(z.literal("")),
  specialities: z.array(z.string()).min(1, "Pilih minimal 1 spesialisasi"),
  bio: z.string().min(10, "Biografi minimal terdiri dari 10 karakter").max(500, "Biografi terlalu panjang"),
  certifications: z.string().max(300, "Sertifikasi terlalu panjang").optional().or(z.literal("")),
  is_active: z.boolean(),
})

export type TrainerInput = z.infer<typeof trainerSchema>
