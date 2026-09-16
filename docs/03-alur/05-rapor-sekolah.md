# Rapor dan sekolah mitra — konsep terkunci

**Produk:** Next Swimming School  
**Kode dokumen:** ALUR-NSS-005  
**Versi:** 1.0  
**Status:** Konsep operasional terkunci  
**Tanggal:** 16 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI

Dokumen ini adalah **sumber kebenaran** rapor berenang dari rubrik sampai berkas yang dipegang sekolah mitra. Sekolah **tidak** mengisi nilai dan **tidak** mengoperasikan kolam. Mereka mengunduh arsip.

Jaringan (akun sekolah, logo): `docs/03-alur/01-jaringan.md`. Siswa afiliasi: `docs/03-alur/02-siswa.md`. Absensi yang diekspor: `docs/03-alur/03-absensi-izin-honor.md` bab 5. Layar: `docs/04-panel/01-owner.md` Report Levels/Schools, `docs/04-panel/02-admin.md` Report Cards, `docs/04-panel/03-coach.md` Report Card, `docs/04-panel/06-school.md`, `docs/04-panel/05-student.md`.

Jika panel bertentangan dengan dokumen ini untuk periode rapor, ZIP, atau Excel sekolah, **dokumen ini menang**. Jika dokumen ini bertentangan dengan PRD, **PRD menang** sampai ada addendum.

---

## 1. Mengapa rapor bukan absensi

Rapor adalah penilaian berkala (satu periode per pusat). Absensi adalah kejadian harian. Mencampur keduanya membuat PDF memakai status hadir sebagai nilai, atau Excel sekolah menunggu periode rapor.

KPI-04: paling banyak **satu** `rapor_periods.is_open = true` per `branch_id`. Membuka periode baru menutup yang lama di pusat itu.

Ulasan bintang siswa hanya hidup saat periode masih terbuka. Identitas pengulas disamarkan di peladen.

---

## 2. Syarat sebelum pelatih bisa mengisi

Urutan ini wajib. Melompat langkah = PDF tanpa rubrik atau tanpa tanda tangan.

1. Owner **Report Levels** — rubrik global: kriteria `score_10` \| `score_100` \| `choice` \| `text`, waktu standar, cakupan semua kelas atau kelas tertentu.
2. Owner **Master Data** — nama, jabatan, tanda tangan Head of NEXT.
3. Owner **Schools** — logo sekolah mitra; `school_signatures`; sakelar `show_coach_sig` / `show_head_sig` / `show_school_sig`.
4. Kelas punya `rapor_signer_coach_id` (atau pelatih kepala sebagai cadangan).
5. Siswa sudah di kelas (reguler, privat, atau afiliasi — ketiga tipe boleh punya rapor).
6. Admin **Report Cards** membuka periode di pusat itu.

Owner **tidak** mengisi nilai per siswa. Admin **tidak** mengisi nilai; Admin membuka jendela dan mengunduh.

---

## 3. Alur isi rapor

**Konteks.** Pelatih mengisi hanya di cabang aktif yang periodenya terbuka. Profil lengkap; tidak ditangguhkan.

1. Sistem merintis `rapor_entries` untuk setiap siswa di kelas pelatih itu.
2. Pelatih memilih level yang berlaku, mengisi skor, catatan, kepribadian/motivasi/capaian, waktu terbaik.
3. Simpan → `locked = true`.
4. Pratinjau dan unduh PDF: blok tanda tangan mengikuti sakelar Owner **Schools**.
5. Pelatih dapat mengunggah tanda tangan digital (`profiles.signature_url`).
6. Siswa, saat periode masih `is_open`, dapat mengulas pelatih (bintang + pesan). Setelah periode tutup: histori, ulasan tertutup.

Tanpa periode terbuka, pelatih tidak dapat mengisi. Di School, daftar siswa tetap ada tetapi unduh rapor tidak aktif sampai ada entri terkunci pada periode terbuka.

---

## 4. Siapa mengunduh PDF

Mesin unduh sama (`downloadRaporPdf` / `downloadRaporZip`).

| Siapa | Apa yang boleh |
|---|---|
| Pelatih | PDF kelasnya, setelah `locked` |
| Admin / MC | PDF satu siswa atau ZIP; daftar terisi/belum |
| Siswa | PDF sendiri |
| School | PDF/ZIP **hanya** `locked` milik `school_id` akun itu |

### 4.1 ZIP harus tertata (FB-09)

Tombol ZIP yang “sudah ada” tidak cukup jika arsip kosong atau kacau.

- Hanya rapor `locked` milik sekolah itu (atau hasil saringan Admin untuk pusatnya).
- Nama berkas memuat identitas siswa.
- Tidak campur berkas rusak atau rapor belum dikunci.
- Tidak memuat siswa sekolah lain.
- Operator boleh: satu PDF, ZIP semua lengkap, ZIP saringan, atau ZIP pilihan.

---

## 5. Panel School — pantau, bukan operasi

**Konteks.** PIC sekolah butuh arsip semester dan rekap kehadiran. Mereka tidak boleh mengubah siswa, pelatih, izin, atau iuran.

Dua tab, rapor di atas absensi (operator lebih sering mengambil arsip semester):

1. **Student Report Cards**
2. **Student Attendance**

Tidak ada tab pengumuman, tagihan, atau isi rapor. Admin boleh menargetkan peran `school` di pengumuman; di panel School hanya Bell jika ada pemberitahuan.

Jika masuk tanpa baris `schools` yang cocok: layar data tidak ditemukan; hubungi Admin pusat.

Kolom jenjang (`school_grade`) wajib tampil di tabel rapor, kartu ponsel, dan Excel absensi. Jenjang ≠ nama kelas les (FB-08).

---

## 6. Excel absensi sekolah (FB-10)

**Konteks.** Operator sekolah tidak rekap dari “satu baris per kejadian”. Mereka butuh lembar horizontal. Jangan merapikan Excel sebelum status absensi benar (`docs/03-alur/03-absensi-izin-honor.md`, FB-05).

1. Pilih rentang tanggal dulu. Hanya tanggal dalam rentang yang menjadi kolom.
2. Satu **baris per murid** afiliasi sekolah itu.
3. Struktur:

| Nama murid | Jenjang (`school_grade`) | Nama kelas les | Tanggal 1 | Tanggal 2 | … | Hadir | Telat | Tidak hadir | Sakit | Izin |
|---|---|---|---|---|---|---|---|---|---|---|

4. Sel tanggal memakai status yang sama dengan basis data, bukan label bebas.
5. Kolom kanan = jumlah tiap status pada rentang itu.
6. Nama berkas: `Absensi-{nama-sekolah}-{dari}-sd-{sampai}.xlsx`.

Dilarang: mengekspor satu baris per kejadian sebagai format resmi; meniadakan jenjang.

---

## 7. Dampak ke peran lain

| Langkah | Owner | Admin | Pelatih | Siswa | School |
|---|---|---|---|---|---|
| Rubrik + tanda tangan Head | Report Levels, Master Data | PDF memakai | Formulir | PDF | PDF |
| Logo/sakelar sekolah | Schools | — | PDF | PDF afiliasi | PDF |
| Buka/tutup periode | — | Report Cards | Isi jika terbuka | Ulasan jika terbuka | Hero periode |
| Kunci rapor | — | Status lengkap | `locked` | Unduh | Status + unduh |
| ZIP tertata | — | ZIP pusat | — | — | ZIP `school_id` |
| Excel 1 baris/murid | — | — | Sumber status | — | Ekspor |

---

## 8. Jangan tertukar

1. Periode rapor ≠ periode invoice.
2. Mengisi rapor ≠ mencatat absensi.
3. Jenjang sekolah ≠ nama kelas les.
4. ZIP rapor ≠ Excel absensi (dua berkas, dua tujuan).
5. Sekolah mitra ≠ Admin pusat.
6. Tanda tangan Head (Owner Master Data) ≠ tanda tangan perwakilan sekolah (Owner Schools).

## 9. Bukan tujuan

- Sekolah mengisi atau mengunci rapor.
- Sekolah mengubah data siswa, izin, atau iuran.
- Tab pengumuman atau tagihan di panel School.
- Dua periode rapor terbuka di satu pusat.
- ZIP yang memuat siswa sekolah lain atau rapor belum `locked`.
- Fitur kecerdasan buatan untuk skor otomatis.
