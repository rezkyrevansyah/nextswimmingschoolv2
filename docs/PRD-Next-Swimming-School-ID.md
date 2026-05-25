# PRD — Next Swimming School
## Product Requirements Document (Bahasa Indonesia)

**Versi:** 1.0  
**Tanggal:** 2025  
**Status:** Final — Siap untuk Development  

---

## DAFTAR ISI

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Stack Teknologi](#2-stack-teknologi)
3. [Peran & Akses (Roles)](#3-peran--akses-roles)
4. [Database Schema](#4-database-schema)
5. [Halaman & Fitur](#5-halaman--fitur)
6. [Logika Bisnis Penting](#6-logika-bisnis-penting)
7. [Spesifikasi UI/UX Global](#7-spesifikasi-uiux-global)
8. [Spesifikasi Notifikasi](#8-spesifikasi-notifikasi)
9. [Spesifikasi File & Storage](#9-spesifikasi-file--storage)
10. [Aturan Keamanan & Akses Data](#10-aturan-keamanan--akses-data)

---

## 1. RINGKASAN PRODUK

**Nama Produk:** Next Swimming School — Sistem Manajemen Sekolah Renang  
**Filosofi:** *"Fast, Clean, Trusted, Effortless."*

### Deskripsi
Sistem manajemen digital terintegrasi untuk Next Swimming School — mencakup landing page publik, panel owner, panel admin per cabang, halaman coach, halaman member, dan halaman school. Sistem ini mengelola seluruh operasional sekolah renang mulai dari registrasi member, absensi, pembayaran, rapor, hingga invoice pelatih — semuanya dalam satu ekosistem.

### Target Pengguna
- **Owner** — pemilik bisnis, memantau seluruh cabang
- **Admin** — staf administrasi per cabang
- **Coach** — pelatih renang
- **Member** — murid (atau orang tua/wali yang memegang akun)
- **School** — pihak sekolah yang berafiliasi
- **Publik** — calon member yang mengakses landing page

### Prinsip Utama
- Mobile-first: mayoritas pengguna mengakses lewat HP
- Zero loading antar menu: navigasi harus terasa instan
- Semua alert menggunakan custom UI — tidak ada browser default alert
- Notifikasi in-app (bell icon di navbar) — tidak ada push notification

---

## 2. STACK TEKNOLOGI

| Layer | Teknologi |
|---|---|
| Frontend | Next.js (latest) |
| Backend / Database | Supabase (PostgreSQL + Auth + Realtime) |
| File Storage | Cloudflare R2 |
| Authentication | Supabase Auth (Email + Password) |
| PDF Generation | Server-side (untuk invoice & rapor) |

---

## 3. PERAN & AKSES (ROLES)

### Daftar Role

| Role | Deskripsi | Redirect setelah login |
|---|---|---|
| `owner` | Pemilik bisnis, akses semua cabang | `/owner` |
| `admin` | Admin per cabang, hanya bisa akses cabangnya | `/admin` |
| `coach` | Pelatih, akses data kelas yang diassign | `/coach` |
| `member` | Murid atau orang tua/wali | `/member` |
| `school` | Pihak sekolah afiliasi | `/school` |

### Matriks Akses

| Fitur | Owner | Admin | Coach | Member | School |
|---|---|---|---|---|---|
| Buat/kelola cabang | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buat akun admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Akses admin panel cabang | ✅ (semua) | ✅ (cabangnya) | ❌ | ❌ | ❌ |
| CRUD member | ❌ | ✅ | ❌ | ❌ | ❌ |
| CRUD coach | ❌ | ✅ | ❌ | ❌ | ❌ |
| CRUD kelas | ❌ | ✅ | ❌ | ❌ | ❌ |
| Absensi diri sendiri | ❌ | ❌ | ✅ | ❌ | ❌ |
| Absensi member | ❌ | ❌ | ✅ | ❌ | ❌ |
| Absensi manual (CRUD) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Kelola pembayaran | ❌ | ✅ | ❌ | ❌ | ❌ |
| Generate invoice | ❌ | ❌ | ✅ | ❌ | ❌ |
| Lihat invoice | ✅ | ❌ | ✅ | ❌ | ❌ |
| Isi rapor | ❌ | ❌ | ✅ | ❌ | ❌ |
| Lihat rapor | ❌ | ✅ | ✅ | ✅ | ✅ |
| Review rapor | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ajukan izin | ❌ | ❌ | ✅ | ✅ | ❌ |
| Approve izin | ❌ | ✅ | ❌ | ❌ | ❌ |
| Settings tarif | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. DATABASE SCHEMA

> Semua tabel menggunakan UUID sebagai primary key. Timestamps menggunakan `timestamptz`. RLS (Row Level Security) wajib diaktifkan di semua tabel.

---

### 4.1 TABEL USERS & AUTH

```sql
-- Tabel profil user (extension dari auth.users Supabase)
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('owner','admin','coach','member','school')),
  full_name      TEXT,
  email          TEXT UNIQUE NOT NULL,
  phone          TEXT,
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
```

---

### 4.2 TABEL BRANCHES (CABANG)

```sql
CREATE TABLE public.branches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  address        TEXT,
  description    TEXT,
  logo_url       TEXT,                        -- Cloudflare R2, rasio 1:1
  location_lat   DOUBLE PRECISION,            -- Koordinat latitude
  location_lng   DOUBLE PRECISION,            -- Koordinat longitude
  wa_numbers     TEXT[] DEFAULT '{}',         -- Array nomor WhatsApp admin cabang
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin cabang (one admin dapat diassign ke satu cabang)
CREATE TABLE public.branch_admins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, profile_id)
);

CREATE INDEX idx_branch_admins_branch ON public.branch_admins(branch_id);
CREATE INDEX idx_branch_admins_profile ON public.branch_admins(profile_id);
```

---

### 4.3 TABEL CLASSES (KELAS)

```sql
CREATE TABLE public.classes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  goal                TEXT,
  photo_url           TEXT,                   -- landscape photo, Cloudflare R2
  capacity            INTEGER NOT NULL DEFAULT 20,
  sessions_per_week   INTEGER NOT NULL DEFAULT 1,
  sessions_per_month  INTEGER NOT NULL DEFAULT 4,
  location_name       TEXT,
  price_per_month     NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_age             INTEGER,
  max_age             INTEGER,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  show_on_landing     BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jadwal kelas (satu kelas bisa punya banyak jadwal/hari)
CREATE TABLE public.class_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 1=Senin, ..., 6=Sabtu
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_branch ON public.classes(branch_id);
CREATE INDEX idx_class_schedules_class ON public.class_schedules(class_id);
```

---

### 4.4 TABEL COACHES

```sql
CREATE TABLE public.coaches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nick_name         TEXT,
  gender            TEXT CHECK (gender IN ('male','female','other')),
  birth_date        DATE,
  bio               TEXT,
  address           TEXT,
  education_level   TEXT CHECK (education_level IN ('TK','SD','SMP','SMA','D1','D2','D3','S1/D4','S2','S3')),
  education_school  TEXT,
  specialization    TEXT,
  bank_name         TEXT,
  bank_account_no   TEXT,
  bank_account_name TEXT,
  coach_code        TEXT UNIQUE,              -- contoh: coach-001
  qr_code_url       TEXT,                    -- URL QR code coach
  profile_complete  BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  suspend_reason    TEXT,
  suspend_start     TIMESTAMPTZ,
  suspend_end       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relasi coach dengan cabang (multi-cabang)
CREATE TABLE public.coach_branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, branch_id)
);

-- Relasi coach dengan kelas
CREATE TABLE public.coach_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, class_id)
);

-- Sertifikasi coach
CREATE TABLE public.coach_certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  valid_from      DATE,
  valid_until     DATE,
  no_expiry       BOOLEAN NOT NULL DEFAULT false,
  photo_url       TEXT,                       -- Cloudflare R2
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES public.profiles(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaches_profile ON public.coaches(profile_id);
CREATE INDEX idx_coaches_status ON public.coaches(status);
CREATE INDEX idx_coach_branches_coach ON public.coach_branches(coach_id);
CREATE INDEX idx_coach_branches_branch ON public.coach_branches(branch_id);
CREATE INDEX idx_coach_classes_coach ON public.coach_classes(coach_id);
CREATE INDEX idx_coach_classes_class ON public.coach_classes(class_id);
CREATE INDEX idx_coach_certifications_coach ON public.coach_certifications(coach_id);
```

---

### 4.5 TABEL MEMBERS

```sql
CREATE TABLE public.members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- nullable jika belum punya akun
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  birth_date          DATE,
  gender              TEXT CHECK (gender IN ('male','female','other')),
  phone               TEXT,
  phone_owner         TEXT CHECK (phone_owner IN ('self','parent')),
  parent_name         TEXT,                   -- Nama orang tua/wali (jika phone_owner = 'parent')
  parent_phone        TEXT,
  address             TEXT,
  health_notes        TEXT,                   -- Riwayat kesehatan / alergi
  member_type         TEXT NOT NULL CHECK (member_type IN ('reguler','private','school_affiliate')),
  school_id           UUID REFERENCES public.schools(id) ON DELETE SET NULL, -- hanya jika school_affiliate
  start_date          DATE,
  photo_url           TEXT,                   -- Cloudflare R2
  qr_code_value       TEXT UNIQUE NOT NULL,   -- Value unik untuk QR, tidak pernah berubah
  qr_code_url         TEXT,                   -- URL gambar QR code, Cloudflare R2
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  suspend_reason      TEXT,
  suspend_start       TIMESTAMPTZ,
  suspend_end         TIMESTAMPTZ,
  admin_notes         TEXT,
  from_register_page  BOOLEAN NOT NULL DEFAULT false,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relasi member dengan kelas (member bisa di banyak kelas)
CREATE TABLE public.member_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,                    -- Diisi jika member keluar dari kelas (history tetap ada)
  is_active   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(member_id, class_id)
);

CREATE INDEX idx_members_branch ON public.members(branch_id);
CREATE INDEX idx_members_profile ON public.members(profile_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_type ON public.members(member_type);
CREATE INDEX idx_members_qr ON public.members(qr_code_value);
CREATE INDEX idx_member_classes_member ON public.member_classes(member_id);
CREATE INDEX idx_member_classes_class ON public.member_classes(class_id);
```

---

### 4.6 TABEL MEMBER REGISTRATIONS (Register Page)

```sql
CREATE TABLE public.member_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  birth_date      DATE,
  gender          TEXT,
  phone           TEXT,
  phone_owner     TEXT CHECK (phone_owner IN ('self','parent')),
  parent_name     TEXT,
  parent_phone    TEXT,
  address         TEXT,
  health_notes    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES public.profiles(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  payment_proof   TEXT,                       -- Cloudflare R2
  payment_date    DATE,
  member_id       UUID REFERENCES public.members(id), -- diisi setelah approved
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_registrations_status ON public.member_registrations(status);
CREATE INDEX idx_member_registrations_branch ON public.member_registrations(branch_id);
```

---

### 4.7 TABEL COACH ATTENDANCE (Absensi Coach)

```sql
CREATE TABLE public.coach_attendances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL,
  clock_in_at     TIMESTAMPTZ NOT NULL,
  selfie_url      TEXT,                       -- Cloudflare R2
  location_lat    DOUBLE PRECISION,
  location_lng    DOUBLE PRECISION,
  distance_meters NUMERIC(10,2),             -- Jarak dari lokasi cabang saat clock in
  is_manual       BOOLEAN NOT NULL DEFAULT false, -- true jika diinput manual oleh admin
  manual_by       UUID REFERENCES public.profiles(id), -- Admin yang input manual
  manual_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_attendances_coach ON public.coach_attendances(coach_id);
CREATE INDEX idx_coach_attendances_class ON public.coach_attendances(class_id);
CREATE INDEX idx_coach_attendances_date ON public.coach_attendances(session_date);
CREATE INDEX idx_coach_attendances_branch ON public.coach_attendances(branch_id);
```

---

### 4.8 TABEL MEMBER ATTENDANCE (Absensi Member)

```sql
CREATE TABLE public.member_attendances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('present','excused','sick','absent')),
  scanned_by      UUID REFERENCES public.coaches(id), -- Coach yang scan/input
  scan_method     TEXT CHECK (scan_method IN ('qr','manual')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, class_id, session_date)
);

CREATE INDEX idx_member_attendances_member ON public.member_attendances(member_id);
CREATE INDEX idx_member_attendances_class ON public.member_attendances(class_id);
CREATE INDEX idx_member_attendances_date ON public.member_attendances(session_date);
CREATE INDEX idx_member_attendances_branch ON public.member_attendances(branch_id);
```

---

### 4.9 TABEL LEAVE REQUESTS (Izin Coach & Member)

```sql
-- Izin Coach
CREATE TABLE public.coach_leaves (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id            UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  leave_type          TEXT NOT NULL CHECK (leave_type IN ('izin','sakit','lainnya')),
  reason              TEXT,
  date_start          DATE NOT NULL,
  date_end            DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by_admin    BOOLEAN NOT NULL DEFAULT false, -- true jika dibuat oleh admin
  substitute_coach_id UUID REFERENCES public.coaches(id),
  reviewed_by         UUID REFERENCES public.profiles(id),
  reviewed_at         TIMESTAMPTZ,
  rejection_note      TEXT,
  admin_note          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kelas yang terdampak oleh izin coach
CREATE TABLE public.coach_leave_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id    UUID NOT NULL REFERENCES public.coach_leaves(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  UNIQUE(leave_id, class_id)
);

-- Izin Member
CREATE TABLE public.member_leaves (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  leave_type       TEXT NOT NULL CHECK (leave_type IN ('izin','sakit','ujian','lainnya')),
  reason           TEXT,
  date_start       DATE NOT NULL,
  date_end         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by_admin BOOLEAN NOT NULL DEFAULT false,
  reviewed_by      UUID REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  rejection_note   TEXT,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kelas yang terdampak oleh izin member
CREATE TABLE public.member_leave_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id    UUID NOT NULL REFERENCES public.member_leaves(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  UNIQUE(leave_id, class_id)
);

CREATE INDEX idx_coach_leaves_coach ON public.coach_leaves(coach_id);
CREATE INDEX idx_coach_leaves_status ON public.coach_leaves(status);
CREATE INDEX idx_member_leaves_member ON public.member_leaves(member_id);
CREATE INDEX idx_member_leaves_status ON public.member_leaves(status);
```

---

### 4.10 TABEL CLASS HOLIDAYS (Kelas Libur)

```sql
CREATE TABLE public.class_holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  date_start  DATE NOT NULL,
  date_end    DATE NOT NULL,
  reason      TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_holidays_class ON public.class_holidays(class_id);
CREATE INDEX idx_class_holidays_dates ON public.class_holidays(date_start, date_end);
```

---

### 4.11 TABEL PAYMENTS (Pembayaran)

```sql
CREATE TABLE public.payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  class_id            UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  payment_type        TEXT NOT NULL CHECK (payment_type IN ('monthly','session_package','custom','school_covered')),
  period_label        TEXT,                   -- Contoh: "Januari 2025" atau "Paket 6 Sesi"
  period_month        INTEGER,                -- 1-12, untuk tipe monthly
  period_year         INTEGER,
  gross_amount        NUMERIC(12,2) NOT NULL,
  discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_reason     TEXT,
  net_amount          NUMERIC(12,2) NOT NULL, -- gross - discount (computed)
  status              TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','partial','free','school_covered')),
  -- Untuk tipe session_package
  total_sessions      INTEGER,               -- Total sesi dalam paket
  used_sessions       INTEGER NOT NULL DEFAULT 0,
  remaining_sessions  INTEGER GENERATED ALWAYS AS (COALESCE(total_sessions,0) - used_sessions) STORED,
  package_start_date  DATE,
  -- Verifikasi pembayaran
  paid_at             DATE,
  payment_method      TEXT CHECK (payment_method IN ('transfer','cash','other')),
  payment_proof_url   TEXT,                  -- Cloudflare R2
  verified_by         UUID REFERENCES public.profiles(id),
  verified_at         TIMESTAMPTZ,
  admin_notes         TEXT,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_member ON public.payments(member_id);
CREATE INDEX idx_payments_branch ON public.payments(branch_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_period ON public.payments(period_year, period_month);
```

---

### 4.12 TABEL REPORT CARDS (Rapor)

```sql
-- Template aspek penilaian per kelas (dikonfigurasi admin)
CREATE TABLE public.report_aspects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  aspect_type   TEXT NOT NULL CHECK (aspect_type IN ('score','multiple_choice','free_text')),
  score_range   TEXT CHECK (score_range IN ('1-10','1-100')),  -- untuk tipe score
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pilihan jawaban untuk aspek multiple_choice
CREATE TABLE public.report_aspect_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aspect_id   UUID NOT NULL REFERENCES public.report_aspects(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Periode rapor (dibuka/ditutup oleh admin per cabang)
CREATE TABLE public.report_periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,               -- Contoh: "Semester 1 2025"
  date_start  DATE NOT NULL,
  date_end    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rapor per member per kelas per periode
CREATE TABLE public.report_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   UUID NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  is_locked   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, member_id, class_id)
);

-- Nilai per aspek dalam rapor
CREATE TABLE public.report_card_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id  UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  aspect_id       UUID NOT NULL REFERENCES public.report_aspects(id) ON DELETE CASCADE,
  score_value     NUMERIC(5,2),
  choice_option_id UUID REFERENCES public.report_aspect_options(id),
  free_text_value TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, aspect_id)
);

-- Review member terhadap coach (per rapor)
CREATE TABLE public.report_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  coach_id       UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text    TEXT,
  is_locked      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, member_id)
);

CREATE INDEX idx_report_aspects_class ON public.report_aspects(class_id);
CREATE INDEX idx_report_periods_branch ON public.report_periods(branch_id);
CREATE INDEX idx_report_cards_period ON public.report_cards(period_id);
CREATE INDEX idx_report_cards_member ON public.report_cards(member_id);
CREATE INDEX idx_report_card_values_card ON public.report_card_values(report_card_id);
```

---

### 4.13 TABEL COACH CLASS PROGRAMS (Spreadsheet Program)

```sql
CREATE TABLE public.class_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  content     JSONB NOT NULL DEFAULT '{}',   -- Konten program (flexible struktur)
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, coach_id)
);

CREATE INDEX idx_class_programs_class ON public.class_programs(class_id);
```

---

### 4.14 TABEL COACH INVOICES

```sql
CREATE TABLE public.coach_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  period_month    INTEGER NOT NULL,
  period_year     INTEGER NOT NULL,
  total_amount    NUMERIC(12,2) NOT NULL,
  pdf_url         TEXT,                      -- Cloudflare R2
  bank_name       TEXT,                      -- Snapshot rekening saat generate
  bank_account_no TEXT,
  bank_account_name TEXT,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detail kelas dalam invoice
CREATE TABLE public.coach_invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.coach_invoices(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  class_name      TEXT NOT NULL,             -- Snapshot nama kelas
  attendance_id   UUID REFERENCES public.coach_attendances(id),
  session_date    DATE NOT NULL,
  rate_amount     NUMERIC(12,2) NOT NULL,    -- Tarif per sesi (snapshot dari owner settings)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_invoices_coach ON public.coach_invoices(coach_id);
CREATE INDEX idx_coach_invoices_period ON public.coach_invoices(period_year, period_month);
CREATE INDEX idx_coach_invoice_items_invoice ON public.coach_invoice_items(invoice_id);
```

---

### 4.15 TABEL COACH RATES (Tarif Coach — Owner Panel)

```sql
-- Tarif umum per kelas (diset owner)
CREATE TABLE public.class_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  rate_amount NUMERIC(12,2) NOT NULL,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id)
);

-- Tarif khusus per coach per kelas (override tarif umum)
CREATE TABLE public.coach_class_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  rate_amount NUMERIC(12,2) NOT NULL,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, class_id)
);
```

---

### 4.16 TABEL SCHOOLS (Sekolah Afiliasi)

```sql
CREATE TABLE public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Akun login school page
  name        TEXT NOT NULL,
  email       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schools_branch ON public.schools(branch_id);
```

---

### 4.17 TABEL ANNOUNCEMENTS (Pengumuman)

```sql
CREATE TABLE public.announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('all','specific_class')),
  valid_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until   DATE,                        -- NULL = tidak kadaluarsa
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Target kelas spesifik (jika target_type = 'specific_class')
CREATE TABLE public.announcement_classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  UNIQUE(announcement_id, class_id)
);

CREATE INDEX idx_announcements_branch ON public.announcements(branch_id);
CREATE INDEX idx_announcements_valid ON public.announcements(valid_from, valid_until);
```

---

### 4.18 TABEL NOTIFICATIONS (Notifikasi In-App)

```sql
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                 -- Tipe event, contoh: 'invoice_new', 'leave_approved'
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',            -- Payload tambahan (contoh: link ke halaman terkait)
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
```

---

### 4.19 TABEL TESTIMONIALS (untuk Landing Page)

```sql
CREATE TABLE public.testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  role        TEXT,                          -- Contoh: "Orang tua member"
  content     TEXT NOT NULL,
  photo_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.20 TABEL FAQ (untuk Landing Page)

```sql
CREATE TABLE public.faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.21 RELASI & FOREIGN KEYS RINGKASAN

```
auth.users (Supabase)
  └── profiles (1:1)
        ├── branch_admins (admin ke cabang)
        ├── coaches (1:1 via profile_id)
        │     ├── coach_branches (N:N dengan branches)
        │     ├── coach_classes (N:N dengan classes)
        │     ├── coach_certifications
        │     ├── coach_attendances
        │     ├── coach_leaves
        │     └── coach_invoices
        ├── members (1:1 via profile_id, nullable)
        │     ├── member_classes (N:N dengan classes)
        │     ├── member_attendances
        │     ├── member_leaves
        │     ├── payments
        │     └── report_cards
        └── schools (1:1 via profile_id)
              └── members (via school_id)

branches
  ├── classes
  │     ├── class_schedules
  │     ├── class_holidays
  │     ├── class_programs
  │     ├── report_aspects
  │     └── class_rates
  ├── coach_branches
  ├── announcements
  └── report_periods
```

---

## 5. HALAMAN & FITUR

### 5.1 LANDING PAGE (`/`)

**Navbar:** Home | Program | Coach | FAQ | Login | [Konsultasi Sekarang — WhatsApp]

**Sections:**
1. **Hero** — Headline, subheadline, CTA WA, visual premium, trust indicators
2. **Why Choose Us** — 5 keunggulan utama (icon + teks singkat)
3. **Swimming Programs** — Data dinamis dari `classes` (filter: `show_on_landing = true`, `status = 'active'`). Field yang ditampilkan: nama, foto, deskripsi, target usia, benefit, CTA
4. **Smart Ecosystem** — Ilustrasi fitur untuk member, coach, dan admin
5. **Coach Showcase** — Data dari tabel `coaches` yang memiliki `status = 'active'` dan `profile_complete = true`. Tampil: foto, nama panggilan, spesialisasi, sertifikasi aktif
6. **Testimonials** — Data dari tabel `testimonials`
7. **FAQ** — Data dari tabel `faqs`
8. **Final CTA** — Headline + button WA

**Login Page (`/login`):**
- Input email + password
- Auto-redirect berdasarkan `profiles.role`
- Lupa password → pop up instruksi WA admin
- Button ke Register Page

**Register Page (`/register`):**
- Form: nama, lahir, gender, HP, HP milik siapa, nama+HP orang tua (conditional), alamat, riwayat kesehatan
- Submit → insert ke `member_registrations`
- Pop up setelah submit + button WA admin dengan template pesan

---

### 5.2 OWNER PANEL (`/owner`)

**Menu:**
- Dashboard — statistik total semua cabang + per cabang
- Cabang (CRUD) — tabel `branches`
- Admin — CRUD akun admin, assign ke cabang (`branch_admins`)
- Kelas — view semua kelas semua cabang + detail
- Settings Tarif — CRUD `class_rates` dan `coach_class_rates`
- Invoice Coach — view semua `coach_invoices` dari semua cabang

**Navigasi ke Admin Panel Cabang:**
- Session/cookie menyimpan `acting_as_admin_for_branch_id`
- Header menampilkan banner "Anda sedang mengakses [nama cabang]" + tombol kembali

---

### 5.3 ADMIN PANEL (`/admin`)

**Urutan menu:**

| No | Menu | Fungsi Utama |
|---|---|---|
| 1 | Settings | Logo, koordinat, nomor WA admin |
| 2 | Class | CRUD kelas, jadwal, aspek penilaian |
| 3 | Member | CRUD member, suspend, reset password |
| 4 | Coach | CRUD coach, suspend, assign |
| 5 | Class Activity | Kalender kelas, input libur |
| 6 | Absensi Coach | CRUD absensi manual |
| 7 | Pengumuman | CRUD pengumuman |
| 8 | Izin | Approve/reject izin coach & member |
| 9 | Pembayaran | Generate tagihan, verifikasi |
| 10 | Approvement | Registrasi, izin pending, sertifikasi |
| 11 | Rapor | Periode rapor, monitoring |
| 12 | School Panel | CRUD sekolah afiliasi |
| 13 | Dashboard | Statistik cabang + live attendance |

**Detail fitur tiap menu tersedia di Project Document.**

---

### 5.4 COACH PAGE (`/coach`)

**Guard:**
- Redirect ke profile jika `profile_complete = false`
- Tampil suspend banner jika `status = 'suspended'` dan `suspend_end > now()`

**Menu:**
| No | Menu | Fungsi |
|---|---|---|
| 1 | Home | Kelas hari ini, quick access, rekap absensi, button izin |
| 2 | Absensi | Clock in (selfie + lokasi), absensi member |
| 3 | Profile | Update profil, sertifikasi, ganti password |
| 4 | Kelas | List kelas, detail, spreadsheet program |
| 5 | Invoice | Generate invoice PDF bulanan |
| 6 | Rapor | Isi rapor member (jika periode aktif) |

**Clock In Window:** Hanya bisa dilakukan dari `(jadwal.start_time - 1 jam)` sampai `jadwal.end_time`

---

### 5.5 MEMBER PAGE (`/member`)

**Guard:**
- Redirect ke halaman "akun tidak aktif" jika `status = 'suspended'`

**Menu:**
| No | Menu | Fungsi |
|---|---|---|
| 1 | Home | Ringkasan, pengumuman, reminder tagihan, reminder paket sesi |
| 2 | Jadwal | Jadwal kelas aktif + label libur |
| 3 | Absensi | History absensi |
| 4 | Tagihan | Tagihan aktif + histori pembayaran |
| 5 | Izin | Ajukan izin, riwayat izin |
| 6 | Rapor | Lihat rapor, berikan review |
| 7 | Profile | Update data terbatas, ganti password, download QR |

---

### 5.6 SCHOOL PAGE (`/school`)

- Tampil hanya saat periode rapor aktif (`report_periods.is_active = true`)
- List siswa afiliasi + rapor masing-masing
- Download rapor per siswa atau semua sekaligus
- Tidak ada data keuangan

---

## 6. LOGIKA BISNIS PENTING

### 6.1 Window Waktu Clock In
```
clock_in_allowed = 
  current_time >= (schedule.start_time - INTERVAL '1 hour') 
  AND current_time <= schedule.end_time
  AND class_holiday TIDAK ADA untuk class_id dan session_date ini
  AND coach.status = 'active'
```

### 6.2 Auto-Status Suspend
Supabase Cron Job (pg_cron) atau trigger:
```sql
-- Jalankan setiap jam atau setiap menit
UPDATE public.coaches
SET status = 'active', suspend_reason = NULL, suspend_start = NULL, suspend_end = NULL
WHERE status = 'suspended' AND suspend_end <= now();

UPDATE public.members
SET status = 'active', suspend_reason = NULL, suspend_start = NULL, suspend_end = NULL
WHERE status = 'suspended' AND suspend_end <= now();
```

### 6.3 Sisa Sesi Paket Private
```
remaining_sessions = total_sessions - used_sessions
```
`used_sessions` bertambah +1 setiap kali `member_attendances` insert dengan `status = 'present'` untuk member dengan `member_type = 'private'` pada kelas yang terkait paket tersebut.

Trigger notifikasi: `remaining_sessions = 1` → insert ke `notifications` untuk member tersebut.

### 6.4 Izin Member → Auto-Absensi
Saat `member_leaves.status` diubah ke `'approved'`:
- Loop semua tanggal antara `date_start` dan `date_end`
- Untuk setiap tanggal, cek apakah ada jadwal kelas di kelas yang terdampak
- Jika ada → insert ke `member_attendances` dengan `status = 'excused'`
- Jika sudah ada record → update ke `status = 'excused'`

### 6.5 Coach Pengganti Sementara
Saat `coach_leaves.status` diubah ke `'approved'` dan `substitute_coach_id` ada:
- Record ini digunakan sebagai sinyal bahwa coach pengganti tampil di kelas tersebut
- Query di coach page: `SELECT classes yang diassign + classes dari coach_leaves yang approved dan substitute_coach_id = saya dan date_start <= today <= date_end`

### 6.6 Validasi Kapasitas Kelas
```
current_count = SELECT COUNT(*) FROM member_classes 
                WHERE class_id = $1 AND is_active = true

IF current_count >= classes.capacity THEN
  return warning "Kelas sudah penuh (X/Y member)"
  -- Admin bisa tetap override dengan konfirmasi
```

### 6.7 Generate Tagihan Bulanan
```
FOR EACH member WHERE 
  member_type = 'reguler' 
  AND status = 'active'
  AND branch_id = $branch_id
DO
  FOR EACH class IN member_classes WHERE is_active = true DO
    IF NOT EXISTS (SELECT 1 FROM payments 
                   WHERE member_id = member.id 
                   AND class_id = class.id 
                   AND period_month = $month 
                   AND period_year = $year) THEN
      INSERT INTO payments (...)
    END IF
  END FOR
END FOR
```

---

## 7. SPESIFIKASI UI/UX GLOBAL

### Navigasi
- **Zero loading antar menu:** Gunakan Next.js App Router dengan `prefetch`, data di-cache di client
- **Skeleton loading:** Hanya pada first load halaman, tidak pada navigasi antar menu
- **Mobile first:** Semua komponen didesain untuk mobile (min-width: 375px), kemudian responsive ke desktop

### Komponen Wajib
| Komponen | Spesifikasi |
|---|---|
| Alert/Toast | Custom component, muncul di dalam halaman (bukan browser alert) |
| Notification Bell | Di navbar semua role, dropdown list notifikasi + timestamp |
| Konfirmasi Aksi Kritis | Modal konfirmasi custom (delete, suspend, approve) |
| QR Scanner | Camera-based, web (tidak perlu app native) |
| Selfie Camera | Camera-based dengan opsi ambil ulang |
| PDF Viewer | Browser native atau iframe |

### Visual Style (Landing Page)
- Palette: Swimming-inspired, aqua blue accent
- Tidak menggunakan: heavy glassmorphism, excessive gradient, generic SaaS layout
- Animasi: simple dan subtle — hover effect, section transition
- Typography: premium, clean, readable

### Warna Status (Global)
| Status | Warna |
|---|---|
| Aktif / Hadir | Hijau |
| Pending / Menunggu | Kuning/Amber |
| Suspend | Oranye |
| Arsip / Nonaktif | Abu-abu |
| Ditolak / Tidak Hadir | Merah |
| Libur | Abu-abu dengan border |
| Pengganti | Biru muda / badge |
| Manual (admin) | Ungu / badge |

---

## 8. SPESIFIKASI NOTIFIKASI

### Event → Notifikasi

| Event | Penerima | Tipe |
|---|---|---|
| Invoice baru dari coach | Owner | `invoice_new` |
| Izin coach disetujui | Coach yang izin | `leave_approved` |
| Izin coach ditolak | Coach yang izin | `leave_rejected` |
| Sertifikasi disetujui | Coach | `certification_approved` |
| Sertifikasi ditolak | Coach | `certification_rejected` |
| Ditambahkan sebagai pengganti | Coach pengganti | `substitute_assigned` |
| Kelas baru diassign | Coach | `class_assigned` |
| Registrasi member baru | Admin cabang terkait | `registration_new` |
| Pengajuan izin coach pending | Admin cabang terkait | `coach_leave_pending` |
| Pengajuan izin member pending | Admin cabang terkait | `member_leave_pending` |
| Sertifikasi baru dari coach | Admin cabang terkait | `certification_new` |
| Tagihan baru dibuat | Member | `payment_new` |
| Tagihan diverifikasi lunas | Member | `payment_verified` |
| Rapor tersedia | Member | `report_available` |
| Izin member disetujui | Member | `member_leave_approved` |
| Izin member ditolak | Member | `member_leave_rejected` |
| Pengumuman baru | Member (sesuai target) | `announcement_new` |
| Sisa paket sesi tinggal 1 | Member private | `session_package_ending` |

### Implementasi
- Insert ke tabel `notifications` setiap event terjadi
- Supabase Realtime untuk live update badge count di navbar
- Notifikasi dibaca → `is_read = true`

---

## 9. SPESIFIKASI FILE & STORAGE

### Cloudflare R2 — Struktur Folder

```
r2-bucket/
├── branches/
│   └── {branch_id}/
│       └── logo.{ext}
├── coaches/
│   └── {coach_id}/
│       ├── avatar.{ext}
│       ├── selfies/
│       │   └── {attendance_id}.{ext}
│       └── certifications/
│           └── {certification_id}.{ext}
├── members/
│   └── {member_id}/
│       ├── avatar.{ext}
│       └── qr_code.png
├── payments/
│   └── {payment_id}/
│       └── proof.{ext}
├── invoices/
│   └── {invoice_id}/
│       └── invoice.pdf
├── classes/
│   └── {class_id}/
│       └── photo.{ext}
└── registrations/
    └── {registration_id}/
        └── payment_proof.{ext}
```

### Aturan Upload
- Logo cabang: rasio 1:1, max 2MB, format PNG/JPG/WebP
- Foto profil coach/member: auto crop 1:1 di frontend, max 2MB
- Foto selfie absensi: max 5MB, disimpan untuk audit
- Foto sertifikat: max 10MB, format PDF/PNG/JPG
- Foto kelas: landscape, max 5MB
- PDF invoice: generated server-side

---

## 10. ATURAN KEAMANAN & AKSES DATA

### Row Level Security (RLS) — Prinsip Utama

```sql
-- Contoh: Member hanya bisa baca data dirinya sendiri
CREATE POLICY "member_read_own" ON public.members
  FOR SELECT USING (
    profile_id = auth.uid()
  );

-- Admin hanya bisa akses data di cabangnya
CREATE POLICY "admin_read_branch_members" ON public.members
  FOR SELECT USING (
    branch_id IN (
      SELECT branch_id FROM public.branch_admins 
      WHERE profile_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Coach hanya bisa baca member di kelas yang diassign
CREATE POLICY "coach_read_class_members" ON public.members
  FOR SELECT USING (
    id IN (
      SELECT mc.member_id FROM public.member_classes mc
      JOIN public.coach_classes cc ON cc.class_id = mc.class_id
      JOIN public.coaches c ON c.id = cc.coach_id
      WHERE c.profile_id = auth.uid()
    )
  );
```

### Pembatasan Akses Cabang
- Admin hanya bisa baca/tulis data dengan `branch_id` yang ada di `branch_admins` miliknya
- Owner bisa akses semua `branch_id`
- Coach bisa akses kelas dari semua cabang yang dia assign (`coach_branches`)
- Member hanya bisa akses data `branch_id` cabang mereka terdaftar

### Field Sensitif
- Password dikelola oleh Supabase Auth — tidak disimpan plain text
- QR code value di `members.qr_code_value` harus unique dan tidak bisa diubah setelah dibuat
- Foto selfie absensi coach disimpan untuk keperluan audit — tidak bisa dihapus oleh coach sendiri

---

# Konsep Connect Database Menggunakan Next.js (App Router) + Supabase

## Install Packages

Install dependency Supabase untuk Next.js App Router:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## Environment Variables

Buat file `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

---

## Struktur Folder

```bash
utils/
└── supabase/
    ├── client.ts
    ├── server.ts
    └── middleware.ts
```

---

## Server Component Example (`page.tsx`)

Digunakan untuk fetch data langsung dari server component pada App Router.

```tsx
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {

  const cookieStore = await cookies()

  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase
    .from('todos')
    .select()

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  )
}
```

---

## `utils/supabase/server.ts`

Client Supabase khusus untuk server component, server action, dan route handler.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {

        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {

          try {

            cookiesToSet.forEach(
              ({ name, value, options }) =>
                cookieStore.set(name, value, options)
            )

          } catch {

            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.

          }

        },

      },

    },
  );

};
```

---

## `utils/supabase/client.ts`

Client Supabase khusus untuk Client Component (`"use client"`).

```ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
```

---

## `utils/supabase/middleware.ts`

Digunakan untuk menjaga session authentication tetap sinkron pada App Router.

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (request: NextRequest) => {

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {

      cookies: {

        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {

          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          )

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
          )

        },

      },

    },
  );

  return supabaseResponse

};
```

---

## Install Agent Skills (Optional)

Agent Skills membantu AI coding tools memahami Supabase dengan lebih akurat dan efisien.

```bash
npx skills add supabase/agent-skills
```

---

## Catatan Implementasi untuk Project Next Swimming School

- Menggunakan Next.js App Router
- Authentication menggunakan Supabase Auth
- Database menggunakan PostgreSQL dari Supabase
- Semua tabel wajib menggunakan RLS (Row Level Security)
- Gunakan Server Component sebanyak mungkin untuk performa yang lebih baik
- Gunakan Client Component hanya untuk interactive UI
- Session auth dijaga menggunakan middleware Supabase
- Struktur role login:
  - owner
  - admin
  - coach
  - member
  - school
- Setelah login berhasil, user diarahkan otomatis berdasarkan role masing-masing
- Gunakan realtime Supabase untuk:
  - Notification Center
  - Live attendance
  - Dashboard monitoring
- Gunakan Cloudflare R2 untuk:
  - Foto profil
  - QR code
  - Bukti transfer
  - Sertifikat coach
  - PDF invoice
  - PDF rapor
- Fokus utama sistem:
  - Mobile first
  - Zero loading navigation
  - Fast response
  - Clean UX
  - Modern admin experience

---

*Dokumen PRD ini adalah referensi lengkap untuk pembangunan sistem Next Swimming School.*  
*Baca bersama file flows untuk memahami urutan operasional setiap role.*
