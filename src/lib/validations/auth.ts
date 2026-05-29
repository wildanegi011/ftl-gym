import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  membership_type: z.enum(["basic", "premium", "vip"]),
})

export const wizardProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number is too long").regex(/^(\+62|62|0)[0-9]+$/, "Please enter a valid Indonesian phone number"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type WizardProfileInput = z.infer<typeof wizardProfileSchema>
