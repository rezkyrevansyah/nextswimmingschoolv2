# Next Swimming School — Test Scenarios

> Dokumen ini berisi test scenario manual yang harus dijalankan secara berurutan.
> Beberapa test bergantung pada data yang dibuat di test sebelumnya — jangan loncat.
>
> **Legend:**
> - ✅ Expected Result (apa yang seharusnya terjadi)
> - 📝 Actual Result (isi saat testing)
> - 🔴 Critical / 🟡 High / 🟢 Medium priority

---

## PERSIAPAN SEBELUM TEST

Buat akun owner terlebih dahulu langsung di Supabase:

1. Buka Supabase → Authentication → Users → Add User
   - Email: `owner@nextswimmingschool.com`
   - Password: `owner123`
2. Buka Table Editor → profiles → tambah row:
   - `id`: (sama dengan user id yang baru dibuat)
   - `role`: `owner`
   - `full_name`: `Mas Syahril`
   - `email`: `owner@nextswimmingschool.com`

---

---

# BLOK 1 — LANDING PAGE

## TC-L01 — Halaman utama dapat diakses 🔴

**URL:** `/`

**Langkah:**
1. Buka browser, navigasi ke URL aplikasi
2. Scroll dari atas ke bawah

**Expected Result:**
- ✅ Halaman loading tanpa error
- ✅ Navbar tampil: `Home – Program – Coach – FAQ – Login – Konsultasi Sekarang`
- ✅ Hero section tampil dengan headline dan CTA
- ✅ Section Why Choose Us tampil
- ✅ Section Swimming Programs tampil
- ✅ Section Ecosystem tampil
- ✅ Section Coach Showcase tampil
- ✅ Section Testimonials tampil
- ✅ Section FAQ tampil
- ✅ Final CTA Section tampil
- ✅ Footer tampil

**Actual Result:** 📝

---

## TC-L02 — Tombol CTA diarahkan ke WhatsApp 🟡

**Langkah:**
1. Di Hero section, klik tombol CTA utama (contoh: "Konsultasi Sekarang")
2. Ulangi untuk setiap section yang memiliki CTA

**Expected Result:**
- ✅ Setiap klik membuka tab baru ke `https://wa.me/...`
- ✅ Pesan otomatis terisi di WhatsApp

**Actual Result:** 📝

---

## TC-L03 — Link navigasi navbar berfungsi 🟢

**Langkah:**
1. Klik `Program` di navbar
2. Klik `Coach` di navbar
3. Klik `FAQ` di navbar
4. Klik `Login` di navbar

**Expected Result:**
- ✅ `Program`, `Coach`, `FAQ` scroll ke section yang tepat di halaman yang sama
- ✅ `Login` navigasi ke halaman `/login`

**Actual Result:** 📝

---

## TC-L04 — FAQ dapat dibuka/tutup 🟢

**Langkah:**
1. Scroll ke section FAQ
2. Klik salah satu pertanyaan FAQ

**Expected Result:**
- ✅ Jawaban FAQ muncul/terlipat saat diklik (accordion)

**Actual Result:** 📝

---

## TC-L05 — Halaman Register dapat diakses dari Landing 🟡

**Langkah:**
1. Dari halaman utama, cari link/button ke Register (atau akses `/register` langsung)

**Expected Result:**
- ✅ Halaman register terbuka
- ✅ Step pertama tampil: "Sebelum mendaftar" dengan tombol konsultasi WA dan "Langsung isi form"

**Actual Result:** 📝

---

---

# BLOK 2 — REGISTER PAGE

## TC-R01 — Alur register member baru (step 1 → konsultasi WA) 🟡

**Langkah:**
1. Buka `/register`
2. Klik tombol `Konsultasi via WhatsApp`

**Expected Result:**
- ✅ Membuka WhatsApp dengan pesan template

**Actual Result:** 📝

---

## TC-R02 — Alur register member baru (step 2 → isi form) 🔴

**Langkah:**
1. Buka `/register`
2. Klik `Langsung isi form pendaftaran`
3. Isi semua field:
   - **Nama lengkap:** `Budi Santoso`
   - **Tanggal lahir:** `2015-03-10`
   - **Jenis kelamin:** `Laki-laki`
   - **Cabang yang dituju:** (pilih cabang dari dropdown — skip dulu jika belum ada)
   - **Nomor HP / WhatsApp:** `081234567890`
   - **HP milik siapa?:** `Orang tua / wali`
   - **Nama orang tua / wali:** `Pak Budi`
   - **Nomor HP orang tua:** `081298765432`
   - **Alamat:** `Jl. Merdeka No. 1, Jakarta`
   - **Riwayat kesehatan / alergi:** (kosongkan)
4. Klik `Kirim pendaftaran`

**Expected Result:**
- ✅ Saat pilih "Orang tua / wali", field nama dan nomor orang tua muncul
- ✅ Setelah submit, tampil step sukses: "Pendaftaran terkirim!"
- ✅ Ada tombol `Chat admin sekarang` dan `Kembali ke beranda`
- ✅ Data masuk ke tabel `registrations` di Supabase

**Actual Result:** 📝

---

## TC-R03 — Validasi form register — field wajib kosong 🟡

**Langkah:**
1. Buka `/register` → klik `Langsung isi form`
2. Klik `Kirim pendaftaran` tanpa mengisi apapun

**Expected Result:**
- ✅ Form tidak tersubmit
- ✅ Muncul pesan error atau field wajib ter-highlight

**Actual Result:** 📝

---

---

# BLOK 3 — LOGIN PAGE

## TC-LOG01 — Login berhasil sebagai Owner 🔴

**Langkah:**
1. Buka `/login`
2. Isi **Email:** `owner@nextswimmingschool.com`
3. Isi **Password:** `owner123`
4. Klik `Masuk`

**Expected Result:**
- ✅ Loading sebentar lalu redirect ke `/owner`
- ✅ Owner panel terbuka

**Actual Result:** 📝

---

## TC-LOG02 — Login dengan kredensial salah 🟡

**Langkah:**
1. Buka `/login`
2. Isi **Email:** `salah@email.com`
3. Isi **Password:** `passwordsalah`
4. Klik `Masuk`

**Expected Result:**
- ✅ Muncul pesan error: "Email atau password salah"
- ✅ Tidak ada redirect

**Actual Result:** 📝

---

## TC-LOG03 — Fitur lupa password 🟡

**Langkah:**
1. Buka `/login`
2. Klik link `Lupa password?`

**Expected Result:**
- ✅ Modal "Lupa password?" muncul
- ✅ Ada instruksi untuk menghubungi admin
- ✅ Tombol `Chat admin sekarang` membuka WhatsApp
- ✅ Tombol `Nanti saja` menutup modal

**Actual Result:** 📝

---

---

# BLOK 4 — OWNER PANEL

> Login sebagai owner sebelum menjalankan blok ini.

## TC-O01 — Dashboard owner tampil dengan benar 🔴

**Langkah:**
1. Login sebagai owner → masuk ke `/owner`
2. Perhatikan halaman Dashboard

**Expected Result:**
- ✅ Sidebar tampil dengan menu: Dashboard, Cabang, Admin, Kelas, Tarif Coach, Invoice Coach
- ✅ Dashboard menampilkan stats (meski 0 semua di awal)
- ✅ Greeting card "Pagi/Siang/Sore, Owner" tampil

**Actual Result:** 📝

---

## TC-O02 — Buat cabang baru 🔴

**Langkah:**
1. Di sidebar, klik `Cabang`
2. Klik tombol `Tambah Cabang`
3. Isi modal:
   - **Nama cabang:** `Next Swimming School Jakarta`
   - **Kota:** `Jakarta`
   - **Alamat:** `Jl. Sudirman No. 10, Jakarta Pusat`
4. Klik `Simpan`

**Expected Result:**
- ✅ Modal tertutup
- ✅ Card cabang baru muncul di grid
- ✅ Data tersimpan di tabel `branches`

**Actual Result:** 📝

---

## TC-O03 — Edit data cabang 🟡

**Langkah:**
1. Di halaman Cabang, klik ikon `Edit` pada cabang yang baru dibuat
2. Ubah **Nama cabang** menjadi: `NSS Jakarta`
3. Klik `Simpan`

**Expected Result:**
- ✅ Nama cabang berubah di card

**Actual Result:** 📝

---

## TC-O04 — Buat akun admin cabang 🔴

**Langkah:**
1. Di sidebar, klik `Admin`
2. Klik `Tambah Admin`
3. Isi modal:
   - **Nama lengkap:** `Siti Admin`
   - **Email:** `admin@nssjakarta.com`
   - **Nomor WhatsApp:** `082110009667`
   - **Cabang:** `NSS Jakarta` (pilih dari dropdown)
   - **Password awal:** `admin123`
4. Klik `Buat Akun`

**Expected Result:**
- ✅ Admin baru muncul di tabel
- ✅ Data tersimpan — admin bisa login dengan kredensial ini

**Actual Result:** 📝

---

## TC-O05 — Menu Kelas (view only) 🟢

**Langkah:**
1. Klik `Kelas` di sidebar
2. Pilih cabang dari dropdown filter

**Expected Result:**
- ✅ Banner "View-only" tampil
- ✅ Tabel kelas per cabang tampil (kosong dulu jika belum ada kelas)

**Actual Result:** 📝

---

## TC-O06 — Logout dari owner panel 🟡

**Langkah:**
1. Klik tombol logout (biasanya di Topbar atau sidebar bawah)

**Expected Result:**
- ✅ Redirect ke `/login`
- ✅ Tidak bisa akses `/owner` tanpa login ulang

**Actual Result:** 📝

---

---

# BLOK 5 — ADMIN PANEL: SETUP AWAL

> Login sebagai admin cabang yang baru dibuat (TC-O04) sebelum menjalankan blok ini.
> Email: `admin@nssjakarta.com` | Password: `admin123`

## TC-A01 — Login berhasil sebagai Admin 🔴

**Langkah:**
1. Buka `/login`
2. Isi **Email:** `admin@nssjakarta.com`
3. Isi **Password:** `admin123`
4. Klik `Masuk`

**Expected Result:**
- ✅ Redirect ke `/admin`
- ✅ Sidebar admin tampil dengan semua menu

**Actual Result:** 📝

---

## TC-A02 — Setup Settings Cabang 🔴

**Langkah:**
1. Di sidebar, klik `Settings`
2. Di section **Logo & Identitas Cabang:**
   - Upload file logo (PNG/JPG)
   - **Nama cabang:** `NSS Jakarta`
   - **Alamat:** `Jl. Sudirman No. 10, Jakarta Pusat`
   - Klik `Simpan perubahan`
3. Di section **Nomor WhatsApp Admin:**
   - Klik `Tambah nomor`
   - Isi: `082110009667`
4. Di section **Koordinat Lokasi:**
   - **Latitude:** `-6.200000`
   - **Longitude:** `106.816666`
   - Klik `Simpan`

**Expected Result:**
- ✅ Logo terupload dan tampil
- ✅ Nama dan alamat tersimpan
- ✅ Nomor WA tersimpan dan tampil di list
- ✅ Koordinat tersimpan

**Actual Result:** 📝

---

## TC-A03 — Buat kelas baru 🔴

**Langkah:**
1. Di sidebar, klik `Kelas`
2. Klik `Tambah Kelas`
3. Isi modal:
   - **Nama kelas:** `Kids Class`
   - **Kapasitas:** `15`
   - **Harga/bulan:** `350000`
   - **Jam sesi:** `08:00` (time_start) dan `09:00` (time_end)
   - **Hari sesi:** klik tombol `Senin`, `Rabu`, `Jumat`
   - **Tujuan kelas:** `Memperkenalkan teknik dasar renang untuk anak`
   - **Tampilkan di landing page:** aktifkan toggle
4. Klik `Simpan kelas`

**Expected Result:**
- ✅ Modal tertutup
- ✅ Card kelas "Kids Class" muncul
- ✅ Kapasitas bar tampil `0/15`
- ✅ Jadwal Senin, Rabu, Jumat tampil

**Actual Result:** 📝

---

## TC-A04 — Buat kelas kedua 🔴

**Langkah:**
1. Klik `Tambah Kelas` lagi
2. Isi:
   - **Nama kelas:** `Teen Class`
   - **Kapasitas:** `12`
   - **Harga/bulan:** `400000`
   - **Jam sesi:** `15:00` – `16:30`
   - **Hari sesi:** `Selasa`, `Kamis`
   - **Tampilkan di landing page:** nonaktifkan
3. Klik `Simpan kelas`

**Expected Result:**
- ✅ Card kelas "Teen Class" muncul

**Actual Result:** 📝

---

## TC-A05 — Tambah aspek penilaian untuk kelas 🟡

**Langkah:**
1. Di card `Kids Class`, klik ikon `Aspek penilaian` (clipboard)
2. Di modal, isi form "Tambah Aspek Baru":
   - **Label aspek:** `Teknik gaya bebas`
   - **Tipe penilaian:** `Nilai 1–10`
   - Klik `Tambah Aspek`
3. Tambah aspek kedua:
   - **Label:** `Daya tahan`
   - **Tipe:** `Nilai 1–100`
   - Klik `Tambah Aspek`
4. Tambah aspek ketiga:
   - **Label:** `Catatan coach`
   - **Tipe:** `Teks bebas`
   - Klik `Tambah Aspek`

**Expected Result:**
- ✅ Setiap aspek muncul di daftar setelah klik tambah
- ✅ Ada tombol hapus per aspek

**Actual Result:** 📝

---

## TC-A06 — Buat akun coach baru 🔴

**Langkah:**
1. Di sidebar, klik `Coach`
2. Klik `Tambah Coach`
3. Isi modal:
   - **Nama lengkap:** `Rina Pelatih`
   - **Email:** `coach@nssjakarta.com`
   - **No HP / WA:** `085612345678`
   - **Spesialisasi:** `Renang anak`
   - **Password awal:** `coach123`
4. Klik `Buat Akun`

**Expected Result:**
- ✅ Modal form tertutup
- ✅ Muncul modal/popup "Akun Coach Dibuat" berisi:
  - Nama, email, dan password yang dibuat
  - Tombol `Kirim via WA` (karena phone diisi)
- ✅ Coach card muncul di halaman setelah popup ditutup

**Actual Result:** 📝

---

## TC-A07 — Popup credential coach — kirim via WA 🟡

**Langkah:**
1. Lanjut dari TC-A06, saat popup credential muncul
2. Klik `Kirim via WA`

**Expected Result:**
- ✅ WhatsApp terbuka dengan pesan berisi nama, email, dan password coach

**Actual Result:** 📝

---

## TC-A08 — Buat member baru (tipe Reguler) 🔴

**Langkah:**
1. Di sidebar, klik `Member`
2. Klik `Tambah Member`
3. Isi modal (form lengkap):
   - **Nama lengkap:** `Andi Murid`
   - **Tanggal lahir:** `2018-06-15`
   - **Jenis kelamin:** `Laki-laki`
   - **Nomor HP / WA:** `081111111111`
   - **HP milik siapa:** `Orang tua`
   - **Nama orang tua:** `Pak Andi`
   - **Nomor HP orang tua:** `082222222222`
   - **Alamat:** `Jl. Kebon Jeruk No. 5`
   - **Riwayat kesehatan:** `Tidak ada alergi`
   - **Tipe member:** `Reguler`
   - **Kelas:** pilih `Kids Class`
   - **Tanggal mulai:** (hari ini)
   - **Email:** `member@nssjakarta.com`
   - **Password:** `member123`
4. Klik `Buat Akun Member`

**Expected Result:**
- ✅ Modal tertutup
- ✅ Muncul popup credential member (nama, email, password)
- ✅ Member muncul di tabel member
- ✅ Ada tombol kirim via WA di popup

**Actual Result:** 📝

---

## TC-A09 — Buat member kedua (tipe Private) 🟡

**Langkah:**
1. Klik `Tambah Member` lagi
2. Isi:
   - **Nama lengkap:** `Dewi Private`
   - **Jenis kelamin:** `Perempuan`
   - **Nomor HP / WA:** `083333333333`
   - **HP milik siapa:** `Saya sendiri`
   - **Alamat:** `Jl. Mawar No. 3`
   - **Tipe member:** `Private`
   - **Email:** `private@nssjakarta.com`
   - **Password:** `private123`
3. Klik `Buat Akun Member`

**Expected Result:**
- ✅ Member tipe Private berhasil dibuat

**Actual Result:** 📝

---

---

# BLOK 6 — ADMIN PANEL: CLASS ACTIVITY & KELAS LIBUR

## TC-A10 — Assign coach ke kelas 🔴

> Cara assign coach ke kelas: melalui menu Kelas → Edit kelas, atau cek apakah ada UI assign coach di card kelas.

**Langkah:**
1. Di menu `Kelas`, pada card `Kids Class`, klik `Edit`
2. Cari section assign coach
3. Assign `Rina Pelatih` ke `Kids Class`
4. Simpan

**Expected Result:**
- ✅ Nama coach tampil di card kelas

**Actual Result:** 📝

---

## TC-A11 — Tandai kelas libur dari Class Activity 🔴

**Langkah:**
1. Di sidebar, klik `Class Activity`
2. Lihat tampilan kalender weekly
3. Klik kelas `Kids Class` di salah satu hari
4. Di modal detail, cari tombol/opsi untuk menandai libur
5. Input:
   - **Tanggal libur:** (pilih tanggal hari ini atau besok)
   - **Alasan:** `Kolam renovasi`
6. Simpan

**Expected Result:**
- ✅ Kelas yang ditandai libur tampil dengan style berbeda (abu-abu/dashed)
- ✅ Label alasan libur tampil

**Actual Result:** 📝

---

## TC-A12 — Batalkan status libur kelas 🟢

**Langkah:**
1. Di Class Activity, klik kelas yang sudah ditandai libur
2. Di modal, klik `Batalkan Libur`

**Expected Result:**
- ✅ Kelas kembali tampil normal (tidak ada label libur)

**Actual Result:** 📝

---

---

# BLOK 7 — ADMIN PANEL: ABSENSI COACH

## TC-A13 — Input absensi coach manual 🔴

**Langkah:**
1. Di sidebar, klik `Absensi Coach`
2. Klik `Tambah Absensi Manual`
3. Isi form:
   - **Coach:** `Rina Pelatih`
   - **Kelas:** `Kids Class`
   - **Tanggal:** (hari ini)
   - **Jam masuk:** `08:05`
   - **Catatan:** `Coach lupa Clock In, konfirmasi via WA`
4. Simpan

**Expected Result:**
- ✅ Record absensi muncul di tabel dengan label `Manual`
- ✅ Badge "Manual" tampil pada row tersebut

**Actual Result:** 📝

---

## TC-A14 — Edit absensi coach manual 🟡

**Langkah:**
1. Pada absensi yang baru dibuat (TC-A13), klik ikon edit (pensil)
2. Ubah **Jam masuk** menjadi: `08:15`
3. Simpan

**Expected Result:**
- ✅ Jam masuk berubah di tabel

**Actual Result:** 📝

---

## TC-A15 — Hapus absensi coach 🟡

**Langkah:**
1. Pada absensi manual, klik ikon hapus (trash)
2. Konfirmasi di dialog konfirmasi

**Expected Result:**
- ✅ Record absensi hilang dari tabel

**Actual Result:** 📝

---

---

# BLOK 8 — ADMIN PANEL: PENGUMUMAN

## TC-A16 — Buat pengumuman untuk semua member 🟡

**Langkah:**
1. Di sidebar, klik `Pengumuman`
2. Klik `Buat Pengumuman`
3. Isi:
   - **Judul:** `Libur Hari Raya`
   - **Isi:** `Kelas diliburkan selama 3 hari pada tanggal 20-22 Juni 2026.`
   - **Target:** biarkan `Semua member` terpilih (toggle target_all)
   - **Tanggal kadaluarsa:** `2026-06-23`
4. Klik `Simpan`

**Expected Result:**
- ✅ Pengumuman muncul di daftar
- ✅ Tag "Semua member" tampil

**Actual Result:** 📝

---

## TC-A17 — Buat pengumuman untuk kelas tertentu 🟡

**Langkah:**
1. Klik `Buat Pengumuman`
2. Isi:
   - **Judul:** `Jadwal Kids Class berubah`
   - **Isi:** `Kids Class minggu depan dimulai pukul 09:00.`
   - **Target:** pilih `Kids Class` dari chip kelas (nonaktifkan "semua member")
   - **Tanggal kadaluarsa:** (kosongkan)
3. Klik `Simpan`

**Expected Result:**
- ✅ Pengumuman muncul dengan label kelas `Kids Class`

**Actual Result:** 📝

---

---

# BLOK 9 — ADMIN PANEL: IZIN

## TC-A18 — Admin buat izin coach langsung 🔴

**Langkah:**
1. Di sidebar, klik `Izin`
2. Pastikan tab `Izin Coach` aktif
3. Klik tombol `Buat Izin`
4. Isi modal:
   - **Coach:** `Rina Pelatih`
   - **Jenis izin:** `Sakit`
   - **Tanggal mulai:** (besok)
   - **Tanggal selesai:** (besok)
   - **Kelas yang ditinggalkan:** klik chip `Kids Class`
   - **Coach pengganti:** (kosongkan)
   - **Keterangan:** `Demam`
5. Klik `Buat Izin`

**Expected Result:**
- ✅ Izin muncul di list dengan status `Disetujui`
- ✅ `created_by_admin: true` tersimpan di DB

**Actual Result:** 📝

---

## TC-A19 — Admin buat izin member langsung 🔴

**Langkah:**
1. Di `Izin`, klik tab `Izin Member`
2. Klik `Buat Izin`
3. Isi:
   - **Member:** `Andi Murid`
   - **Jenis izin:** `Izin`
   - **Tanggal mulai:** (besok)
   - **Tanggal selesai:** (besok)
   - **Kelas:** klik chip `Kids Class`
4. Klik `Buat Izin`

**Expected Result:**
- ✅ Izin muncul di tab Izin Member dengan status `Disetujui`

**Actual Result:** 📝

---

---

# BLOK 10 — ADMIN PANEL: PEMBAYARAN

## TC-A20 — Generate tagihan bulanan 🔴

**Langkah:**
1. Di sidebar, klik `Pembayaran`
2. Di bagian atas, pastikan bulan sudah terpilih (contoh: `2026-05`)
3. Klik `Generate Tagihan`
4. Konfirmasi di dialog

**Expected Result:**
- ✅ Tagihan otomatis dibuat untuk semua member reguler aktif
- ✅ Tagihan `Andi Murid` muncul dengan nominal Rp 350.000
- ✅ Toast sukses tampil

**Actual Result:** 📝

---

## TC-A21 — Verifikasi pembayaran member 🔴

**Langkah:**
1. Di tabel tagihan, temukan tagihan `Andi Murid` dengan status `Belum bayar`
2. Klik `Verifikasi`

**Expected Result:**
- ✅ Status tagihan berubah menjadi `Lunas`
- ✅ Kolom `verified_by` terisi di DB

**Actual Result:** 📝

---

---

# BLOK 11 — ADMIN PANEL: APPROVEMENT (REGISTRASI)

## TC-A22 — Review dan approve registrasi member 🔴

> Pastikan TC-R02 sudah dijalankan sehingga ada data registrasi.

**Langkah:**
1. Di sidebar, klik `Approvement`
2. Temukan registrasi `Budi Santoso`
3. Klik untuk melihat detail
4. Klik `Approve`
5. Lengkapi data member yang tersisa (email, password, tipe, kelas)

**Expected Result:**
- ✅ Status registrasi berubah ke `Approved`
- ✅ Member baru muncul di menu Member

**Actual Result:** 📝

---

## TC-A23 — Tolak registrasi member 🟡

**Langkah:**
1. Jalankan TC-R02 sekali lagi dengan nama berbeda untuk mendapat data baru
2. Di Approvement, klik registrasi tersebut
3. Klik `Tolak`

**Expected Result:**
- ✅ Status berubah ke `Rejected`
- ✅ Data tetap ada di history (tidak hilang)

**Actual Result:** 📝

---

---

# BLOK 12 — ADMIN PANEL: RAPOR

## TC-A24 — Buka periode rapor 🔴

**Langkah:**
1. Di sidebar, klik `Rapor`
2. Klik `Buat Periode Rapor`
3. Isi:
   - **Label:** `Semester 1 — 2026`
   - **Tanggal mulai:** `2026-06-01`
   - **Tanggal selesai:** `2026-06-30`
4. Simpan

**Expected Result:**
- ✅ Periode rapor muncul di list dengan status `Buka`
- ✅ Menu rapor di coach page akan aktif

**Actual Result:** 📝

---

---

# BLOK 13 — ADMIN PANEL: SUSPEND MEMBER & COACH

## TC-A25 — Suspend member 🟡

**Langkah:**
1. Di menu `Member`, klik ikon detail member `Andi Murid`
2. Klik `Suspend`
3. Isi:
   - **Alasan:** `Test suspend`
   - **Suspend berakhir:** (3 hari dari sekarang)
4. Klik `Terapkan Suspend`

**Expected Result:**
- ✅ Status member berubah ke `Suspend`
- ✅ Badge merah/kuning tampil di card member
- ✅ Member tidak muncul di hitungan aktif dashboard

**Actual Result:** 📝

---

## TC-A26 — Akhiri suspend member 🟡

**Langkah:**
1. Di detail member `Andi Murid` (masih suspend)
2. Klik `Akhiri Suspend`

**Expected Result:**
- ✅ Status member kembali aktif
- ✅ Badge suspend hilang

**Actual Result:** 📝

---

## TC-A27 — Suspend coach 🟡

**Langkah:**
1. Di menu `Coach`, pada card `Rina Pelatih`, klik `Suspend`
2. Isi:
   - **Alasan:** `Test suspend coach`
   - **Suspend berakhir:** (2 hari dari sekarang)
3. Klik `Terapkan Suspend`

**Expected Result:**
- ✅ Badge `Suspend` muncul di card coach
- ✅ Info suspend dan tanggal berakhir tampil

**Actual Result:** 📝

---

## TC-A28 — Akhiri suspend coach 🟡

**Langkah:**
1. Pada card coach yang disuspend, klik `Akhiri Suspend`

**Expected Result:**
- ✅ Status coach kembali aktif

**Actual Result:** 📝

---

---

# BLOK 14 — COACH PAGE

> Login sebagai coach: `coach@nssjakarta.com` / `coach123`

## TC-C01 — Login berhasil sebagai Coach 🔴

**Langkah:**
1. Buka `/login`
2. Isi email dan password coach
3. Klik `Masuk`

**Expected Result:**
- ✅ Redirect ke `/coach`
- ✅ Nama coach tampil di halaman

**Actual Result:** 📝

---

## TC-C02 — Home tab: kelas hari ini tampil 🔴

**Langkah:**
1. Lihat tab `Home` (default)

**Expected Result:**
- ✅ Kelas `Kids Class` tampil jika hari ini adalah Senin, Rabu, atau Jumat
- ✅ Tombol `Clock In` tampil (jika dalam window waktu: 1 jam sebelum–sesudah sesi)
- ✅ Jika di luar window: teks "Di luar window — hubungi admin" tampil

**Actual Result:** 📝

---

## TC-C03 — Kelas libur tampil dengan label di Home 🔴

> Pastikan TC-A11 sudah dijalankan dan kelas ditandai libur hari ini.

**Langkah:**
1. Lihat tab `Home`
2. Cari kelas yang sudah ditandai libur

**Expected Result:**
- ✅ Badge `Libur` tampil pada card kelas tersebut
- ✅ Tombol `Clock In` tidak tampil untuk kelas libur

**Actual Result:** 📝

---

## TC-C04 — Isi spreadsheet program kelas 🔴

**Langkah:**
1. Klik tab `Kelas`
2. Pada card `Kids Class`, klik tombol `Program`
3. Di modal "Spreadsheet Program":
   - Pilih bulan (contoh: `2026-06`)
   - **Week 1 — Topik:** `Perkenalan teknik dasar`
   - **Week 2 — Topik:** `Latihan gaya bebas`
   - **Week 3 — Topik:** `Gaya dada pemula`
   - **Week 4 — Topik:** `Evaluasi progress`
4. Klik `Simpan program`

**Expected Result:**
- ✅ Toast sukses tampil
- ✅ Modal tertutup
- ✅ Data tersimpan (tidak muncul warning "belum isi" di Home)

**Actual Result:** 📝

---

## TC-C05 — Ajukan izin dari coach page 🔴

**Langkah:**
1. Di tab `Home`, klik `Ajukan Izin`
2. Isi form:
   - **Jenis:** `Sakit`
   - **Tanggal mulai:** (besok)
   - **Tanggal selesai:** (besok)
   - **Kelas terdampak:** pilih `Kids Class`
   - **Alasan:** `Flu`
3. Klik `Submit`

**Expected Result:**
- ✅ Pop up konfirmasi tampil: "Pengajuan berhasil, menunggu persetujuan"
- ✅ Izin masuk ke `Izin Coach` di admin panel dengan status `Menunggu`

**Actual Result:** 📝

---

## TC-C06 — Admin setujui izin dari coach page 🔴

**Langkah:**
1. Login sebagai admin
2. Menu `Izin` → tab `Izin Coach`
3. Temukan izin dari `Rina Pelatih` dengan status `Menunggu`
4. Klik `Setujui`
5. Di modal assign pengganti, biarkan kosong lalu klik `Setujui Izin`

**Expected Result:**
- ✅ Status izin berubah ke `Disetujui`
- ✅ Login kembali sebagai coach: tombol `Clock In` tidak muncul untuk kelas di tanggal izin

**Actual Result:** 📝

---

## TC-C07 — Admin tolak izin member dengan alasan 🔴

**Langkah:**
1. Pastikan ada izin member dengan status Menunggu (dari TC-A19 atau member mengajukan sendiri)
2. Login sebagai admin → menu `Izin` → tab `Izin Member`
3. Klik `Tolak` pada izin yang pending
4. Di modal "Tolak Izin Member":
   - Isi **Alasan penolakan:** `Tidak ada keterangan yang cukup`
5. Klik `Konfirmasi Tolak`

**Expected Result:**
- ✅ Status berubah ke `Ditolak`
- ✅ Alasan tersimpan di DB (`reject_reason`)

**Actual Result:** 📝

---

## TC-C08 — Absensi manual member oleh coach 🔴

**Langkah:**
1. Login sebagai coach
2. Di tab `Absensi`, klik `Absen Manual`
3. Pilih **Kelas:** `Kids Class`
4. Pilih **Tanggal:** (hari ini)
5. Dari daftar member yang muncul:
   - `Andi Murid` → klik `Hadir`
6. Klik `Submit`

**Expected Result:**
- ✅ Absensi member tercatat
- ✅ Data masuk ke `member_attendances`

**Actual Result:** 📝

---

## TC-C09 — Isi rapor member 🔴

> Pastikan periode rapor sudah dibuka (TC-A24)

**Langkah:**
1. Login sebagai coach
2. Klik tab `Rapor`
3. Klik `Isi Rapor` untuk kelas `Kids Class`
4. Pilih member `Andi Murid`
5. Isi penilaian:
   - **Teknik gaya bebas (1–10):** `8`
   - **Daya tahan (1–100):** `75`
   - **Catatan coach:** `Perkembangan sangat baik`
6. Simpan

**Expected Result:**
- ✅ Rapor tersimpan
- ✅ Status berubah dari "Belum diisi" ke "Terisi"

**Actual Result:** 📝

---

## TC-C10 — Generate invoice bulanan 🟡

**Langkah:**
1. Login sebagai coach
2. Klik tab `Invoice`
3. Pilih bulan
4. Pilih kelas yang sudah diabsen
5. Klik `Generate Invoice`

**Expected Result:**
- ✅ Invoice tampil / bisa didownload
- ✅ Invoice masuk ke owner panel

**Actual Result:** 📝

---

## TC-C11 — Tambah sertifikasi dari coach page 🟡

**Langkah:**
1. Klik tab `Profile`
2. Di section Sertifikasi, klik `Tambah Sertifikasi`
3. Isi:
   - **Nama sertifikasi:** `Renang Profesional`
   - **Nama lembaga:** `PRSI`
   - **Berlaku dari:** `2025-01-01`
   - **Berlaku hingga:** `2027-01-01`
4. Submit

**Expected Result:**
- ✅ Sertifikasi muncul dengan status `Menunggu`
- ✅ Muncul di menu Approvement admin

**Actual Result:** 📝

---

## TC-C12 — Admin approve sertifikasi coach 🟡

**Langkah:**
1. Login sebagai admin
2. Menu `Approvement`
3. Temukan sertifikasi `Renang Profesional` dari `Rina Pelatih`
4. Klik `Approve`

**Expected Result:**
- ✅ Status sertifikasi berubah ke `Approved`
- ✅ Sertifikasi tampil di profil coach sebagai aktif

**Actual Result:** 📝

---

---

# BLOK 15 — MEMBER PAGE

> Login sebagai member: `member@nssjakarta.com` / `member123`

## TC-M01 — Login berhasil sebagai Member 🔴

**Langkah:**
1. Buka `/login`
2. Isi email dan password member
3. Klik `Masuk`

**Expected Result:**
- ✅ Redirect ke `/member`
- ✅ Nama member tampil

**Actual Result:** 📝

---

## TC-M02 — Home: pengumuman tampil 🔴

> Pastikan TC-A16 dan TC-A17 sudah dijalankan.

**Langkah:**
1. Lihat tab `Home`

**Expected Result:**
- ✅ Pengumuman "Libur Hari Raya" tampil (karena target semua member)
- ✅ Pengumuman "Jadwal Kids Class berubah" tampil (karena member ini di Kids Class)

**Actual Result:** 📝

---

## TC-M03 — Home: card tagihan belum bayar tampil 🔴

> Pastikan TC-A20 sudah dijalankan dan tagihan belum diverifikasi.

**Langkah:**
1. Lihat tab `Home` (dengan tagihan unpaid)

**Expected Result:**
- ✅ Card pengingat tagihan tampil dengan nominal dan periode
- ✅ Tombol `Lihat Tagihan` dan `Hubungi Admin Cabang` tersedia

**Actual Result:** 📝

---

## TC-M04 — Jadwal: kelas tampil dengan label libur 🔴

> Pastikan TC-A11 sudah dijalankan untuk menandai libur hari ini.

**Langkah:**
1. Klik tab `Jadwal`

**Expected Result:**
- ✅ Card `Kids Class` tampil dengan jadwal lengkap
- ✅ Jika hari ini kelas libur: badge `Libur Hari Ini` tampil di card
- ✅ Kelas agak transparan (opacity turun) saat libur

**Actual Result:** 📝

---

## TC-M05 — Absensi: history tampil dengan benar 🔴

> Pastikan TC-C08 sudah dijalankan.

**Langkah:**
1. Klik tab `Absensi`
2. Perhatikan stats dan list

**Expected Result:**
- ✅ Angka `Hadir` bertambah sesuai absensi yang diinput coach
- ✅ Baris absensi tampil: tanggal, nama kelas, status `Hadir`
- ✅ Icon hijau untuk Hadir, merah untuk Absen, kuning untuk Izin/Sakit

**Actual Result:** 📝

---

## TC-M06 — Tagihan: detail tagihan tampil dengan diskon 🟡

> Catatan: test ini valid jika ada tagihan dengan diskon. Jika belum, skip bagian diskon.

**Langkah:**
1. Klik tab `Tagihan`
2. Di tab `Tagihan Aktif`, klik tagihan yang ada

**Expected Result:**
- ✅ Detail tagihan tampil: periode, nominal, diskon (jika ada), total
- ✅ Tombol `Hubungi Admin` membuka WhatsApp dengan template pesan

**Actual Result:** 📝

---

## TC-M07 — Tagihan pindah ke histori setelah diverifikasi 🔴

> Pastikan TC-A21 sudah dijalankan (verifikasi tagihan).

**Langkah:**
1. Klik tab `Tagihan`
2. Cek tab `Histori`

**Expected Result:**
- ✅ Tagihan yang sudah verified muncul di tab Histori
- ✅ Tab `Tagihan Aktif` tidak lagi menampilkan tagihan tersebut
- ✅ Card pengingat di Home hilang

**Actual Result:** 📝

---

## TC-M08 — Ajukan izin dari member page 🔴

**Langkah:**
1. Klik tab `Izin`
2. Klik `Ajukan Izin Baru`
3. Isi:
   - **Kelas:** klik chip `Kids Class`
   - **Tanggal mulai:** (besok)
   - **Jenis izin:** `Ujian`
   - **Alasan:** `Ujian semester`
4. Klik `Submit`

**Expected Result:**
- ✅ Pop up "Pengajuan berhasil, menunggu persetujuan" tampil
- ✅ Izin muncul di list dengan status `Menunggu`
- ✅ Di admin panel, izin masuk ke tab Izin Member

**Actual Result:** 📝

---

## TC-M09 — Status izin update setelah admin setujui 🔴

**Langkah:**
1. Login sebagai admin
2. Menu `Izin` → tab `Izin Member`
3. Setujui izin dari `Andi Murid`
4. Login kembali sebagai member
5. Buka tab `Izin`

**Expected Result:**
- ✅ Status izin berubah dari `Menunggu` ke `Disetujui`

**Actual Result:** 📝

---

## TC-M10 — Alasan penolakan tampil di member page 🔴

> Pastikan TC-C07 dijalankan (admin tolak izin dengan alasan).

**Langkah:**
1. Login sebagai member yang izinnya ditolak
2. Klik tab `Izin`

**Expected Result:**
- ✅ Izin yang ditolak tampil dengan status `Ditolak`
- ✅ Alasan penolakan dari admin tampil di bawah status

**Actual Result:** 📝

---

## TC-M11 — Rapor tampil dan bisa direview 🔴

> Pastikan TC-C09 sudah dijalankan.

**Langkah:**
1. Login sebagai member
2. Klik tab `Rapor`
3. Klik `Buka` pada rapor yang tersedia
4. Di halaman rapor, beri review coach:
   - Klik bintang ke-4
   - Isi ulasan: `Coach sabar dan menyenangkan`
   - Klik `Kirim Review`

**Expected Result:**
- ✅ Rapor tampil dengan nilai dan catatan coach
- ✅ Review berhasil tersimpan
- ✅ Review muncul di coach page (menu Rapor coach)

**Actual Result:** 📝

---

## TC-M12 — QR Code tersedia di Profile 🟡

**Langkah:**
1. Klik tab `Profile` (ikon `Saya`)
2. Scroll ke bagian QR Code

**Expected Result:**
- ✅ QR code member tampil
- ✅ Ada tombol download atau opsi simpan

**Actual Result:** 📝

---

---

# BLOK 16 — SCHOOL PAGE

## TC-SC01 — Buat akun school dari admin panel 🔴

**Langkah:**
1. Login sebagai admin
2. Di sidebar, klik `School Panel`
3. Klik `Tambah Sekolah`
4. Isi:
   - **Nama sekolah:** `SD Harapan Bangsa`
   - **Email:** `school@harapanbangsa.com`
   - **Password:** `school123`
5. Simpan

**Expected Result:**
- ✅ Data sekolah muncul di list
- ✅ Muncul popup dengan credential sekolah

**Actual Result:** 📝

---

## TC-SC02 — Login berhasil sebagai School 🔴

**Langkah:**
1. Buka `/login`
2. Isi **Email:** `school@harapanbangsa.com`
3. Isi **Password:** `school123`
4. Klik `Masuk`

**Expected Result:**
- ✅ Redirect ke `/school`
- ✅ School page tampil dengan nama sekolah

**Actual Result:** 📝

---

## TC-SC03 — School page menampilkan rapor siswa 🔴

> Pastikan ada member dengan tipe `Afiliasi Sekolah` yang di-assign ke sekolah ini, dan rapornya sudah diisi coach.

**Langkah:**
1. Login sebagai school
2. Lihat halaman School Page

**Expected Result:**
- ✅ List siswa afiliasi tampil
- ✅ Status rapor tampil: "Tersedia" / "Belum diisi"
- ✅ Tombol `Lihat` aktif untuk rapor yang tersedia

**Actual Result:** 📝

---

## TC-SC04 — Lihat detail rapor siswa 🟡

**Langkah:**
1. Klik tombol `Lihat` pada salah satu siswa
2. Modal rapor terbuka

**Expected Result:**
- ✅ Nilai, catatan coach, dan info siswa tampil lengkap
- ✅ Tidak ada data keuangan sama sekali

**Actual Result:** 📝

---

---

# BLOK 17 — EDGE CASES & VALIDASI

## TC-E01 — Member tersuspend tidak bisa login 🔴

> Pastikan TC-A25 dijalankan dan member masih dalam status suspend.

**Langkah:**
1. Logout dari akun apapun
2. Coba login sebagai member yang disuspend

**Expected Result:**
- ✅ Login gagal dengan pesan bahwa akun tidak aktif
- ✅ Tidak bisa masuk ke member page

**Actual Result:** 📝

---

## TC-E02 — Coach tersuspend tidak bisa Clock In 🔴

> Pastikan TC-A27 dijalankan dan coach masih suspend.

**Langkah:**
1. Login sebagai coach yang disuspend

**Expected Result:**
- ✅ Banner suspend tampil dengan alasan dan countdown
- ✅ Semua fitur (Clock In, Invoice, Rapor) tidak bisa diakses

**Actual Result:** 📝

---

## TC-E03 — Kapasitas kelas penuh saat assign member 🟡

**Langkah:**
1. Ubah kapasitas `Kids Class` menjadi `1` (untuk test)
2. Tambah member baru dan assign ke `Kids Class`

**Expected Result:**
- ✅ Muncul peringatan "Kelas sudah mencapai kapasitas"
- ✅ Admin masih bisa override (lanjut assign)

**Actual Result:** 📝

---

## TC-E04 — Role redirect otomatis setelah login 🔴

**Langkah:**
1. Login sebagai owner → cek redirect ke `/owner`
2. Login sebagai admin → cek redirect ke `/admin`
3. Login sebagai coach → cek redirect ke `/coach`
4. Login sebagai member → cek redirect ke `/member`
5. Login sebagai school → cek redirect ke `/school`

**Expected Result:**
- ✅ Setiap role diarahkan ke halaman yang tepat

**Actual Result:** 📝

---

## TC-E05 — Akses halaman tanpa login diredirect ke login 🔴

**Langkah:**
1. Logout dari semua sesi
2. Coba akses langsung: `/admin`, `/owner`, `/coach`, `/member`, `/school`

**Expected Result:**
- ✅ Semua URL diredirect ke `/login`

**Actual Result:** 📝

---

## TC-E06 — Navigasi antar menu tidak ada loading 🔴

**Langkah:**
1. Login sebagai admin
2. Klik menu Dashboard → Kelas → Member → Pembayaran → Izin → berulang kali dengan cepat

**Expected Result:**
- ✅ Perpindahan menu **instan** — tidak ada skeleton loading atau blank screen
- ✅ Data per menu tetap muncul (bisa ada loading data awal, tapi UI tidak blank)

**Actual Result:** 📝

---

## TC-E07 — Tombol WA dari member page menggunakan nomor settings admin 🔴

> Pastikan TC-A02 sudah mengisi nomor WA admin.

**Langkah:**
1. Login sebagai member
2. Di tab `Tagihan`, klik `Hubungi Admin Cabang`

**Expected Result:**
- ✅ Link WA menggunakan nomor `082110009667` (dari settings admin)
- ✅ Pesan template otomatis terisi

**Actual Result:** 📝

---

---

# RINGKASAN TEST

| No  | Test ID   | Nama Test                                   | Priority | Status |
|-----|-----------|---------------------------------------------|----------|--------|
| 1   | TC-L01    | Landing page dapat diakses                  | 🔴       | 📝     |
| 2   | TC-L02    | Tombol CTA ke WhatsApp                      | 🟡       | 📝     |
| 3   | TC-L03    | Link navbar berfungsi                       | 🟢       | 📝     |
| 4   | TC-L04    | FAQ accordion                               | 🟢       | 📝     |
| 5   | TC-L05    | Akses halaman register                      | 🟡       | 📝     |
| 6   | TC-R01    | Register — konsultasi WA                    | 🟡       | 📝     |
| 7   | TC-R02    | Register — isi form & submit                | 🔴       | 📝     |
| 8   | TC-R03    | Register — validasi field kosong            | 🟡       | 📝     |
| 9   | TC-LOG01  | Login sebagai Owner                         | 🔴       | 📝     |
| 10  | TC-LOG02  | Login kredensial salah                      | 🟡       | 📝     |
| 11  | TC-LOG03  | Lupa password modal                         | 🟡       | 📝     |
| 12  | TC-O01    | Owner dashboard                             | 🔴       | 📝     |
| 13  | TC-O02    | Buat cabang baru                            | 🔴       | 📝     |
| 14  | TC-O03    | Edit cabang                                 | 🟡       | 📝     |
| 15  | TC-O04    | Buat akun admin                             | 🔴       | 📝     |
| 16  | TC-O05    | Menu Kelas (view only)                      | 🟢       | 📝     |
| 17  | TC-O06    | Logout owner                                | 🟡       | 📝     |
| 18  | TC-A01    | Login sebagai Admin                         | 🔴       | 📝     |
| 19  | TC-A02    | Setup settings cabang                       | 🔴       | 📝     |
| 20  | TC-A03    | Buat kelas baru                             | 🔴       | 📝     |
| 21  | TC-A04    | Buat kelas kedua                            | 🔴       | 📝     |
| 22  | TC-A05    | Tambah aspek penilaian                      | 🟡       | 📝     |
| 23  | TC-A06    | Buat akun coach baru                        | 🔴       | 📝     |
| 24  | TC-A07    | Credential popup coach — kirim WA           | 🟡       | 📝     |
| 25  | TC-A08    | Buat member Reguler                         | 🔴       | 📝     |
| 26  | TC-A09    | Buat member Private                         | 🟡       | 📝     |
| 27  | TC-A10    | Assign coach ke kelas                       | 🔴       | 📝     |
| 28  | TC-A11    | Tandai kelas libur                          | 🔴       | 📝     |
| 29  | TC-A12    | Batalkan status libur                       | 🟢       | 📝     |
| 30  | TC-A13    | Input absensi manual coach                  | 🔴       | 📝     |
| 31  | TC-A14    | Edit absensi coach                          | 🟡       | 📝     |
| 32  | TC-A15    | Hapus absensi coach                         | 🟡       | 📝     |
| 33  | TC-A16    | Buat pengumuman semua member                | 🟡       | 📝     |
| 34  | TC-A17    | Buat pengumuman kelas tertentu              | 🟡       | 📝     |
| 35  | TC-A18    | Admin buat izin coach langsung              | 🔴       | 📝     |
| 36  | TC-A19    | Admin buat izin member langsung             | 🔴       | 📝     |
| 37  | TC-A20    | Generate tagihan bulanan                    | 🔴       | 📝     |
| 38  | TC-A21    | Verifikasi pembayaran                       | 🔴       | 📝     |
| 39  | TC-A22    | Approve registrasi member                   | 🔴       | 📝     |
| 40  | TC-A23    | Tolak registrasi member                     | 🟡       | 📝     |
| 41  | TC-A24    | Buka periode rapor                          | 🔴       | 📝     |
| 42  | TC-A25    | Suspend member                              | 🟡       | 📝     |
| 43  | TC-A26    | Akhiri suspend member                       | 🟡       | 📝     |
| 44  | TC-A27    | Suspend coach                               | 🟡       | 📝     |
| 45  | TC-A28    | Akhiri suspend coach                        | 🟡       | 📝     |
| 46  | TC-C01    | Login sebagai Coach                         | 🔴       | 📝     |
| 47  | TC-C02    | Home coach: kelas hari ini                  | 🔴       | 📝     |
| 48  | TC-C03    | Kelas libur tampil di Home coach            | 🔴       | 📝     |
| 49  | TC-C04    | Isi spreadsheet program                     | 🔴       | 📝     |
| 50  | TC-C05    | Ajukan izin dari coach page                 | 🔴       | 📝     |
| 51  | TC-C06    | Admin setujui izin coach                    | 🔴       | 📝     |
| 52  | TC-C07    | Admin tolak izin member dengan alasan       | 🔴       | 📝     |
| 53  | TC-C08    | Absensi manual member oleh coach            | 🔴       | 📝     |
| 54  | TC-C09    | Isi rapor member                            | 🔴       | 📝     |
| 55  | TC-C10    | Generate invoice                            | 🟡       | 📝     |
| 56  | TC-C11    | Tambah sertifikasi                          | 🟡       | 📝     |
| 57  | TC-C12    | Admin approve sertifikasi                   | 🟡       | 📝     |
| 58  | TC-M01    | Login sebagai Member                        | 🔴       | 📝     |
| 59  | TC-M02    | Home: pengumuman tampil                     | 🔴       | 📝     |
| 60  | TC-M03    | Home: card tagihan tampil                   | 🔴       | 📝     |
| 61  | TC-M04    | Jadwal: label libur tampil                  | 🔴       | 📝     |
| 62  | TC-M05    | Absensi: history tampil                     | 🔴       | 📝     |
| 63  | TC-M06    | Tagihan: detail dengan diskon               | 🟡       | 📝     |
| 64  | TC-M07    | Tagihan pindah ke histori                   | 🔴       | 📝     |
| 65  | TC-M08    | Ajukan izin dari member page                | 🔴       | 📝     |
| 66  | TC-M09    | Status izin update setelah admin setujui    | 🔴       | 📝     |
| 67  | TC-M10    | Alasan penolakan tampil di member           | 🔴       | 📝     |
| 68  | TC-M11    | Rapor tampil dan bisa direview              | 🔴       | 📝     |
| 69  | TC-M12    | QR Code tersedia di Profile                 | 🟡       | 📝     |
| 70  | TC-SC01   | Buat akun school dari admin                 | 🔴       | 📝     |
| 71  | TC-SC02   | Login sebagai School                        | 🔴       | 📝     |
| 72  | TC-SC03   | School page tampilkan rapor siswa           | 🔴       | 📝     |
| 73  | TC-SC04   | Lihat detail rapor siswa                    | 🟡       | 📝     |
| 74  | TC-E01    | Member tersuspend tidak bisa login          | 🔴       | 📝     |
| 75  | TC-E02    | Coach tersuspend tidak bisa Clock In        | 🔴       | 📝     |
| 76  | TC-E03    | Kapasitas kelas penuh — peringatan          | 🟡       | 📝     |
| 77  | TC-E04    | Role redirect otomatis setelah login        | 🔴       | 📝     |
| 78  | TC-E05    | Akses tanpa login redirect ke login         | 🔴       | 📝     |
| 79  | TC-E06    | Navigasi antar menu tidak ada loading       | 🔴       | 📝     |
| 80  | TC-E07    | Tombol WA dari member page pakai nomor admin| 🔴       | 📝     |

---

**Total: 80 test cases**
- 🔴 Critical: 46
- 🟡 High: 25
- 🟢 Medium: 9

---

*Dokumen ini dibuat berdasarkan Next Swimming School Project Document dan flows yang sudah diverifikasi terhadap codebase versi terkini.*
