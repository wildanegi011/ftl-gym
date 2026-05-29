# FTL Gym Application — Implementation Tasks

## Phase 1: Project Setup
- [ ] **TASK-01**: Inisialisasi project Next.js 16 dengan TypeScript dan Tailwind CSS menggunakan Bun (`bunx create-next-app`)
- [ ] **TASK-02**: Install dan konfigurasi Shadcn UI
- [ ] **TASK-03**: Install dependencies via Bun: `bun add @supabase/supabase-js @supabase/ssr zustand @tanstack/react-query zod react-hook-form @hookform/resolvers xendit-node face-api.js @zxing/browser qrcode`
- [ ] **TASK-04**: Setup Supabase project, buat semua tabel dan RLS policies
- [ ] **TASK-05**: Konfigurasi environment variables (`.env.local`): Supabase, Xendit API key, Xendit callback token
- [ ] **TASK-06**: Setup Supabase client (browser & server) di `lib/supabase/`
- [ ] **TASK-07**: Setup TanStack React Query provider di `app/providers.tsx`
- [ ] **TASK-08**: Buat base layout dengan Sidebar dan NavigationMenu per role

## Phase 2: Autentikasi
- [ ] **TASK-09**: Buat halaman `/login` dengan form + Zod validation
- [ ] **TASK-10**: Buat halaman `/register` dengan pilihan subscription awal
- [ ] **TASK-11**: Implementasi Supabase Auth (signIn, signUp, signOut, resetPassword)
- [ ] **TASK-12**: Buat `middleware.ts` untuk proteksi route berdasarkan role (admin, trainer, pt, member)
- [ ] **TASK-13**: Buat Zustand `auth.store.ts` untuk session & role

## Phase 3: Landing Page
- [ ] **TASK-14**: Buat halaman `/` — hero section, fitur unggulan, daftar PT (foto, rating, paket sesi), pricing membership
- [ ] **TASK-15**: Buat komponen `PricingSection` — dua jalur: membership saja vs membership + PT; tampilkan paket sesi per PT (2, 8, 14 sesi + harga)
- [ ] **TASK-16**: Implementasi CTA "Daftar Sekarang" yang membawa pilihan ke `/register` via query params (`membership_type`, `package_id`)
- [ ] **TASK-17**: Optimasi SEO (metadata, OG tags, JSON-LD structured data)

## Phase 4: Dashboard Admin
- [ ] **TASK-18**: Buat halaman `/admin` dengan stats cards (member aktif, pendapatan, kelas hari ini, sesi PT hari ini)
- [ ] **TASK-19**: Tambahkan grafik pertumbuhan member dan pendapatan (Recharts)
- [ ] **TASK-20**: Buat React Query hooks untuk fetch dashboard stats

## Phase 5: Manajemen Member
- [ ] **TASK-21**: Buat API route `GET/POST /api/members`
- [ ] **TASK-22**: Buat API route `GET/PATCH/DELETE /api/members/[id]`
- [ ] **TASK-23**: Buat halaman `/admin/members` dengan DataTable (pagination, filter)
- [ ] **TASK-24**: Buat Dialog form tambah/edit member dengan `memberSchema`
- [ ] **TASK-25**: Buat halaman `/admin/members/[id]` — detail + riwayat booking, pembayaran, check-in
- [ ] **TASK-26**: Buat halaman `/member/profile` — edit profil + tampilkan QR code barcode

## Phase 5: Manajemen Trainer
- [ ] **TASK-23**: Buat API route `GET/POST/PATCH /api/trainers`
- [ ] **TASK-24**: Buat halaman `/admin/trainers` dengan DataTable
- [ ] **TASK-25**: Buat Dialog form tambah/edit trainer dengan upload foto (Supabase Storage)

## Phase 6: Personal Trainer (PT)
- [ ] **TASK-27**: Buat API route `GET/POST /api/personal-trainers` dan `GET/PATCH /api/personal-trainers/[id]`
- [ ] **TASK-28**: Buat API route `GET/POST /api/personal-trainers/[id]/packages` — kelola paket sesi PT
- [ ] **TASK-29**: Buat halaman `/admin/personal-trainers` dengan DataTable + Dialog form PT dan paket sesi (2, 8, 14 sesi + harga)
- [ ] **TASK-30**: Buat halaman `/member/pt` — daftar PT dengan rating dan paket sesi + harga, tombol beli paket
- [ ] **TASK-31**: Buat API route `GET/POST /api/member-pt-packages` — beli paket, trigger Xendit invoice
- [ ] **TASK-32**: Buat halaman `/member/pt/packages` — daftar paket yang dimiliki + sisa sesi, tombol jadwalkan sesi
- [ ] **TASK-33**: Buat API route `GET/POST /api/pt-sessions` dan `GET/PATCH /api/pt-sessions/[id]`
- [ ] **TASK-34**: Buat form jadwalkan sesi dari paket dengan `ptSessionSchema`
- [ ] **TASK-35**: Buat halaman `/pt/sessions` — daftar booking masuk dengan aksi confirm/reject
- [ ] **TASK-36**: Implementasi review & rating setelah sesi selesai

## Phase 7: Manajemen Kelas
- [ ] **TASK-37**: Buat API route `GET/POST /api/classes` dan `GET/PATCH/DELETE /api/classes/[id]`
- [ ] **TASK-38**: Buat halaman `/admin/classes` dengan DataTable jadwal kelas
- [ ] **TASK-39**: Buat Dialog form tambah/edit kelas dengan `classSchema`
- [ ] **TASK-40**: Buat halaman `/member/classes` — daftar kelas + tombol booking
- [ ] **TASK-41**: Implementasi booking kelas dengan optimistic update
- [ ] **TASK-42**: Buat halaman `/trainer/schedule` dan `/trainer/classes/[id]`

## Phase 8: Subscription
- [ ] **TASK-43**: Buat API route `GET/POST /api/subscriptions`
- [ ] **TASK-44**: Buat API route `PATCH /api/subscriptions/[id]` (cancel/pause)
- [ ] **TASK-45**: Integrasi Xendit Recurring Payment saat create subscription
- [ ] **TASK-46**: Buat halaman `/admin/subscriptions` — daftar subscription aktif
- [ ] **TASK-47**: Buat halaman `/member/subscription` — status, upgrade/downgrade, cancel

## Phase 9: Pembayaran via Xendit
- [ ] **TASK-48**: Setup Xendit SDK di `lib/xendit/`
- [ ] **TASK-49**: Buat API route `POST /api/payments` — create Xendit Invoice
- [ ] **TASK-50**: Buat API route `POST /api/webhooks/xendit` — handle semua events dengan validasi callback token
- [ ] **TASK-51**: Buat halaman `/admin/payments` — DataTable riwayat transaksi
- [ ] **TASK-52**: Buat halaman `/member/payments` — riwayat + link invoice PDF Xendit
- [ ] **TASK-53**: Setup Supabase Realtime untuk update status pembayaran di client

## Phase 10: Check-in (Face Recognition + Liveness & Barcode)
- [ ] **TASK-54**: Enable pgvector di Supabase, tambah kolom `face_embedding vector(128)` dan `face_photo_url` di `profiles`, buat `ivfflat` index; buat tabel `checkin_blocks`
- [ ] **TASK-55**: Setup `face-api.js` — load models: `ssdMobilenetv1`, `faceRecognitionNet`, `faceLandmark68Net`, `faceExpressionNet`
- [ ] **TASK-56**: Buat API route `POST /api/members/[id]/face` — upload foto ke Storage, extract embedding server-side
- [ ] **TASK-57**: Buat API route `GET /api/checkins/face/challenge` — generate challenge acak, TTL 10 detik
- [ ] **TASK-58**: Buat komponen `LivenessChallenge` — tampilkan instruksi, deteksi aksi real-time, ambil snapshot
- [ ] **TASK-59**: Buat API route `POST /api/checkins/face` — validasi challenge, verifikasi snapshot, pgvector matching, rate limiting
- [ ] **TASK-60**: Buat komponen `BarcodeCheckin` — scan QR via `@zxing/browser`
- [ ] **TASK-61**: Buat API route `POST /api/checkins` — handle barcode & manual check-in
- [ ] **TASK-62**: Buat halaman `/checkin` (public kiosk) — pilih mode face atau barcode
- [ ] **TASK-63**: Buat halaman `/admin/checkin` — check-in manual + monitor hari ini + upload foto wajah member

## Phase 11: Polish & Deployment
- [ ] **TASK-64**: Tambahkan Skeleton loading dan error boundaries di semua halaman
- [ ] **TASK-65**: Implementasi toast notifications (Shadcn Sonner) untuk semua aksi
- [ ] **TASK-66**: Pastikan semua form validasi Zod di client dan server
- [ ] **TASK-67**: Audit RLS policies Supabase untuk semua tabel
- [ ] **TASK-68**: Deploy ke Vercel, konfigurasi env production + Xendit webhook URL
