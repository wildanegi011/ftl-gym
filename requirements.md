# FTL Gym Application — Requirements

## Overview
Aplikasi manajemen gym bernama **FTL Gym** yang mencakup landing page publik, manajemen member, jadwal kelas, trainer, personal trainer (PT) dengan paket sesi, pembayaran via Xendit, subscription otomatis, check-in dengan face recognition (liveness detection) + barcode, dan dashboard admin. Dibangun dengan Next.js 16 (App Router), Zustand, Shadcn UI, TanStack React Query, Zod, dan Supabase.

---

## Functional Requirements

### 1. Autentikasi & Otorisasi
- **FR-01**: User dapat mendaftar dengan email dan password
- **FR-02**: User dapat login/logout menggunakan Supabase Auth
- **FR-03**: Sistem mendukung 4 role: `admin`, `trainer`, `pt`, `member`
- **FR-04**: Route protection berdasarkan role (middleware Next.js)
- **FR-05**: User dapat reset password via email

### 2. Landing Page (Public)
- **FR-06**: Terdapat landing page publik di `/` menampilkan informasi gym, fitur unggulan, dan CTA daftar/login
- **FR-07**: Landing page menampilkan **pricing section** dengan dua jalur pendaftaran:
  - **Membership saja** (tanpa PT): pilih tipe `basic`, `premium`, `vip` dan interval `monthly`, `quarterly`, `annual`
  - **Membership + Personal Trainer**: pilih PT dari daftar, lalu pilih paket sesi PT
- **FR-08**: Setiap PT menampilkan paket sesi yang tersedia (contoh: 2 sesi, 8 sesi, 14 sesi) dengan harga per paket
- **FR-09**: Calon member dapat memilih kombinasi membership + paket sesi PT dari landing page, lalu diarahkan ke `/register` dengan pilihan sudah terisi (query params)
- **FR-10**: Landing page menampilkan daftar PT (foto, nama, spesialisasi, rating) sebagai social proof
- **FR-11**: Landing page dioptimasi untuk SEO (metadata, OG tags, structured data)

### 3. Manajemen Member
- **FR-12**: Admin dapat melihat daftar semua member (dengan pagination & filter)
- **FR-13**: Admin dapat menambah, mengedit, dan menonaktifkan member
- **FR-14**: Member dapat melihat dan mengedit profil sendiri
- **FR-15**: Member memiliki status: `active`, `inactive`, `suspended`
- **FR-16**: Member memiliki tipe membership: `basic`, `premium`, `vip`
- **FR-17**: Saat registrasi, member dapat memilih paket subscription (dan opsional paket sesi PT)

### 4. Manajemen Kelas
- **FR-18**: Admin/trainer dapat membuat jadwal kelas (nama, deskripsi, kapasitas, waktu, durasi)
- **FR-19**: Member dapat melihat jadwal kelas yang tersedia
- **FR-20**: Member dapat mendaftar (booking) dan membatalkan kelas
- **FR-21**: Sistem membatasi booking sesuai kapasitas kelas
- **FR-22**: Notifikasi email dikirim saat booking berhasil/dibatalkan

### 5. Manajemen Trainer
- **FR-23**: Admin dapat menambah, mengedit, dan menonaktifkan trainer
- **FR-24**: Trainer memiliki profil: nama, spesialisasi, bio, foto
- **FR-25**: Trainer dapat melihat jadwal kelas yang diampu

### 6. Personal Trainer (PT)
- **FR-26**: Admin dapat menambah, mengedit, dan menonaktifkan PT
- **FR-27**: PT memiliki profil: nama, spesialisasi, bio, foto, rating
- **FR-28**: Admin dapat membuat **paket sesi PT** per PT: jumlah sesi (misal 2, 8, 14) dan harga per paket
- **FR-29**: Member dapat melihat daftar PT beserta paket sesi dan harganya
- **FR-30**: Member membeli paket sesi PT (pembayaran sekali untuk seluruh paket via Xendit)
- **FR-31**: Setelah paket dibeli, member menjadwalkan sesi satu per satu sesuai sisa kuota
- **FR-32**: PT dapat menerima atau menolak jadwal sesi
- **FR-33**: PT dapat melihat jadwal sesi yang sudah dikonfirmasi
- **FR-34**: Admin dapat melihat laporan penjualan paket PT dan komisi

### 7. Subscription & Membership
- **FR-35**: Sistem mendukung paket subscription: `monthly`, `quarterly`, `annual`
- **FR-36**: Pembayaran subscription diproses otomatis via Xendit Recurring Payment
- **FR-37**: Member mendapat notifikasi H-7 dan H-1 sebelum subscription diperpanjang
- **FR-38**: Member dapat upgrade/downgrade paket subscription
- **FR-39**: Member dapat membatalkan subscription (berlaku hingga akhir periode)
- **FR-40**: Admin dapat melihat daftar subscription aktif dan riwayat pembayaran
- **FR-41**: Webhook Xendit memperbarui status subscription secara otomatis

### 8. Pembayaran via Xendit
- **FR-42**: Metode pembayaran: Virtual Account (semua bank), QRIS, e-wallet (OVO, GoPay, Dana), kartu kredit
- **FR-43**: Sistem membuat invoice Xendit untuk setiap transaksi (membership, paket PT)
- **FR-44**: Webhook Xendit menangani konfirmasi pembayaran secara real-time
- **FR-45**: Member dapat melihat riwayat transaksi dan mengunduh invoice PDF
- **FR-46**: Admin dapat melihat laporan keuangan terintegrasi

### 9. Check-in Member
- **FR-47**: Member dapat check-in menggunakan **face recognition** via kamera perangkat
- **FR-48**: Foto wajah member disimpan di Supabase Storage; face embedding disimpan di PostgreSQL menggunakan **pgvector**
- **FR-49**: Face matching dilakukan di server menggunakan pgvector cosine similarity search
- **FR-50**: Sistem wajib melakukan **liveness detection** sebelum face matching — mencegah spoofing menggunakan foto/video orang lain
- **FR-51**: Liveness detection menggunakan **challenge-response**: sistem secara acak meminta salah satu aksi: senyum, kedip mata kiri, kedip mata kanan, atau menoleh kiri/kanan
- **FR-52**: Challenge di-generate server (random per sesi), client harus membuktikan aksi dalam batas waktu 10 detik
- **FR-53**: Jika liveness gagal (timeout atau aksi tidak terdeteksi), check-in ditolak dan dicatat sebagai percobaan gagal
- **FR-54**: Setelah 3 kali liveness gagal berturut-turut, sistem memblokir check-in face selama 5 menit
- **FR-55**: Member dapat check-in menggunakan **barcode/QR code** sebagai alternatif
- **FR-56**: Admin/staff dapat melakukan check-in manual (fallback)
- **FR-57**: Sistem memvalidasi status membership aktif saat check-in
- **FR-58**: Riwayat check-in tersimpan (method + liveness status) dan dapat dilihat per member
- **FR-59**: Check-in hanya diizinkan sekali per hari (dapat dikonfigurasi)
- **FR-60**: Admin dapat mengunggah/mengupdate foto wajah member

### 10. Dashboard & Laporan
- **FR-61**: Dashboard admin: total member aktif, pendapatan bulan ini, kelas hari ini, sesi PT hari ini, member baru
- **FR-62**: Grafik pertumbuhan member per bulan
- **FR-63**: Laporan kehadiran kelas per periode
- **FR-64**: Laporan pendapatan subscription vs paket PT
- **FR-65**: Laporan check-in harian/mingguan

---

## Non-Functional Requirements

- **NFR-01**: Halaman utama (LCP) < 2.5 detik
- **NFR-02**: Aplikasi responsif (mobile-first)
- **NFR-03**: Validasi form di client dan server menggunakan Zod
- **NFR-04**: Data sensitif tidak terekspos di client
- **NFR-05**: Row Level Security (RLS) aktif di semua tabel Supabase
- **NFR-06**: Optimistic updates untuk aksi booking kelas
- **NFR-07**: Foto wajah member disimpan di Supabase Storage (private bucket); face embedding disimpan sebagai `vector(128)` dengan ekstensi pgvector
- **NFR-08**: Face matching menggunakan pgvector `<=>` (cosine distance) dengan index `ivfflat`
- **NFR-09**: Liveness challenge di-generate dan divalidasi di server — client tidak bisa memalsukan hasil deteksi
- **NFR-10**: Deteksi aksi liveness menggunakan `face-api.js` expression + landmark detection; server verifikasi ulang dari snapshot
- **NFR-11**: Webhook Xendit divalidasi menggunakan callback token
- **NFR-12**: Semua transaksi Xendit idempotent (external_id unik per transaksi)

---

## User Stories

### Admin
- Sebagai admin, saya ingin melihat dashboard ringkasan gym agar bisa memantau kondisi bisnis
- Sebagai admin, saya ingin mengelola data member dan subscription agar data selalu up-to-date
- Sebagai admin, saya ingin melihat laporan keuangan dari Xendit agar keuangan tercatat dengan baik
- Sebagai admin, saya ingin memantau check-in harian agar tahu kepadatan gym
- Sebagai admin, saya ingin membuat paket sesi PT dengan harga berbeda agar fleksibel

### Personal Trainer (PT)
- Sebagai PT, saya ingin melihat jadwal sesi saya agar bisa mempersiapkan diri
- Sebagai PT, saya ingin menerima/menolak booking sesi agar jadwal saya terkontrol
- Sebagai PT, saya ingin melihat riwayat sesi dan komisi saya

### Trainer
- Sebagai trainer, saya ingin melihat jadwal kelas saya agar bisa mempersiapkan diri
- Sebagai trainer, saya ingin melihat daftar peserta kelas agar tahu siapa yang hadir

### Member
- Sebagai calon member, saya ingin melihat harga dan paket di landing page sebelum mendaftar
- Sebagai calon member, saya ingin memilih PT dan paket sesinya langsung dari landing page
- Sebagai member, saya ingin check-in dengan wajah atau QR code agar proses masuk cepat
- Sebagai member, saya ingin berlangganan membership secara otomatis agar tidak perlu bayar manual
- Sebagai member, saya ingin membeli paket sesi PT dan menjadwalkan sesi sesuai kebutuhan
- Sebagai member, saya ingin melihat jadwal kelas dan booking secara online
- Sebagai member, saya ingin melihat status subscription dan riwayat pembayaran saya
