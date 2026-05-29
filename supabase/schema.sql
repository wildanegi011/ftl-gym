-- Enable pgvector extension
create extension if not exists vector;

-- Enums
create type user_role as enum ('admin', 'trainer', 'pt', 'member');
create type membership_type as enum ('basic', 'premium', 'vip');
create type membership_status as enum ('active', 'inactive', 'suspended');
create type subscription_interval as enum ('monthly', 'quarterly', 'annual');
create type subscription_status as enum ('active', 'paused', 'cancelled');
create type payment_status as enum ('unpaid', 'paid', 'expired', 'pending', 'failed');
create type pt_session_status as enum ('pending', 'confirmed', 'rejected', 'completed', 'cancelled');
create type booking_status as enum ('confirmed', 'cancelled', 'attended');
create type payment_method as enum ('va_bca', 'va_bni', 'va_bri', 'qris', 'ovo', 'gopay', 'dana', 'credit_card');
create type checkin_method as enum ('face', 'barcode', 'manual');
create type reference_type as enum ('membership', 'pt_package', 'subscription');

-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  phone text,
  avatar_url text,
  role user_role default 'member',
  barcode text unique default gen_random_uuid()::text,
  face_photo_url text,
  face_embedding vector(128),
  created_at timestamptz default now()
);

-- Index for pgvector
create index on profiles using ivfflat (face_embedding vector_cosine_ops);

-- Memberships
create table public.memberships (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles(id) on delete cascade not null,
  type membership_type not null,
  status membership_status default 'inactive',
  start_date date,
  end_date date,
  price numeric not null,
  created_at timestamptz default now()
);

-- Subscriptions
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles(id) on delete cascade not null,
  membership_type membership_type not null,
  interval subscription_interval not null,
  status subscription_status default 'active',
  xendit_subscription_id text,
  next_billing_date date,
  created_at timestamptz default now()
);


-- Personal Trainers
create table public.personal_trainers (
  id uuid references public.profiles(id) on delete cascade not null primary key,
  bio text,
  certifications text,
  rating numeric(3,2) default 0,
  is_active boolean default true
);

-- PT Session Packages
create table public.pt_session_packages (
  id uuid default gen_random_uuid() primary key,
  pt_id uuid references public.personal_trainers(id) on delete cascade not null,
  session_count int not null,
  price numeric not null,
  duration_minutes int default 60,
  is_active boolean default true
);

-- Member PT Packages
create table public.member_pt_packages (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles(id) on delete cascade not null,
  package_id uuid references public.pt_session_packages(id) on delete cascade not null,
  sessions_remaining int not null,
  xendit_invoice_id text,
  payment_status payment_status default 'unpaid',
  purchased_at timestamptz default now()
);

-- PT Sessions
create table public.pt_sessions (
  id uuid default gen_random_uuid() primary key,
  member_package_id uuid references public.member_pt_packages(id) on delete cascade not null,
  pt_id uuid references public.personal_trainers(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  status pt_session_status default 'pending',
  notes text,
  created_at timestamptz default now()
);

-- PT Reviews
create table public.pt_reviews (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.pt_sessions(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  pt_id uuid references public.personal_trainers(id) on delete cascade not null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Classes
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  trainer_id uuid references public.personal_trainers(id) on delete set null,
  capacity int not null,
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Bookings
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  status booking_status default 'confirmed',
  booked_at timestamptz default now(),
  unique (class_id, member_id)
);

-- Payments
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles(id) on delete cascade not null,
  reference_id uuid not null,
  reference_type reference_type not null,
  amount numeric not null,
  xendit_invoice_id text,
  xendit_external_id text unique not null,
  method text,
  status payment_status default 'pending',
  paid_at timestamptz,
  invoice_url text,
  created_at timestamptz default now()
);

-- Checkins
create table public.checkins (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles(id) on delete cascade not null,
  method checkin_method not null,
  liveness_passed boolean,
  checked_in_at timestamptz default now(),
  checked_in_by uuid references public.profiles(id) on delete set null
);

-- Checkin Blocks
create table public.checkin_blocks (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles(id) on delete cascade not null,
  blocked_until timestamptz not null,
  reason text
);

-- Setup Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.trainers enable row level security;
alter table public.personal_trainers enable row level security;
alter table public.pt_session_packages enable row level security;
alter table public.member_pt_packages enable row level security;
alter table public.pt_sessions enable row level security;
alter table public.pt_reviews enable row level security;
alter table public.classes enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_blocks enable row level security;

-- Basic RLS Policies (Can be refined further)
-- Profiles: Users can read everyone (for social proof, pt lists, etc) but only update themselves. Admin can do anything.
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on public.profiles for insert with check (auth.uid() = id);

-- Other tables generally viewable by owners or admins.
create policy "Users can view own memberships." on public.memberships for select using (auth.uid() = member_id);
create policy "Users can view own subscriptions." on public.subscriptions for select using (auth.uid() = member_id);
create policy "Trainers are viewable by everyone." on public.trainers for select using (true);
create policy "Personal Trainers are viewable by everyone." on public.personal_trainers for select using (true);
create policy "PT Packages are viewable by everyone." on public.pt_session_packages for select using (true);
create policy "Users can view own purchased packages." on public.member_pt_packages for select using (auth.uid() = member_id);
create policy "Users can view own pt sessions." on public.pt_sessions for select using (auth.uid() = member_id or auth.uid() = pt_id);
create policy "PT Reviews are viewable by everyone." on public.pt_reviews for select using (true);
create policy "Classes are viewable by everyone." on public.classes for select using (true);
create policy "Users can view own bookings." on public.bookings for select using (auth.uid() = member_id);
create policy "Users can view own payments." on public.payments for select using (auth.uid() = member_id);
create policy "Users can view own checkins." on public.checkins for select using (auth.uid() = member_id);

-- Note: Face embedding and face_photo_url should ideally be restricted, but for simplicity we rely on application logic to filter fields if necessary. 
-- In production, create a view or secure function for face matching.

-- Create storage bucket for face photos
insert into storage.buckets (id, name, public) values ('face_photos', 'face_photos', false);
