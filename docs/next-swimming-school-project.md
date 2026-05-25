# Next Swimming School — Project Document

---

## Teknologi Utama

- Next.js (latest)
- Supabase
- Cloudflare R2 Storage

---

## Glosarium

- **Member** : Murid yang berlatih di Next Swimming School
- **Coach** : Pelatih di Next Swimming School
- **Admin** : Yang mengurusi administrasi, website, sosmed, dan sebagainya
- **Owner** : Pemilik bisnis Next Swimming School

---

## Gambaran Kondisi Next Swimming School

- Ada owner bernama Mas Syahril
- Ada admin yang mengurusi admin panel
- Ada coach yang bisa login ke coach page untuk absensi dan scan QR anak-anak
- Ada member — sebagian sudah cukup umur dan memegang akun sendiri, sebagian akunnya dipegang orang tua/wali
- Rata-rata sistem ini dipakai secara mobile

---

## Halaman Utama

1. Landing Page
2. Owner Panel
3. Admin Panel
4. Coach Page
5. Member Page
6. School Page

---

## Flow Utama (Urutan Setup Sistem)

1. Owner membuat cabang dari owner panel
2. Owner membuat akun admin cabang
3. Admin cabang login ke admin panel
4. Admin mengisi settings cabang (logo, koordinat lokasi, nomor WhatsApp admin)
5. Admin membuat data kelas
6. Admin membuat data member
7. Admin membuat data coach dan assign coach ke kelas

---

## Flow Absensi

1. Coach masuk ke coach page
2. Coach melakukan absensi untuk dirinya sendiri (per kelas, bukan per hari) — hanya bisa dilakukan dalam window waktu: 1 jam sebelum sesi dimulai hingga sesi berakhir
3. Data absensi coach masuk ke sistem dan ke admin panel cabang terkait
4. Absensi coach tersimpan di history absensi coach page dan admin panel cabang
5. Setelah absen, coach mengabsen member dengan scan QR mereka
6. Coach bisa absen member via QR atau manual (checklist data member kelas hari itu)
7. Data absensi member secara instan masuk ke sistem, member page, coach page, dan admin panel cabang

---

## Konsep UI (Global)

- Mobile first — mudah diakses di HP, terasa nyaman digunakan di HP karena rata-rata pengguna adalah pengguna mobile
- Clean, modern, fast navigation, simple transition dan animation
- Web juga harus tampil dengan baik
- Easy to use, ukuran button yang baik, konsep simple tapi berkualitas
- Semua alert message harus berupa custom alert yang muncul di dalam halaman web, bukan browser default alert
- **Notification Center:** Setiap halaman (owner, admin, coach, member) memiliki icon bell/notifikasi di navbar. Klik icon → dropdown list semua notifikasi terbaru beserta timestamp. Notifikasi bersifat in-app — tidak perlu push notification ke HP

---

## Masalah yang Harus Dihindari

1. Saat navigasi antar menu, selalu muncul skeleton loading — jika pertama kali buka halaman masih bisa diterima, tapi jika muncul setiap kali pindah menu itu sangat mengganggu
2. Sistem harus terasa zero loading — perpindahan antar menu di semua halaman harus instan, tampilan langsung terbuka tanpa loading, tidak ada skeleton loading atau loading biasa setiap kali membuka menu

---

## Filosofi Utama Project

**"Fast, Clean, Trusted, Effortless."**

---
---

# A. Landing Page

## Catatan Khusus

- Harus memiliki SEO yang baik
- Strong CTA untuk konversi murid baru
- Setiap section harus ada CTA
- Semua CTA diarahkan ke WhatsApp admin: **082110009667**

---

## Konsep UI Landing Page

- Tidak boleh terlihat seperti AI generated atau template website sekolah biasa
- Modern, clean, creative, attractive
- Simple animation dan simple transition
- Tampilan premium dan professional
- Fokus pada simplicity, fast navigation, modern experience, dan strong CTA

**Target User:**

- Orang tua yang ingin mendaftarkan anaknya
- Remaja yang ingin belajar renang
- Dewasa yang ingin mengikuti kelas renang
- Existing member yang ingin mengakses sistem

**Visual Style:**

- Modern swimming-inspired color palette
- Aqua blue accent
- Soft shadows, rounded corners, elegant spacing
- Premium photography
- Subtle water-inspired motion
- Smooth hover interaction
- Simple section transition

**Hindari:**

- Template-looking design
- Over animation
- Excessive gradients
- Heavy glassmorphism
- Generic SaaS layout
- Terlalu banyak floating elements
- Complex navigation
- Excessive skeleton loading
- Slow transition
- Overdesigned UI

**CTA Examples:**

- Konsultasi Sekarang
- Chat Admin
- Tanya Program
- Daftar Sekarang
- Cek Jadwal Kelas
- Mulai Belajar Renang

---

## Navbar

`Home – Program – Coach – FAQ – Login – Konsultasi Sekarang`

Login button tersedia di navbar namun bukan menjadi CTA utama.

---

## Struktur Landing Page

### 1. Hero Section

**Tujuan:** Menjelaskan value utama, menarik perhatian, meningkatkan konversi

**Isi:**

- Strong headline
- Supporting subheadline
- CTA WhatsApp
- Premium swimming visual
- Trust indicators

**Contoh Headline:**

> "Belajar Renang Lebih Aman, Modern, dan Profesional"

**Contoh Subheadline:**

> "Next Swimming School membantu anak hingga dewasa belajar renang dengan metode modern, coach profesional, dan sistem digital yang memudahkan orang tua."

---

### 2. Why Choose Us Section

**Tujuan:** Menjelaskan keunggulan utama dan membangun trust

**Isi:**

- Coach profesional
- Progress monitoring
- Sistem digital modern
- Jadwal fleksibel
- Kelas nyaman dan aman

---

### 3. Swimming Programs Section

**Tujuan:** Menampilkan program yang tersedia

**Program (data dinamis dari admin panel, gunakan dummy data untuk awal):**

- Kids Class
- Teen Class
- Adult Class
- Private Coaching
- Intensive Training
- School Collaboration

**Setiap program menampilkan:**

- Penjelasan singkat
- Target umur
- Benefit
- CTA

---

### 4. Smart Swimming Ecosystem Section

**Tujuan:** Menampilkan bahwa sistem terintegrasi dan modern

**Untuk Member:**

- Lihat jadwal
- Monitoring progress
- Attendance
- Informasi kelas

**Untuk Coach:**

- Scan attendance
- Update progress
- Manage class

**Untuk Admin:**

- Member management
- Scheduling
- Reporting
- Monitoring

---

### 5. Coach Showcase Section

**Tujuan:** Menampilkan profesionalisme coach

**Isi:**

- Foto coach
- Pengalaman
- Specialty
- Sertifikasi

---

### 6. Testimonial Section

**Tujuan:** Meningkatkan trust dan konversi

**Isi:**

- Testimoni orang tua
- Pengalaman member
- Positive class experience

---

### 7. FAQ Section

**Isi:**

- Umur minimal
- Jadwal kelas
- Private class
- Sistem pembayaran
- Cara daftar
- Lokasi kelas

---

### 8. Final CTA Section

**Tujuan:** Closing konversi

**Headline:** "Mulai Perjalanan Renang Bersama Next Swimming School"

**Button:** "Chat Admin Sekarang"

---

## Login Page

- Input email dan password
- Fitur lupa password
- Button register untuk ke halaman register
- Single login page dengan auto redirect berdasarkan role
- Role yang ada di database: Member, Coach, Admin, Owner, School
- Login method: Email + Password (untuk semua role)

**Konsep Lupa Password:**
Jika klik lupa password, akan muncul pop up yang mengarahkan user untuk menghubungi admin cabang via WhatsApp agar diberikan password baru.

---

## Register Page

**Catatan UX:**

- Di halaman register harus ada strong CTA yang mendorong calon member untuk bertanya terlebih dahulu ke admin sebelum mendaftar, untuk meminimalisir miskomunikasi
- Sediakan button direct ke WhatsApp admin

**Form isian:**

- Nama lengkap
- Tanggal lahir
- Jenis kelamin
- Nomor HP
- HP milik siapa (diri sendiri atau orang tua/wali) — jika pilih orang tua/wali, akan muncul input nama dan nomor HP orang tua/wali
- Alamat
- Riwayat kesehatan/alergi
- Klik button "Kirim"

**Alur setelah klik Kirim:**

- Muncul pop up: "Form registrasi berhasil dikirim. Kamu bisa menunggu dihubungi oleh admin, atau langsung chat admin sekarang." — disertai button direct ke WhatsApp admin dengan template pesan bahwa user baru saja mendaftar lewat web

**Alur setelah di-review admin:**

- Data registrasi masuk ke menu Approvement di admin panel untuk di-review
- Admin akan menghubungi calon member secara manual via WhatsApp — pastikan nomor HP yang diinputkan bisa dihubungi via WhatsApp
- Jika data di-approve, data member otomatis masuk ke menu member di admin panel namun masih perlu dilengkapi oleh admin, karena yang diisi di form register baru sebagian data

---
---

# B. Owner Panel

**Catatan:** Saat sistem pertama kali dibuat, cabang pertama harus dibuat terlebih dahulu dari owner panel. Owner panel hanya bisa diakses oleh owner.

---

## 1. Dashboard

**Isi:**

- Total member keseluruhan (semua cabang)
- Total coach keseluruhan (semua cabang)
- Total kelas aktif keseluruhan (semua cabang)
- Total member per cabang
- Total coach per cabang
- Total kelas aktif per cabang

**Notifikasi Owner:**

- Invoice baru dari coach masuk ke notification center owner

---

## 2. Menu Cabang (CRUD)

- Owner membuat dan mengelola cabang
- Setiap cabang yang dibuat akan memiliki admin panel tersendiri

---

## 3. Menu Admin

- Owner membuat akun admin untuk setiap cabang
- Isian: nama admin, email, password, assign cabang (dropdown)

---

## 4. Akses ke Admin Panel Cabang

- Tersedia button untuk owner langsung masuk ke admin panel cabang yang dipilih
- Owner mendapat akses yang sama seperti admin (read, create, update, delete)
- Tersedia button untuk kembali ke owner panel setelah selesai

---

## 5. Menu Kelas

- Berisi informasi semua kelas di setiap cabang
- Mencakup: detail kelas, spreadsheet program yang diinput coach, daftar coach, daftar member, history absensi coach dan member

---

## 6. Menu Settings Tarif

- Pilih cabang terlebih dahulu
- Setelah cabang dipilih, muncul list semua kelas yang ada di cabang tersebut
- Owner memasukkan tarif per kelas secara umum
- Opsional: owner bisa mengatur tarif khusus per coach — berguna jika ada coach yang lebih berpengalaman dan memiliki tarif berbeda. Tarif ini akan override tarif umum dan akan tercermin di invoice coach tersebut

---

## 7. Menu Invoice Coach

- Berisi list invoice yang dikirimkan coach dari coach page
- Owner bisa melihat detail kelas, tarif per kelas, dan informasi rekening coach untuk keperluan pembayaran

---
---

# C. Admin Panel

**Catatan:** Jika yang login ke admin panel memiliki role owner, tersedia button quick access untuk langsung berpindah ke owner panel.

Urutan menu di bawah ini disusun sesuai urutan logis setup dan operasional cabang.

---

## 1. Menu Settings

Menu ini harus diisi pertama kali sebelum menggunakan fitur lainnya.

- CRUD logo cabang — logo yang diupload akan terhubung ke landing page, rapor, admin panel, owner panel, dan semua elemen yang menggunakan logo Next Swimming School (rasio 1:1)
- Input koordinat presisi lokasi cabang — digunakan untuk validasi jarak saat coach melakukan absensi
- **Nomor WhatsApp Admin Cabang** — admin menginput satu atau lebih nomor WhatsApp yang aktif bertugas. Nomor ini digunakan secara otomatis oleh semua button "Hubungi Admin Cabang" di member page dan coach page. Jika ada lebih dari satu nomor, sistem akan menampilkan pilihan atau mengarahkan ke nomor pertama sebagai default

---

## 2. Menu Class

**Catatan:** Data kelas yang aktif dan ditandai untuk ditampilkan akan muncul di landing page section Swimming Programs.

**Form Create/Edit Kelas:**

- Foto kelas landscape (opsional)
- Nama kelas
- Tujuan kelas (opsional)
- Deskripsi kelas (opsional)
- Cabang (otomatis terassign ke cabang yang sedang login)
- Status kelas (aktif atau diarsipkan)
- Kapasitas kelas — akan digunakan sebagai batas validasi saat assign member
- Jumlah sesi per minggu dan per bulan
- Jadwal: admin pilih hari (Senin–Minggu) beserta jam mulai dan jam selesai
- Nama lokasi tempat kelas
- Harga per bulan
- Usia minimum (opsional)
- Usia maksimum (opsional)
- Toggle: tampilkan kelas ini di landing page atau tidak (jika ya, kelas akan muncul di section Swimming Programs)

**Indikator Kapasitas:**

- Di list kelas dan detail kelas, tampilkan indikator kapasitas secara real-time: contoh "12/15 member"
- Saat assign member ke kelas yang sudah penuh: muncul peringatan "Kelas sudah mencapai kapasitas (X/X member)"
- Admin tetap bisa override dengan konfirmasi

**Detail Kelas:**

- Informasi lengkap kelas
- Status spreadsheet program: sudah diinput coach atau belum
- Indikator kapasitas terkini

**Aspek Penilaian / Rapor (CRUD per kelas):**

- Admin menginput aspek penilaian yang akan diisi coach saat pembagian rapor
- Pilih range penilaian: 1–10 atau 1–100
- Bisa tambahkan pertanyaan pilihan ganda dengan soal dan pilihan jawaban yang bisa dikustomisasi
- Bisa tambahkan kolom free text sebagai kolom feedback coach ke member
- Aspek penilaian ini yang nantinya akan muncul di menu rapor coach page untuk diisi coach

---

## 3. Menu Member

**Tipe Member:**

- **Reguler** — member kelas reguler dengan jadwal tetap, membayar per bulan
- **Private** — member kelas private, pembayaran per paket (sejumlah sesi yang disepakati); detail konsep pembayaran private ada di Menu Pembayaran
- **Afiliasi Sekolah** — member yang datang dari kerja sama dengan sekolah tertentu, biaya ditanggung pihak sekolah

**Fitur:**

- CRUD Member
- List member dengan filter: tipe, kelas, status (aktif / diarsipkan / suspend)
- Lihat detail member, update data member, arsipkan member, suspend member
- Member yang tidak diarsipkan dan tidak disuspend = member aktif, dan yang dihitung di dashboard
- Setiap member memiliki QR code unik yang tidak berubah — bisa didownload atau dikirim via WhatsApp dari halaman detail member, dan bisa diprint sebagai kartu absensi
- Bisa melihat history absensi member per kelas
- Bisa melihat history pembayaran member
- **Reset Password Member:** Di detail member, admin bisa reset password member — input password baru, langsung overwrite tanpa konfirmasi (konsisten dengan pola coach)
- **Edit Assign Kelas Member:** Admin bisa menambah atau mengganti kelas member kapan saja dari detail member. History absensi di kelas lama tetap tersimpan. Perubahan kelas hanya bisa dilakukan oleh admin — tidak ada self-service untuk member

**Fitur Suspend Member:**

- Berbeda dengan arsip — suspend bersifat sementara dengan durasi yang ditentukan
- Admin input: alasan suspend, tanggal mulai, durasi (dalam hari) atau tanggal berakhir suspend
- Selama masa suspend: member tidak bisa login ke member page
- Member yang disuspend tidak muncul di daftar absensi harian coach
- Member yang disuspend tidak masuk hitungan member aktif di dashboard
- Setelah durasi berakhir → status member otomatis kembali aktif tanpa tindakan manual admin
- Admin bisa mengakhiri suspend lebih awal dari detail member
- Perbedaan arsip vs suspend: arsip = permanen/nonaktif (misalnya member berhenti), suspend = sementara (misalnya member melanggar aturan)

**Form Create Member (oleh admin — langsung aktif tanpa perlu approvement):**

- Foto profil (opsional)
- Nama lengkap member
- Tanggal lahir
- Jenis kelamin
- Nomor HP member
- HP milik siapa (diri sendiri atau orang tua/wali) — jika orang tua/wali, muncul input nama dan nomor HP orang tua/wali
- Alamat
- Riwayat kesehatan/alergi
- Tipe member (Reguler / Private / Afiliasi Sekolah) — jika Afiliasi Sekolah, pilih nama sekolah dari dropdown (data dari menu School Panel)
- Assign ke kelas (bisa lebih dari satu, dropdown dari data kelas yang ada di cabang — disertai indikator kapasitas tiap kelas)
- Tanggal mulai aktif
- Email (untuk login ke member page)
- Password (dibuatkan admin, langsung overwrite tanpa konfirmasi)
- Catatan khusus dari admin (opsional)

**Field tambahan khusus admin (tidak ada di form register page):**

- Status pembayaran bulan berjalan (sudah bayar / belum bayar / gratis / ditanggung sekolah)
- Bukti transfer pembayaran pertama (upload file)
- Tanggal verifikasi pembayaran

**Alur Setelah Create oleh Admin:**

- Member langsung aktif dan bisa login ke member page
- Muncul pop up ringkasan data member beserta credential login — bisa dicopy atau langsung dikirim ke WhatsApp member/orang tua via button (template chat otomatis ke nomor yang sudah diinput)
- QR code member otomatis terbuat dan bisa langsung didownload atau dikirim via WhatsApp dari halaman detail member

**Alur Member dari Register Page (perlu approvement):**

- Data registrasi masuk ke menu Approvement
- Admin bisa edit, hapus, atau approve data
- Sebelum approve, admin harus menginput dan mengupload bukti transfer pembayaran
- Setelah di-approve, data member otomatis masuk ke menu member namun masih perlu dilengkapi oleh admin karena yang diisi di form register baru sebagian data
- Setelah dilengkapi, member aktif dan bisa login

---

## 4. Menu Coach

**Catatan Penting:**

- Dalam satu kelas bisa lebih dari 1 coach
- Sistem ini multi-cabang — satu coach bisa mengajar di lebih dari satu cabang
- Sebelum membuat coach baru, tersedia button untuk menampilkan list coach dari cabang lain. Jika coach sudah terdaftar di cabang lain, admin cukup klik "Assign Coach ke Cabang Ini" — data coach otomatis masuk dan credential login tetap sama, coach tidak perlu akun baru
- Semua admin hanya bisa mengakses data cabang mereka sendiri, namun bisa melihat coach mereka terassign ke cabang mana saja
- Jika admin ingin melepas coach dari cabangnya, admin hanya bisa menghapus assign untuk cabangnya sendiri — untuk cabang lain, admin cabang tersebut yang mengelola
- Absensi coach terfilter otomatis berdasarkan kelas dan cabang saat absen dilakukan

**Fitur:**

- CRUD Coach
- List coach, lihat detail coach, update coach, delete coach, arsipkan coach, suspend coach
- Coach yang tidak diarsipkan dan tidak disuspend = coach aktif
- Assign coach ke kelas (mempengaruhi jadwal dan pengingat absensi di coach page)
- Lihat history absensi coach dengan filter: bulan, kelas, nama coach
- Klik detail history absensi → muncul foto selfie absensi coach beserta detail lainnya

**Form Create Coach:**

- Profile picture (opsional — coach bisa melengkapi sendiri di coach page)
- Nama lengkap
- Nama panggilan (opsional)
- Jenis kelamin
- Tanggal lahir (opsional)
- Bio / deskripsi (opsional)
- Alamat (opsional)
- Pendidikan terakhir: dropdown (TK, SD, SMP, SMA, D1, D2, D3, S1/D4, S2, S3) + nama instansi (opsional)
- Nomor rekening: nama bank, nomor rekening, atas nama (opsional)
- Spesialisasi (opsional)
- Assign cabang
- Assign kelas yang dia handle (opsional)
- Email
- Nomor telepon WhatsApp
- Sertifikasi: nama sertifikasi, range tanggal berlaku, opsi checkbox "tidak ada kedaluwarsa", foto sertifikat (opsional)
- Buat password untuk coach (langsung overwrite, tanpa konfirmasi email)

**Alur Setelah Create:**

- Muncul pop up ringkasan data coach beserta credential login — bisa dicopy atau langsung dikirim ke WhatsApp coach via button (template chat otomatis ke nomor coach yang sudah diinput)
- Di detail coach tersedia QR code coach beserta ID coach (contoh: `coach-001`)
- Di tabel list coach ada label yang menandakan apakah coach sudah terassign ke kelas atau belum — jika belum, admin masuk ke detail coach dan assign coach ke kelas
- Jika jadwal coach bentrok dengan cabang lain, muncul peringatan banner. Admin tetap bisa override, namun peringatan bentrok akan muncul di halaman menu coach dan di section list peringatan pada dashboard admin panel cabang yang terdampak
- Di detail coach, admin bisa mengubah password coach (langsung overwrite, tanpa konfirmasi)

**Fitur Suspend Coach:**

- Berbeda dengan arsip — suspend bersifat sementara dengan durasi yang ditentukan
- Saat admin meng-suspend coach, admin menginput: alasan suspend, tanggal mulai, dan durasi suspend (dalam hari) atau tanggal berakhir suspend
- Selama masa suspend: coach tetap bisa login namun tidak bisa melakukan aktivitas apapun di coach page — halaman coach page menampilkan banner menonjol bahwa akun sedang dalam masa suspend beserta countdown (hari, jam, menit) hingga suspend berakhir
- Setelah durasi suspend berakhir, status coach otomatis kembali aktif tanpa perlu tindakan manual dari admin
- Admin tetap bisa mengakhiri suspend lebih awal secara manual dari detail coach
- **Alert kelas tanpa coach aktif:** Jika coach yang di-suspend adalah satu-satunya coach yang meng-handle suatu kelas, sistem otomatis memunculkan alert di dashboard dan di menu coach admin panel — berisi peringatan bahwa kelas tersebut tidak memiliki coach aktif dan perlu di-assign coach pengganti segera. Alert ini tidak akan hilang sampai admin assign coach lain ke kelas tersebut

---

## 5. Menu Class Activity

**Tujuan:** Mempermudah admin dalam memantau dan mengatur jadwal kelas secara visual

**Tampilan:**

- Seperti Google Calendar — rapih, clean, simple
- Bisa tampil dalam mode day, week, atau month (default: week)
- Klik kelas di kalender → muncul pop up modal berisi: detail kelas, nama coach, daftar member, label jika ada penggantian coach, label jika kelas libur
- Admin bisa mengedit kelas langsung dari modal ini
- Menampilkan informasi apakah coach di kelas tersebut sedang digantikan karena izin
- Kelas yang sedang libur ditampilkan dengan style berbeda (contoh: warna abu-abu) beserta keterangan alasan libur

**Fitur Kelas Libur:**

- Admin bisa menandai kelas sebagai libur untuk tanggal atau range tanggal tertentu langsung dari Class Activity — berguna untuk libur nasional, kolam tutup, atau kondisi khusus lainnya, tanpa perlu mengarsipkan kelas
- Form input libur: pilih kelas, pilih tanggal/range tanggal, isi alasan (opsional)
- Efek saat kelas ditandai libur:
  - Button Clock In untuk kelas tersebut tidak muncul di coach page pada tanggal libur
  - Absensi member tidak perlu diisi untuk sesi yang libur
  - Di home coach page, muncul informasi bahwa kelas tersebut libur pada hari itu
  - Di home member page, jadwal terdekat diupdate — kelas libur tidak ditampilkan sebagai jadwal aktif
- Admin bisa hapus/batalkan status libur kapan saja

---

## 6. Menu Absensi Coach

- List absensi coach dalam 1 bulan dengan filter bulan
- **CRUD Absensi Manual oleh Admin:**
  - Admin bisa membuat (create) data absensi coach baru secara manual — untuk kasus coach lupa Clock In dan sudah konfirmasi langsung ke admin
  - Admin bisa mengedit (update) data absensi yang sudah ada — untuk koreksi jika ada kesalahan data
  - Admin bisa menghapus (delete) data absensi — jika ada data yang tidak valid
  - Semua absensi yang dibuat atau diedit manual oleh admin diberi label "Manual — oleh Admin" beserta nama admin dan timestamp untuk transparansi
  - Alur: coach lupa Clock In → coach hubungi admin langsung → jika justifikasi oke, admin input absensi manual dari menu ini

---

## 7. Menu Pengumuman

**Tujuan:** Admin membuat dan mengelola pengumuman yang akan tampil di member page.

**Fitur:**

- CRUD Pengumuman
- Form buat pengumuman: judul, isi teks, tanggal mulai berlaku, tanggal kadaluarsa (opsional — jika tidak diisi, pengumuman tetap tampil sampai dihapus manual)
- **Target pengumuman:**
  - Semua member di cabang ini, atau
  - Member di kelas tertentu saja (multi-select dropdown kelas)
- Pengumuman yang sudah kadaluarsa otomatis tidak tampil di member page namun tetap tersimpan di history admin panel
- Admin bisa menonaktifkan pengumuman lebih awal tanpa harus menghapus
- Di member page home, pengumuman tampil sebagai notifikasi/banner — member mendapat notifikasi di notification center saat ada pengumuman baru yang ditujukan untuk mereka

---

## 8. Menu Izin

**Tujuan:** Admin membuat dan mengelola izin secara proaktif untuk coach maupun member, serta melihat dan menindaklanjuti pengajuan izin yang masuk dari coach page dan member page.

**Catatan:** Menu ini menggabungkan dua fungsi — membuat izin baru oleh admin (create by admin) dan menyetujui/menolak izin yang diajukan dari coach page atau member page.

**Sub-menu / Tab:**

### Tab: Izin Coach

- List semua izin coach: yang sudah disetujui, ditolak, menunggu persetujuan, dan yang dibuat langsung oleh admin
- Filter: status (pending / disetujui / ditolak / dibuat admin), nama coach, bulan, kelas
- Klik item → lihat detail lengkap izin

**Buat Izin Coach (oleh admin):**

- Pilih coach (dropdown)
- Pilih jenis izin: Izin, Sakit, atau Lainnya (jika Lainnya, input alasan teks)
- Pilih tanggal atau range tanggal
- Pilih kelas yang terdampak (multi-select, berdasarkan jadwal coach di tanggal tersebut)
- Assign coach pengganti (opsional — dropdown berisi list coach aktif di cabang yang tidak sedang suspend)
- Catatan admin (opsional)
- Status langsung "Disetujui" karena dibuat langsung oleh admin
- Setelah disimpan: kelas yang terdampak otomatis dialihkan ke coach pengganti (jika ada), button Clock In untuk kelas tersebut tidak muncul di coach page coach yang izin, dan kelas tersebut otomatis muncul sementara di coach page coach pengganti hanya untuk tanggal izin tersebut dengan label "Pengganti"

**Tindak Lanjut Izin dari Coach Page:**

- Pengajuan izin dari coach page masuk ke tab ini dengan status "Menunggu Persetujuan"
- Admin bisa menyetujui atau menolak
- Jika disetujui: admin bisa assign coach pengganti dari halaman ini (jika coach belum assign sendiri). Kelas otomatis muncul di coach page pengganti hanya untuk tanggal izin tersebut dengan label "Pengganti"
- Jika jadwal coach pengganti bentrok, muncul peringatan namun admin tetap bisa override

### Tab: Izin Member

- List semua izin member: yang sudah disetujui, ditolak, menunggu persetujuan, dan yang dibuat langsung oleh admin
- Filter: status, nama member, bulan, kelas

**Buat Izin Member (oleh admin):**

- Pilih member (dropdown)
- Pilih jenis izin: Izin, Sakit, Ujian, atau Lainnya (jika Lainnya, input alasan teks)
- Pilih tanggal atau range tanggal — berguna untuk kasus member izin beberapa hari berturut-turut (contoh: libur ujian sekolah)
- Pilih kelas yang terdampak (multi-select, berdasarkan jadwal member di tanggal tersebut)
- Catatan admin (opsional)
- Status langsung "Disetujui" karena dibuat langsung oleh admin
- Setelah disimpan: status absensi member di hari dan kelas yang terdampak otomatis tercatat sebagai "Izin" di sistem — coach tidak perlu input manual untuk sesi tersebut

**Tindak Lanjut Izin dari Member Page:**

- Pengajuan izin dari member page masuk ke tab ini dengan status "Menunggu Persetujuan"
- Admin bisa menyetujui atau menolak
- Jika ditolak, admin bisa menambahkan alasan penolakan yang akan tampil di member page

---

## 9. Menu Pembayaran

**Catatan Penting:** Menu ini mengelola seluruh aspek pembayaran member di cabang — input tagihan, verifikasi pembayaran masuk, histori, dan pengaturan diskon. Tipe pembayaran berbeda untuk setiap tipe member.

### Logika Pembayaran per Tipe Member

**Tipe Reguler:**
- Tagihan dibuat per bulan
- Admin membuat tagihan bulanan untuk member reguler — bisa sekaligus (generate semua member reguler aktif) atau satu per satu
- Nominal tagihan otomatis mengacu pada harga kelas yang diinput di menu class, namun admin bisa override nominal untuk member tertentu (contoh: ada kesepakatan harga khusus)
- Admin bisa menambahkan pengurangan (diskon) nominal tagihan untuk member tertentu — input nominal pengurangan dan alasan pengurangan (opsional). Pengurangan ini akan tercermin di tagihan member page

**Tipe Private:**
- Tagihan berbasis paket sesi, bukan per bulan
- Saat create tagihan private, admin menginput: jumlah sesi dalam paket (contoh: 6 sesi), nominal per paket, dan tanggal mulai paket
- Member membayar di awal untuk seluruh sesi dalam paket
- Sistem melacak sisa sesi yang belum digunakan — setiap kali member hadir di kelas private, sisa sesi berkurang otomatis
- **Pengingat otomatis:** Ketika sisa sesi tinggal 1 (sesi terakhir sebelum paket habis), sistem otomatis memunculkan notifikasi di member page — menanyakan apakah member ingin melanjutkan paket berikutnya. Member bisa langsung klik "Hubungi Admin" untuk perpanjangan
- Admin bisa melihat status sisa sesi setiap member private di detail member dan di menu pembayaran

**Tipe Afiliasi Sekolah:**
- Tidak ada tagihan ke member secara langsung — biaya ditanggung sekolah
- Admin tetap bisa membuat tagihan dengan tipe "Ditanggung Sekolah" sebagai catatan rekap biaya yang ditanggung sekolah per bulan/periode
- Di Menu School Panel: admin bisa melihat total biaya yang ditanggung sekolah per bulan/periode berdasarkan catatan tagihan ini
- Status pembayaran member afiliasi sekolah otomatis "Ditanggung Sekolah"
- School page tidak melihat data keuangan — hanya rapor siswa

### Fitur Menu Pembayaran

**Tab: Tagihan**

- List semua tagihan yang sudah dibuat, dengan filter: tipe member, kelas, bulan/periode, status pembayaran (belum bayar / sudah bayar / sebagian / gratis / ditanggung sekolah)
- Setiap item tagihan menampilkan: nama member, kelas, periode/paket, nominal, status
- Klik tagihan → lihat detail lengkap tagihan
- Button "Generate Tagihan Bulanan" — admin memilih bulan dan sistem otomatis membuatkan tagihan untuk semua member reguler aktif berdasarkan harga kelas masing-masing. Member yang sudah ada tagihan di bulan tersebut tidak akan di-generate ulang
- Tambah tagihan manual (satu per satu) untuk member tertentu

**Form Buat/Edit Tagihan:**

- Pilih member (dropdown)
- Tipe tagihan (otomatis mengikuti tipe member): Bulanan / Paket Sesi / Custom
- Periode atau nama paket
- Nominal tagihan (pre-filled dari harga kelas, bisa di-override)
- Pengurangan / diskon: toggle aktif atau tidak — jika aktif, input nominal pengurangan dan alasan (opsional)
- Total yang harus dibayar (otomatis terhitung: nominal - pengurangan)
- Catatan admin (opsional)

**Verifikasi Pembayaran:**

- Setelah admin menerima pembayaran (transfer atau tunai), admin membuka detail tagihan dan klik "Verifikasi Pembayaran"
- Admin mengisi: tanggal pembayaran, metode pembayaran (transfer / tunai / lainnya), upload bukti transfer (opsional untuk tunai)
- Status tagihan berubah menjadi "Sudah Bayar" dan timestamp verifikasi tercatat
- Informasi ini otomatis tampil di menu tagihan member page
- Notifikasi "Tagihan diverifikasi" dikirim ke notification center member

**Tab: Histori Pembayaran**

- List semua pembayaran yang sudah diverifikasi
- Filter: nama member, bulan, tipe member, kelas
- Bisa dilihat per member dari halaman detail member

---

## 10. Menu Approvement

**Catatan:**

- Semua item yang sudah di-approve, ditolak, atau diproses tetap tersimpan di history — tidak hilang
- Detail setiap item bisa dilihat, termasuk foto bukti transfer pada history registrasi member

**Isi menu ini:**

- Registrasi member dari register page — bisa diedit, dihapus, atau di-approve. Sebelum approve, admin harus menginput dan mengupload bukti transfer
- Pengajuan izin coach yang menunggu persetujuan (juga muncul di Menu Izin tab Coach)
- Pengajuan izin member yang menunggu persetujuan (juga muncul di Menu Izin tab Member)
- Sertifikasi coach yang diajukan dari coach page

**Catatan duplikasi izin:** Item pengajuan izin di menu Approvement dan menu Izin adalah data yang sama — jika di-approve/tolak dari salah satu menu, status di menu lainnya ikut berubah secara otomatis.

---

## 11. Menu Rapor

- Admin menginput periode pengisian rapor (tanggal mulai dan tanggal selesai)
- Jika periode sudah dibuka, menu rapor di coach page otomatis aktif
- Jika periode berakhir, menu rapor otomatis tertutup — namun admin bisa memperpanjang periode secara manual
- Admin bisa melihat list rapor semua member yang sudah diisi coach
- Admin bisa melihat review yang diberikan member terhadap coach

---

## 12. Menu School Panel

- Admin melakukan CRUD data sekolah yang berafiliasi dengan Next Swimming School
- Isian: nama sekolah, email sekolah, dan password (dibuatkan admin untuk diberikan ke pihak sekolah)
- Menu ini menampilkan hasil rapor member yang berada di bawah naungan sekolah tersebut
- Menu ini juga menampilkan rekap total biaya yang ditanggung sekolah per bulan/periode — berdasarkan catatan tagihan tipe "Ditanggung Sekolah" dari Menu Pembayaran
- Tracking dilakukan melalui tipe member — saat create member atau approve registrasi, admin memilih tipe "Afiliasi Sekolah" dan memilih nama sekolah yang bersangkutan
- Member afiliasi sekolah tidak perlu membayar secara mandiri karena biaya ditanggung pihak sekolah

---

## 13. Dashboard

**Catatan:** Dashboard adalah halaman pertama yang tampil saat login, namun dijelaskan terakhir agar konteks semua datanya sudah dipahami terlebih dahulu.

**Isi:**

- Total anggota aktif di cabang (tidak termasuk yang diarsipkan atau disuspend)
- Total coach aktif di cabang (tidak termasuk yang diarsipkan atau disuspend)
- Total kelas aktif di cabang
- List kelas hari ini (kelas yang sedang libur ditampilkan dengan label "Libur")
- Live attendance — coach dan member yang baru saja absen
- **Section list peringatan** — mencakup:
  - Bentrokan jadwal coach
  - Coach yang sedang suspend dan menjadi satu-satunya penanggung jawab kelas (perlu assign pengganti)
  - Tagihan member yang belum dibayar melewati batas waktu tertentu (opsional, bisa dikonfigurasi)
  - Notifikasi penting lainnya
- Section list approvement — item yang menunggu persetujuan admin, jika diklik akan langsung masuk ke halaman approvement

**Notifikasi Admin:**

- Registrasi member baru dari register page
- Pengajuan izin coach dan member yang menunggu persetujuan
- Sertifikasi baru dari coach yang menunggu review

---
---

# D. Coach Page

## Catatan Penting

- Absensi dilakukan per kelas, bukan per hari — jika coach terassign di 5 kelas dalam 1 hari, coach harus absen 5 kali
- Jika coach terassign di hari yang sama untuk kelas di cabang A dan cabang B, data absensi akan masuk ke admin panel cabang sesuai dengan kelas yang sedang diabsen
- Di detail kelas yang muncul di coach page, harus ada informasi cabang terkait — karena validasi jarak absensi menggunakan koordinat lokasi cabang tersebut
- Jika coach belum melengkapi profil, coach tidak bisa melakukan aktivitas apapun dan akan diarahkan untuk melengkapi profil terlebih dahulu
- Coach bisa mengedit profil mereka sendiri dari coach page, sehingga data di admin panel bisa ikut berubah
- Jika coach terassign di 2 kelas atau lebih dalam waktu yang bersamaan, coach harus melakukan absen sebanyak jumlah kelas tersebut
- Untuk absensi member via QR, coach cukup scan — sistem otomatis mendeteksi kelas dan cabang yang sedang berlangsung
- Untuk absensi member secara manual, coach masuk ke menu absensi → pilih kelas → absen member satu per satu. Pilihan status: Hadir, Izin, atau Sakit
- Jika ada kelas yang terassign ke coach namun spreadsheet program belum diisi, coach wajib mengisinya terlebih dahulu — akan muncul peringatan di halaman home
- **Jika akun coach sedang dalam status suspend**, seluruh fitur coach page tidak dapat diakses. Halaman menampilkan banner menonjol berisi informasi bahwa akun sedang disuspend, alasan suspend (jika admin mengisi), dan countdown waktu tersisa hingga suspend berakhir (hari, jam, menit)
- **Window waktu Clock In:** Coach hanya bisa Clock In mulai 1 jam sebelum sesi dimulai hingga saat sesi berakhir. Di luar window ini, button Clock In tidak muncul atau disabled. Jika window sudah lewat dan coach belum Clock In, coach harus menghubungi admin langsung untuk input absensi manual

---

## 1. Menu Home

**Isi:**

- List kelas hari ini beserta jam dan detail sesi — kelas yang sedang libur ditampilkan dengan label "Libur" dan tidak ada button Clock In
- Quick access button: Absensi Coach (diri sendiri) dan Absen Member (QR)
- Button Absensi Coach menampilkan nama kelas, detail sesi (tanggal dan jam), dan button Clock In — hanya muncul dalam window waktu yang valid (1 jam sebelum sesi s.d. sesi berakhir)
- Button Absen Member (QR) membuka halaman scan QR member
- Card rekap: jumlah kehadiran so far, jumlah absen terlewat, jumlah izin/sakit
- Button Izin — membuka form pengajuan izin atau sakit
- Jika ada kelas yang spreadsheet program belum diisi: muncul peringatan banner di home

**Form Pengajuan Izin:**

- Dropdown: Izin, Sakit, atau Lainnya (jika Lainnya, ada input teks alasan)
- Pilih tanggal atau range tanggal
- Pilih kelas yang terdampak (dropdown multi-select, otomatis menampilkan kelas coach di hari tersebut)
- Alasan / deskripsi
- Assign coach pengganti (dropdown berisi list coach aktif di cabang tersebut yang tidak sedang suspend)
- Klik Submit → menunggu persetujuan admin (masuk ke Menu Izin dan Menu Approvement di admin panel)

**Alur setelah disetujui admin:**

- Kelas yang diizinkan otomatis dialihkan ke coach pengganti
- Button Clock In untuk kelas tersebut tidak akan muncul di coach page coach yang izin
- Kelas tersebut otomatis muncul sementara di coach page coach pengganti hanya untuk tanggal izin, dengan label "Pengganti"
- Jika jadwal coach pengganti bentrok dengan kelas lain, akan muncul alert di coach page coach pengganti dan di section peringatan dashboard admin panel
- Coach mendapat notifikasi di notification center saat izin disetujui atau ditolak

**Notifikasi Coach:**

- Izin disetujui/ditolak
- Sertifikasi disetujui/ditolak
- Ditambahkan sebagai coach pengganti di kelas tertentu
- Kelas baru diassign ke coach ini

---

## 2. Menu Absensi

**Isi:**

- List kelas yang sedang berlangsung atau yang akan datang, beserta detail sesi (tanggal dan jam)
- Button Clock In hanya muncul jika kelas sedang dalam window waktu valid (1 jam sebelum sesi s.d. sesi berakhir) dan kelas tidak sedang libur

**Flow Clock In:**

1. Coach klik button Clock In
2. Halaman selfie terbuka → coach mengambil foto
3. Tersedia opsi "Ambil Ulang" atau "Done"
4. Setelah klik Done, sistem menampilkan jarak lokasi coach saat ini dari lokasi cabang (koordinat dari settings admin panel)
5. Coach klik Submit → muncul custom pop up "Absensi Berhasil"
6. Data absensi langsung terkirim ke history absensi coach page dan admin panel cabang terkait
7. Coach kemudian bisa langsung melakukan absensi member via scan QR atau manual

**Jika window waktu sudah lewat dan coach belum Clock In:**

- Button Clock In tidak muncul
- Tampil keterangan "Waktu absensi sudah lewat — hubungi admin untuk input manual"
- Coach menghubungi admin langsung (di luar sistem) → admin input absensi manual dari Menu Absensi Coach di admin panel

**Fitur lainnya:**

- Button history absensi coach — menampilkan list seluruh absensi coach di semua kelas, termasuk label "Manual — oleh Admin" jika absensi diinput manual oleh admin
- List kelas — jika diklik, bisa digunakan untuk absensi manual member dan melihat history absensi member di kelas tersebut

---

## 3. Menu Profile

- Coach bisa update profil kapan saja, data di database ikut terupdate
- Jika profil belum lengkap, akan muncul peringatan dan coach tidak bisa menggunakan fitur lainnya

**Isian profil:**

- Profile picture (ada fitur auto crop 1:1)
- Nama lengkap
- Nama panggilan
- Jenis kelamin
- Tanggal lahir
- Bio / deskripsi
- Alamat
- Pendidikan terakhir: dropdown + nama instansi
- Nomor rekening: nama bank, nomor rekening, atas nama
- Spesialisasi
- Email
- Nomor telepon WhatsApp
- Sertifikasi (CRUD):
  - Nama sertifikasi
  - Range tanggal berlaku (ada opsi checkbox "Tidak Ada Kedaluwarsa")
  - Foto sertifikat
  - Sertifikasi baru yang diinput coach perlu persetujuan admin
  - Jika sudah di-approve: coach bisa edit (butuh persetujuan admin kembali) atau delete (langsung terhapus, hanya muncul konfirmasi pop up)
- Ganti password: coach langsung memasukkan password baru, langsung overwrite tanpa perlu konfirmasi apapun

---

## 4. Menu Kelas

- List kelas yang terassign ke coach (termasuk kelas sementara sebagai pengganti, dengan label "Pengganti")
- Klik kelas → lihat detail kelas termasuk tujuan/target kelas, deskripsi, informasi cabang, dan daftar member
- Klik salah satu member di daftar → pop up berisi detail data member (dari database)
- Di list maupun pop up detail member tersedia button WhatsApp untuk direct ke nomor member
- Bisa melihat history absensi member di kelas tersebut
- Coach wajib menginput spreadsheet program kelas — data ini akan masuk ke admin panel dan owner panel

---

## 5. Menu Invoice

**Tujuan:** Coach mengenerate invoice bulanan untuk keperluan pembayaran dari owner

**Fitur:**

- List kelas yang sudah dihandle coach dalam 1 bulan (bisa pilih bulan yang ingin dilihat)
- Kelas yang tampil hanya kelas yang sudah diabsen oleh coach — kelas yang dialihkan ke pengganti karena izin tidak akan muncul
- Tampilan bisa dipilih: week atau month
- Coach memilih kelas yang ingin dimasukkan ke invoice (pilih manual atau klik "Pilih Semua")
- Tarif per kelas tampil di list (tarif diinput di owner panel menu settings tarif)
- Generate invoice → bisa didownload dalam format PDF
- Invoice yang di-generate otomatis masuk ke list di menu invoice owner panel dan memicu notifikasi ke owner
- Coach bisa generate berkali-kali — semua tetap masuk ke owner panel
- PDF invoice berisi: detail kelas, total pembayaran, dan informasi rekening coach (dari database)

---

## 6. Menu Rapor

- Menu ini aktif hanya saat periode pembagian rapor sudah dibuka oleh admin
- Coach mengisi rapor untuk semua member di semua kelas yang diajarnya
- Isian rapor berasal dari aspek penilaian yang sudah dikonfigurasi admin di menu class
- Coach bisa mengupdate rapor selama periode masih berlangsung
- Setelah rapor diisi, otomatis tampil di member page untuk dilihat member
- Coach bisa melihat review dari member terhadap dirinya (bintang 1–5 dan pesan dari member)
- Jika periode pembagian rapor berakhir, semua rapor otomatis terkunci dan masuk ke history rapor

---
---

# E. Member Page

## Catatan Penting

- Setiap member memiliki QR code unik yang tidak berubah — bisa diprint dan dijadikan kartu absensi
- Orang tua bisa membawakan kartu absensi untuk anaknya
- Akun member bisa dipegang oleh member sendiri (jika sudah cukup umur) atau oleh orang tua/wali
- Member yang sedang dalam status suspend tidak bisa login

---

## 1. Menu Home

- Menampilkan informasi ringkas: kelas yang diikuti, jadwal latihan terdekat, dan status kehadiran terakhir
- Menampilkan pengumuman dari admin (jika ada yang aktif dan ditujukan untuk member ini atau kelasnya)
- **Pengingat tagihan belum dibayar:** Jika ada tagihan yang statusnya masih "Belum Bayar", muncul card pengingat yang menonjol di home — menampilkan informasi tagihan (periode, nominal) beserta dua button: "Lihat Tagihan" (direct ke menu Tagihan) dan "Hubungi Admin Cabang" (direct ke WhatsApp admin cabang menggunakan nomor dari settings admin)
- **Pengingat paket sesi hampir habis (khusus member Private):** Jika sisa sesi dalam paket berjalan tinggal 1, muncul card notifikasi di home — menginformasikan bahwa sesi terakhir hampir tiba dan memberikan opsi "Hubungi Admin" untuk melanjutkan paket berikutnya
- **Notifikasi member:** tagihan baru, tagihan diverifikasi lunas, rapor tersedia, izin disetujui/ditolak, pengumuman baru — semua masuk ke notification center (icon bell di navbar)

---

## 2. Menu Jadwal

- Menampilkan jadwal kelas yang diikuti member
- Menampilkan hari, jam, lokasi, dan nama coach per kelas
- Kelas yang sedang libur pada hari tertentu ditampilkan dengan label "Libur" sehingga member tahu tidak perlu datang

---

## 3. Menu Absensi

- Menampilkan history absensi member per kelas
- Bisa filter berdasarkan bulan atau kelas
- Status kehadiran: Hadir, Izin, Sakit, atau Tidak Hadir

---

## 4. Menu Tagihan

**Tujuan:** Member melihat tagihan aktif dan histori pembayaran yang sudah dibuat admin.

**Isi:**

- **Tab Tagihan Aktif:** Menampilkan semua tagihan dengan status "Belum Bayar" atau "Sebagian Bayar"
  - Setiap item menampilkan: periode/nama paket, kelas, nominal tagihan, nominal pengurangan (jika ada beserta alasannya), total yang harus dibayar, dan status
  - Untuk tagihan private: menampilkan jumlah sesi dalam paket dan sisa sesi yang tersisa
  - Tersedia button "Hubungi Admin Cabang" di setiap item tagihan — direct ke WhatsApp admin cabang (nomor dari settings admin) dengan template pesan konfirmasi pembayaran
- **Tab Histori Pembayaran:** Menampilkan semua tagihan yang sudah lunas — menampilkan tanggal verifikasi, metode pembayaran, dan nominal

**Catatan:** Member tidak bisa melakukan pembayaran mandiri lewat sistem (tidak ada payment gateway) — semua pembayaran dikonfirmasi manual oleh admin setelah menerima transfer atau uang tunai.

---

## 5. Menu Izin

**Tujuan:** Member mengajukan izin tidak hadir di kelas tertentu.

**Catatan:** Pengajuan izin dari menu ini akan masuk ke Menu Izin tab Member di admin panel dengan status "Menunggu Persetujuan".

**Form Pengajuan Izin:**

- Pilih kelas yang ingin diizinkan (dropdown berisi kelas yang diikuti member)
- Pilih tanggal izin (bisa pilih satu hari atau range tanggal jika izin beberapa hari berturut-turut)
- Jam kelas otomatis tampil sesuai kelas dan hari yang dipilih
- Pilih jenis izin: Izin, Sakit, Ujian, atau Lainnya (jika Lainnya, input alasan teks)
- Alasan tambahan (opsional — text area)
- Klik Submit

**Alur setelah submit:**

- Muncul pop up konfirmasi: "Pengajuan izin berhasil dikirim. Menunggu persetujuan admin."
- Status izin tampil di list riwayat izin di menu ini
- Member mendapat notifikasi di notification center saat izin disetujui atau ditolak

**List Riwayat Izin:**

- Menampilkan semua pengajuan izin beserta statusnya: Menunggu Persetujuan, Disetujui, atau Ditolak
- Jika ditolak, tampilkan alasan penolakan dari admin (jika admin mengisi)
- Filter berdasarkan bulan atau kelas

---

## 6. Menu Rapor

- Menampilkan hasil rapor yang diberikan coach, sesuai periode yang dibuka admin
- Member mendapat notifikasi di notification center saat rapor baru tersedia
- Setelah menerima rapor, member bisa memberikan review terhadap coach: bintang 1–5 dan ulasan teks
- Review bisa diedit selama periode pembagian rapor masih berlangsung
- Jika periode berakhir, semua rapor dan review terkunci dan masuk ke history rapor

---

## 7. Menu Profile

- Member bisa melihat dan mengupdate data profil mereka
- Data yang bisa diupdate: nomor HP, alamat, riwayat kesehatan/alergi, foto profil
- Data seperti nama, tanggal lahir, kelas, dan tipe member tidak bisa diubah sendiri — harus minta admin
- Ganti password: langsung overwrite tanpa perlu konfirmasi apapun
- Member bisa melihat dan mendownload QR code absensi mereka dari halaman ini

---
---

# F. School Page

- Jika user yang login memiliki role school, dia akan masuk ke school page
- Di school page ini berisi data rapor siswa afiliasinya
- Halaman ini berguna hanya saat pembagian rapor, jadi sekolah bisa melihat rapor siswanya — bisa didownload sekaligus ataupun satu persatu di setiap murid
- Tampilannya harus complete fiturnya yang memudahkan sekolah dan enak dilihat
- School page tidak menampilkan data keuangan — hanya rapor siswa

# Konsep Connect Database Menggunakan Next.js (App Router) + Supabase

## Install Packages

Install dependency Supabase untuk Next.js App Router:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## Environment Variables

Buat file `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

---

## Struktur Folder

```bash
utils/
└── supabase/
    ├── client.ts
    ├── server.ts
    └── middleware.ts
```

---

## Server Component Example (`page.tsx`)

Digunakan untuk fetch data langsung dari server component pada App Router.

```tsx
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {

  const cookieStore = await cookies()

  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase
    .from('todos')
    .select()

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  )
}
```

---

## `utils/supabase/server.ts`

Client Supabase khusus untuk server component, server action, dan route handler.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {

        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {

          try {

            cookiesToSet.forEach(
              ({ name, value, options }) =>
                cookieStore.set(name, value, options)
            )

          } catch {

            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.

          }

        },

      },

    },
  );

};
```

---

## `utils/supabase/client.ts`

Client Supabase khusus untuk Client Component (`"use client"`).

```ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
```

---

## `utils/supabase/middleware.ts`

Digunakan untuk menjaga session authentication tetap sinkron pada App Router.

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (request: NextRequest) => {

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {

      cookies: {

        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {

          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          )

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
          )

        },

      },

    },
  );

  return supabaseResponse

};
```

---

## Install Agent Skills (Optional)

Agent Skills membantu AI coding tools memahami Supabase dengan lebih akurat dan efisien.

```bash
npx skills add supabase/agent-skills
```

---

## Catatan Implementasi untuk Project Next Swimming School

- Menggunakan Next.js App Router
- Authentication menggunakan Supabase Auth
- Database menggunakan PostgreSQL dari Supabase
- Semua tabel wajib menggunakan RLS (Row Level Security)
- Gunakan Server Component sebanyak mungkin untuk performa yang lebih baik
- Gunakan Client Component hanya untuk interactive UI
- Session auth dijaga menggunakan middleware Supabase
- Struktur role login:
  - owner
  - admin
  - coach
  - member
  - school
- Setelah login berhasil, user diarahkan otomatis berdasarkan role masing-masing
- Gunakan realtime Supabase untuk:
  - Notification Center
  - Live attendance
  - Dashboard monitoring
- Gunakan Cloudflare R2 untuk:
  - Foto profil
  - QR code
  - Bukti transfer
  - Sertifikat coach
  - PDF invoice
  - PDF rapor
- Fokus utama sistem:
  - Mobile first
  - Zero loading navigation
  - Fast response
  - Clean UX
  - Modern admin experience
