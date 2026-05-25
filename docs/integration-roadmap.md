# Next Swimming School — Integration Roadmap

Dokumen ini adalah panduan bertahap untuk menghubungkan front-end (yang sudah selesai) ke Supabase, memfungsikan semua fitur, dan memastikan seluruh halaman fully functional.

---

## Status Saat Ini

| Layer | Status |
|---|---|
| Front-end (semua halaman) | ✅ Selesai — pixel-identical dengan prototype |
| Supabase client (`utils/supabase/`) | ✅ Selesai |
| Middleware (auth guard + role redirect) | ✅ Selesai |
| Database types (`src/types/database.ts`) | ✅ Stub — regenerate setelah SQL dijalankan |
| SQL schema | ✅ Siap di `docs/supabase-schema.sql` |
| `.env.local` | ✅ Template siap — tinggal isi URL dan key |
| Integrasi data ke komponen | ⬜ Belum |

---

## Langkah 0 — Setup Supabase Project

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor → New Query**
3. Paste isi `docs/supabase-schema.sql` → Run
4. Isi `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key>
   ```
5. Regenerate types:
   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
   ```

---

## Phase 1 — Authentication

**File-file yang diubah:** `src/app/login/page.tsx`, `src/app/register/page.tsx`

### 1.1 Login Page

- [ ] Ganti dummy `setStep(2)` dengan `supabase.auth.signInWithPassword({ email, password })`
- [ ] Pada error → tampilkan pesan via `useToast()`
- [ ] Pada sukses → baca `user.user_metadata.role` → redirect ke `/<role>`
- [ ] Hapus "Demo role selector" (ganti dengan form email + password yang fungsional)
- [ ] Forgot password modal → sudah mengarah ke WA, tidak perlu password reset email

### 1.2 Register Page

- [ ] Form submit → `INSERT INTO registrations` (bukan auth signup — registrasi masuk ke approvement dulu)
- [ ] Setelah insert berhasil → `setStep(2)` (sudah ada)
- [ ] Pilih cabang dari `SELECT * FROM branches` (bukan hardcoded `BRANCHES`)

---

## Phase 2 — Owner Panel (`src/app/owner/page.tsx`)

### 2.1 Dashboard

- [ ] Stat cards → `SELECT count(*) FROM members WHERE status='active'` per cabang
- [ ] Branch table → `SELECT branches.*, count(members) ...`
- [ ] Invoice list → `SELECT * FROM coach_invoices ORDER BY created_at DESC`

### 2.2 Branches (CRUD)

- [ ] List → `SELECT * FROM branches`
- [ ] Create → `INSERT INTO branches`
- [ ] Edit → `UPDATE branches SET ... WHERE id=?`
- [ ] Delete → `DELETE FROM branches WHERE id=?`

### 2.3 Admins

- [ ] List → `SELECT * FROM profiles WHERE role='admin'`
- [ ] Create → `supabase.auth.admin.createUser({ email, password, user_metadata: { role:'admin', branch_id } })`
- [ ] Delete → `supabase.auth.admin.deleteUser(id)`

### 2.4 Classes (cross-branch view)

- [ ] `SELECT classes.*, branches.name FROM classes JOIN branches ON ...`

### 2.5 Settings Tarif

- [ ] Load kelas per cabang → `SELECT * FROM classes WHERE branch_id=?`
- [ ] Load coach rates → `SELECT * FROM coach_rates WHERE class_id IN (?)`
- [ ] Save rate → `UPSERT INTO coach_rates`

### 2.6 Invoices

- [ ] `SELECT coach_invoices.*, profiles.full_name FROM coach_invoices JOIN profiles ON ...`
- [ ] Klik detail → buka modal dengan `coach_invoice_items`

---

## Phase 3 — Admin Panel (`src/app/admin/page.tsx`)

### 3.1 Dashboard

- [ ] Stats → `SELECT count(*) FROM members WHERE branch_id=? AND status='active'`
- [ ] Kelas hari ini → filter `classes.schedule_days` berisi hari ini
- [ ] Live attendance → realtime subscription ke `coach_attendances` dan `member_attendances`
- [ ] Pending approvement → `SELECT count(*) FROM registrations WHERE status='pending'`

### 3.2 Settings

- [ ] Load → `SELECT * FROM branches WHERE id=auth_branch_id()`
- [ ] Update → `UPDATE branches SET wa_numbers=?, lat=?, lng=? WHERE id=?`

### 3.3 Class (CRUD)

- [ ] List → `SELECT * FROM classes WHERE branch_id=?`
- [ ] Create modal → `INSERT INTO classes`
- [ ] Edit → `UPDATE classes`
- [ ] Delete → soft delete (set status='archived')
- [ ] Add class criteria → `INSERT INTO class_criteria`

### 3.4 Member (CRUD)

- [ ] List + filter → `SELECT members.*, profiles.* FROM members JOIN profiles ON ...`
- [ ] Create → 
  1. `supabase.auth.admin.createUser(...)` → dapat user.id
  2. `INSERT INTO members (...)`
  3. `INSERT INTO member_classes (member_id, class_id)`
- [ ] Detail modal → load member + kelas + payment history
- [ ] Suspend → `UPDATE members SET status='suspended', suspend_until=?, suspend_reason=?`
- [ ] Reset password → `supabase.auth.admin.updateUserById(id, { password })`
- [ ] QR download → generate QR dari `members.qr_code` menggunakan library (html5-qrcode sudah installed)

### 3.5 Coach (CRUD)

- [ ] List → `SELECT profiles.* FROM profiles WHERE role='coach' AND branch_id=?`
- [ ] Create →
  1. `supabase.auth.admin.createUser(...)` → dapat user.id
  2. Profile sudah auto-created via trigger
  3. `UPDATE profiles SET full_name=?, specialization=?, ... WHERE id=?`
  4. `INSERT INTO class_coaches (class_id, coach_id)`
- [ ] Certifications → `SELECT * FROM certifications WHERE coach_id=?`
- [ ] Approve cert → `UPDATE certifications SET status='approved'`

### 3.6 Class Activity (Calendar)

- [ ] Generate calendar events dari `coach_attendances` + `classes.schedule_days`
- [ ] Klik event → modal detail (sudah ada struktur di front-end)
- [ ] Tandai libur → simpan ke tabel `class_holidays` (tambahkan di schema jika belum)

### 3.7 Absensi Coach

- [ ] List → `SELECT coach_attendances.*, profiles.full_name, classes.name FROM ...`
- [ ] Manual input → `INSERT INTO coach_attendances (..., is_manual=true, manual_by=auth.uid())`
- [ ] Edit → `UPDATE coach_attendances`
- [ ] Delete → `DELETE FROM coach_attendances`

### 3.8 Pengumuman (CRUD)

- [ ] List → `SELECT * FROM announcements WHERE branch_id=?`
- [ ] Create → `INSERT INTO announcements`
- [ ] Setelah create → insert `notifications` untuk semua member yang ditarget

### 3.9 Izin

**Tab Coach:**
- [ ] List → `SELECT coach_leaves.*, profiles.full_name FROM coach_leaves JOIN ...`
- [ ] Create izin admin → `INSERT INTO coach_leaves (..., created_by_admin=true, status='approved')`
- [ ] Approve/reject → `UPDATE coach_leaves SET status=?, reviewed_by=auth.uid()`

**Tab Member:**
- [ ] List → `SELECT member_leaves.*, profiles.full_name FROM member_leaves JOIN ...`
- [ ] Create izin admin → `INSERT INTO member_leaves (..., created_by_admin=true, status='approved')`
- [ ] Approve/reject → `UPDATE member_leaves SET status=?, reviewed_by=auth.uid()`

### 3.10 Pembayaran

- [ ] List tagihan → `SELECT bills.*, profiles.full_name FROM bills JOIN members JOIN profiles WHERE branch_id=?`
- [ ] Generate tagihan bulanan → bulk `INSERT INTO bills` untuk semua member reguler aktif
- [ ] Verifikasi → `UPDATE bills SET status='paid', paid_at=now(), paid_method=?, verified_by=auth.uid()`
- [ ] Setelah verifikasi → insert notification ke member

### 3.11 Approvement

- [ ] Registrasi → `SELECT * FROM registrations WHERE branch_id=? AND status='pending'`
- [ ] Approve registrasi → 
  1. Buat akun auth
  2. Insert member
  3. `UPDATE registrations SET status='approved', member_id=?`
- [ ] Izin pending → join dari `coach_leaves` + `member_leaves` WHERE status='pending'
- [ ] Sertifikasi pending → `SELECT * FROM certifications WHERE status='pending'`

### 3.12 Rapor

- [ ] Buat periode → `INSERT INTO rapor_periods`
- [ ] List rapor → `SELECT rapor_entries.*, profiles.full_name FROM rapor_entries JOIN ...`
- [ ] Tutup periode → `UPDATE rapor_periods SET is_open=false; UPDATE rapor_entries SET locked=true`

### 3.13 School Panel

- [ ] CRUD sekolah → `INSERT/UPDATE/DELETE FROM schools`
- [ ] List siswa afiliasi → `SELECT members.*, profiles.* FROM members WHERE school_id=?`
- [ ] Rekap biaya → `SELECT sum(bills.total), period_label FROM bills WHERE member_id IN (...)`

---

## Phase 4 — Coach Page (`src/app/coach/page.tsx`)

### 4.1 Home

- [ ] Kelas hari ini → `SELECT classes.* FROM class_coaches JOIN classes WHERE coach_id=auth.uid()` filter hari
- [ ] Rekap kehadiran → `SELECT count(*) FROM coach_attendances WHERE coach_id=auth.uid() AND session_date >= first_of_month`

### 4.2 Clock In Flow

- [ ] Step 1-2: selfie → upload foto ke Cloudflare R2 (atau Supabase Storage), dapat URL
- [ ] Step 3: hitung jarak dari `navigator.geolocation` vs `branches.lat/lng`
- [ ] Submit → `INSERT INTO coach_attendances ({ coach_id, class_id, branch_id, session_date: today, selfie_url, distance_meters })`
- [ ] Window waktu → validasi di client: `now()` antara `(class.time_start - 1jam)` dan `class.time_end`

### 4.3 Absensi Member

- [ ] QR scan → baca `members.qr_code` dari kamera (html5-qrcode sudah installed)
- [ ] Lookup member → `SELECT * FROM members WHERE qr_code=?`
- [ ] `INSERT INTO member_attendances ({ member_id, class_id, session_date: today, status: 'hadir', method: 'qr', marked_by: auth.uid() })`
- [ ] Manual absensi → `SELECT member_classes JOIN members JOIN profiles WHERE class_id=?` → checklist per member

### 4.4 Kelas

- [ ] `SELECT classes.*, class_coaches FROM classes JOIN class_coaches WHERE coach_id=auth.uid()`
- [ ] Detail kelas → member list dari `member_classes JOIN members JOIN profiles`
- [ ] Spreadsheet program → `UPDATE classes SET spreadsheet_filled=true, prog=?` (atau tabel terpisah)

### 4.5 Invoice

- [ ] Load sesi → `SELECT coach_attendances.*, classes.name FROM coach_attendances WHERE coach_id=auth.uid()`
- [ ] Rate per kelas → `SELECT rate FROM coach_rates WHERE coach_id=auth.uid() AND class_id=?`
- [ ] Generate → `INSERT INTO coach_invoices` + `INSERT INTO coach_invoice_items`
- [ ] Download PDF → generate di client dengan `@react-pdf/renderer` atau kirim ke edge function

### 4.6 Rapor

- [ ] Cek periode aktif → `SELECT * FROM rapor_periods WHERE branch_id=? AND is_open=true`
- [ ] Load member per kelas → seperti di 4.4
- [ ] Simpan rapor → `UPSERT INTO rapor_entries ({ period_id, member_id, class_id, coach_id, scores, notes })`
- [ ] Lihat review → `SELECT * FROM member_reviews WHERE coach_id=auth.uid()`

### 4.7 Profile

- [ ] Load → `SELECT * FROM profiles WHERE id=auth.uid()`
- [ ] Update → `UPDATE profiles SET ...`
- [ ] Cek profil lengkap → validasi field wajib → `UPDATE profiles SET is_profile_complete=true`
- [ ] Sertifikasi → `INSERT INTO certifications (status='pending')` → notif ke admin
- [ ] Ganti password → `supabase.auth.updateUser({ password })`

### 4.8 Leave (Izin)

- [ ] Submit → `INSERT INTO coach_leaves` + `INSERT INTO coach_leave_classes`
- [ ] Notifikasi ke admin setelah insert

---

## Phase 5 — Member Page (`src/app/member/page.tsx`)

### 5.1 Home

- [ ] Jadwal terdekat → `SELECT classes.* FROM member_classes JOIN classes WHERE member_id=?`
- [ ] Pengumuman → `SELECT * FROM announcements WHERE branch_id=? AND active=true AND (valid_until IS NULL OR valid_until >= today)`
- [ ] Tagihan belum bayar → `SELECT * FROM bills WHERE member_id=? AND status='unpaid'`
- [ ] Sisa sesi (private) → `SELECT remaining_sessions FROM members WHERE profile_id=auth.uid()`

### 5.2 Jadwal

- [ ] `SELECT classes.*, profiles.full_name as coach_name FROM member_classes JOIN classes JOIN class_coaches JOIN profiles WHERE member_id=?`

### 5.3 Absensi

- [ ] `SELECT member_attendances.*, classes.name FROM member_attendances JOIN classes WHERE member_id=?`
- [ ] Filter bulan → tambahkan `WHERE session_date BETWEEN ? AND ?`

### 5.4 Tagihan

- [ ] Aktif → `SELECT * FROM bills WHERE member_id=? AND status IN ('unpaid','partial')`
- [ ] Histori → `SELECT * FROM bills WHERE member_id=? AND status='paid'`

### 5.5 Izin

- [ ] Submit → `INSERT INTO member_leaves` + `INSERT INTO member_leave_classes`
- [ ] History → `SELECT * FROM member_leaves WHERE member_id=?`

### 5.6 Rapor

- [ ] `SELECT rapor_entries.*, rapor_periods.label FROM rapor_entries JOIN rapor_periods WHERE member_id=? AND locked=true`
- [ ] Submit review → `INSERT INTO member_reviews`

### 5.7 Profile

- [ ] Load → `SELECT profiles.*, members.qr_code FROM profiles JOIN members WHERE profiles.id=auth.uid()`
- [ ] Update terbatas → `UPDATE profiles SET phone=?, address=?, health_notes=?, avatar_url=?`
- [ ] QR download → render QR dari `members.qr_code`

---

## Phase 6 — School Page (`src/app/school/page.tsx`)

- [ ] Load siswa → `SELECT members.*, profiles.full_name FROM members WHERE school_id=?` (school_id dari profile)
- [ ] Load rapor → `SELECT rapor_entries.*, rapor_periods.label FROM rapor_entries WHERE member_id IN (siswa afiliasi) AND locked=true`
- [ ] Download ZIP → Cloudflare R2 pre-signed URL atau server action yang generate multiple PDF

---

## Phase 7 — Realtime

Supabase Realtime sudah di-enable di schema untuk tabel berikut:

| Tabel | Digunakan di |
|---|---|
| `notifications` | Bell dropdown — semua halaman |
| `member_attendances` | Admin dashboard live attendance |
| `coach_attendances` | Admin dashboard live attendance |
| `bills` | Member page — status tagihan live update |
| `announcements` | Member home — pengumuman baru |

**Pattern:**
```ts
// Di komponen "use client"
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // tambahkan ke state
  })
  .subscribe();
```

---

## Phase 8 — File Storage (Cloudflare R2 / Supabase Storage)

Semua file upload menggunakan Supabase Storage bucket (bisa diganti R2 nanti).

| File | Bucket | Path |
|---|---|---|
| Avatar / foto profil | `avatars` | `{user_id}/avatar.jpg` |
| Selfie absensi coach | `attendances` | `{coach_id}/{session_date}/{class_id}.jpg` |
| QR code member | `qrcodes` | `{member_id}.png` |
| Bukti transfer | `payments` | `{bill_id}/proof.jpg` |
| Sertifikat coach | `certs` | `{coach_id}/{cert_id}.jpg` |
| PDF invoice | `invoices` | `{invoice_id}.pdf` |
| PDF rapor | `rapors` | `{period_id}/{member_id}.pdf` |
| Logo cabang | `logos` | `{branch_id}/logo.png` |

---

## Phase 9 — Error Handling & UX Polish

- [ ] Semua mutation menggunakan `useToast()` untuk feedback sukses/gagal
- [ ] Semua konfirmasi destruktif menggunakan `useConfirm()`
- [ ] Loading state: gunakan `useState` lokal (jangan skeleton global) untuk zero-loading feel
- [ ] Form validation dengan `react-hook-form` + `zod` (sudah installed)
- [ ] Infinite loop QR scan protection: debounce 1.5s setelah scan berhasil

---

## Urutan Pengerjaan yang Disarankan

```
Phase 0 (Setup)  →  Phase 1 (Auth)  →  Phase 3 (Admin)  →  Phase 2 (Owner)
→  Phase 4 (Coach)  →  Phase 5 (Member)  →  Phase 6 (School)
→  Phase 7 (Realtime)  →  Phase 8 (Storage)  →  Phase 9 (Polish)
```

Admin panel dierjakan sebelum owner karena data cabang, kelas, dan member harus bisa dikelola sebelum owner panel bisa menampilkan data yang bermakna.

---

## Catatan Penting

- **Jangan hapus mock data di `src/lib/data.ts`** sampai integrasi Phase 3-5 selesai — data tersebut masih digunakan untuk preview UI selama pengembangan.
- **RLS (Row Level Security)** sudah di-enable di semua tabel. Gunakan `supabase.auth.getUser()` di server components, bukan di client untuk operasi sensitif.
- **Middleware** di `src/middleware.ts` sudah handle redirect otomatis berdasarkan role — jangan tambahkan redirect manual di page components.
- **`supabase.auth.admin.*`** memerlukan service role key — jangan expose ke client. Buat Route Handler di `src/app/api/` untuk operasi admin user management.
