# Stack dan konvensi folder

**Produk:** Next Swimming School  
**Status:** Acuan kerja agen  
**Tanggal:** 16 September 2026

Sumber: `docs/01-prd.md` bab 4. Hierarki kebenaran: `docs/README.md`.

---

## 1. Yang terkunci di dokumen

| Lapis | Keputusan |
|---|---|
| Versi paket | Rilis **stabil terbaru** saat proyek dibuat atau dependensi ditambah. Bukan canary, bukan beta |
| UI framework | Next.js App Router (stabil terbaru) plus TypeScript |
| React | Versi yang dibawa `create-next-app` terbaru |
| Styling | Tailwind CSS v4, token di `src/app/globals.css` (`@theme inline`) |
| Konfigurasi Tailwind | **Tidak ada** `tailwind.config.ts` |
| Font | Plus Jakarta Sans (`font-display`), Inter (`font-sans`), JetBrains Mono (`font-mono`, panel saja) |
| Komponen | `src/components/ui/`: `<Btn>`, `<Status>`, `<Card>`, `Field`, `Modal`, `Icon` |
| Navigasi panel | Tab `useState` di dalam **satu** `page` per peran, bukan rute per menu |
| Bahasa UI | Inggris di kode; ID = widget Google Translate (`docs/06-teknis/I18N.md`) |
| Peta / GPS | Pin `branches` atau pin kelas; geolokasi peramban pelatih; bukan pagar geografis |
| WhatsApp | `wa.me` + nomor Admin pusat; bukan WhatsApp Business API |
| AI in-app | Tidak ada |
| Auth, Postgres, storage | Supabase |
| Query dan migrasi | Drizzle ORM plus `drizzle-kit`. Agen jalankan dari terminal |
| Env | `.env.example` di akar repo |

## 2. Yang belum dikunci (jangan diisi agen)

| Kode PRD | Topik |
|---|---|
| TBD-03 | Sudah dikunci: Supabase plus Drizzle. Jangan ganti vendor. |
| TBD-02 | Anggaran infrastruktur dan tenggat rilis |
| TBD-05 | Ambang latensi API |
| TBD-04 | Dasar hukum retensi / privasi |
| TBD-06 | Gerbang bayar versi mendatang. Ditolak sekarang |

Jangan menukar Drizzle dengan Prisma. Jangan mengarang Firebase atau Auth.js. Rincian koneksi dan perintah migrasi: `CLAUDE.md` bagian 6.

Saat scaffolding atau `npm install` paket stack (Next, React, Tailwind, Drizzle, drizzle-kit, postgres, klien Supabase): pasang rilis stabil terbaru dari npm. Jangan mengunci versi lama "karena tutorial". Jangan Pages Router. Nomor patch tidak ditulis di dokumen ini supaya tidak usang; yang mengikat adalah kebijakan latest stable plus keluarga yang sudah dipilih (App Router, Tailwind v4, Drizzle).

---

## 3. Peta rute

```
Publik
  /                  landing (CMS Owner)
  /register          pendaftaran calon siswa
  /login             (jika ada di kode; jangan gandakan)

Sesi + profiles.role
  /owner             owner, semua branch_id
  /admin             admin | manager_center, satu branch_id
  /coach             coach, class_coaches + coach_branches
  /staff             staff, satu branch_id
  /student            Student (peran student)
  /school            school, schools.profile_id
```

Owner masuk pertama: `POST /api/owner/init-profile`.

Pratinjau Admin dari Owner: `sessionStorage.ownerPreviewBranch`, lalu `/admin`. Bukan cookie. Tidak menaikkan wewenang akun Admin.

Query `?tab=` boleh untuk deep-link, tetapi wewenang tetap di peladen. `/admin?tab=financial` sebagai Admin biasa harus ditolak.

---

## 4. Folder yang diharapkan

Sesuaikan jika kode sudah berbeda; jangan membuat pohon paralel.

```
src/app/
  layout.tsx                 font display + sans; widget terjemahan
  globals.css                @theme inline (ocean, wave, ink, paper, line, semantik)
  page.tsx                   landing
  register/                  US-01
  owner/page.tsx             cangkang saja (tab state)
  owner/tabs/<id>/           satu folder per menu Owner
  admin/page.tsx             cangkang Admin / Manager Center
  admin/tabs/<id>/
  coach/page.tsx             cangkang
  coach/tabs/<id>/
  staff/page.tsx
  staff/tabs/<id>/
  student/page.tsx
  student/tabs/<id>/
  school/page.tsx
  school/tabs/<id>/
  api/                       rute di docs/06-teknis/API.md
src/components/ui/           Btn, Status, Card, Field, Modal, Icon, …
src/lib/fonts.ts             JetBrains Mono hanya layout panel
src/i18n/                    jika ada: hanya en sebagai sumber, bukan kamus id
src/lib/db.ts                klien Drizzle (postgres.js, prepare: false)
drizzle/schema.ts            schema Postgres
drizzle.config.ts            drizzle-kit
.env.example                 kunci publik plus DATABASE_URL kosong
```

Alias impor: `@/` → `src/`.

`page.tsx` tidak boleh menampung seluruh panel. Satu tab satu modul. Batas ~300 baris per file. Rincian: `CLAUDE.md` bagian "File kecil, kode modular".

---

## 5. Konvensi kode UI

1. Jangan interpolasi class Tailwind.
2. Jangan `bg-blue-`, `bg-slate-`, `bg-gray-` untuk merek (pengecualian token `archive`).
3. Tombol aksi: `<Btn>`. Status: `<Status kind>`.
4. Formulir: bungkus `<Field label>`.
5. Umpan: `useToast()`, `useConfirm()`.
6. Modal: portal `z-[90]`, overlay `bg-ink/50`.
7. Sentuhan: aksi `md`/`lg` `min-h-[44px]`; input 16 px di lebar ≤640 px.
8. `prefers-reduced-motion` sudah di `globals.css`; jangan `@keyframes` baru tanpa cabang itu.
9. Jangan memuat JetBrains Mono di landing/login.

---

## 6. Isolasi data

KPI-02: peran selain Owner (dan pelatih yang ditautkan ke pusat itu) tidak membaca `branch_id` lain.

Pelatih: daftar siswa kelas lewat API pelatih jika RLS menolak kueri langsung (`/api/coach/class-students`, `/api/coach/attendance-detail`).

Manager Center ≠ Owner meskipun URL `/admin` sama.

---

## 7. Skrip yang diharapkan

Minimal setelah repo hidup: `dev`, `build`, `lint`, plus skrip Drizzle (`db:generate`, `db:migrate` atau setara).

Perubahan tabel: edit schema Drizzle, lalu agen menjalankan `drizzle-kit generate` / `migrate` / `push` di terminal. Bukan SQL Editor dashboard.

Jangan menambah layanan AI, antrian, atau paket i18n routing tanpa addendum PRD.
---
