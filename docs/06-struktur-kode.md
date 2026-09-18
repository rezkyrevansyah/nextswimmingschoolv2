# Struktur kode panel — pecah god file

**Produk:** Next Swimming School  
**Kode dokumen:** STR-NSS-001  
**Versi:** 1.0  
**Status:** Rencana kerja (belum dieksekusi di `src/`)  
**Tanggal:** 17 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI  
**Pembaca:** manusia (rekayasa) dan agen AI

Dokumen ini adalah **kontrak struktur berkas**, bukan niat produk. Menu layar tetap `docs/04-panel/`. Alur bisnis tetap `docs/03-alur/`. Kesalahan lama tetap `docs/02-umpan-balik.md`.

Nomor `06` mengikuti urutan baca di `docs/README.md` (01 niat → 05 desain → **06 struktur berkas**). Isi di sini tidak boleh dipakai sebagai alasan mengubah rumus uang, absensi, wewenang, atau rute.

---

## 0. Cara memakai

1. Baca **bab 1–3** sebelum menambah layar atau memindahkan berkas.
2. Bab 4–7 adalah peta kerja. Kerjakan per gelombang; jangan satu diff untuk seluruh repo.
3. Selama status masih “rencana kerja”, kode produksi **belum** wajib mengikuti pohon folder target. Setelah gelombang 1 (Owner shell) selesai, salin aturan ukuran berkas di bab 10 ke `AGENTS.md` / `Claude.md`.
4. Hierarki jika bertentangan: PRD → umpan balik → alur → panel → **perilaku kode saat ini**. Pecah berkas tidak boleh mengubah perilaku.

---

## 1. Masalah yang dikunci

Berkas ribuan baris tidak efektif untuk manusia **atau** agen AI.

| Gejala | Dampak |
|---|---|
| Satu `page.tsx` 5.000+ baris | Agen tidak muat seluruh berkas di context; suntingan menembak fungsi yang salah |
| Banyak layar dalam satu modul | Review diff berisik; regresi mudah lolos |
| Nama berkas = peran, bukan layar | Pencarian tidak menuntun ke menu yang sedang dikerjakan |
| Fitur baru ditambah di bawah | God file makin gemuk (utang berbunga) |

Ini **bukan** alasan memecah aplikasi menjadi layanan kecil, mengganti tab menjadi rute Next.js, atau menulis ulang logika bisnis.

### 1.1 Baseline (17 September 2026)

Diukur dari `src/` tanpa `src/app/api/`. Hitungan = baris non-kosong (bukan baris fisik).

| Metrik | Nilai |
|---|---|
| Berkas `.ts` / `.tsx` | ~151 |
| Total baris | ~53.700 |
| Berkas ≥ 400 baris | 34 |
| Berkas ≥ 500 baris | 27 |
| Berkas ≥ 1.000 baris | 16 |

Enam terburuk:

| Baris | Berkas |
|---|---|
| 5.625 | `src/app/owner/page.tsx` |
| 4.318 | `src/app/coach/page.tsx` |
| 2.428 | `src/app/owner/payroll/PayslipGenerator.tsx` |
| 2.014 | `src/app/student/page.tsx` |
| 1.932 | `src/app/admin/_components/AdminStudent.tsx` |
| 1.647 | `src/app/owner/_components/OwnerClassesMaster.tsx` |

---

## 2. Nama konsep

Yang dimaksud “dipisah-pisah supaya bersih dan gampang dicari”:

| Istilah | Pakai untuk |
|---|---|
| **God file / god object** | Anti-pola sekarang: satu berkas memegang banyak layar, query, dan modal |
| **Decomposition** | Memecah unit besar menjadi unit kecil berbatas jelas |
| **Single Responsibility Principle (SRP)** | Satu berkas = satu alasan berubah |
| **Separation of Concerns** | UI layar, pengambilan data, dan aturan bisnis tidak wajib hidup di file yang sama |
| **Modular monolith** | Tetap satu aplikasi Next.js, satu satuan deploy; tiap panel/layar jadi modul |
| **Feature colocation** | Berkas yang berubah bersama diletakkan bersama (folder layar), bukan dipecah `hooks/` lawan `components/` secara global |
| **Extract module** | Teknik: pindahkan fungsi `OwnerFinancial` ke foldernya tanpa mengubah perilaku |

Arsitektur yang dipilih: **modular monolith** dengan **screen-folder extraction**.

Bukan Clean Architecture penuh. Bukan Feature-Sliced Design penuh. Bukan microservices.

---

## 3. Keputusan terkunci

| Topik | Keputusan |
|---|---|
| Pola acuan | `src/app/admin/page.tsx` (sekitar 321 baris) + `src/app/admin/_components/AdminXxx.tsx` |
| Navigasi | Tab `useState` di dalam **satu** `page` per peran. **Dilarang** membuat `/owner/financial` dan sejenisnya |
| Perilaku | Gelombang pecah = potong-tempel + impor. Dilarang merapikan rumus, mengganti query, atau “sekaligus perbaikan bug”, kecuali berkas tidak compile |
| Ukuran lunak | ≤ 400 baris per berkas sumber (`.ts` / `.tsx` tulisan tangan) |
| Ukuran keras | ≤ 500 baris. Jika akan melebihi, pecah dulu sebelum menambah fitur |
| Pengecualian | Kamus i18n, `supabase/schema.sql`, berkas hasil generate |
| Colocation | Tipe privat, hook, dan modal milik satu layar tinggal di folder layar itu |
| Shared | Pindah ke `src/lib/` atau `src/components/` hanya jika dipakai ≥ 2 peran |
| i18n | Jangan dipecah dalam pekerjaan ini |
| Produk FB-01…FB-14 | Jangan dicampur. Audit alur ≠ pecah berkas |
| Verifikasi | Setelah tiap layar pindah: buka tab itu di peramban, jalankan alur utama. Bukan cuplikan layar diam |

### 3.1 Pendekatan yang ditolak

| Pendekatan | Alasan ditolak sekarang |
|---|---|
| Feature-Sliced Design penuh (`src/features/billing` untuk semua peran) | Benar jangka panjang; terlalu besar untuk gelombang pertama. Boleh sebagian di gelombang 4 (dedup tipe `Branch`) |
| Rute App Router per tab | Bertentangan dengan `docs/04-panel/README.md` dan `Claude.md` (tab tanpa muat ulang) |
| Rewrite besar satu PR | 16 berkas ≥ 1.000 baris tidak bisa di-review |

---

## 4. Pohon target (satu peran)

Contoh Owner setelah gelombang 1–2. Nama berkas mengikuti id tab di `buildNavItems`.

```
src/app/owner/
  page.tsx                      # shell: auth, nav, switch tab. Target ≤ 400 baris
  _types.ts                     # tipe panel yang dipakai ≥ 2 layar Owner
  _utils.ts                     # helper kecil panel (bukan domain)
  _components/
    OwnerDashboard.tsx
    OwnerBranches.tsx
    OwnerRaporLevels/
      index.tsx
    OwnerTarif.tsx
    OwnerInvoices/
      index.tsx
    OwnerFinancial/
      index.tsx                 # layar + tab internal overview/income/expenses/payroll/moneyflow
      CategoryManagerModal.tsx
      useOwnerFinancial.ts      # fetch + mutasi, jika index masih > 500
    OwnerActivityLog.tsx
    OwnerStorage.tsx
    LandingCMS.tsx              # sudah ada; pecah lagi jika masih ≥ 1.000
    OwnerSchools.tsx
    OwnerMasterData.tsx
    OwnerAccountsMaster.tsx
    OwnerAccountDetail.tsx
    OwnerStudentPrivate.tsx
    OwnerStaffPresensi.tsx
    OwnerClassesMaster.tsx
  payroll/
    PayslipGenerator/           # sekarang 1 berkas ~2.400 baris
      index.tsx
    CoachLoans.tsx
```

Admin sudah mendekati bentuk ini di **tingkat 1** (`page.tsx` tipis + satu berkas per menu). **Tingkat 2** (folder per layar gemuk) belum: `AdminStudent.tsx` masih sekitar 1.932 baris.

Coach, Student (`student`), Staff, dan School meniru pola yang sama: `page.tsx` = `Shell` + `switch (active)`; tiap tab = `_components/CoachRapor/` dan seterusnya.

Landing publik `(public)/_components/` sudah per section. Jangan diubah oleh pekerjaan ini.

---

## 5. Inventaris god file

Nomor baris fungsi = posisi fisik di berkas pada 17 September 2026. Bisa bergeser; cari **nama fungsi**, jangan mengandalkan nomor saja.

### 5.1 Owner — `src/app/owner/page.tsx` (~5.625 baris non-kosong)

Masih di dalam `page.tsx` (harus keluar pada gelombang 1):

| Fungsi | Sekitar baris | Tujuan |
|---|---|---|
| `Dashboard` | 158 | `_components/OwnerDashboard.tsx` |
| `Branches` | 358 | `_components/OwnerBranches.tsx` |
| `Classes` | 758 | Bungkus tipis; isi master sudah di `OwnerClassesMaster.tsx` |
| `OwnerRaporLevels` | 796 | `_components/OwnerRaporLevels/` (sudah ~900 baris → folder) |
| `SettingsTarif` | 1738 | `_components/OwnerTarif.tsx` |
| `Invoices` | 2064 | `_components/OwnerInvoices/` |
| `OwnerFinancial` | 2489 | `_components/OwnerFinancial/` (~2.500 baris; **wajib folder**) |
| `CategoryManagerModal` | 5048 | Colocate di `OwnerFinancial/` |
| `OwnerActivityLog` | 5162 | `_components/OwnerActivityLog.tsx` |
| `OwnerStorage` | 5529 | `_components/OwnerStorage.tsx` |
| `buildNavItems` + `OwnerPage` | 6056 | Tetap di `page.tsx` |

Sudah berkas sendiri tetapi masih gemuk (gelombang 3, kecuali Payslip didahulukan di gelombang 1):

| Baris | Berkas |
|---|---|
| ~2.428 | `payroll/PayslipGenerator.tsx` |
| ~1.647 | `_components/OwnerClassesMaster.tsx` |
| ~1.155 | `_components/LandingCMS.tsx` |
| ~1.022 | `_components/OwnerAccountDetail.tsx` |
| ~928 | `_components/OwnerAccountsMaster.tsx` |

Tab Owner yang **sudah** di `_components/` atau `payroll/`: master, accounts, schools, studentPrivate, staffPresensi, landing, loans, competitions (memakai ulang `AdminCompetition`).

### 5.2 Coach — `src/app/coach/page.tsx` (~4.318)

| Fungsi | Sekitar baris | Tujuan |
|---|---|---|
| `Shell` | 195 | `_components/CoachShell.tsx` |
| `ClockInFlow` | 367 | `_components/ClockInFlow.tsx` (overlay Home/Absensi) |
| `LeaveHistory` / `LeaveForm` | 615 / 698 | `_components/CoachLeave/` |
| `QRScanner` | 856 | `_components/QRScanner.tsx` |
| `CoachHome` | 1054 | `_components/CoachHome.tsx` |
| `CoachAbsensi` | 1453 | `_components/CoachAbsensi/` |
| `SpreadsheetModal` | 2023 | Colocate Kelas |
| `ReimburseModal` | 2079 | Colocate Invoice |
| `StudentDetailModal` | 2128 | Colocate Kelas |
| `CoachKelas` | 2172 | `_components/CoachKelas.tsx` |
| `CoachInvoice` | 2388 | `_components/CoachInvoice/` |
| `CoachRapor` | 2859 | `_components/CoachRapor/` (paling gemuk di panel ini) |
| `CoachMyReviews` | 3680 | Colocate Rapor atau berkas sendiri |
| `CoachProfile` | 3750 | `_components/CoachProfile.tsx` |
| `CoachPayslip` | 4198 | `_components/CoachPayslip.tsx` |

### 5.3 Peran lain (gelombang 2)

| Baris | Berkas | Pecah menjadi |
|---|---|---|
| ~2.014 | `src/app/student/page.tsx` | `Shell` + `StudentHome` `StudentSchedule` `StudentAbsensi` `StudentBills` `StudentLeave` `StudentRapor` `StudentProfile` `ProfileGate` |
| ~1.635 | `src/app/staff/page.tsx` | `StaffProfileGate` `StaffClockInFlow` `StaffInvoice` + sisa tab |
| ~1.337 | `src/app/school/page.tsx` | `SchoolAbsensi` + tab rapor/ekspor |

### 5.4 Layar sudah diekstrak tetapi masih god screen (gelombang 3)

`AdminStudent` (~1.932), `AdminCompetition` (~1.522), `AdminCoach` (~1.258), `AdminStudentPrivate` (~1.205), plus Owner gemuk di 5.1.

Pola tingkat 2: `index.tsx` (daftar) + `*FormModal.tsx` + `use*.ts` jika fetch/mutasi mendominasi ukuran berkas.

### 5.5 Jangan dipecah dalam pekerjaan ini

- `src/i18n/locales/**` — kamus, bukan logika
- `src/app/api/**` — sudah satu rute per folder
- `src/components/ui/**` — mayoritas sudah kecil
- Landing `src/app/(public)/_components/` — sudah per section

---

## 6. Resep ekstraksi (wajib diikuti agen)

Satu layar = satu siklus. Jangan menggabungkan delapan tab dalam satu commit tanpa titik periksa.

1. **Salin fungsi** ke berkas baru. Tambah `"use client"` jika berkas itu merender UI.
2. **Ekspor** nama yang sama (`export function OwnerFinancial ...`).
3. **Impor** dari `page.tsx`. Hapus fungsi lama dari `page.tsx`.
4. Pindahkan **tipe yang hanya dipakai fungsi itu** ke berkas atau folder tujuan. Tipe dipakai banyak layar Owner → `_types.ts`.
5. Jangan ganti properti, query Supabase, atau kunci `t("...")`.
6. Pastikan TypeScript bersih untuk berkas yang disentuh.
7. **Peramban:** masuk sebagai peran itu → buka tab → buka modal, saring, atau simpan yang ada di layar itu.
8. Commit per layar atau per shell panel, pesan: `refactor(owner): extract OwnerFinancial from page`.

Jika `page.tsx` masih mengimpor ikon atau util yang hanya dipakai layar yang sudah pindah, bersihkan impor pada langkah yang sama. Itu bagian mekanis, bukan rewrite.

---

## 7. Gelombang kerja

### Gelombang 0 — dokumen ini

Selesai ketika berkas ini ada di `docs/06-struktur-kode.md`. Tidak ada perubahan `src/`.

### Gelombang 1 — Owner shell

Keluarkan semua fungsi di tabel 5.1 dari `page.tsx`. Target: `owner/page.tsx` ≤ 400 baris, setara Admin.

Lalu pecah `OwnerFinancial/` dan `PayslipGenerator` sampai tiap berkas ≤ 500 baris. Dua unit ini paling menolong agen.

**Selesai jika:** semua menu Owner bisa dibuka; Financial (semua sub-tab) dan Payslip masih menghitung dan menyimpan seperti semula.

### Gelombang 2 — Coach, Student, Staff, School

Shell + satu folder atau berkas per tab, resep bab 6. `CoachRapor` dan `StudentRapor` didahulukan di dalam gelombang ini karena paling gemuk.

**Selesai jika:** tidak ada `src/app/<peran>/page.tsx` ≥ 500 baris.

### Gelombang 3 — god screen sisa

`AdminStudent`, `AdminCompetition`, `AdminCoach`, `AdminStudentPrivate`, `OwnerClassesMaster`, `LandingCMS`, `OwnerAccountDetail`.

**Selesai jika:** tidak ada komponen layar ≥ 500 baris tanpa pecahan folder.

### Gelombang 4 — opsional, setelah 1–3

- Satukan antarmuka `Branch` / `ClassRow` yang sekarang disalin di Owner, Admin `_types.ts`, Payslip, Schools, Staff, dan lainnya
- Hook data bersama hanya untuk query yang benar-benar identik
- Salin aturan ukuran berkas ke `AGENTS.md`

---

## 8. Definisi selesai (seluruh program)

- Tidak ada `page.tsx` panel ≥ 500 baris
- Tidak ada komponen layar ≥ 500 baris tanpa folder pecahan
- Tab, auth, dan hasil query sama seperti sebelum pecah (uji asap per peran di peramban)
- Agen bisa menavigasi `src/app/<peran>/_components/<Screen>/` dari nama menu di `docs/04-panel/`
- Aturan ≤ 400 / ≤ 500 tertulis di `AGENTS.md`

---

## 9. Yang tidak termasuk

- Audit alur produk FB-01…FB-14
- Ganti tab menjadi App Router
- Pecah kamus i18n
- Microservices, hexagonal, atau Clean Architecture
- `drizzle-kit push`
- Tes ujung-ke-ujung otomatis sebagai syarat gelombang 1–2 (belum ada rangkaian yang cukup; verifikasi = peramban)

---

## 10. Aturan untuk `AGENTS.md` (salin setelah gelombang 1)

Teks Inggris agar selaras dengan `AGENTS.md` yang ada:

```
Panel pages stay as internal useState tabs (no App Router per menu).
New UI for a screen that would push a file past ~400 lines must go in a
colocated file under that role's `_components/<Screen>/`, not appended
to page.tsx. Hard ceiling 500 lines except i18n dictionaries and generated
files. Extraction is behavior-preserving: no business-logic rewrites in
the same change.
```
