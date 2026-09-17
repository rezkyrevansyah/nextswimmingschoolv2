# Jaringan pusat, akun, dan kelas — konsep terkunci

**Produk:** Next Swimming School  
**Kode dokumen:** ALUR-NSS-002  
**Versi:** 1.0  
**Status:** Konsep operasional terkunci  
**Tanggal:** 16 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI

Dokumen ini adalah **sumber kebenaran** tiga alur yang harus ada sebelum kolam bisa beroperasi: membuat pusat, membuat akun, membuat kelas reguler. Tanpa urutan ini, absensi tidak punya pin GPS, tagihan tidak punya rekening, dan siswa tidak punya pelatih.

Menu layar: `docs/04-panel/01-owner.md`, `docs/04-panel/02-admin.md`. Tiga tipe siswa: `docs/03-alur/02-siswa.md`. Absensi dan honor: `docs/03-alur/03-absensi-izin-honor.md`. Niat: `docs/01-prd.md`.

Jika panel bertentangan dengan dokumen ini untuk pusat, akun, kelas reguler, atau wewenang peran, **dokumen ini menang**. Jika dokumen ini bertentangan dengan PRD, **PRD menang** sampai ada addendum.

---

## 1. Mengapa jaringan dulu

NEXT mengelola **beberapa kolam**. Hampir semua rekaman terikat `branch_id` (pusat). Isolasi pusat adalah KPI-02: Admin pusat A tidak boleh melihat siswa, tagihan, atau kelas pusat B.

Pelatih adalah pengecualian yang disengaja: satu orang dapat diikat ke banyak pusat (`coach_branches`), karena pengajar sering berpindah kolam. Owner melihat semua pusat. Sekolah mitra, siswa, staf, Admin, dan Manager Center masing-masing terikat **satu** pusat.

Salah urutan yang sering terjadi di iterasi lama: membuat siswa sebelum ada kelas, atau membuat kelas sebelum ada pelatih, atau mengisi GPS clock-in tanpa pin pusat. Rantai di bawah mencegah itu.

```
Owner (satu orang, init-profile)
  → Pusat (Centers)
  → aturan global (Master Data, Report Levels)
  → akun per pusat (Admin, Manager Center, pelatih, staf, sekolah)
  → pelatih diikat ke pusat
  → kelas reguler + paket sesi kelas
  → (siswa: lihat docs/03-alur/02-siswa.md)
```

Dashboard selalu di puncak menu. Settings/Profile selalu di dasar. Itu pengecualian tampilan, bukan pengecualian rantai create.

---

## 2. Wewenang yang tidak boleh tertukar

Tiga peran sering disangka sama karena Admin dan Manager Center memakai URL `/admin`. Mereka **bukan** satu wewenang.

| Tindakan | Owner | Admin biasa | Manager Center |
|---|---|---|---|
| Melihat semua pusat | Ya | Tidak | Tidak |
| Membuat pusat | Ya | Tidak | Tidak |
| Membuat Admin atau Owner | Ya (Owner tidak dari formulir tambah biasa) | Tidak | Tidak |
| Menu **Payments** | Lewat Financial Income | Hanya jika sakelar pusat hidup | **Selalu** |
| Menu **Financial** | Semua pusat | Tidak | Satu pusat, lebih kurus |
| Terbit slip, kasbon, periode invoice | Ya | Tidak | Tidak |
| Landing, Storage, Activity Log | Ya | Tidak | Tidak |
| Buka periode rapor | Tidak | Ya | Ya |

Sakelar **Show Payments menu to Admin** tidak berlaku bagi Manager Center. Menyembunyikan menu di antarmuka **tidak cukup**: API harus menolak (FB-12). Membuka `/admin?tab=financial` sebagai Admin biasa harus gagal.

Pratinjau Owner (**Open Admin Panel**) menyimpan `sessionStorage.ownerPreviewBranch` dan menampilkan tombol kembali. Pratinjau **tidak** menaikkan wewenang akun Admin sungguhan.

Tidak ada panel ketiga untuk Manager Center.

---

## 3. Alur pusat baru

**Konteks.** Pusat adalah induk `branch_id`. Pin peta dipakai clock-in pelatih (jarak dicatat, tidak menolak). Nomor WhatsApp dan rekening dipakai tagihan siswa. Tanpa pusat, akun operasional tidak punya tempat.

Yang mengerjakan: **Owner**, menu **Centers**.

1. Isi nama, kota, alamat.
2. Pasang pin peta (lintang/bujur). Kosong = jarak clock-in reguler tidak dihitung.
3. Isi nomor WhatsApp Admin (tombol hubungi di Student **Bills** dan kaki School).
4. Isi rekening (bank, nomor, nama pemegang) — instruksi transfer siswa, bukan gerbang pembayaran.
5. Atur sakelar **Show Payments menu to Admin** (tidak mengenai Manager Center).
6. Simpan. Pusat aktif dapat dipajang di landing (CMS tab **Branches**), terpisah dari operasional.

Setelah itu:

7. **Accounts** membuat Admin atau Manager Center untuk pusat itu (bab 4).
8. Admin menyunting identitas harian di **Settings** (nama, alamat, pin, WA, logo). Rekening siswa dan sakelar Payments **tetap** di Owner Centers.

Arsip: pusat tidak tampil di operasional harian, data tetap. Pulihkan = aktif lagi. Hapus permanen menghapus data pusat dan akun masuk terkait — merusak, wajib konfirmasi.

---

## 4. Alur akun

**Konteks.** Setiap orang yang masuk panel punya baris profil dan peran. Formulir yang sama untuk semua tipe siswa adalah sumber rancu (FB-01). Privat **bukan** dari sini.

### 4.1 Siapa membuat siapa

| Pembuat | Boleh membuat | Tidak boleh |
|---|---|---|
| Sistem, masuk pertama Owner | Baris Owner lewat `POST /api/owner/init-profile` | — |
| Owner **Accounts** | `admin`, `manager_center`, `coach`, `staff`, `school`, `member` (reguler atau afiliasi) | Owner dari formulir tambah; siswa `private` |
| Admin / MC **Coach**, **Student**, **School Panel** | Pelatih (pusat ini atau tautan), siswa reguler/afiliasi, akun sekolah | Owner, Admin, siswa privat |
| Admin / MC **Private Students** | Siswa privat + kelas privat | — |
| Publik `/register` | Baris pendaftaran tertunda | Akun aktif; itu Approvals |

Suntingan peran di Owner **dapat** diubah menjadi `owner`. Formulir tambah tidak.

Membuat Admin atau Manager Center boleh otomatis membuat Staff (surel `namastaff@…`).

### 4.2 Pelatih banyak pusat

Pelatih dibuat di satu pusat, lalu dapat **ditautkan** ke pusat lain (`coach_branches`). Tajuk panel pelatih menampilkan pemilih cabang jika tautan lebih dari satu. Clock-in, rapor, dan klaim honor mengikuti cabang aktif dan kelas yang diampu.

Menangguhkan (`suspend_until`) mengunci Absen, Honor → Invoice, Rapor, dan clock-in. Kelas, Payslip, Profile, dan izin tetap terbuka. Menangguhkan semua pelatih suatu kelas memicu peringatan dasbor Admin.

### 4.3 Kunci sebelum kerja di kolam

- **Pelatih:** telepon, gender, tanggal lahir, bank, nomor rekening, nama pemegang. Sertifikat opsional (antrian **Approvals**).
- **Staf:** gerbang yang sama; seluruh panel tertutup sampai lengkap.
- **Siswa:** gerbang foto jika profil belum lengkap **dan** avatar kosong. Cukup salah satu untuk membuka panel.

Rekening pelatih/staf muncul di invoice dan slip. QR siswa dipakai pelatih saat memindai, bukan oleh siswa untuk menandai hadir.

---

## 5. Alur kelas reguler

**Konteks.** Kelas reguler adalah jadwal berulang di satu pusat: banyak siswa, satu atau beberapa pelatih. Bukan les 1:1. Les privat masuk `docs/03-alur/02-siswa.md` dan menu **Private Students**; **tidak** tampil di **Class**.

Syarat: pusat ada, minimal satu pelatih terikat pusat itu.

Yang mengerjakan: Admin **Class** (satu pusat) atau Owner **Classes** (semua pusat).

1. Buat kelas: nama, hari jamak dengan jam mulai dan jam selesai per hari, kapasitas, harga bulanan atau per sesi, foto, lokasi pusat atau titik sendiri lewat peta (geser pin atau cari nama tempat).
2. Tugaskan pelatih beserta perannya: satu pelatih otomatis kepala, dua pelatih dipilih kepala dan asisten, lebih dari dua sisanya coaching staff (`docs/06-teknis/SCHEMA.md` bagian `class_coaches`).
3. Tetapkan `rapor_signer_coach_id` (siapa yang menandatangani rapor kelas itu).
4. **Paket sesi** (`class_packages`: nama, jumlah sesi, harga) **hanya di Admin Class**. Owner Classes tidak punya UI ini. Paket ini untuk tagihan session pack siswa **reguler**, bukan sisa sesi privat.

Libur: Admin **Class Activity** menandai **satu tanggal** per kelas. Pelatih tidak clock-in pada tanggal itu. Libur ≠ izin orang ≠ sakit staf.

Pelatih mengisi tautan spreadsheet program per kelas (`class_coach_spreadsheets`). Itu bukan membuat kelas.

---

## 6. Dampak ke peran lain

| Langkah | Owner | Admin / MC | Pelatih | Staf | Siswa | School | Publik |
|---|---|---|---|---|---|---|---|
| Buat pusat | Centers | Settings memakai data itu | Pin GPS | — | WA + rekening Bills | WA kaki | Pajangan landing |
| Sakelar Payments | Mengatur | Menu Payments hilang/tampil | — | — | — | — | — |
| Buat Admin/MC | Accounts | Masuk `/admin` | — | Staf otomatis opsional | — | — | — |
| Taut pelatih | Accounts | Coach taut/lepas | Pemilih cabang | — | — | — | Landing pelatih **bukan** dari sini |
| Buat kelas reguler | Classes lintas pusat | Class + paket | Ampu, absensi, rapor | — | Jadwal, tagihan | Rapor kelas | — |
| Libur kelas | — | Class Activity | Clock-in mati | — | Lencana libur | — | — |

---

## 7. Jangan tertukar

1. Pusat ≠ lokasi privat. Clock-in reguler memakai pin pusat; privat/eksternal memakai pin kelas.
2. Admin ≠ Manager Center ≠ Owner.
3. Kelas reguler ≠ kelas privat ≠ jenjang sekolah (`school_grade`).
4. `class_packages` ≠ sisa sesi privat (`members.remaining_sessions`).
5. Libur kelas ≠ izin pelatih ≠ izin siswa ≠ sakit staf.
6. CMS landing pelatih ≠ daftar pelatih operasional.
7. Pratinjau Owner ≠ wewenang Admin.

## 8. Bukan tujuan

- Panel ketiga Manager Center.
- Admin membuat Owner atau Admin.
- Paket sesi reguler di Owner **Classes**.
- Siswa privat dari menu **Class** atau formulir **Student**.
- Pagar GPS yang menolak clock-in.
- Pencarian global di bilah atas (placeholder dihapus).
- Menu Owner **Database Manager** (sudah dihapus).
