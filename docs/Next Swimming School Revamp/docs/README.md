# Dokumentasi Next Swimming School

**Mulai di sini.** Agen AI dan manusia membaca folder ini dari atas ke bawah menurut nomor. Jangan mulai dari berkas panel.

Bahasa dokumen: Indonesia PUEBI. String antarmuka di kode: Inggris. Tampilan Indonesia: injeksi Google Translate (lihat `docs/01-prd.md` bab 4.6).

---

## Urutan baca

| Urutan | Berkas / folder | Baca jika |
|---|---|---|
| 0 | **Berkas ini** | Selalu. Peta + glosarium + jangan tertukar |
| 1 | [01-prd.md](./01-prd.md) | Niat produk, KPI, cerita pengguna, yang sengaja tidak dibangun, bahasa UI |
| 2 | [02-umpan-balik.md](./02-umpan-balik.md) | Kesalahan lama yang tidak boleh diulang (FB-01…FB-14) |
| 3 | [03-alur/](./03-alur/) | Mesin lintas peran (jaringan → siswa → absensi/izin/honor → uang → rapor) |
| 4 | [04-panel/](./04-panel/) | Menu dan wewenang **satu** layar, setelah alur terkait sudah dibaca |
| 5 | [05-desain/](./05-desain/) | Token visual, **sebelum** menulis CSS/JSX |
| 6 | [06-teknis/](./06-teknis/) | Stack, skema konsep, API, i18n — sebelum scaffolding repo |
| 7 | [07-ui/](./07-ui/) | Inventaris frame Pen, state, kamus komponen |
| 8 | [08-qa/](./08-qa/) | Enam alur kritis KPI-01 sebagai definisi selesai |
| — | [`../CLAUDE.md`](../CLAUDE.md) | Aturan kerja agen di akar repo. Bukan niat produk |

Kalau diminta **buat proyek dari ulang:** 0 → 1 → 2 → seluruh `03-alur/` (01 sampai 05) → panel peran yang dikerjakan → `05-desain/` → `06-teknis/` → `07-ui/` → `CLAUDE.md`.

Kalau diminta **ubah satu layar:** baca alur terkait di `03-alur/`, berkas panel itu, lalu baris layar di `07-ui/SCREENS.md`. Jangan mengarang langkah yang bertentangan dengan alur.

**Yang tidak dibaca sebagai sumber menu:** usulan IA lama. Isinya sudah masuk `03-alur/` dan `04-panel/`.

---

## Siapa yang menang jika bertentangan

1. `01-prd.md` — niat, KPI, bukan-tujuan, bahasa UI.
2. `02-umpan-balik.md` — kesalahan yang tidak boleh diulang.
3. `03-alur/` — mesin lintas peran (status, delegasi, tiga tipe siswa, tiga mesin uang).
4. `04-panel/` — susunan menu dan tindakan di layar.
5. Kode — perilaku **sekarang**. Jika beda dari konsep, lampiran **Selisih vs kode** di panel; jangan anggap fitur sudah hidup.

---

## Peta alur (dua belas tulang punggung)

Rincian: [03-alur/README.md](./03-alur/README.md).

| No. | Alur | Berkas |
|---|---|---|
| 1–3 | Pusat, akun, kelas reguler | [03-alur/01-jaringan.md](./03-alur/01-jaringan.md) |
| 4–6 | Siswa reguler / privat / afiliasi | [03-alur/02-siswa.md](./03-alur/02-siswa.md) |
| 7–8 | Hadir di kolam; Sick/Izin + delegasi | [03-alur/03-absensi-izin-honor.md](./03-alur/03-absensi-izin-honor.md) |
| 9 | Tagihan siswa | [03-alur/04-uang.md](./03-alur/04-uang.md) |
| 10–11 | Honor pelatih/staf → slip | [03-alur/03-absensi-izin-honor.md](./03-alur/03-absensi-izin-honor.md) bab 6–7; pemisah di [04-uang.md](./03-alur/04-uang.md) |
| 12 | Rapor + ZIP + Excel sekolah | [03-alur/05-rapor-sekolah.md](./03-alur/05-rapor-sekolah.md) |

---

## Keputusan terkunci (ringkas)

| Topik | Keputusan |
|---|---|
| Urutan menu | Rantai create. Dashboard/Home di puncak; Settings/Profile di dasar |
| Satu pintu privat | Hanya **Private Students** |
| Honor pelatih | Payung **Honor**: Invoice lalu Payslip; covering diklaim pengganti |
| Honor staf | Payung **Honor**: Invoice → Reimburse → Payslip |
| Kasbon | Sub-tab **Payslips**, bukan menu sendiri |
| Bahasa UI | Kode Inggris; ID = Google Translate; dokumen PUEBI |
| Manager Center | Panel `/admin`, bukan panel ketiga |
| Pencarian bilah atas | Dihapus; bukan pencarian global |

Daftar lengkap “jangan improvisasi”: gerbang bayar, unggah bukti siswa, pagar GPS, siswa absen sendiri, School mengoperasikan kolam, Admin meninjau honor, AI, Database Manager.

---

## Glosarium

| Istilah dokumen | Label UI / kode | Arti |
|---|---|---|
| Student | peran `member`, rute `/member`, tabel `members` | Bahasa produk untuk siswa. Jangan menulis “Member” di prosa |
| Pusat | Centers, `branches` | Cabang sekolah renang |
| Tagihan siswa | Payments / Bills, `bills` | Iuran siswa |
| Invoice honor | Honor / Invoice, `coach_invoices` | Klaim pelatih atau staf ke Owner |
| Slip gaji | Payslips, `payslips` | Hanya `published` ke pelatih/staf; staf juga `staff_salaries` |
| Periode invoice | Periods, `invoice_periods` | Jendela klaim honor |
| Periode rapor | Report Cards, `rapor_periods` | Satu terbuka per pusat |
| Kasbon | Loans, `coach_loans` | Potongan di slip |
| Les privat | Private Students, `class_type=private` | Bukan menu Class |
| Siswa afiliasi | `school_affiliate` | Tab Bills disembunyikan |
| Manager Center | `manager_center` | `/admin`; selalu Payments + Financial |
| Supported | Izin | Bukan “ada pengganti” |
| Paket sesi kelas | `class_packages` | Hanya Admin **Class** |
| Paket sesi privat | `members.remaining_sessions` | Bukan harga per pertemuan |
| Jenjang sekolah | `school_grade` | Bukan nama kelas les |
| ID akun | `public_id` | `NEXT.001.OW.26`. Staff = `SF`. Student = `ST` |
| QR akun | `qr_payload` | Auto saat create. Permanen. QR siswa untuk absensi |

**Jangan tertukar:** tagihan siswa ≠ invoice honor ≠ slip. Periode rapor ≠ periode invoice. Kelas reguler ≠ privat ≠ jenjang sekolah. Izin pelatih ≠ izin siswa ≠ sakit staf ≠ libur kelas. Bell Owner ≠ Bell Admin. Admin ≠ Manager Center ≠ Owner.
