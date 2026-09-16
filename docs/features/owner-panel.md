# Owner Panel — Daftar Fitur

> Sumber: `src/app/owner/` dan panel peran lain.
> Peran `owner` melihat **semua pusat**. Admin dan Manager Center melihat **satu pusat**.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan Owner
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Owner**

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Member · School · Publik (halaman landing)

Manager Center memakai panel Admin (`/admin`), bukan panel Owner. Manager Center selalu melihat menu **Payments** dan **Financial**. Admin biasa tidak memiliki **Financial**; menu **Payments**-nya dapat disembunyikan per pusat (lihat **Centers**).

Masuk pertama kali memanggil `POST /api/owner/init-profile` agar baris profil Owner ada. Kotak pencarian di bilah atas hanya placeholder, **bukan** pencarian global.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:**

- bilah sisi 16 menu dan keluar;
- bilah atas: judul, placeholder pencarian, Bell, pengalih bahasa (EN/ID), avatar;
- Bell (`notifications`): invoice honor baru dari pelatih atau staf;
- umpan balik beta jika bendera aktif;
- dari **Centers**: **Open Admin Panel** menyimpan `sessionStorage.ownerPreviewBranch` lalu membuka `/admin` (mode pratinjau).

**Dampak ke peran lain:**

- **Coach / Staff:** mengajukan invoice → pemberitahuan di Bell Owner
- **Admin:** pratinjau panel Admin untuk satu pusat, dengan tombol kembali ke Owner

---

## 1. Dashboard (`dashboard`)

**Apa:** Ringkasan angka lintas pusat. Tidak ada ubahan data.

**Yang dapat dilakukan:**

- jumlah member, pelatih, dan kelas aktif (semua pusat);
- jumlah invoice honor berstatus `pending`;
- tabel per pusat (member, pelatih, kelas);
- daftar invoice masuk terbaru (paling banyak 4, status `pending`).

**Dampak ke peran lain:** invoice `pending` dari pelatih atau staf muncul di kartu ini.

---

## 2. Master Data (`master`)

**Apa:** Pengaturan global: profil Head of NEXT dan kategori transaksi manual.

**Yang dapat dilakukan:**

- mengubah nama, jabatan, dan tanda tangan digital (`owner_settings`);
- menambah, mengubah, menghapus, dan mengurutkan kategori pemasukan/pengeluaran (`manual_transaction_categories`).

**Dampak ke peran lain:**

- **School / Admin / Coach / Member:** tanda tangan Head tampil di PDF rapor jika sekolah mengaktifkan `show_head_sig` (diatur di **Schools**)
- **Owner Financial** dan **Financial** Manager Center memakai kategori yang sama

---

## 3. Centers (`branches`)

**Apa:** Data induk pusat. Hampir semua akun, kelas, dan invoice terikat `branch_id`.

**Yang dapat dilakukan:**

- membuat atau mengubah: nama, kota, alamat, pin peta (lintang/bujur), nomor WhatsApp Admin, rekening (bank, nomor, nama pemegang);
- sakelar **Show Payments menu to Admin** (tidak berlaku bagi Manager Center);
- mengarsipkan atau memulihkan;
- menghapus permanen (`DELETE /api/owner/branches/:id`) — data pusat dan akun masuk terkait ikut terhapus;
- membuka pratinjau panel Admin.

**Dampak ke peran lain:**

- **Admin:** nama, alamat, dan WhatsApp di **Settings**; sakelar menyembunyikan menu **Payments**
- **Manager Center:** tetap melihat **Payments** dan **Financial**
- **Coach:** lintang/bujur pusat = titik pembanding GPS clock-in (kelas privat dapat memakai pin khusus kelas). Jarak dicatat, clock-in tidak ditolak karena jauh
- **Member:** WhatsApp = tombol hubungi Admin; rekening = instruksi transfer di tab **Bills** (bukan unggah bukti di aplikasi)
- **Publik:** pusat aktif dapat ditampilkan di landing (CMS tab **Branches**)

---

## 4. Schools (`schools`)

**Apa:** Logo dan tanda tangan rapor per sekolah mitra. **Bukan** pembuatan akun sekolah — akun dibuat di **Account Master Data** atau Admin **School Panel**.

**Yang dapat dilakukan:**

- mengunggah logo;
- menambah, mengubah, menghapus `school_signatures` (nama, jabatan, gambar, aktif/nonaktif);
- sakelar tampilan tanda tangan pelatih / Head / sekolah beserta judulnya.

**Dampak ke peran lain:**

- PDF rapor di School, Admin, Coach, dan Member memakai logo dan tiga slot tanda tangan sesuai sakelar
- Member `school_affiliate` terikat `school_id` dari akun, bukan dari tab ini

---

## 5. Account Master Data (`accounts`)

**Apa:** Semua akun di sistem, lintas pusat.

**Yang dapat dilakukan:**

- menyaring peran, pusat, arsip, dan kata kunci;
- membuat akun (`POST /api/admin/users`): `admin | manager_center | coach | member | school | staff`. Formulir tambah **tidak** dapat membuat Owner;
- saat membuat Admin atau Manager Center: opsi otomatis membuat Staff (surel `namastaff@…`);
- tipe member: `reguler | private | school_affiliate` (plus sekolah, jenjang, jumlah sesi jika relevan);
- rincian: mengubah profil, peran, dan pusat (peran **dapat** diubah menjadi `owner`), mengatur ulang kata sandi, menonaktifkan atau mengaktifkan (`is_archived`), menghapus;
- kartu QR: satu, banyak (zip), cetak;
- data rekening untuk `coach | staff | admin | manager_center`.

**Dampak ke peran lain:**

- akun masuk ke panel sesuai peran;
- **Admin** dapat membuat pengguna, tetapi tidak dapat membuat Owner atau Admin;
- rekening pelatih/staf dipakai di invoice dan slip gaji;
- QR member untuk absensi; tipe `private` dilanjutkan di **Private Members**;
- peran `school` masuk panel School.

---

## 6. Private Members (`memberPrivate`)

**Apa:** Les privat — satu siswa berpasangan dengan satu kelas `class_type=private`. Komponen sama dengan Admin; Owner melihat semua pusat plus saringan pusat.

**Yang dapat dilakukan:**

- membuat akun member plus kelas privat (jadwal, lokasi/GPS khusus, pelatih, paket sesi, harga);
- mengubah data siswa, sisa sesi, jadwal, lokasi;
- kelas privat **tidak** tampil di menu **Classes** Owner maupun Admin.

**Dampak ke peran lain:**

- **Admin:** fitur sama, satu pusat
- **Coach:** kelas privat di absensi dan kelas; GPS clock-in memakai pin kelas, bukan pin pusat
- **Member:** sisa sesi, jadwal, lokasi privat

Paket sesi privat **bukan** `class_packages` di menu Class Admin.

---

## 7. Classes (`classes`)

**Apa:** Kelas reguler lintas pusat. Kelas privat dikelola di **Private Members**.

**Yang dapat dilakukan:**

- membuat, mengubah, mengarsipkan, memulihkan, menghapus kelas: jadwal, kapasitas, harga bulanan atau per sesi, foto, lokasi di pusat atau eksternal;
- menugaskan pelatih kepala atau asisten, mengubah peran;
- rincian: info, daftar pelatih, daftar member, absensi pelatih, absensi member;
- menetapkan `rapor_signer_coach_id` (penandatangan rapor resmi kelas);
- melihat tautan spreadsheet per pelatih.

**Tidak** ada UI paket sesi (`class_packages`). Paket itu hanya di Admin **Class**, dipakai saat menambah tagihan tipe session pack.

**Dampak ke peran lain:**

- **Admin:** kelas pusat sendiri
- **Coach:** kelas yang diampu → absensi, rapor, invoice per sesi
- **Member:** jadwal, absensi, tagihan
- **School:** rapor siswa di kelas terkait

---

## 8. Competitions (`competitions`)

**Apa:** Kompetisi dan prestasi member. Komponen Admin (`AdminCompetition`) tanpa saringan pusat = semua pusat.

**Yang dapat dilakukan:** membuat kompetisi, mencatat partisipasi (gaya, jarak, waktu, peringkat, medali), mengunggah dokumen.

**Dampak ke peran lain:**

- **Admin:** komponen sama, satu pusat
- **Member:** riwayat lomba di tab rapor
- **Coach:** dapat tercatat sebagai pendamping

---

## 9. Report Levels (`levels`)

**Apa:** Cetakan rubrik rapor global, bukan isi rapor per siswa.

**Yang dapat dilakukan:**

- menambah, mengubah, mengaktifkan, mengurutkan level;
- kriteria: `score_10 | score_100 | choice | text` (termasuk ubah jenis massal);
- waktu standar: jarak, gaya, target;
- cakupan: semua kelas (`all_classes`) atau kelas tertentu (`rapor_level_classes`).

**Dampak ke peran lain:** pelatih memakai level aktif yang berlaku untuk kelasnya; PDF rapor Admin, School, dan Member memakai kriteria dan waktu standar itu.

---

## 10. Coach Rates (`rates`)

**Apa:** Tarif honor pelatih per kelas. Dipakai saat pelatih membuat invoice.

**Yang dapat dilakukan:**

- tarif umum per kelas (`coach_id` kosong);
- tarif khusus per pelatih per kelas;
- tarif extra (`coach_extra_rates`) untuk sesi di luar jadwal;
- saringan lengkap / belum lengkap / belum ada tarif extra.

**Dampak ke peran lain:** pelatih memakai tarif ini untuk sesi reguler dan extra. Kelas tanpa tarif tidak dapat diklaim. Tidak tampil ke Member atau School.

---

## 11. Payslips (`invoices`)

**Apa:** Meninjau invoice pelatih dan staf, menerbitkan slip gaji, mengelola periode pengajuan. Invoice staf memakai tabel yang sama (`coach_invoices`, `coach_id` = id staf).

### A. Daftar invoice dan slip

Alur: `pending` → setujui atau tolak → buat slip (draf) → sunting potongan (pajak, kasbon, lain) → terbitkan.

**Yang dapat dilakukan:**

- menyetujui, menolak, atau membatalkan persetujuan invoice;
- membuat slip dari invoice yang disetujui, atau manual tanpa invoice (pelatih atau staf);
- untuk staf manual: Owner dapat memakai jumlah hari `present` di `staff_attendances` sebagai acuan;
- menyunting draf: kotor, potongan, catatan;
- menerbitkan: `payslips.status = published`; invoice terkait menjadi `paid`; cicilan kasbon periode itu ditutup;
- mencetak; menghapus slip (ikut menghapus turunan).

### B. Periods (`invoice_periods`)

**Yang dapat dilakukan:** membuka periode (satu pusat atau semua pusat), mengubah label/tanggal/cakupan, menutup atau membuka lagi. Periode tertutup = pelatih dan staf tidak dapat mengajukan invoice baru.

**Dampak ke peran lain:**

- **Coach:** tab Invoice hanya jika periode terbuka (pusat ini atau global); tab Payslip hanya `published`; beranda menampilkan spanduk tenggat
- **Staff:** tab Invoice (periode terbuka **tidak** disaring pusat di kode staf); tab Payslip menggabungkan `staff_salaries` dan `payslips`
- Bell Owner; **Financial** mencatat pengeluaran setelah `paid` atau `published`; **Loan List** menjadi calon potongan

---

## 12. Loan List (`loans`)

**Apa:** Kasbon pelatih **dan** staf (berkas `CoachLoans.tsx`).

**Yang dapat dilakukan:** membuat kasbon (pokok, tenor, cicilan otomatis, alasan), menyaring pusat/peran/status, mencatat cicilan, menghapusbukukan sisa, membatalkan jika belum ada pembayaran. Status: `active | paid_off | written_off | cancelled`.

**Dampak ke peran lain:** kasbon `active` menjadi opsi potongan di draf slip; setelah diterbitkan, pelatih/staf melihatnya di slip (bukan tab kasbon tersendiri).

---

## 13. Financial (`financial`)

**Apa:** Buku keuangan lintas pusat. Lima sub-tab.

**Yang dapat dilakukan:**

- **Overview** — ringkasan pemasukan dan pengeluaran
- **Income** — tagihan siswa (`bills`) plus transaksi manual pemasukan. Saringan status (`unpaid | paid | partial | school_covered | free`), jenis, metode, tanggal, pusat
- **Expenses** — honor pelatih, gaji staf, reimburse staf, transaksi manual pengeluaran. Menyetujui, menolak, atau menandai dibayar pada `staff_reimbursements`
- **Payroll** — daftar siap ditransfer versus sudah dibayar; input `staff_salaries` per periode
- **Money flow** — rekap bulanan pemasukan, pengeluaran, bersih
- transaksi manual dan kategori (sama dengan Master Data)

**Dampak ke peran lain:**

- **Admin:** **Payments** (jika sakelar pusat hidup) untuk tagihan siswa satu pusat. **Tidak** ada menu Financial
- **Manager Center:** Payments dan Financial selalu ada, satu pusat
- **Member:** tab **Bills** menampilkan rekening; konfirmasi lewat WhatsApp. Admin yang memverifikasi lunas (dapat mengunggah bukti dari sisi Admin). Tidak ada unggah bukti di panel Member
- **Staff:** mengajukan reimburse; gaji tampil di tab Payslip staf
- **Coach:** honor lewat invoice, bukan input di sini

---

## 14. Landing Page (`landing`)

**Apa:** Pengelola konten halaman publik `/`. Sembilan tab, lalu `POST /api/owner/revalidate`. Tidak ada tab Hero tersendiri (bagian hero diatur di kode halaman publik).

| Tab CMS | Isi |
|---|---|
| Programs | program les |
| Coaches | sorotan pelatih (bukan daftar pelatih operasional) |
| Video | tautan YouTube |
| Why Next | poin keunggulan |
| Testimonials | testimoni dan foto |
| Partners | logo mitra |
| Branches | pajangan pusat di landing |
| FAQ | tanya jawab |
| Footer | slogan, alamat, WhatsApp, surel, media sosial, hak cipta, pesan WhatsApp mengambang |

**Dampak ke peran lain:** hanya halaman publik. Tidak masuk panel internal.

---

## 15. System Storage (`storage`)

**Apa:** Pemantauan dan cadangan berkas di penyimpanan (ember publik dan privat).

**Yang dapat dilakukan:** statistik (`/api/storage/stats`), daftar cadangan per kategori, unduh, hapus.

**Dampak ke peran lain:** antarmuka hanya Owner. Berkas yang dihapus dapat merusak avatar, bukti bayar Admin, sertifikat, tanda tangan, atau foto kelas di peran lain.

---

## 16. Activity Log (`activity`)

**Apa:** Riwayat ubahan (`activity_logs`) lintas pusat.

**Yang dapat dilakukan:** menyaring pusat, entitas, aksi, peran, tanggal, label; halaman; angka hari ini dan tujuh hari; membuka rincian.

**Dampak ke peran lain:** antarmuka hanya Owner. Entri ditulis dari aksi Owner dan peran lain yang memanggil `logActivity`.

---

## Matriks silang Owner → peran lain

| Fitur Owner | Admin / Manager Center | Coach | Staff | Member | School | Publik |
|---|---|---|---|---|---|---|
| Dashboard | — | Invoice `pending` | Invoice `pending` | — | — | — |
| Master Data | Kategori Financial MC; tanda tangan Head | Tanda tangan Head di PDF | — | Tanda tangan Head di PDF | Tanda tangan Head di PDF | — |
| Centers | Settings; sakelar Payments (Admin). MC selalu Payments+Financial | GPS clock-in | — | WA + rekening di Bills | — | Pajangan pusat |
| Schools | Logo dan tanda tangan di PDF | Sama | — | Sama | Sama | — |
| Accounts | Akun Admin/MC | Masuk + rekening | Masuk + rekening | Masuk + QR | Akun school | — |
| Private Members | UI sama, satu pusat | Kelas privat + GPS kelas | — | Sesi/jadwal privat | — | — |
| Classes | Kelas pusat sendiri; **paket sesi hanya di Admin** | Ampu → absensi/rapor/invoice | — | Jadwal/absensi/tagihan | Rapor kelas | — |
| Competitions | UI sama, satu pusat | Pendamping | — | Riwayat di rapor | — | — |
| Report Levels | PDF memakai rubrik | Formulir rapor | — | PDF | PDF | — |
| Coach Rates | — | Hitung invoice | — | — | — | — |
| Payslips | — | Ajukan invoice; lihat slip terbit | Ajukan invoice; lihat gaji/slip | — | — | — |
| Loan List | — | Potongan di slip | Potongan di slip | — | — | — |
| Financial | Admin: Payments. MC: Payments+Financial | Honor via invoice | Reimburse + gaji | Tagihan + WA, bukan unggah bukti | — | — |
| Landing | — | — | — | — | — | Halaman `/` |
| Storage | Berkas bersama | Sama | Sama | Sama | Sama | Berkas landing |
| Activity Log | Aksi tercatat | Aksi tercatat | Aksi tercatat | — | — | — |

---

## Alur silang (contoh)

**1. Terbitkan slip gaji.** Owner menyetujui invoice → membuat draf (pajak/kasbon) → menerbitkan. Pelatih melihat slip `published`. Invoice menjadi `paid`. Cicilan kasbon tertutup. **Financial** mencatat pengeluaran.

**2. Buka periode invoice.** Owner membuka `invoice_periods`. Beranda pelatih menampilkan tenggat. Pelatih dan staf dapat mengajukan. Bell Owner menerima pemberitahuan. Menutup periode menolak pengajuan baru.

**3. Rekening dan peta pusat.** Owner mengisi rekening dan pin. Member melihat rekening di **Bills** dan mengonfirmasi lewat WhatsApp. Pelatih clock-in membandingkan GPS dengan pin pusat (kelas privat: pin kelas).

**4. Tanda tangan rapor.** Owner mengatur Head of NEXT dan sakelar sekolah. PDF di School, Admin, Coach, dan Member mengikuti `show_coach_sig` / `show_head_sig` / `show_school_sig`.
