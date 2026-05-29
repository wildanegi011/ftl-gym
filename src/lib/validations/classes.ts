import { z } from "zod"

export const classSchema = z.object({
  name: z.string().min(2, "Nama kelas minimal 2 karakter").max(100, "Nama kelas terlalu panjang"),
  description: z.string().max(300, "Deskripsi maksimal 300 karakter").optional().or(z.literal("")),
  trainer_id: z.string().uuid("Trainer ID harus berupa UUID yang valid").optional().or(z.literal("")).nullable(),
  capacity: z.number().int().min(1, "Kapasitas minimal 1 orang").max(100, "Kapasitas maksimal 100 orang"),
  day_of_week: z.string().min(1, "Hari wajib ditentukan"),
  start_time: z.string().min(1, "Waktu mulai wajib ditentukan"),
  duration_minutes: z.number().int().min(15, "Durasi minimal 15 menit").max(180, "Durasi maksimal 180 menit").default(60),
  is_active: z.boolean().default(true),
})

export type ClassInput = z.infer<typeof classSchema>
