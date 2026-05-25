# Next Swimming School — Complete User Flows

> Dokumen ini menjelaskan secara lengkap semua flow yang bisa dilakukan oleh setiap role: Owner, Admin, Coach, Member, dan School. Disusun dari awal (setup) hingga operasional harian. Semua gap yang ditemukan pada review sebelumnya sudah diintegrasikan di sini.

---

# DAFTAR ISI

1. [Flow Owner](#1-flow-owner)
2. [Flow Admin](#2-flow-admin)
3. [Flow Coach](#3-flow-coach)
4. [Flow Member](#4-flow-member)
5. [Flow School](#5-flow-school)
6. [Flow Lintas Role (Cross-Role Flows)](#6-flow-lintas-role-cross-role-flows)

---
---

# 1. FLOW OWNER

## 1.1 Setup Awal Sistem (One-Time)

Urutan yang harus dilakukan owner saat sistem pertama kali dijalankan.

```
1. Owner login dengan akun owner yang sudah dibuat saat deploy awal
2. Masuk ke Owner Panel → Dashboard
3. Buat cabang pertama (Menu Cabang → Create)
   - Isi: nama cabang, alamat, deskripsi (opsional)
4. Buat akun admin untuk cabang tersebut (Menu Admin → Create)
   - Isi: nama admin, email, password, assign ke cabang
5. Kirimkan credential ke admin cabang
6. Owner selesai — setup lanjutan dilakukan oleh admin cabang
```

## 1.2 Menambah Cabang Baru

```
1. Menu Cabang → Create Cabang Baru → isi data cabang → simpan
2. Menu Admin → Create akun admin untuk cabang baru
3. Kirimkan credential ke admin cabang baru
```

## 1.3 Mengelola Tarif Coach

Dilakukan setelah admin cabang sudah membuat data kelas.

```
1. Menu Settings Tarif → pilih cabang dari dropdown
2. Tampil list semua kelas di cabang tersebut
3. Input tarif umum per kelas (nominal yang dibayarkan ke coach per sesi)
4. (Opsional) Atur tarif khusus per coach jika ada coach dengan tarif berbeda
   → Tarif khusus override tarif umum di invoice coach tersebut
5. Simpan
```

## 1.4 Memantau Invoice Coach

```
1. Menu Invoice Coach
2. Lihat list semua invoice dari seluruh cabang — notifikasi masuk saat ada invoice baru
3. Klik invoice → lihat detail: kelas yang diajar, tarif per kelas, total, rekening coach
4. Lakukan pembayaran ke rekening coach secara manual (di luar sistem)
```

## 1.5 Memantau Semua Cabang dari Owner Panel

```
1. Dashboard Owner: total member, coach, dan kelas aktif secara keseluruhan + breakdown per cabang
2. Pantau kondisi tiap cabang dari satu tampilan
```

## 1.6 Masuk ke Admin Panel Cabang Tertentu

```
1. Pilih cabang → klik "Masuk ke Admin Panel Cabang"
2. Owner mendapat akses penuh setara admin di cabang tersebut
3. Untuk kembali: klik button "Kembali ke Owner Panel"
```

## 1.7 Memantau Semua Kelas di Seluruh Cabang

```
1. Menu Kelas di Owner Panel
2. Lihat list semua kelas dari semua cabang
3. Klik kelas → lihat detail: coach, daftar member, status spreadsheet program,
   history absensi coach dan member
```

---
---

# 2. FLOW ADMIN

## 2.1 Setup Awal Cabang (One-Time)

```
1. Admin login dengan credential dari owner → masuk ke Dashboard
2. Wajib pertama kali: Menu Settings
   - Upload logo cabang (rasio 1:1)
   - Input koordinat presisi lokasi cabang
   - Input nomor WhatsApp admin cabang (satu atau lebih)
     → Nomor ini dipakai otomatis oleh semua button "Hubungi Admin Cabang"
       di member page dan coach page
3. Buat data kelas (Menu Class → Create)
   - Isi semua field: nama, deskripsi, jadwal, kapasitas, harga, usia, lokasi
   - Toggle tampil di landing page jika perlu
   - (Opsional) Atur aspek penilaian untuk rapor kelas ini
4. Buat data coach (Menu Coach → Create)
   - Isi data coach, set email dan password
   - Assign ke cabang dan (opsional) langsung assign ke kelas
5. Buat data member pertama atau tunggu dari register page
6. Assign coach ke kelas yang belum memiliki coach
7. Setup selesai — sistem siap operasional
```

## 2.2 Membuat Data Kelas Baru

```
1. Menu Class → Create
2. Isi form lengkap termasuk kapasitas — kapasitas digunakan sebagai batas
   validasi saat assign member (muncul warning jika sudah penuh, admin bisa override)
3. Toggle "Tampilkan di Landing Page" jika perlu
4. Simpan
5. (Opsional) Detail kelas → atur Aspek Penilaian untuk rapor
6. Assign coach ke kelas
```

## 2.3 Membuat Data Member Baru (Langsung oleh Admin)

```
1. Menu Member → Create
2. Isi semua field:
   - Data personal (nama, lahir, gender, HP, alamat, riwayat kesehatan)
   - Tipe member (Reguler / Private / Afiliasi Sekolah)
   - Assign ke kelas — indikator kapasitas tiap kelas tampil di dropdown
   - Email dan password login
3. Isi field khusus admin: status pembayaran pertama, upload bukti transfer
4. Simpan
5. Pop up ringkasan + credential → kirim ke member/orang tua via button WhatsApp
6. QR code otomatis terbuat — download atau kirim via WhatsApp dari detail member
```

## 2.4 Meng-approve Registrasi Member dari Register Page

```
1. Notifikasi masuk di Dashboard (section Approvement) + notification center
2. Menu Approvement → pilih item registrasi
3. Review data → hubungi calon member via WhatsApp (manual, di luar sistem)
4. Setelah deal:
   - Input bukti transfer (wajib sebelum approve)
   - Klik Approve
5. Data otomatis masuk ke Menu Member → lengkapi data yang belum terisi
   (tipe member, assign kelas, email, password)
6. Kirim credential ke member via WhatsApp
```

## 2.5 Membuat Data Coach Baru

```
1. Menu Coach → cek dulu apakah coach sudah terdaftar di cabang lain
   - Jika sudah: klik "Assign Coach ke Cabang Ini" → selesai, credential tetap sama
   - Jika belum: lanjut Create
2. Isi form lengkap → assign ke cabang dan kelas → simpan
3. Pop up ringkasan + credential → kirim ke coach via button WhatsApp
4. Pantau label di list coach — jika "Belum Assign ke Kelas", segera assign
```

## 2.6 Mengelola Jadwal Kelas (Class Activity)

```
1. Menu Class Activity (default: mode Week)
2. Klik kelas di kalender → pop up modal: detail kelas, nama coach, daftar member,
   label penggantian coach, label kelas libur
3. Edit kelas langsung dari modal jika diperlukan

Input kelas libur:
4. Dari modal atau dari tombol "Tandai Libur": pilih kelas, tanggal/range, alasan
5. Simpan → efek otomatis:
   - Button Clock In hilang dari coach page pada tanggal tersebut
   - Absensi member tidak perlu diisi untuk sesi libur
   - Coach dan member mendapat info kelas libur di halaman home masing-masing
6. Admin bisa batalkan status libur kapan saja
```

## 2.7 Mengelola Izin Coach

```
A. Admin membuat izin langsung (proaktif):
   1. Menu Izin → Tab Izin Coach → Buat Izin Coach
   2. Pilih coach, jenis izin, tanggal, kelas terdampak
   3. (Opsional) Assign coach pengganti (dari list coach aktif yang tidak disuspend)
   4. Simpan → status langsung Disetujui
   5. Kelas otomatis dialihkan ke pengganti — muncul sementara di coach page pengganti
      dengan label "Pengganti" hanya untuk tanggal tersebut

B. Menyetujui pengajuan izin dari coach page:
   1. Notifikasi di Dashboard + notification center
   2. Menu Izin → Tab Izin Coach (atau dari Menu Approvement)
   3. Review → Setujui atau Tolak
   4. Jika disetujui dan coach belum assign pengganti: assign dari sini
   5. Sistem otomatis mengalihkan kelas, coach pengganti mendapat notifikasi
```

## 2.8 Mengelola Izin Member

```
A. Admin membuat izin member langsung (proaktif):
   1. Menu Izin → Tab Izin Member → Buat Izin Member
   2. Pilih member, jenis izin (Izin/Sakit/Ujian/Lainnya), tanggal/range tanggal
   3. Pilih kelas yang terdampak → Simpan → status langsung Disetujui
   4. Absensi member di hari dan kelas tersebut otomatis tercatat "Izin"
      → coach tidak perlu input manual

B. Menyetujui pengajuan izin dari member page:
   1. Notifikasi di Dashboard + notification center
   2. Menu Izin → Tab Izin Member → review → Setujui atau Tolak
   3. Jika ditolak: isi alasan penolakan (tampil di member page)
   4. Member mendapat notifikasi hasil keputusan
```

## 2.9 Mengelola Pembayaran Member

```
A. Generate tagihan bulanan (member Reguler):
   1. Menu Pembayaran → Tab Tagihan → "Generate Tagihan Bulanan" → pilih bulan
   2. Sistem buat tagihan untuk semua member reguler aktif
      berdasarkan harga kelas masing-masing
   3. Member yang sudah ada tagihan di bulan tersebut tidak akan di-generate ulang
   4. (Opsional) Edit tagihan tertentu untuk tambah diskon/pengurangan
   5. Member mendapat notifikasi tagihan baru di notification center

B. Membuat tagihan paket private:
   1. Menu Pembayaran → Tambah Tagihan Manual → pilih member private
   2. Input: jumlah sesi paket, nominal, tanggal mulai paket → simpan
   3. Sistem mulai melacak sisa sesi — berkurang otomatis setiap member hadir

C. Verifikasi pembayaran masuk:
   1. Terima konfirmasi bayar dari member (via WhatsApp / langsung)
   2. Menu Pembayaran → cari tagihan → klik "Verifikasi Pembayaran"
   3. Input: tanggal bayar, metode, upload bukti (opsional untuk tunai) → simpan
   4. Status tagihan berubah ke "Sudah Bayar"
   5. Member mendapat notifikasi di notification center
   6. Card pengingat di home member otomatis hilang
```

## 2.10 Menginput Absensi Coach Manual

```
Skenario: coach lupa Clock In dan sudah konfirmasi langsung ke admin

1. Coach hubungi admin secara langsung (di luar sistem)
2. Jika justifikasi dari coach diterima:
3. Menu Absensi Coach → klik "Tambah Absensi Manual"
4. Pilih coach, pilih kelas, pilih tanggal/jam sesi
5. Input catatan/alasan (opsional)
6. Simpan → data absensi terbuat dengan label "Manual — oleh Admin"
   beserta nama admin dan timestamp

Admin juga bisa:
- Edit absensi yang sudah ada (jika ada kesalahan data)
- Delete absensi yang tidak valid
Semua aksi manual diberi label transparan di history absensi coach page
```

## 2.11 Mengelola Suspend Coach

```
1. Menu Coach → Detail Coach → klik "Suspend Coach"
2. Input: alasan, tanggal mulai, durasi (hari) atau tanggal berakhir → simpan
3. Sistem cek: apakah coach ini satu-satunya coach di kelas tertentu?
   → Jika ya: alert otomatis di Dashboard dan Menu Coach
   → Admin perlu assign coach lain ke kelas tersebut
4. Coach masih bisa login tapi tidak bisa melakukan aktivitas
   → Tampil banner: alasan + countdown waktu tersisa

Akhiri suspend lebih awal:
5. Detail Coach → klik "Akhiri Suspend" → status coach langsung aktif kembali

Setelah durasi habis (otomatis):
6. Status coach otomatis kembali aktif, banner di coach page hilang
```

## 2.12 Mengelola Suspend Member

```
1. Menu Member → Detail Member → klik "Suspend Member"
2. Input: alasan, tanggal mulai, durasi (hari) atau tanggal berakhir → simpan
3. Member tidak bisa login selama masa suspend
4. Member tidak muncul di daftar absensi harian coach
5. Member tidak masuk hitungan member aktif di dashboard

Akhiri suspend lebih awal:
6. Detail Member → klik "Akhiri Suspend"

Setelah durasi habis:
7. Status member otomatis kembali aktif
```

## 2.13 Membuat Pengumuman untuk Member

```
1. Menu Pengumuman → Create
2. Isi: judul, isi teks, tanggal mulai berlaku, tanggal kadaluarsa (opsional)
3. Target: semua member di cabang ini, atau pilih kelas tertentu (multi-select)
4. Simpan → pengumuman aktif
5. Member yang menjadi target mendapat notifikasi di notification center
6. Pengumuman tampil di home member page sebagai banner/card

Menonaktifkan lebih awal:
7. Detail pengumuman → toggle nonaktif (tanpa harus hapus)

Setelah kadaluarsa:
8. Pengumuman otomatis tidak tampil di member page, tetap ada di history admin
```

## 2.14 Menyetujui Sertifikasi Coach

```
1. Notifikasi masuk di notification center
2. Menu Approvement → buka detail pengajuan sertifikasi
3. Review: nama, tanggal berlaku, foto sertifikat
4. Approve atau Tolak
5. Coach mendapat notifikasi hasil keputusan
6. Jika disetujui: sertifikasi tampil di profil coach dan halaman coach showcase landing page
```

## 2.15 Mengelola Periode Rapor

```
Membuka periode:
1. Menu Rapor → input tanggal mulai dan tanggal selesai → simpan
2. Menu rapor di coach page otomatis aktif

Memantau progress:
3. Menu Rapor → pantau siapa yang sudah/belum isi rapor
4. Pantau review member terhadap coach

Menutup / memperpanjang:
5. Jika periode berakhir → rapor otomatis terkunci
6. Jika perlu diperpanjang → edit tanggal selesai secara manual
```

## 2.16 Mengelola School Panel

```
1. Menu School Panel → Create Sekolah
2. Input: nama sekolah, email, password untuk login school page
3. Kirim credential ke pihak sekolah
4. Saat create member afiliasi: pilih tipe "Afiliasi Sekolah" → pilih nama sekolah
5. Menu School Panel menampilkan:
   - Rapor semua member afiliasi sekolah tersebut
   - Rekap total biaya yang ditanggung sekolah per bulan/periode
```

## 2.17 Memantau Dashboard Harian

```
Setiap hari:
1. Dashboard → cek ringkasan: total member/coach/kelas aktif
2. Lihat list kelas hari ini (kelas libur tampil dengan label)
3. Live attendance: coach dan member yang baru absen
4. Section Peringatan:
   - Bentrokan jadwal coach
   - Kelas tanpa coach aktif (akibat suspend)
   - Tagihan jatuh tempo
5. Section Approvement:
   - Item pending → klik langsung ke halaman approvement
6. Notification center: cek notifikasi terbaru
```

---
---

# 3. FLOW COACH

## 3.1 First Login & Wajib Lengkapi Profil

```
1. Coach login dengan credential dari admin
2. Sistem cek kelengkapan profil
3. Jika belum lengkap:
   → Diarahkan ke Menu Profile
   → Semua fitur lain terkunci sampai profil dilengkapi
4. Isi semua field wajib: foto, data personal, rekening, spesialisasi
5. Simpan → semua fitur terbuka
```

## 3.2 Kondisi Akun Disuspend

```
1. Coach login → seluruh fitur tidak bisa diakses
2. Halaman menampilkan banner menonjol:
   - Informasi akun disuspend
   - Alasan suspend (jika admin mengisi)
   - Countdown: hari, jam, menit tersisa
3. Coach tidak bisa absen, generate invoice, isi rapor, atau aktivitas apapun
4. Setelah durasi habis → akun otomatis aktif kembali, semua fitur terbuka
```

## 3.3 Cek Kelas dan Isi Spreadsheet Program (Wajib)

```
1. Menu Kelas → lihat list kelas yang diassign
2. Jika ada kelas yang spreadsheet programnya belum diisi:
   → Peringatan banner muncul di Home
   → Harus diisi sebelum bisa melakukan aktivitas lain
3. Klik kelas → isi spreadsheet program → simpan
4. Data masuk ke admin panel dan owner panel
5. Peringatan hilang setelah semua kelas terisi
```

## 3.4 Alur Absensi Harian (Per Kelas)

**Syarat:** Window waktu valid = 1 jam sebelum sesi dimulai hingga sesi berakhir. Di luar window, button Clock In tidak muncul.

```
STEP 1 — Absensi Coach (diri sendiri):
1. Buka Home atau Menu Absensi
2. Klik button "Clock In" pada kelas yang sedang dalam window waktu valid
   (kelas libur tidak memiliki button Clock In)
3. Halaman selfie terbuka → ambil foto → klik Done (atau Ambil Ulang)
4. Sistem tampilkan jarak dari lokasi cabang → klik Submit
5. Pop up "Absensi Berhasil" → data terkirim ke history coach page dan admin panel

STEP 2 — Absensi Member:

A. Via QR Scan:
   1. Klik "Absen Member (QR)" di Home → kamera scan terbuka
   2. Scan QR kartu member satu per satu
   3. Sistem otomatis deteksi kelas yang sedang berlangsung
   4. Status "Hadir" tercatat instan di semua panel

B. Via Manual:
   1. Menu Absensi → pilih kelas → pilih sesi hari ini
   2. Tampil list member → centang satu per satu
   3. Set status: Hadir / Izin / Sakit → Submit
```

**Jika window waktu sudah lewat dan coach belum Clock In:**
- Button Clock In tidak muncul, muncul keterangan "Waktu absensi sudah lewat"
- Coach hubungi admin langsung → admin input absensi manual dari admin panel

**Catatan:** Jika terassign di beberapa kelas dalam 1 hari, ulangi flow ini untuk setiap kelas.

## 3.5 Sesi Kelas sebagai Coach Pengganti

```
1. Saat izin coach lain disetujui dan coach ini diassign sebagai pengganti:
   → Notifikasi masuk di notification center
   → Kelas tersebut muncul di Home dan Menu Kelas dengan label "Pengganti"
2. Lakukan absensi seperti biasa untuk kelas tersebut
3. Jika jadwal bentrok dengan kelas lain: alert muncul di Home dan di dashboard admin
4. Setelah tanggal izin lewat: kelas pengganti otomatis hilang dari coach page
```

## 3.6 Mengajukan Izin

```
1. Menu Home → klik "Izin" (atau Menu Absensi → "Ajukan Izin")
2. Isi form:
   - Jenis: Izin / Sakit / Lainnya (+ alasan teks)
   - Tanggal atau range tanggal
   - Kelas yang terdampak (multi-select, dari jadwal coach hari tersebut)
   - Alasan/deskripsi
   - Coach pengganti (dari list coach aktif yang tidak sedang suspend)
3. Submit → status "Menunggu Persetujuan"
4. Notifikasi masuk ke admin → setelah disetujui/ditolak, coach mendapat notifikasi
5. Jika disetujui: button Clock In untuk kelas tersebut hilang pada tanggal izin
```

## 3.7 Melihat History Absensi

```
1. Menu Absensi → klik "History Absensi"
2. List semua sesi yang sudah diabsen di semua kelas dan cabang
3. Absensi yang diinput manual oleh admin tampil dengan label "Manual — oleh Admin"
4. Klik detail → lihat foto selfie, timestamp, jarak lokasi, kelas
```

## 3.8 Generate Invoice Bulanan

```
1. Menu Invoice → pilih bulan
2. Tampil list kelas yang sudah diabsen coach di bulan tersebut
   (kelas libur dan kelas yang dialihkan ke pengganti tidak muncul)
3. Pilih kelas (manual atau "Pilih Semua")
4. Tarif per kelas tampil otomatis (dari owner panel)
5. Klik "Generate Invoice" → PDF bisa didownload
6. Invoice otomatis terkirim ke Menu Invoice Owner Panel
   → owner mendapat notifikasi invoice baru
7. Coach bisa generate berkali-kali — semua masuk ke owner panel
```

## 3.9 Mengisi Rapor Member

```
Hanya aktif saat admin membuka periode rapor:

1. Menu Rapor → list member per kelas
2. Pilih member → isi formulir (nilai, pilihan ganda, free text feedback)
3. Simpan → rapor langsung tampil di member page, member mendapat notifikasi
4. Bisa update selama periode berlangsung
5. Setelah periode berakhir → rapor terkunci otomatis

Melihat review dari member:
6. Menu Rapor → lihat rating bintang dan pesan teks dari member
```

## 3.10 Update Profil & Kelola Sertifikasi

```
Update profil:
1. Menu Profile → edit field → simpan → data di database langsung terupdate

Tambah sertifikasi:
1. Menu Profile → Sertifikasi → Add → isi data + upload foto → submit
2. Status "Menunggu Persetujuan Admin"
3. Setelah admin approve → sertifikasi tampil di profil
4. Coach mendapat notifikasi hasil keputusan

Edit sertifikasi yang sudah ada:
1. Klik sertifikasi → edit → submit → perlu persetujuan admin kembali

Hapus sertifikasi:
1. Klik sertifikasi → Hapus → konfirmasi pop up → langsung terhapus

Ganti password:
1. Menu Profile → Ganti Password → input baru → simpan → langsung aktif
```

---
---

# 4. FLOW MEMBER

## 4.1 First Login

```
1. Member terima credential dari admin (via WhatsApp)
2. Login → sistem redirect ke Member Page
3. Home menampilkan: kelas yang diikuti, jadwal terdekat, status kehadiran terakhir
```

## 4.2 Kondisi Akun Disuspend

```
Member yang disuspend tidak bisa login → halaman login menampilkan pesan
bahwa akun sedang tidak aktif dan mengarahkan untuk menghubungi admin.
```

## 4.3 Melihat Jadwal Kelas

```
1. Menu Jadwal → tampil semua kelas yang diikuti
2. Informasi: hari, jam, lokasi, nama coach per kelas
3. Kelas yang sedang libur pada hari tertentu tampil dengan label "Libur"
   → member tahu tidak perlu datang
```

## 4.4 Melihat History Absensi

```
1. Menu Absensi → filter berdasarkan bulan atau kelas
2. Status: Hadir / Izin / Sakit / Tidak Hadir
3. Berguna untuk orang tua memantau kehadiran anak
```

## 4.5 Mengajukan Izin

```
1. Menu Izin → klik "Ajukan Izin"
2. Isi form:
   - Pilih kelas
   - Pilih tanggal (atau range tanggal)
   - Jam kelas otomatis tampil
   - Jenis izin: Izin / Sakit / Ujian / Lainnya (+ alasan teks)
   - Alasan tambahan (opsional)
3. Submit → pop up "Pengajuan berhasil, menunggu persetujuan admin"

Setelah admin setujui:
4. Notifikasi di notification center → status "Disetujui"
5. Absensi di kelas tersebut otomatis tercatat "Izin" oleh sistem

Jika ditolak:
4. Notifikasi di notification center → status "Ditolak" + alasan dari admin (jika ada)
```

## 4.6 Melihat Tagihan dan Konfirmasi Pembayaran

```
Melihat tagihan:
1. Menu Tagihan → Tab Tagihan Aktif
2. Tiap tagihan menampilkan: periode/paket, kelas, nominal, diskon (+ alasan), total
   Untuk tagihan private: tampil sisa sesi dalam paket

Konfirmasi pembayaran:
3. Catat nominal yang harus dibayar
4. Transfer ke rekening yang dikomunikasikan admin (di luar sistem)
5. Klik "Hubungi Admin Cabang" di tagihan → WA terbuka dengan template pesan
   (nomor otomatis dari settings admin cabang)
6. Admin verifikasi → notifikasi "Tagihan diverifikasi" masuk ke notification center
7. Status tagihan berubah ke "Sudah Bayar" → pindah ke Tab Histori
8. Card pengingat di Home menghilang
```

## 4.7 Pengingat Tagihan dan Paket Sesi

```
Tagihan belum dibayar:
→ Card menonjol di Home: info tagihan + button "Lihat Tagihan" + "Hubungi Admin Cabang"

Paket sesi hampir habis (member Private, sisa = 1):
→ Card notifikasi di Home: info sesi terakhir hampir tiba + button "Hubungi Admin"
→ Juga muncul di notification center
```

## 4.8 Menerima Pengumuman dari Admin

```
1. Saat admin buat pengumuman yang ditujukan ke member ini / kelasnya:
   → Notifikasi masuk di notification center
   → Pengumuman tampil di Home sebagai banner/card
2. Member bisa klik untuk baca detail pengumuman
```

## 4.9 Menerima dan Memberikan Review Rapor

```
Menerima rapor:
1. Notifikasi di notification center: "Rapor baru tersedia"
2. Menu Rapor → lihat nilai, feedback coach, jawaban pilihan ganda per kelas

Memberikan review:
3. Di halaman rapor → scroll ke bagian Review Coach
4. Beri rating bintang 1–5 + ulasan teks (opsional) → submit
5. Review bisa diedit selama periode rapor berlangsung
6. Setelah periode berakhir → rapor dan review terkunci → masuk History Rapor
```

## 4.10 Mengelola Profil & QR Code

```
Update data yang diizinkan:
1. Menu Profile → edit: nomor HP, alamat, riwayat kesehatan, foto profil → simpan

Ganti password:
2. Menu Profile → Ganti Password → input baru → simpan → langsung aktif

QR Code absensi:
3. Menu Profile → scroll ke QR Code → download untuk dicetak sebagai kartu absensi
   QR tidak pernah berubah → aman untuk diprint permanen
   Orang tua bisa bawa kartu untuk scan di kelas

Catatan: Data seperti nama, tanggal lahir, kelas tidak bisa diubah sendiri
→ hubungi admin cabang untuk perubahan tersebut
```

---
---

# 5. FLOW SCHOOL (Pihak Sekolah)

## 5.1 Login ke School Page

```
1. Pihak sekolah terima credential (email + password) dari admin cabang
2. Login → sistem redirect ke School Page
3. School page hanya menampilkan data rapor — tidak ada data keuangan
```

## 5.2 Melihat Rapor Siswa

```
Hanya tersedia saat admin membuka periode rapor:

1. School Page menampilkan list semua siswa afiliasi sekolah tersebut
2. Filter/cari siswa berdasarkan nama atau kelas
3. Klik siswa → lihat rapor lengkap dari coach
```

## 5.3 Download Rapor

```
Download satu per satu:
1. Buka detail rapor siswa → klik Download → file ter-download

Download semua sekaligus:
1. Klik "Download Semua Rapor"
2. Sistem generate semua rapor siswa afiliasi sekolah ini
3. File ter-download (PDF per siswa atau ZIP)
```

---
---

# 6. FLOW LINTAS ROLE (Cross-Role Flows)

---

## 6.1 Registrasi Member Baru via Landing Page

```
[Calon Member]
1. Buka landing page → klik CTA → Register
2. Isi form → klik Kirim → pop up konfirmasi
3. (Opsional) klik button WA ke admin

[Admin]
4. Notifikasi di notification center + Dashboard
5. Menu Approvement → review data
6. Hubungi calon member via WA untuk konfirmasi kelas dan pembayaran
7. Terima pembayaran → input bukti transfer → klik Approve
8. Lengkapi data member (tipe, kelas, email, password)
9. Kirim credential ke member via WA

[Member]
10. Terima credential → login → siap digunakan
```

---

## 6.2 Absensi Lengkap Satu Sesi Kelas

```
[Pra-kondisi: Settings cabang sudah berisi koordinat lokasi yang benar]

[Coach — dalam window waktu: 1 jam sebelum sesi s.d. sesi berakhir]
1. Buka Home → klik Clock In pada kelas yang aktif
2. Selfie → Done → sistem tampilkan jarak dari cabang → Submit
3. Pop up "Absensi Berhasil" → data masuk ke admin panel

[Coach → Member]
4. Buka scan QR / mode manual
5. Scan QR kartu setiap member yang hadir
   → Status "Hadir" tercatat instan

[Member / Orang Tua]
6. Buka member page → Menu Absensi → status "Hadir" sudah tercatat

[Admin]
7. Dashboard → Live Attendance memperlihatkan siapa yang baru absen
```

---

## 6.3 Coach Lupa Clock In

```
[Coach]
1. Window waktu lewat → button Clock In tidak muncul
2. Tampil keterangan "Waktu absensi sudah lewat — hubungi admin"
3. Coach hubungi admin langsung (di luar sistem)

[Admin]
4. Terima konfirmasi dari coach → nilai justifikasi
5. Jika justifikasi oke:
   Menu Absensi Coach → Tambah Absensi Manual
   → pilih coach, kelas, tanggal/jam, isi catatan → simpan
6. Absensi terbuat dengan label "Manual — oleh Admin" + nama admin + timestamp

[Coach]
7. History absensi di coach page terupdate dengan label "Manual — oleh Admin"
```

---

## 6.4 Flow Izin Coach + Penggantian

```
[Coach]
1. Menu Home → Izin → isi form → Submit
   Status: Menunggu Persetujuan

[Admin]
2. Notifikasi di notification center + Dashboard
3. Menu Izin → Tab Izin Coach → review
4. Jika coach belum assign pengganti: assign dari sini
   (pengganti hanya dari coach aktif yang tidak sedang suspend)
5. Klik Setujui
6. Otomatis: kelas dialihkan ke pengganti, Clock In hilang dari coach yang izin

[Coach Pengganti]
7. Notifikasi di notification center: "Anda ditambahkan sebagai pengganti di kelas X"
8. Kelas muncul di Home dan Menu Kelas dengan label "Pengganti"
9. Jika jadwal bentrok: alert di Home pengganti + section peringatan dashboard admin

[Admin]
10. Menu Class Activity: kelas menampilkan label "Penggantian Coach"

[Setelah tanggal izin lewat]
11. Kelas otomatis hilang dari coach page pengganti — tidak perlu action manual
```

---

## 6.5 Flow Kelas Libur

```
[Admin]
1. Menu Class Activity → pilih kelas di tanggal tertentu → "Tandai Libur"
2. Input alasan → simpan

[Otomatis terjadi]
3. Button Clock In untuk kelas tersebut hilang dari coach page pada tanggal libur
4. Absensi member tidak perlu diisi untuk sesi libur
5. Coach page Home: label "Libur" pada kelas tersebut hari itu
6. Member page Jadwal: kelas ditampilkan dengan label "Libur"

[Admin — jika perlu batalkan]
7. Klik kelas libur di Class Activity → "Batalkan Libur" → kelas kembali normal
```

---

## 6.6 Pembayaran Member Reguler (Bulanan)

```
[Admin — awal bulan]
1. Menu Pembayaran → Generate Tagihan Bulanan → pilih bulan
2. Sistem buat tagihan untuk semua member reguler aktif
3. (Opsional) edit tagihan tertentu untuk tambah diskon
4. Member mendapat notifikasi tagihan baru di notification center

[Member]
5. Home: card pengingat tagihan belum dibayar
6. Klik "Lihat Tagihan" → lihat nominal + diskon (jika ada)
7. Transfer ke rekening admin
8. Klik "Hubungi Admin Cabang" → WA terbuka dengan template konfirmasi bayar

[Admin]
9. Terima konfirmasi bayar
10. Menu Pembayaran → cari tagihan → Verifikasi Pembayaran
11. Input tanggal, metode, bukti transfer → simpan

[Member]
12. Notifikasi "Tagihan diverifikasi" di notification center
13. Card pengingat di Home hilang
14. Tagihan pindah ke Tab Histori Pembayaran
```

---

## 6.7 Pembayaran Member Private (Paket Sesi)

```
[Admin — awal paket]
1. Sepakati jumlah sesi dan harga dengan member (di luar sistem)
2. Menu Pembayaran → Tambah Tagihan → pilih member private
3. Input: jumlah sesi, nominal, tanggal mulai → simpan

[Member]
4. Bayar nominal paket (transfer/tunai) → konfirmasi ke admin via WA

[Admin]
5. Verifikasi pembayaran → status "Sudah Bayar"

[Operasional berjalan]
6. Setiap sesi member hadir → sisa sesi berkurang otomatis

[Saat sisa sesi = 1]
7. Notifikasi di notification center member: "Sesi terakhir dalam paket hampir tiba"
8. Card pengingat di Home member + button "Hubungi Admin"

[Member → Admin]
9. Member hubungi admin → sepakati paket berikutnya → siklus berulang
```

---

## 6.8 Flow Rapor Lengkap

```
[Admin — membuka periode]
1. Menu Rapor → input tanggal mulai dan selesai → simpan
2. Menu rapor di coach page otomatis aktif

[Coach — mengisi rapor]
3. Menu Rapor → pilih member per kelas → isi aspek penilaian → simpan
4. Rapor langsung tampil di member page → member mendapat notifikasi

[Member — melihat dan review]
5. Notifikasi di notification center: "Rapor baru tersedia"
6. Menu Rapor → lihat nilai dan feedback coach
7. Beri review: rating bintang + ulasan teks → submit
8. Review bisa diedit selama periode berlangsung

[Coach — melihat review]
9. Menu Rapor → lihat rating dan pesan dari setiap member

[Admin — monitoring]
10. Menu Rapor → pantau progress pengisian oleh coach

[School Page — member afiliasi]
11. Pihak sekolah login → lihat dan download rapor semua siswa afiliasinya

[Setelah periode berakhir]
12. Semua rapor dan review otomatis terkunci → masuk History Rapor
13. Admin bisa perpanjang periode secara manual jika diperlukan
```

---

## 6.9 Flow Suspend Coach

```
[Admin]
1. Menu Coach → Detail Coach → Suspend Coach
2. Input: alasan, tanggal mulai, durasi/tanggal berakhir → simpan
3. Sistem cek: apakah coach satu-satunya di kelas tertentu?
   → Jika ya: alert di Dashboard dan Menu Coach
   → Admin assign coach lain ke kelas tersebut sampai alert hilang

[Coach yang disuspend]
4. Login → banner suspend tampil: alasan + countdown waktu tersisa
5. Semua fitur tidak bisa diakses

[Admin — opsional, akhiri lebih awal]
6. Detail Coach → "Akhiri Suspend" → status langsung aktif

[Setelah durasi habis]
7. Status coach otomatis aktif → banner hilang → semua fitur terbuka
```

---

## 6.10 Flow Setup Coach Multi-Cabang

```
[Admin Cabang A]
1. Menu Coach → klik "Lihat Coach dari Cabang Lain"
2. Cari coach yang sudah terdaftar → klik "Assign Coach ke Cabang Ini"
3. Coach muncul di list coach Cabang A — credential tetap sama

[Coach]
4. Login seperti biasa → kelas dari Cabang A kini muncul di coach page
5. Detail setiap kelas menampilkan informasi cabang terkait
   (penting karena koordinat validasi absensi berbeda per cabang)

[Admin Cabang A]
6. Assign coach ke kelas di Cabang A
7. Jika jadwal bentrok dengan cabang lain → muncul peringatan
   Admin tetap bisa override
```

---

*Dokumen ini disusun berdasarkan Next Swimming School Project Document versi final.*
*Mencakup semua konsep yang telah settled termasuk: window waktu Clock In, absensi manual CRUD oleh admin, notification center, coach pengganti sementara, kelas libur, suspend member, reset password member, pengumuman admin, validasi kapasitas kelas, nomor WA admin di settings, ganti kelas member via admin, dan logika pembayaran afiliasi sekolah.*
