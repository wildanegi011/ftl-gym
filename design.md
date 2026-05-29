# FTL Gym Application — Design

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Shadcn UI |
| State Management | Zustand |
| Server State | TanStack React Query v5 |
| Validation | Zod |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Payment Gateway | Xendit |
| Face Recognition | `face-api.js` (extract descriptor di client) + pgvector (server-side matching) |
| Barcode/QR | `@zxing/browser` (scan) + `qrcode` (generate) |
| Package Manager | Bun |
| Deployment | Vercel |

---

## Architecture

```
ftl-gym/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── trainer/
│   │   ├── pt/
│   │   └── member/
│   ├── api/
│   │   └── webhooks/xendit/
│   └── middleware.ts
├── components/
│   ├── ui/
│   └── features/
│       ├── checkin/
│       └── payment/
├── lib/
│   ├── supabase/
│   ├── xendit/
│   ├── face/
│   └── validations/
├── stores/
├── hooks/
└── types/
```

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK auth.users.id |
| full_name | text | |
| phone | text | |
| avatar_url | text | |
| role | enum | `admin`, `trainer`, `pt`, `member` |
| barcode | text | unique, auto-generated |
| face_photo_url | text | Supabase Storage private bucket |
| face_embedding | vector(128) | pgvector, dari face-api.js descriptor |
| created_at | timestamptz | |

### `memberships`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK profiles.id |
| type | enum | `basic`, `premium`, `vip` |
| status | enum | `active`, `inactive`, `suspended` |
| start_date | date | |
| end_date | date | |
| price | numeric | |

### `subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK profiles.id |
| membership_type | enum | `basic`, `premium`, `vip` |
| interval | enum | `monthly`, `quarterly`, `annual` |
| status | enum | `active`, `paused`, `cancelled` |
| xendit_subscription_id | text | Xendit Recurring ID |
| next_billing_date | date | |
| created_at | timestamptz | |

### `trainers`
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK profiles.id |
| specialization | text | |
| bio | text | |
| is_active | boolean | |

### `personal_trainers`
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK profiles.id |
| specialization | text | |
| bio | text | |
| rating | numeric | avg 0-5 |
| is_active | boolean | |

### `pt_session_packages`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| pt_id | uuid | FK personal_trainers.id |
| session_count | int | jumlah sesi (misal 2, 8, 14) |
| price | numeric | harga paket (IDR) |
| duration_minutes | int | durasi per sesi, default 60 |
| is_active | boolean | |

### `member_pt_packages`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK profiles.id |
| package_id | uuid | FK pt_session_packages.id |
| sessions_remaining | int | sisa sesi yang belum dijadwalkan |
| xendit_invoice_id | text | |
| payment_status | enum | `unpaid`, `paid`, `expired` |
| purchased_at | timestamptz | |

### `pt_sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_package_id | uuid | FK member_pt_packages.id |
| pt_id | uuid | FK personal_trainers.id |
| member_id | uuid | FK profiles.id |
| scheduled_at | timestamptz | |
| duration_minutes | int | |
| status | enum | `pending`, `confirmed`, `rejected`, `completed`, `cancelled` |
| notes | text | |

### `pt_reviews`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK pt_sessions.id |
| member_id | uuid | FK profiles.id |
| pt_id | uuid | FK personal_trainers.id |
| rating | int | 1-5 |
| comment | text | |

### `classes`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| description | text | |
| trainer_id | uuid | FK trainers.id |
| capacity | int | |
| scheduled_at | timestamptz | |
| duration_minutes | int | |
| is_active | boolean | |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| class_id | uuid | FK classes.id |
| member_id | uuid | FK profiles.id |
| status | enum | `confirmed`, `cancelled`, `attended` |
| booked_at | timestamptz | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK profiles.id |
| reference_id | uuid | FK memberships.id atau pt_sessions.id |
| reference_type | enum | `membership`, `pt_package`, `subscription` |
| amount | numeric | |
| xendit_invoice_id | text | |
| xendit_external_id | text | unique |
| method | text | `va_bca`, `va_bni`, `qris`, `ovo`, `gopay`, `dana`, `credit_card` |
| status | enum | `pending`, `paid`, `expired`, `failed` |
| paid_at | timestamptz | |
| invoice_url | text | Xendit hosted URL |

### `checkins`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK profiles.id |
| method | enum | `face`, `barcode`, `manual` |
| liveness_passed | boolean | null jika bukan face |
| checked_in_at | timestamptz | |
| checked_in_by | uuid | FK profiles.id, null jika self |

### `checkin_blocks`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| member_id | uuid | FK profiles.id |
| blocked_until | timestamptz | |
| reason | text | `liveness_failed_3x` |

---

## State Management

### Zustand Stores
```
stores/
├── auth.store.ts       # session, role
├── ui.store.ts         # sidebar, theme
├── booking.store.ts    # optimistic booking
└── checkin.store.ts    # camera stream, face state
```

### React Query Keys
```ts
['members', { page, filter }]
['classes', { date, trainerId }]
['personal-trainers', { specialization }]
['pt-sessions', { ptId, memberId, status }]
['subscriptions', memberId]
['payments', { memberId, period }]
['checkins', { memberId, date }]
```

---

## Pages & Routes

| Route | Role | Description |
|---|---|---|
| `/` | public | Landing page (pricing, daftar PT, CTA) |
| `/login` | public | Login |
| `/register` | public | Registrasi + pilih subscription + opsional paket PT |
| `/checkin` | public kiosk | Check-in face/barcode |
| `/admin` | admin | Dashboard |
| `/admin/members` | admin | Kelola member |
| `/admin/members/[id]` | admin | Detail member |
| `/admin/classes` | admin | Kelola kelas |
| `/admin/trainers` | admin | Kelola trainer |
| `/admin/personal-trainers` | admin | Kelola PT |
| `/admin/subscriptions` | admin | Daftar subscription |
| `/admin/payments` | admin | Riwayat transaksi |
| `/admin/checkin` | admin | Check-in manual |
| `/trainer/schedule` | trainer | Jadwal kelas |
| `/trainer/classes/[id]` | trainer | Detail kelas & peserta |
| `/pt/dashboard` | pt | Dashboard PT |
| `/pt/sessions` | pt | Booking sesi masuk |
| `/pt/sessions/[id]` | pt | Detail sesi |
| `/member/dashboard` | member | Dashboard |
| `/member/classes` | member | Jadwal & booking kelas |
| `/member/pt` | member | Daftar PT & booking |
| `/member/subscription` | member | Kelola subscription |
| `/member/payments` | member | Riwayat & invoice |
| `/member/profile` | member | Edit profil + QR code |

---

## API Routes

```
app/api/
├── members/route.ts
├── members/[id]/route.ts
├── classes/route.ts
├── classes/[id]/route.ts
├── classes/[id]/bookings/route.ts
├── personal-trainers/route.ts
├── personal-trainers/[id]/route.ts
├── personal-trainers/[id]/packages/route.ts   # GET, POST (paket sesi)
├── member-pt-packages/route.ts                # GET, POST (beli paket)
├── pt-sessions/route.ts                       # GET, POST (jadwalkan sesi dari paket)
├── pt-sessions/[id]/route.ts                  # GET, PATCH (confirm/reject/complete)
├── subscriptions/route.ts
├── subscriptions/[id]/route.ts
├── payments/route.ts
├── checkins/route.ts
├── checkins/face/challenge/route.ts    # GET (generate liveness challenge)
├── checkins/face/route.ts              # POST (verify liveness + face match)
└── webhooks/xendit/route.ts
```

---

## Xendit Integration

### Payment Flow
```
1. POST /api/payments → create Xendit Invoice
2. Return { invoice_url, xendit_invoice_id }
3. Member redirect ke invoice_url
4. Xendit → POST /api/webhooks/xendit → update DB
5. Supabase Realtime → client update otomatis
```

### Subscription Flow
```
1. POST /api/subscriptions → create Xendit Recurring Plan
2. Xendit charge otomatis tiap interval
3. Webhook recurring.payment.succeeded → perpanjang membership
4. Webhook recurring.payment.failed → suspend + notifikasi
```

### Webhook Events
| Event | Aksi |
|---|---|
| `invoice.paid` | Aktifkan membership / PT session |
| `invoice.expired` | Notifikasi member |
| `recurring.payment.succeeded` | Perpanjang subscription |
| `recurring.payment.failed` | Suspend subscription |

---

## Check-in Flow

### Face Recognition + Liveness Detection
```
Setup (dilakukan admin sekali per member):
1. Upload foto wajah → simpan ke Supabase Storage (private bucket)
2. Server: face-api.js extract 128-dim descriptor dari foto
3. Simpan sebagai vector(128) di profiles.face_embedding (pgvector)
4. CREATE INDEX ON profiles USING ivfflat (face_embedding vector_cosine_ops)

Check-in Flow:
1. Client request challenge → GET /api/checkins/face/challenge
2. Server generate challenge acak: { id, action: 'smile'|'blink_left'|'blink_right'|'turn_left'|'turn_right', expires_at }
3. Simpan challenge di Redis/Supabase dengan TTL 10 detik
4. Client tampilkan instruksi ke user ("Silakan senyum")
5. face-api.js deteksi aksi via expression + landmark detection (real-time loop)
6. Saat aksi terdeteksi, ambil snapshot frame + extract descriptor
7. POST /api/checkins/face { challenge_id, descriptor: float[], snapshot_base64 }
8. Server:
   a. Validasi challenge_id belum expired
   b. Verifikasi snapshot: deteksi ulang aksi dari gambar (anti-replay)
   c. pgvector query: ORDER BY face_embedding <=> $descriptor LIMIT 1
   d. Jika cosine distance < 0.4 → match
   e. Validasi membership aktif → insert checkins
   f. Hapus challenge_id (single-use)

Gagal & Rate Limiting:
- Timeout / aksi tidak terdeteksi → catat failed_liveness_attempts di Redis
- 3 kali gagal berturut-turut → blokir 5 menit (simpan di checkin_blocks table)
```

### Barcode / QR
```
1. @zxing/browser scan QR dari kamera
2. QR berisi member barcode (UUID)
3. POST /api/checkins { barcode, method: 'barcode' }
4. Server: lookup member → validasi membership → insert checkins
```

---

## Validation Schemas (Zod)

```ts
// member.ts
memberSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  membership_type: z.enum(['basic', 'premium', 'vip']),
})

// subscription.ts
subscriptionSchema = z.object({
  membership_type: z.enum(['basic', 'premium', 'vip']),
  interval: z.enum(['monthly', 'quarterly', 'annual']),
})

// pt-package.ts
ptPackageSchema = z.object({
  session_count: z.number().int().min(1),
  price: z.number().positive(),
  duration_minutes: z.number().int().min(30).default(60),
})

// pt-session.ts (jadwalkan sesi dari paket yang sudah dibeli)
ptSessionSchema = z.object({
  member_package_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  notes: z.string().optional(),
})

// payment.ts
paymentSchema = z.object({
  reference_id: z.string().uuid(),
  reference_type: z.enum(['membership', 'pt_package', 'subscription']),
  amount: z.number().positive(),
  method: z.enum(['va_bca','va_bni','va_bri','qris','ovo','gopay','dana','credit_card']),
})

// checkin.ts
checkinSchema = z.object({
  method: z.enum(['face', 'barcode', 'manual']),
  barcode: z.string().optional(),
  descriptor: z.array(z.number()).length(128).optional(),
  member_id: z.string().uuid().optional(),
})
```

---

## Security

- **RLS**: `face_photo_url` dan `face_embedding` hanya bisa diakses via service role key; member tidak bisa query langsung
- **Foto wajah**: Disimpan di Supabase Storage private bucket, hanya accessible via signed URL server-side
- **Xendit Webhook**: Validasi `x-callback-token` header setiap request
- **Payments**: Insert/update hanya via server (service role)
- **Middleware**: Session + role check di semua protected routes

---

## UI Components (Shadcn)

- `DataTable` — member, kelas, PT, pembayaran, subscription
- `Dialog` — form tambah/edit, konfirmasi
- `Form`, `Input`, `Select`, `DatePicker` — semua form
- `Badge` — status member, booking, payment, subscription
- `Card` — dashboard stats
- `Sidebar`, `NavigationMenu` — layout
- `Chart` (Recharts) — grafik dashboard
- Kamera overlay — face recognition UI
- QR code display — barcode member di profil
