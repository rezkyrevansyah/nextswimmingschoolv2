# Inventaris layar

**Produk:** Next Swimming School  
**Tanggal:** 16 September 2026  
**Aturan:** `id` tab di kolom ini = `useState` di kode = nama frame Pen.

Sumber menu: `docs/04-panel/`. Jangan menambah baris tanpa addendum panel.

Kode layar: `PERAN-nomor`. Sub-tab memakai huruf (`OWN-13B`).

State wajib: [STATES.md](./STATES.md).

---

## Publik

| Kode | Path | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|
| PUB-01 | `/` | `public/landing` | CMS kosong vs terisi | PRD F-KMN-03; Owner Landing |
| PUB-02 | `/register` | `public/register` | kosong, terkirim tertunda, validasi | US-01; `03-alur/02-siswa.md` |
| PUB-03 | login (jika ada di kode) | `public/login` | salah kredensial, akun belum disetujui | US-01 |

Landing boleh `water-bg` / `caustics`. Panel jangan meniru.

---

## Owner — `/owner` — `src/app/owner/`

| Kode | Menu | `id` tab | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|---|
| OWN-00 | Cangkang | — | `owner/shell` | Bell honor, tanpa search, preview Admin | `04-panel/01-owner.md` Cangkang |
| OWN-01 | Dashboard | `dashboard` | `owner/dashboard` | kosong jaringan vs ada pusat | panel §1 |
| OWN-02 | Centers | `branches` | `owner/centers` | daftar, form baru, hapus konfirmasi | `03-alur/01-jaringan.md` |
| OWN-03 | Master Data | `master` | `owner/master` | kategori keuangan, TTD Head | panel §3 |
| OWN-04 | Account Master Data | `accounts` | `owner/accounts` | daftar, form (tanpa create Owner; tanpa tipe private) | `03-alur/01-jaringan.md` |
| OWN-05 | Schools | `schools` | `owner/schools` | logo/TTD kosong | panel §5 |
| OWN-06 | Report Levels | `levels` | `owner/levels` | rubrik kosong | `03-alur/05-rapor-sekolah.md` |
| OWN-07 | Classes | `classes` | `owner/classes` | tanpa paket sesi; tanpa privat | panel §7 |
| OWN-08 | Private Students | `studentPrivate` | `owner/private-students` | form paket (harga+sesi), bukan tarif/pertemuan | FB-01…04; `03-alur/02-siswa.md` |
| OWN-09 | Coach Rates | `rates` | `owner/rates` | kelas tanpa tarif (tidak bisa diklaim) | US-08 |
| OWN-10 | Competitions | `competitions` | `owner/competitions` | tab Awards bawaan; kosong | panel §10 |
| OWN-10A | Awards | `competitions` | `owner/competitions` | pemilih siswa; saring cabang hanya Owner | panel §10A |
| OWN-10B | Competitions | `competitions` | `owner/competitions-events` | daftar lomba; saring level | panel §10B |
| OWN-10C | Riwayat prestasi | — | `owner/competitions-history` | belum ada prestasi; gandakan | panel §10A |
| OWN-10D | Form hasil peserta | — | `owner/competitions-result` | dari Awards (pemilih lomba tampil) vs dari Competitions (disembunyikan) | panel §10C |
| OWN-11 | Leave Requests | `izin` | `owner/leave` | lintas pusat; sudah diputuskan Admin (tidak bisa diulang) | `03-alur/03` bab 4; panel §11 |
| OWN-12 | Attendance | `absensi` | `owner/attendance` | saring kejadian nyata, bukan konfigurasi kini | FB-06 |
| OWN-12A | Coach | `absensi` | `owner/attendance` | jarak berwarna tapi tidak menolak; baris manual | FB-06; panel §11A |
| OWN-12B | Student | `absensi` | `owner/attendance-student` | hanya baca; sakit/izin dari Leave Requests | FB-05; panel §11B |
| OWN-12C | Staff | `absensi` | `owner/attendance-staff` | tanpa GPS; swafoto tersimpan | FB-07; panel §11C |
| OWN-13 | Payslips | `invoices` | `owner/payslips` | lihat sub-tab | `03-alur/03` bab 6–7 |
| OWN-13A | — Invoice/Slip | `invoices` | `owner/payslips-list` | pending, approved, draf, published | US-08/09 |
| OWN-13B | Periods | — | `owner/payslips-periods` | tidak ada periode terbuka | panel §12B |
| OWN-13C | Loans | — | `owner/payslips-loans` | active / paid_off / written_off / cancelled | panel §12C |
| OWN-14 | Financial | `financial` | `owner/financial` | lima sub-tab; saring dulu | FB-11; `03-alur/04-uang.md` |
| OWN-14A | Overview | — | `owner/financial-overview` | kosong | |
| OWN-14B | Income | — | `owner/financial-income` | status bills | |
| OWN-14C | Expenses | — | `owner/financial-expenses` | reimburse pending | |
| OWN-14D | Payroll | — | `owner/financial-payroll` | siap transfer vs dibayar | |
| OWN-14E | Money flow | — | `owner/financial-flow` | rekap bulan | |
| OWN-15 | Landing | `landing` | `owner/landing` | tiap blok CMS | F-KMN-03 |
| OWN-16 | System Storage | `storage` | `owner/storage` | hapus merusak + konfirmasi | FB-14 |
| OWN-17 | Activity Log | `activity` | `owner/activity` | kosong | panel §16 |

Kasbon **bukan** frame sidebar.

---

## Admin / Manager Center — `/admin` — `src/app/admin/`

Satu set frame. Bedakan MC dengan anotasi `MC only` / `Admin if switch`.

| Kode | Menu | `id` tab | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|---|
| ADM-00 | Cangkang | — | `admin/shell` | lencana Approvals; spanduk preview Owner | `04-panel/02-admin.md` |
| ADM-01 | Dashboard | `dashboard` | `admin/dashboard` | antrian daftar/izin/tagihan | panel |
| ADM-02 | School Panel | `school` | `admin/schools` | sebelum siswa afiliasi | `03-alur/01` + `02` |
| ADM-03 | Coach | `coaches` | `admin/coaches` | sertifikat tertunda | panel |
| ADM-04 | Class | `classes` | `admin/classes` | `class_packages` hanya di sini | F-KLS-02 |
| ADM-05 | Class Activity | `activity` | `admin/class-activity` | libur, kalender pengganti | US-05 |
| ADM-06 | Student | `students` | `admin/students` | reguler + afiliasi; jenjang wajib afiliasi | FB-08 |
| ADM-07 | Approvals | `approve` | `admin/approvals` | registrations + certifications; tanpa izin | US-01 |
| ADM-08 | Private Students | `studentPrivate` | `admin/private-students` | sama konsep Owner privat | FB-01 |
| ADM-09 | Announcements | `announce` | `admin/announcements` | sasaran peran | F-KMN-01 |
| ADM-10 | Leave Requests | `izin` | `admin/leave` | pelatih / siswa / staf tanggal nanti | `03-alur/03` |
| ADM-11 | Attendance | `absensi` | `admin/attendance` | rekap + manual; bukan honor | FB-05/06 |
| ADM-12 | Payments | `pay` | `admin/payments` | Admin: sakelar pusat; MC: selalu. Generate, lunas, bukti Admin | US-07; KPI-03 |
| ADM-13 | Report Cards | `rapor` | `admin/rapor` | buka/tutup periode; unduh | KPI-04 |
| ADM-14 | Competitions | `competitions` | `admin/competitions` | kosong | panel |
| ADM-15 | Financial | `financial` | `admin/financial` | **hanya MC**; Admin biasa = forbidden | FB-12 |
| ADM-16 | Settings | `settings` | `admin/settings` | identitas pusat; bukan sakelar Payments / rekening siswa | `03-alur/01` |

---

## Coach — `/coach` — `src/app/coach/page.tsx`

| Kode | Menu | `id` tab | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|---|
| COA-00 | Cangkang | — | `coach/shell` | pemilih cabang; overlay izin | `04-panel/03-coach.md` |
| COA-01 | Home | `home` | `coach/home` | libur / izin / clock-in / covering | US-03/05 |
| COA-02 | Attendance | `absen` | `coach/attendance` | jendela mati; setelah clock-in → QR | US-03/04 |
| COA-02A | Overlay clock-in | — | `coach/clock-in` | GPS warna; swafoto opsional; ditolak | KPI-05 |
| COA-02B | Pindai QR | — | `coach/scan` | siswa suspend ditolak; privat −1 | US-04 |
| COA-03 | Class | `kelas` | `coach/class` | tautan spreadsheet | panel |
| COA-04 | Report Card | `rapor` | `coach/rapor` | periode tutup; kunci entri | US-10 |
| COA-05 | Honor | `honor` | `coach/honor` | payung Invoice → Payslip | US-08 |
| COA-05A | Invoice | — | `coach/honor-invoice` | periode tutup; tanpa tarif | |
| COA-05B | Payslip | — | `coach/honor-payslip` | hanya `published` | |
| COA-06 | Profile | `profile` | `coach/profile` | belum lengkap (kunci tab) | PRD 2.5 |
| COA-07 | Overlay izin | — | `coach/leave` | pengganti wajib per kelas | US-05 |

Ponsel: Home, Attendance, Class, Report Card, **Menu** (Honor, Profile).

---

## Staff — `/staff` — `src/app/staff/page.tsx`

| Kode | Menu | `id` tab | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|---|
| STF-00 | Gerbang profil | — | `staff/profile-gate` | `is_profile_complete = false` | US-09 |
| STF-01 | Home | `home` | `staff/home` | clock-in; sakit/izin hari ini | panel |
| STF-02 | Daily Attendance | `absen` | `staff/attendance` | riwayat; swafoto tersimpan | FB-07 |
| STF-03 | Honor | `honor` | `staff/honor` | Invoice → Reimburse → Payslip | US-09 |
| STF-03A | Invoice | — | `staff/honor-invoice` | periode tutup; nominal ketik | |
| STF-03B | Reimburse | — | `staff/honor-reimburse` | nota `RB-…` | |
| STF-03C | Payslip | — | `staff/honor-payslip` | `published` + `staff_salaries` | |
| STF-04 | Profile | `profile` | `staff/profile` | rekening | panel |

Ponsel: Home, Absen, Honor, Profile. Tidak ada GPS. Tidak ada QR siswa.

---

## Student — `/student` — `src/app/student/page.tsx`

Gambar **tiga varian** tipe jika layout beda: `reguler` / `private` / `school_affiliate`.

| Kode | Menu | `id` tab | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|---|
| STU-00 | Gerbang foto | — | `student/photo-gate` | profil belum lengkap **dan** tanpa avatar | US-02 |
| STU-01 | Home | `home` | `student/home` | suspend banner; afiliasi tanpa kartu unpaid | panel |
| STU-02 | Schedule | `schedule` | `student/schedule` | privat lentur vs reguler | `03-alur/02-siswa.md` |
| STU-03 | Attendance | `absen` | `student/attendance` | hanya baca; lencana izin | US-04/06 |
| STU-04 | Leave | `leave` | `student/leave` | form tipe izin/sakit/ujian/lainnya | US-06 |
| STU-05 | Bills | `bills` | `student/bills` | rekening + WA; **tanpa** unggah bukti; **sembunyi afiliasi** | US-07 |
| STU-06 | Report Card | `rapor` | `student/rapor` | belum dikunci; ulasan saat periode buka | US-10 |
| STU-07 | Profile | `profile` | `student/profile` | QR untuk dipindai pelatih; ganti sandi min 6 | panel |

Ponsel: Home, Schedule, Attendance, Report Card, **Menu** (Leave, Bills jika bukan afiliasi, Profile).

Tidak ada pemindai. Tidak ada WA laporkan kutu (FB-13).

---

## School — `/school` — `src/app/school/page.tsx`

| Kode | Menu | `id` tab | Frame Pen | State wajib | Acuan |
|---|---|---|---|---|---|
| SCH-00 | Cangkang | — | `school/shell` | data sekolah tidak ditemukan | US-11 |
| SCH-01 | Student Report Cards | `rapor` | `school/rapor` | unduh satu + ZIP; hanya terkunci | FB-09 |
| SCH-02 | Student Attendance | `absensi` | `school/attendance` | Excel 1 baris 1 murid; ikut saringan | FB-10 |

Tidak ada tab pengumuman, tagihan, ubah siswa, atau operasi kolam.

---

## Urutan gambar di Pen (disarankan)

1. Shells (`docs/07-ui/SHELLS.md`) + token.
2. Publik + gerbang (PUB, STU-00, STF-00).
3. Enam alur KPI-01 (`docs/08-qa/KPI-01.md`) end-to-end.
4. Sisa tab Owner/Admin.
---
