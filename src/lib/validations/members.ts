import { z } from "zod"

export const memberSchema = z.object({
  full_name: z.string().min(2, "Nama minimal terdiri dari 2 karakter").max(100, "Nama terlalu panjang"),
  email: z.string().email("Format email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^(\+62|62|0)[0-9]+$/, "Nomor telepon harus berupa format Indonesia yang valid (+62/62/0...)"),
  membership_type: z.enum(["basic", "premium", "vip"]),
  membership_status: z.enum(["active", "inactive", "suspended"]),
})

export type MemberInput = z.infer<typeof memberSchema>
