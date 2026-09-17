# State wajib di luar happy path

Setiap frame di `SCREENS.md` minimal punya: **default**, **kosong**, **memuat**, **gagal**. Tabel ini adalah state produk yang sering dilupakan dan pernah salah di iterasi lama.

---

## 1. Lintas peran

| State | Siapa | Perilaku UI | Bukan |
|---|---|---|---|
| Memuat | Semua | Skeleton token `skeleton`; jangan spinner ad-hoc beda merek | Halaman putih tanpa umpan |
| Kosong | Semua daftar | Satu kalimat + aksi create jika wewenang ada | Ilustrasi landing di dalam tabel |
| Gagal jaringan | Semua | Toast / banner; aksi coba lagi | `alert()` |
| Terlarang | URL ditebak | Layar atau toast forbidden | Tab `hidden` saja |
| EN/ID | Semua cangkang | Pengalih; nama/rekening `notranslate` | Rute `/id` |

---

## 2. Kunci operasional (PRD 2.5)

| Kondisi | UI wajib | Jangan |
|---|---|---|
| Pelatih profil belum lengkap | Profile terbuka; Absen, Invoice, Rapor, overlay clock-in terkunci + alasan | Menyembunyikan Profile |
| Pelatih `suspend_until` berlaku | Kunci sama seperti di atas; Home, Class, Payslip, Profile, form izin tetap ada | Mengunci seluruh app |
| Staf profil belum lengkap | **Seluruh panel** diganti `StaffProfileGate` | Kunci per tab seperti pelatih |
| Siswa gerbang foto | Panel diganti unggah foto jika profil belum lengkap **dan** `avatar_url` kosong | Memaksa keduanya |
| Siswa ditangguhkan | Spanduk + hitung mundur; tab tetap; QR ditolak saat dipindai | Mengunci tab Student |
| Tidak ada `invoice_periods` terbuka | Form invoice pelatih/staf tertutup; riwayat lama tetap | Menyembunyikan seluruh Honor |
| Tidak ada `rapor_periods` terbuka | Pelatih tidak bisa isi; unduhan sekolah tidak aktif | Membuat periode diam-diam |
| Siswa `school_affiliate` | Tab Bills hilang; kartu unpaid Home hilang | Generate tagihan bulanan |

---

## 3. Absensi dan izin

| State | UI |
|---|---|
| Di luar jendela clock-in pelatih | Tombol mati; tampilkan jendela (T−3 jam s.d. `time_end`) |
| Libur kelas | Kartu libur; clock-in ditolak |
| Izin pelatih `approved` untuk kelas itu | Pemilik tidak clock-in; pengganti dapat kartu |
| GPS ≤500 m / ≤2 km / lebih | Warna jarak; **tidak** menolak |
| Tanpa pin | Jarak tidak dihitung; clock-in tetap boleh |
| Swafoto pelatih gagal | Baris absensi tetap tersimpan tanpa foto |
| Swafoto staf | Harus tersimpan + kompres; bukan preview saja (FB-07) |
| Siswa QR ditangguhkan | Tolak di overlay pindai |
| Privat sudah dikonsumsi hari itu | Tolak duplikat |
| Absensi manual | Hanya tanggal jadwal ≤ 56 hari ke belakang |

---

## 4. Uang

| State | UI |
|---|---|
| Generate tagihan | Lewati pasangan yang sudah ada; 0 baris private/afiliasi |
| Bills siswa | Rekening + tombol WhatsApp; **tanpa** input unggah |
| Invoice `pending` | Antrian Owner; Bell Owner |
| Slip draf | Hanya Owner; pelatih/staf tidak melihat |
| Slip `published` | Tampil di Honor → Payslip |
| Kasbon `active` | Opsi potongan di draf slip, bukan menu kiri |
| Reimburse staf | Proses di Owner Financial, bukan MC |
| Financial tanpa saringan tanggal | Jangan ekspor dulu (FB-11) |
| Kelas tanpa tarif | Sesi tidak bisa diklaim |

---

## 5. Rapor dan School

| State | UI |
|---|---|
| Periode kedua dibuka | Periode pertama tertutup (KPI-04) |
| Entri belum `locked` | School tidak mengunduh |
| Sakelar TTD mati | PDF tanpa blok tanda tangan itu |
| Baris `schools` tidak cocok | Layar data tidak ditemukan |
| Excel absensi | 1 murid 1 baris; kolom tanggal; max 2.000; nama berkas baku |

---

## 6. Owner / Admin khusus

| State | UI |
|---|---|
| Preview Admin | Spanduk + tombol kembali; wewenang tetap milik Admin pusat itu |
| Admin biasa buka Financial | Forbidden, bukan tampilan kosong yang seolah boleh |
| Sakelar Payments mati | Menu Payments Admin biasa hilang; MC tetap ada |
| Lencana Approvals | Hanya daftar + sertifikat tertunda |
| Hapus pusat / hapus berkas / hapus slip | `useConfirm()` + salinan risiko |
| Search Topbar | Placeholder; jangan “no results” seolah mesin cari hidup |

Gambar state ini di Pen sebagai variant, bukan catatan kaki.
---
