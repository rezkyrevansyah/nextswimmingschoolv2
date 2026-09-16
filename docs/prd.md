# PRD — Next Swimming School: Sistem Manajemen Sekolah Renang Multi-Cabang

| | |
|---|---|
| **Status** | v1.0 — draf awal |
| **Pemilik dokumen** | Tim produk & engineering Next Swimming School |
| **Terakhir diperbarui** | 2026-09-16 |
| **Audiens** | Manusia (produk, desain, QA, engineer baru) **dan** AI coding agent |

## 0. Tentang dokumen ini

Dokumen ini ditulis **seolah-olah proyek Next Swimming School dibangun dari awal (*greenfield*)** — bukan sebagai catatan perubahan (*changelog*). Isinya disusun berdasarkan implementasi yang sudah berjalan di kode saat ini, sehingga dokumen ini sekaligus menjadi **spesifikasi produk** dan **potret akurat sistem yang sudah ada**. Tujuannya adalah menjadi satu sumber kebenaran (*source of truth*) yang cukup untuk:

- **Manusia** — memahami cakupan produk tanpa harus membaca seluruh kode terlebih dahulu.
- **AI coding agent** — memahami konteks, batasan, dan struktur sistem sebelum mengerjakan fitur baru, sehingga tidak mengarang perilaku yang tidak ada atau melanggar konvensi proyek.

Jika ada pertentangan antara dokumen ini dan kode aktual, **kode yang menang** — bagian yang salah di dokumen ini harus diperbarui, bukan sebaliknya.

**Dokumen rujukan terkait** (lebih rinci per topik, jangan diduplikasi di sini):

| Dokumen | Isi |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Konteks proyek, tumpukan teknologi, konvensi struktur berkas |
| [`AGENTS.md`](../AGENTS.md) | Catatan versi Next.js non-standar untuk agen AI |
| [`docs/features/README.md`](features/README.md) dan berkas per peran di folder yang sama | Rincian menu per panel, berdasarkan kode saat ini |
| [`docs/design-system/README.md`](design-system/README.md) dan [`DESIGN.md`](design-system/DESIGN.md) | Token desain, komponen UI, aturan visual |
| [`supabase/schema.sql`](../supabase/schema.sql) | Skema database PostgreSQL lengkap |

---

## 1. Ringkasan Eksekutif

### 1.1 Pernyataan masalah

Sekolah renang dengan banyak cabang (*multi-branch*) mengelola pendaftaran siswa, jadwal kelas, kehadiran, tagihan iuran, honor pelatih, gaji staf, dan rapor perkembangan siswa secara manual atau tersebar di berbagai alat (WhatsApp, spreadsheet, kertas). Hal ini menyebabkan: data siswa dan keuangan tidak terpusat antar cabang, proses persetujuan (pendaftaran, izin, honor) lambat karena bergantung komunikasi manual, dan pemilik bisnis (Owner) tidak punya gambaran keuangan dan operasional lintas cabang secara real-time.

### 1.2 Solusi yang diusulkan

Aplikasi web (Next.js + Supabase) dengan **satu basis data terpusat** dan **tujuh peran pengguna** (Owner, Admin, Manager Center, Coach, Staff, Member, School), masing-masing punya panel dengan cakupan data yang sesuai wewenangnya. Sistem menangani siklus penuh operasional sekolah renang: pendaftaran → penempatan kelas → kehadiran (QR/GPS) → tagihan iuran → honor pelatih/gaji staf → slip gaji → rapor perkembangan siswa berbasis rubrik — dengan panel publik (landing page) sebagai etalase dan pintu pendaftaran.

### 1.3 Kriteria keberhasilan

Karena dokumen ini berfungsi sebagai acuan pengembangan (bukan dokumen pitching bisnis), kriteria keberhasilan difokuskan pada kelengkapan fungsional dan kualitas teknis:

1. **Cakupan fungsional** — seluruh alur inti (pendaftaran → kelas → kehadiran → tagihan → honor → slip gaji → rapor) berjalan tanpa campur tangan manual di luar aplikasi, kecuali konfirmasi pembayaran via WhatsApp (keputusan produk yang disengaja, lihat §4).
2. **Integritas peran** — setiap peran hanya dapat mengakses data sesuai cakupannya (RLS Supabase + middleware peran); tidak ada kebocoran data lintas cabang untuk peran `admin`, `coach`, `member`, `school`.
3. **Konsistensi desain** — 100% UI baru mematuhi 10 aturan wajib di [`docs/design-system/README.md`](design-system/README.md) (lihat checklist §11 `DESIGN.md`).
4. **Verifikasi sebelum rilis** — setiap perubahan lolos `tsc` bersih dan `eslint` tanpa regresi baru dibanding baseline sebelum commit (lihat memori tim: `tsc` + `eslint`-vs-git-stash-baseline setelah tiap batch perubahan).
5. **Migrasi basis data aman** — setiap perubahan skema diterapkan langsung ke `DATABASE_URL` via skrip `postgres` (bukan `drizzle-kit push`, yang berisiko menimpa kolom asli karena `src/db/schema.ts` belum jadi cerminan penuh `schema.sql`) dan diverifikasi ulang setelah dieksekusi.

---

## 2. Lingkup Produk & Peran Pengguna

### 2.1 Peran (personas)

| Peran (`profiles.role`) | Cakupan data | Perangkat utama | Ringkasan |
|---|---|---|---|
| `owner` | Semua cabang | Desktop | Pemilik bisnis; kontrol penuh: data induk, keuangan lintas cabang, slip gaji, kasbon, CMS landing, penyimpanan berkas, log aktivitas |
| `admin` | Satu cabang | Desktop | Operasional harian satu cabang: kelas, member, pelatih, kehadiran, persetujuan pendaftaran/izin, rapor |
| `manager_center` | Satu cabang | Desktop | Sama seperti Admin, ditambah akses **Payments** (selalu tampil) dan **Financial** (menu eksklusif) |
| `coach` | Kelas yang diampu (lintas cabang jika ditugaskan di lebih dari satu) | Mobile-first | Mengajar: clock-in GPS, absensi member, klaim honor (invoice), mengisi rapor |
| `staff` | Satu cabang | Mobile & desktop | Non-pengajar: clock-in/out harian, klaim gaji nominal, reimburse operasional |
| `member` | Data diri & kelas sendiri | Mobile-first | Siswa/wali: lihat jadwal, kehadiran, tagihan (kecuali afiliasi sekolah), rapor, ajukan izin |
| `school` | Siswa afiliasi sekolah tersebut, satu cabang | Desktop | Mitra sekolah: memantau dan mengunduh rapor serta rekap kehadiran siswa afiliasi (read-only, tanpa input) |
| Publik (tanpa akun) | — | Desktop & mobile | Landing page, formulir pendaftaran `/register` |

Detail menu lengkap per peran ada di `docs/features/{owner,admin,coach,staff,member,school}-panel.md` — dokumen ini tidak menduplikasinya, hanya merangkum sebagai kebutuhan produk.

### 2.2 Prinsip navigasi

Panel bukan memakai routing Next.js per halaman, melainkan **tab internal berbasis `useState`** di satu halaman per peran (`src/app/{owner,admin,coach,member,school,staff}/page.tsx`). Keputusan desain ini disengaja — nol waktu tunggu pindah tab, meniru UX prototipe awal. AI agent yang menambah menu baru **harus** mengikuti pola ini, bukan membuat rute App Router baru untuk sub-halaman panel.

---

## 3. Pengalaman Pengguna & Fungsionalitas

Bagian ini merangkum kebutuhan fungsional dalam bentuk *user story* dan kriteria selesai (*acceptance criteria*) tingkat tinggi per peran. Untuk daftar menu, field, dan aturan bisnis lengkap per menu, rujuk berkas `docs/features/*-panel.md` yang bersangkutan — tautan diberikan di tiap bagian.

### 3.1 Owner — kendali lintas cabang

> Detail lengkap: [`docs/features/owner-panel.md`](features/owner-panel.md)

- **Kisah pengguna:** Sebagai Owner, saya ingin melihat ringkasan member, pelatih, kelas, dan invoice honor tertunda di semua cabang dalam satu dasbor, agar saya tidak perlu menghubungi tiap Admin cabang satu per satu.
  - **AC:** Dasbor menampilkan angka agregat lintas cabang dan tabel per cabang; data bersumber langsung dari Supabase, bukan angka statis.
- **Kisah pengguna:** Sebagai Owner, saya ingin meninjau, menyetujui, membuat draf slip, dan menerbitkan slip gaji pelatih/staf, agar proses pembayaran honor terdokumentasi dan tidak dilakukan manual di luar sistem.
  - **AC:** Alur `pending → approved → draft slip → published` tercatat di `coach_invoices` dan `payslips`; kasbon aktif otomatis tersedia sebagai opsi potongan; setelah diterbitkan, invoice terkait berstatus `paid` dan cicilan kasbon periode itu tertutup.
- **Kisah pengguna:** Sebagai Owner, saya ingin mengelola data induk (cabang, sekolah mitra, akun semua peran, rubrik rapor, tarif honor) dari satu tempat, agar Admin di tiap cabang bekerja dengan aturan yang konsisten.
  - **AC:** Perubahan pin GPS cabang, tarif, atau rubrik rapor langsung memengaruhi panel Coach/Admin/Member/School terkait tanpa perlu deploy ulang.
- **Kisah pengguna:** Sebagai Owner, saya ingin mengelola konten halaman publik (landing page) dari CMS internal, agar promosi cabang dan program tidak butuh sentuhan kode.

### 3.2 Admin & Manager Center — operasional satu cabang

> Detail lengkap: [`docs/features/admin-panel.md`](features/admin-panel.md)

- **Kisah pengguna:** Sebagai Admin, saya ingin menyetujui pendaftaran publik menjadi akun member aktif dan menempatkannya ke kelas, agar siswa baru bisa langsung mengikuti kelas tanpa Admin membuat akun manual dari nol.
  - **AC:** Persetujuan pendaftaran (`registrations`) membuat baris `members` baru; pendaftaran yang ditolak tidak membuat akun.
- **Kisah pengguna:** Sebagai Admin, saya ingin membuat tagihan bulanan otomatis untuk member reguler yang aktif di kelas, agar saya tidak perlu menghitung manual per siswa per bulan.
  - **AC:** Satu tagihan per pasangan member×kelas per periode; tagihan yang sudah ada di periode yang sama dilewati; member `private` dan `school_affiliate` tidak ikut tergenerate otomatis.
- **Kisah pengguna:** Sebagai Manager Center, saya ingin melihat menu **Financial** yang tidak dimiliki Admin biasa, agar saya bisa memantau pemasukan dan pengeluaran satu cabang tanpa perlu login sebagai Owner.
  - **AC:** `Financial` dan `Payments` selalu tampil untuk `manager_center`, terlepas dari sakelar `branches.show_payments_to_admin`.
- **Kisah pengguna:** Sebagai Admin, saya ingin menyetujui izin pelatih dengan mewajibkan pengganti per kelas, agar tidak ada kelas yang kosong pengajar tanpa sepengetahuan Admin.

### 3.3 Coach — pengajaran & klaim honor

> Detail lengkap: [`docs/features/coach-panel.md`](features/coach-panel.md)

- **Kisah pengguna:** Sebagai pelatih, saya ingin melakukan *clock-in* dengan jarak GPS tercatat (bukan pagar geografis yang menolak), agar kehadiran tetap dapat dikirim walau sinyal GPS kurang akurat, sambil tetap ada indikator kewajaran jarak bagi Admin.
  - **AC:** Jarak ke pin cabang (atau pin kelas untuk kelas privat/eksternal) disimpan di `distance_meters` dan diwarnai (≤500 m / ≤2 km / lebih), tetapi **tidak pernah memblokir** pengiriman clock-in.
- **Kisah pengguna:** Sebagai pelatih, saya ingin mengklaim honor dari sesi yang sudah saya hadiri, agar pembayaran honor sesuai jumlah sesi aktual yang saya ajarkan.
  - **AC:** Hanya sesi berstatus `present`/`late` yang belum diklaim (`invoice_id` kosong) yang dapat dipilih; kelas tanpa tarif tidak dapat diklaim; pengiriman mengunci sesi tersebut secara atomik agar tidak diklaim dobel.
- **Kisah pengguna:** Sebagai pelatih, saya ingin profil saya (termasuk rekening bank) wajib lengkap sebelum saya dapat mengakses tab Absen/Invoice/Rapor, agar data pembayaran honor selalu valid saat slip diterbitkan.
- **Kisah pengguna:** Sebagai pelatih, saya ingin mengisi rapor siswa berbasis rubrik yang ditentukan Owner, agar penilaian konsisten antar pelatih dan cabang.

### 3.4 Staff — operasional non-pengajaran

> Detail lengkap: [`docs/features/staff-panel.md`](features/staff-panel.md)

- **Kisah pengguna:** Sebagai staf, saya ingin mencatat *clock-in*/*clock-out* harian dengan swafoto, agar kehadiran saya tercatat tanpa perlu GPS (berbeda dari pelatih yang berpindah lokasi kelas).
- **Kisah pengguna:** Sebagai staf, saya ingin mengajukan klaim gaji dengan nominal yang saya ketik sendiri (bukan berbasis sesi kelas), agar sistem klaim tetap relevan untuk pekerjaan non-pengajaran.
- **Kisah pengguna:** Sebagai staf, saya ingin mengajukan reimburse biaya operasional dengan bukti nota, agar penggantian biaya terdokumentasi dan disetujui Owner secara transparan.

### 3.5 Member — siswa & wali

> Detail lengkap: [`docs/features/member-panel.md`](features/member-panel.md)

- **Kisah pengguna:** Sebagai member reguler, saya ingin melihat tagihan iuran beserta info rekening cabang, agar saya bisa transfer dan mengonfirmasi via WhatsApp tanpa perlu bertanya ke Admin.
  - **AC:** Tidak ada formulir unggah bukti bayar di panel Member — proses verifikasi lunas sepenuhnya di sisi Admin.
- **Kisah pengguna:** Sebagai member tipe `school_affiliate`, saya tidak ingin melihat tab **Bills**, karena iuran saya ditanggung/ditagih lewat skema afiliasi sekolah, bukan langsung ke saya.
- **Kisah pengguna:** Sebagai member tipe `private`, saya ingin melihat sisa sesi les privat saya dan mendapat peringatan saat sisa sesi tinggal sedikit, agar saya bisa memperpanjang paket tepat waktu.
- **Kisah pengguna:** Sebagai member, saya ingin mengunduh rapor perkembangan renang saya dan memberi ulasan bintang ke pelatih selama periode rapor masih terbuka.

### 3.6 School — mitra sekolah

> Detail lengkap: [`docs/features/school-panel.md`](features/school-panel.md)

- **Kisah pengguna:** Sebagai akun sekolah mitra, saya ingin memantau status kelengkapan rapor siswa afiliasi sekolah saya dan mengunduhnya (satuan atau ZIP), tanpa bisa mengubah data siswa, kelas, atau rapor itu sendiri.
  - **AC:** Panel School bersifat **read-only** penuh — tidak ada tombol tambah/ubah/hapus di seluruh panel ini; unduhan rapor hanya untuk entri yang sudah dikunci (`locked = true`) oleh pelatih.
- **Kisah pengguna:** Sebagai akun sekolah, saya ingin mengekspor rekap kehadiran siswa afiliasi ke Excel untuk arsip sekolah.

### 3.7 Publik — landing page & pendaftaran

- **Kisah pengguna:** Sebagai calon member, saya ingin melihat informasi cabang, program, dan pelatih di landing page, lalu mendaftar lewat formulir `/register`, agar saya tidak perlu datang langsung ke lokasi untuk mendaftar.
  - **AC:** Data pendaftaran masuk ke tabel `registrations` berstatus tertunda; tidak langsung membuat akun member sebelum disetujui Admin.

---

## 4. Non-Goals (keputusan cakupan yang disengaja)

Bagian ini penting bagi AI agent agar tidak "memperbaiki" sesuatu yang sebenarnya merupakan keputusan produk yang disengaja, bukan bug.

- **Bukan pagar geografis (geofencing).** *Clock-in* pelatih **tidak pernah ditolak** karena jarak GPS jauh — jarak hanya dicatat dan diwarnai sebagai indikator bagi Admin.
- **Tidak ada gateway pembayaran daring.** Konfirmasi lunas iuran dilakukan manual: member transfer lalu konfirmasi via WhatsApp, Admin yang menandai lunas (dan dapat mengunggah bukti dari sisinya). Tidak ada integrasi payment gateway (Midtrans, Xendit, dsb.) di v1.
- **Bukan aplikasi mobile native.** Panel Coach/Member/Staff dirancang *mobile-first* sebagai web responsif, bukan aplikasi iOS/Android terpisah.
- **Bukan sistem multi-tenant lintas organisasi.** Seluruh cabang berada di bawah satu Owner/organisasi; tidak ada isolasi data antar "perusahaan" yang berbeda dalam satu instalasi.
- **Panel School bersifat read-only sepenuhnya** — sekolah mitra tidak pernah menjadi sumber input data siswa, kelas, atau rapor.
- **Bukan payroll otomatis penuh.** Slip gaji tetap memerlukan tinjauan dan penerbitan manual oleh Owner (potongan pajak/kasbon disunting per slip), bukan kalkulasi otomatis tanpa tinjauan.
- **Tidak ada sistem pesan (chat) internal.** Komunikasi lintas peran memakai WhatsApp deep link (`waLink`) dan Bell notifikasi, bukan fitur chat dalam aplikasi.
- **`drizzle-kit push` tidak digunakan** untuk mengubah skema produksi — `src/db/schema.ts` sengaja dibiarkan sebagai model parsial, bukan cerminan penuh `schema.sql`, sehingga menjalankan `drizzle-kit push` berisiko menimpa/menghapus kolom asli.

---

## 5. Kebutuhan Sistem AI (jika berlaku)

Sistem ini **saat ini tidak memiliki fitur berbasis AI/ML** (bukan produk AI-native). Poin-poin berikut mengklarifikasi batasan agar tidak disalahartikan sebagai kebutuhan AI:

- **Multibahasa (EN/ID)** memakai kamus statis (`src/i18n/dictionaries.ts` + `locales/{en,id}/*.ts`), **bukan** terjemahan otomatis/AI. Kunci yang hilang di salah satu bahasa gagal saat `tsc` (dijamin lewat tipe, bukan lewat model bahasa).
- Tidak ada fitur rekomendasi, prediksi, atau pembuatan konten otomatis (mis. narasi rapor otomatis, deteksi kecurangan absensi) di v1.

**Status:** *Non-goal* untuk v1. Jika di masa depan ada kebutuhan AI (misalnya draf narasi catatan rapor berbasis skor, atau ringkasan performa siswa), maka bagian ini harus diperbarui dengan **Tool Requirements** dan **Evaluation Strategy** yang eksplisit sebelum implementasi — lihat §7.2 Peta Jalan.

---

## 6. Spesifikasi Teknis

### 6.1 Ringkasan arsitektur

```
Publik/Browser (Next.js App Router, React 19)
        │
        ├── Rute peran: /owner, /admin, /coach, /member, /school, /staff
        │     (routing halaman via Next.js; navigasi ANTAR MENU di dalam
        │      satu peran memakai tab useState, bukan routing)
        │
        ├── Middleware (src/proxy.ts → utils/supabase/middleware.ts)
        │     redirect berbasis peran & sesi
        │
        ├── Route Handlers (src/app/api/**)
        │     - operasi butuh service-role key (admin.* Supabase)
        │     - upload/delete storage (bucket publik & privat)
        │     - generate PDF (Puppeteer + Chromium) & Excel (xlsx) & ZIP (jszip)
        │
        └── Supabase (Postgres + Auth + Storage + Realtime)
              - RLS per tabel, berbasis profiles.role & branch_id
              - Storage: next-storage (publik), next-storage-private (privat)
```

### 6.2 Tumpukan teknologi

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | Next.js 16 (App Router) | Lihat [`AGENTS.md`](../AGENTS.md) — versi ini punya breaking changes dari Next.js yang umum dikenal; baca `node_modules/next/dist/docs/` sebelum menulis kode baru |
| Bahasa & UI | TypeScript, React 19, Tailwind CSS v4 (`@theme inline`, tanpa `tailwind.config.ts`) | Token desain di `src/app/globals.css` |
| Backend-as-a-Service | Supabase (Auth, Postgres, Storage, Realtime) | Klien di `src/utils/supabase/{client,server,middleware}.ts` |
| Query langsung/migrasi | `postgres` (postgres-js) + `dotenv` | **Bukan** `psql`, **bukan** `drizzle-kit push` |
| ORM parsial | `drizzle-orm` / `drizzle-kit` | Hanya referensi tipe sebagian; **tidak** dipakai untuk migrasi produksi |
| Dokumen & data | `puppeteer-core` + `@sparticuz/chromium-min` (PDF rapor), `xlsx` (ekspor Excel), `jszip` (unduhan massal) | |
| Peta | `leaflet` (pemilihan pin GPS cabang/kelas) | |
| QR | `qrcode` (generate), `html5-qrcode` (pindai oleh pelatih) | |
| Monitoring | `@sentry/nextjs` | |
| Pengujian | `vitest` (unit), `@playwright/test` (E2E per peran: `flow-owner`, `flow-admin`, `flow-coach`, `flow-member`, `public`) | |

### 6.3 Model data utama

Skema lengkap: [`supabase/schema.sql`](../supabase/schema.sql). Domain utama (nama tabel merepresentasikan entitas):

| Domain | Tabel inti |
|---|---|
| Identitas & struktur | `profiles` (peran via `user_role` enum), `branches`, `schools`, `coach_branches` |
| Kelas & kehadiran | `classes`, `class_coaches`, `class_holidays`, `class_packages`, `member_classes`, `coach_attendances`, `member_attendances`, `staff_attendances` |
| Member & pendaftaran | `members`, `registrations`, `member_leaves`, `certifications` |
| Keuangan | `bills`, `coach_invoices`, `coach_invoice_items`, `coach_rates`, `coach_extra_rates`, `payslips`, `payslip_deductions`, `coach_loans`, `coach_loan_payments`, `invoice_periods`, `staff_invoices`, `staff_reimbursements`, `monthly_salaries`, `manual_transactions`, `manual_transaction_categories`, `tax_settings` |
| Rapor | `rapor_periods`, `rapor_entries`, `rapor_levels` (+ `rapor_level_criteria`, `rapor_level_classes`, `rapor_level_distances`, `rapor_level_strokes`, `rapor_level_best_time_targets`), `rapor_signatures`, `rapor_signature_assignments`, `member_best_times`, `member_reviews` |
| CMS landing publik | `landing_config`, `landing_hero(_stats)`, `landing_whyus(_cards)`, `landing_why_next`, `landing_testimonials(_v2)`, `landing_partners`, `landing_programs`, `landing_coaches`, `landing_branches`, `landing_faqs`, `landing_finalcta`, `landing_nav_links`, `landing_safety(_points)`, `landing_facilities(_items)`, `landing_process_steps`, `landing_gallery`, `landing_videos`, `trial_bookings` |
| Lain-lain | `announcements(_classes)`, `notifications`, `activity_logs`, `class_criteria`, `class_coach_spreadsheets` |

Semua kolom bertipe kunci-asing ke `branches.id` menegakkan batas "satu cabang" untuk peran `admin`/`manager_center`, dan kolom relasi ke `profiles.id` menegakkan kepemilikan data untuk `coach`/`staff`/`member`/`school`.

### 6.4 Titik integrasi

- **Supabase Auth** — sesi dikelola via cookie SSR (`@supabase/ssr`); operasi `auth.admin.*` (buat/reset akun) **hanya** lewat Route Handler server, tidak pernah lewat client dengan service key.
- **Supabase Storage** — dua bucket: `next-storage` (publik: avatar, logo, foto kelas, tanda tangan, gambar landing) dan `next-storage-private` (bukti bayar, sertifikat, swafoto absensi). Field bucket privat menyimpan **kunci mentah**, direnderkan lewat `useSignedUrl`/`/api/storage/signed-url` — tidak pernah URL publik langsung.
- **WhatsApp** — deep link `wa.me` lewat `waLink()`, dipakai di hampir semua alur konfirmasi lintas peran (bukan API resmi WhatsApp Business).
- **Generator PDF/Excel/ZIP** — rapor dan slip gaji dirender ke PDF via Puppeteer+Chromium serverless; ekspor kehadiran ke Excel via `xlsx`; unduhan massal rapor via `jszip`.

### 6.5 Keamanan & privasi

- **Row Level Security (RLS)** aktif per tabel Supabase berbasis `profiles.role` dan `branch_id` — lihat [`supabase/storage_policies.sql`](../supabase/storage_policies.sql) untuk kebijakan storage.
- **Middleware peran** (`src/proxy.ts` → `updateSession()`) menegakkan redirect berbasis peran di level Next.js, sebagai lapisan kedua di atas RLS (bukan pengganti RLS).
- **Service role key** Supabase tidak pernah diekspos ke client — seluruh pemanggilan `getSupabaseAdmin()`/`storage()` terjadi di Route Handler (`src/app/api/**`) atau helper server-only (`src/utils/supabase-storage/`, dilarang diimpor dari komponen `"use client"`).
- **Bukti privat** (bukti bayar, sertifikat, swafoto) tidak pernah dapat diakses lewat URL publik permanen — selalu lewat *signed URL* berumur pendek.
- **Data kesehatan** anak/siswa (catatan kesehatan di profil Member) hanya terlihat oleh peran dengan akses sah ke data member tersebut (Admin cabang terkait, Owner); tidak tampil di panel School atau peran lain di luar cakupan cabang.

### 6.6 Konvensi pengembangan wajib (untuk AI agent)

- **Jangan interpolasi class Tailwind** (`` `bg-${warna}-50` ``) — tulis kelas lengkap agar masuk hasil build.
- **Migrasi skema database diterapkan langsung** oleh agent lewat skrip `.mjs` sekali pakai + `postgres` + `.env.local`, **bukan** diminta dieksekusi manual oleh pengguna di Supabase SQL Editor, dan **bukan** `drizzle-kit push`. Setiap migrasi disimpan juga sebagai berkas rujukan di `supabase/*.sql`.
- **Repositori diedit bersamaan oleh proses lain** yang berjalan paralel — sebelum mengubah berkas, verifikasi terhadap keadaan berkas saat ini (bukan asumsi dari sesi sebelumnya); jika menemukan perubahan tak dikenal, jangan dikembalikan (*revert*) begitu saja.
- **Verifikasi wajib setelah tiap batch perubahan:** `tsc` harus bersih; `eslint` dibandingkan terhadap baseline `git stash` sebelum perubahan (bukan dijalankan berdiri sendiri), agar peringatan lama yang bukan tanggung jawab perubahan ini tidak diblokir.

---

## 7. Risiko & Peta Jalan

### 7.1 Risiko teknis

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `src/db/schema.ts` tidak sinkron dengan `schema.sql` produksi | `drizzle-kit push` tanpa sadar dapat menghapus/mengubah kolom asli | Larangan eksplisit memakai `drizzle-kit push`; migrasi selalu via skrip `postgres` langsung + verifikasi ulang setelah eksekusi |
| Kehadiran GPS pelatih tidak memblokir (bukan geofencing) | Berpotensi disalahgunakan untuk *clock-in* dari lokasi jauh | Keputusan produk yang disengaja (fleksibilitas atas ketatnya sistem); jarak tetap tercatat dan terlihat oleh Admin untuk audit manual |
| Migrasi i18n belum tuntas (Admin/School dan sebagian tab Member masih teks Indonesia hardcode) | Pengalaman berbahasa Inggris tidak konsisten di seluruh panel | Migrasi bertahap tercatat sebagai item roadmap v1.1 (lihat §7.2) |
| Generasi PDF lewat Puppeteer/Chromium di lingkungan serverless | Potensi *cold start* lambat atau biaya komputasi lebih tinggi saat unduhan massal (ZIP rapor) | Pembatasan ukuran per permintaan (paginasi, batas baris) sudah diterapkan di beberapa modul (mis. batas 2.000 baris kehadiran School) |
| Satu pelatih terikat banyak cabang (`coach_branches`) | Kompleksitas saringan data "kelas hari ini" per cabang aktif | Ditegaskan lewat pemilih cabang di header panel Coach saat pelatih terhubung ke >1 cabang |
| Ketergantungan pada konfirmasi manual WhatsApp untuk verifikasi pembayaran | Rawan keterlambatan/kesalahan pencatatan manual oleh Admin | *Non-goal* yang disengaja untuk v1; integrasi payment gateway adalah kandidat roadmap v2 |

### 7.2 Peta jalan bertahap

- **v1 (baseline saat ini)** — seluruh panel dan alur inti yang dijabarkan di §3 sudah berjalan di kode; desain sistem dan token visual sudah baku ([`DESIGN.md`](design-system/DESIGN.md)).
- **v1.1 (penyempurnaan)**
  - Tuntaskan migrasi i18n untuk isi panel Admin, School, dan sisa tab Member (saat ini masih teks Indonesia hardcode di sebagian tempat).
  - Sinkronkan penuh `src/db/schema.ts` terhadap `schema.sql` agar `drizzle-kit` dapat dipakai dengan aman di masa depan (opsional, bukan prasyarat migrasi berjalan).
  - Perkuat cakupan pengujian E2E Playwright untuk peran `staff` dan `school` (saat ini proyek `flow-*` di `package.json` baru mencakup owner/admin/coach/member).
- **v2 (kandidat, belum disepakati/TBD)**
  - Integrasi *payment gateway* untuk verifikasi pembayaran otomatis, menggantikan alur konfirmasi manual WhatsApp.
  - Fitur berbantuan AI (opsional) — misalnya draf narasi catatan rapor dari skor rubrik; **harus** melalui pembaruan §5 (Tool Requirements & Evaluation Strategy) sebelum implementasi.
  - Aplikasi mobile native atau PWA yang lebih dalam untuk peran Coach/Member.

---

## 8. Daftar Periksa Sebelum Mengembangkan Fitur Baru (untuk AI agent)

- [ ] Sudah membaca berkas `docs/features/*-panel.md` yang relevan dengan peran yang disentuh?
- [ ] Perubahan UI mematuhi 10 aturan wajib di [`docs/design-system/README.md`](design-system/README.md)?
- [ ] Perubahan skema database diterapkan langsung (skrip `postgres`), bukan diminta ke pengguna, dan bukan `drizzle-kit push`?
- [ ] Batas peran (RLS + cakupan `branch_id`) tidak dilonggarkan tanpa alasan eksplisit?
- [ ] String UI baru didaftarkan di `src/i18n/locales/{en,id}/*.ts`, bukan teks hardcode?
- [ ] `tsc` bersih dan `eslint` tidak menambah peringatan baru dibanding baseline sebelum perubahan?
