import { z } from "zod"

export const faceRegistrationSchema = z.object({
  member_id: z.string().uuid("Member ID harus berupa UUID yang valid"),
  face_photo_base64: z.string().min(1, "Foto wajah wajib diunggah"),
  face_embedding: z.array(z.number()).length(128, "Embedding wajah harus berupa array float berukuran tepat 128 dimensi"),
})

export type FaceRegistrationInput = z.infer<typeof faceRegistrationSchema>
