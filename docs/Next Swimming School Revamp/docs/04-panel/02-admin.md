# Admin Panel — Konsep terkunci

> Status: konsep panel terkunci. Niat produk: `docs/01-prd.md`. Umpan balik: `docs/02-umpan-balik.md`.
> Peran `admin`: satu pusat (`profiles.branch_id`).
> Manager Center memakai panel yang sama (`/admin`); beda dua menu, lihat kotak di bawah.
> Sumber perilaku yang sudah ada: `src/app/admin/`.
> Jaringan dan wewenang: `docs/03-alur/01-jaringan.md`. Siswa: `docs/03-alur/02-siswa.md`. Tagihan: `docs/03-alur/04-uang.md`. Rapor: `docs/03-alur/05-rapor-sekolah.md`. Izin/absensi: `docs/03-alur/03-absensi-izin-honor.md`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan Admin
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Admin**
- **Jangan** — jalur ganda atau wewenang yang dilarang

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Student · School · Publik (landing dan `/register`)

## Lingkup: Admin versus Manager Center

Semua kueri disaring ke **satu** `branch_id`. Owner dapat membuka panel ini lewat **Open Admin Panel** (spanduk pratinjau dan tombol kembali). Pratinjau Owner tidak mengubah wewenang akun Admin sungguhan (FB-12).

| | Admin biasa | Manager Center |
|---|---|---|
| Panel | `/admin` | `/admin` (komponen sama) |
| **Payments** (`pay`) | Tampil jika `branches.show_payments_to_admin = true` | **Selalu** tampil |
| **Financial** (`financial`) | **Tidak ada** | **Selalu** tampil |
| Slip gaji, kasbon, landing, penyimpanan | Tidak. Itu Owner | Tidak. Itu Owner |

Wewenang dicek di peladen. Membuka `/admin?tab=financial` atau memanggil API keuangan sebagai Admin biasa harus ditolak. Jangan mengandalkan `hidden` di menu sebagai keamanan. Jangan membuat panel ketiga untuk Manager Center.

Lencana **Approvals** = jumlah `registrations` tertunda **plus** `certifications` pelatih tertunda di pusat itu (langsung). Izin **tidak** masuk lencana ini (ada menu **Leave Requests**).

Admin **tidak** dapat: membuat Owner atau Admin, menerbitkan slip gaji, membuka periode invoice honor, mengelola kasbon, menyunting landing, menghapus berkas penyimpanan, meninjau honor pelatih/staf.

## Rantai create di panel ini

Admin tidak membuat pusat. Pusat sudah ada dari Owner.

1. Identitas pusat (Settings memakai data Centers) — suntingan, tetap di dasar
2. Sekolah mitra + akun masuk
3. Pelatih
4. Kelas reguler + paket sesi kelas
5. Siswa reguler / afiliasi, atau persetujuan `/register`
6. Siswa privat
7. Kalender dan libur
8. Pengumuman
9. Izin
10. Absensi
11. Tagihan siswa
12. Periode rapor dan unduh
13. Kompetisi
14. Keuangan satu pusat (hanya Manager Center)

## Susunan menu terkunci

| No. | Menu | `id` tab | Alasan urutan |
|---|---|---|---|
| 1 | Dashboard | `dashboard` | Beranda |
| 2 | School Panel | `school` | Sekolah mitra harus ada sebelum siswa afiliasi |
| 3 | Coach | `coaches` | Pelatih harus ada sebelum kelas dan privat |
| 4 | Class | `classes` | Kelas reguler; paket `class_packages` hanya di sini |
| 5 | Class Activity | `activity` | Libur dan kalender; butuh kelas |
| 6 | Student | `students` | Siswa reguler dan afiliasi; butuh kelas dan (jika afiliasi) sekolah |
| 7 | Approvals | `approve` | Jalur create siswa dari `/register`; dekat Student |
| 8 | Private Students | `studentPrivate` | Setelah pelatih ada; terpisah dari Student |
| 9 | Announcements | `announce` | Butuh kelas jika sasarannya per kelas |
| 10 | Leave Requests | `izin` | Butuh pelatih dan siswa |
| 11 | Attendance | `absensi` | Butuh kelas, orang, dan izin yang disetujui |
| 12 | Payments | `pay` | Tagihan setelah siswa reguler masuk kelas |
| 13 | Report Cards | `rapor` | Periode setelah siswa dan rubrik Owner ada |
| 14 | Competitions | `competitions` | Prestasi setelah siswa ada |
| 15 | Financial | `financial` | Hanya Manager Center; rekap setelah tagihan |
| 16 | Settings | `settings` | Identitas pusat; dasar |

Dashboard boleh menampilkan hitungan antrian (pendaftaran, sertifikat, izin, tagihan lama). **Jangan** menaikkan Approvals ke nomor 2 hanya karena sering dibuka.

## Aturan satu pintu

- Hapus opsi `private` dari formulir **Student** dan dari impor Excel. Privat hanya dari **Private Students**.
- Jangan menggabungkan Student dan Private menjadi satu tabel.
- Class Activity jangan digabung ke Class. Membuat kelas ≠ menandai libur.
- Izin orang ≠ libur kelas ≠ sakit staf.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:** bilah sisi, keluar, judul, Bell, pengalih bahasa, avatar. **Tanpa** kotak pencarian. Logo bilah sisi = logo pusat (**Settings**), cadangan logo NEXT. Spanduk pratinjau Owner jika dibuka dari **Centers**.

**Dampak ke peran lain:** Bell Admin untuk operasional pusat, **bukan** invoice pelatih/staf (itu Bell Owner).

**Jangan:** placeholder pencarian yang mengesankan pencarian global.

---

## 1. Dashboard (`dashboard`)

**Apa:** Ringkasan satu pusat. Tidak ada ubahan data.

**Yang dapat dilakukan:**

- angka: siswa aktif, pelatih aktif (bukan arsip, bukan sedang ditangguhkan), kelas aktif;
- hitungan tertunda: pendaftaran, sertifikat pelatih, izin pelatih, izin siswa;
- peringatan kelas tanpa pelatih aktif;
- peringatan tagihan `unpaid` lebih dari 30 hari;
- kelas hari ini (`schedule_days`) plus lencana libur;
- kehadiran langsung: clock-in pelatih hari ini dan siswa `hadir` hari ini.

**Dampak ke peran lain:** clock-in pelatih, kehadiran siswa, izin tertunda, dan `/register` yang belum disetujui mengisi kartu ini.

---

## 2. School Panel (`school`)

**Apa:** Sekolah mitra satu pusat plus akun masuk `school`. Harus ada sebelum siswa afiliasi dibuat.

**Yang dapat dilakukan:** membuat (nama, surel, kata sandi, PIC) → `POST /api/admin/users` plus baris `schools`; menampilkan kredensial sekali plus WhatsApp; menyunting; menghapus (menghapus pengguna masuk jika ada `profile_id`).

**Bukan** di sini: logo dan tanda tangan rapor (Owner **Schools**).

**Dampak ke peran lain:** akun masuk panel School; siswa afiliasi memakai `school_id`; Owner **Accounts** juga dapat membuat akun sekolah.

---

## 3. Coach (`coaches`)

**Apa:** Pelatih yang terikat pusat ini.

**Yang dapat dilakukan:** membuat pelatih (profil, rekening, bio, pendidikan, avatar, sertifikat awal `pending`); menyunting; mengatur ulang kata sandi; menangguhkan; mengarsipkan; menghapus; **menautkan** pelatih yang sudah ada di pusat lain (`coach_branches`) atau melepas tautan; menugaskan ke kelas.

**Dampak ke peran lain:** sertifikat tertunda ke **Approvals**; menangguhkan semua pelatih suatu kelas memicu peringatan dasbor; rekening ke Owner slip gaji; sorotan pelatih di landing **bukan** dari sini (itu CMS Owner).

---

## 4. Class (`classes`)

**Apa:** Kelas reguler satu pusat. Kelas `class_type=private` **tidak** di sini — lihat **Private Students**.

**Yang dapat dilakukan:**

- membuat dan mengubah: jadwal (hari jamak, tiap hari punya jam mulai dan jam selesai sendiri), kapasitas, harga, foto, lokasi pusat atau titik sendiri lewat peta (geser pin atau cari nama tempat);
- menugaskan pelatih beserta perannya. Satu pelatih otomatis menjadi kepala; dua pelatih dipilih mana kepala dan mana asisten; lebih dari dua, sisanya menjadi coaching staff. Aturan lengkap di `docs/06-teknis/SCHEMA.md` bagian `class_coaches`;
- mengarsipkan atau memulihkan;
- **paket sesi** (`class_packages`): nama, jumlah sesi, harga, aktif/nonaktif — **hanya di sini**, tidak di Owner **Classes**;
- melihat tautan spreadsheet pelatih;
- menampilkan atau menyembunyikan arsip.

Absensi per kelas **bukan** pengganti menu **Attendance**.

**Dampak ke peran lain:** Owner melihat kelas lintas pusat tanpa UI paket; pelatih mengampu; Student melihat jadwal dan tagihan; **Payments** memakai paket saat menambah tagihan session pack; School memakai kelas untuk rapor afiliasi.

**Jangan:** menaruh siswa privat sebagai baris di sini. Jangan memindahkan `class_packages` ke Owner.

---

## 5. Class Activity (`activity`)

**Apa:** Kalender mingguan kelas aktif (kisi pukul 06.00–22.00). Membuat kelas ≠ menandai libur.

**Yang dapat dilakukan:**

- menggeser minggu;
- melihat acara kelas dan pelatih; pengganti dari izin pelatih `approved` tampil sebagai acara pengganti (jadwal yang sama dengan tab Class pengganti);
- menandai **satu tanggal** libur per kelas (`class_holidays.holiday_date`);
- membatalkan libur.

Libur kelas **bukan** izin orang (itu **Leave Requests**).

**Dampak ke peran lain:** pelatih tidak perlu clock-in pada tanggal libur kelas itu; dasbor Admin menampilkan lencana libur; pengganti izin tampil di kalender.

---

## 6. Student (`students`)

**Apa:** Siswa pusat **reguler** dan **afiliasi**. Bukan siswa privat.

**Yang dapat dilakukan:**

- saringan: semua / reguler / school_affiliate / ditangguhkan — **tanpa** saringan atau hitungan privat;
- membuat (`POST /api/admin/users`): kontak, kesehatan, masuk kelas, avatar; afiliasi wajib sekolah dan **jenjang wajib** (`school_grade`, FB-08);
- rincian: sunting, atur ulang kata sandi, tangguhkan atau cabut, hapus;
- menambah sesi paket kelas reguler (opsional membuat tagihan dari `class_packages`);
- melihat absensi, tagihan, bukti daftar, kompetisi;
- unduh QR (satu atau banyak);
- impor Excel (templat dan unggah) untuk `reguler` dan `school_affiliate` saja.

**Dampak ke peran lain:** Student masuk panel; afiliasi tampil di School; tagihan ke **Payments** dan Owner **Financial**; jalur lain masuk = **Approvals** dari `/register`.

**Jangan:** opsi `private` di formulir atau impor (FB-01). Jangan menampilkan privat yang “tersembunyi di daftar”. Jangan mencampur jenjang sekolah dengan nama kelas les (FB-08).

---

## 7. Approvals (`approve`)

**Apa:** Antrian persetujuan. Lencana = pendaftaran tertunda + sertifikat tertunda. Letaknya dekat Student karena ini jalur create siswa dari `/register`, bukan beranda operasional.

### A. Pendaftaran (`registrations`)

Dari `/register`. Menyunting data, menyetujui (membuat akun Student, peran `student`, tipe `reguler` atau `school_affiliate` sesuai data daftar), menolak, menghapus, tautan WhatsApp.

### B. Sertifikasi pelatih

Menyetujui atau menolak unggahan dari **Coach** (Admin atau pelatih sendiri).

**Dampak ke peran lain:** publik `/register`; Student dapat masuk setelah disetujui; status sertifikat di profil pelatih.

**Jangan:** menyetujui pendaftaran menjadi `private`. Privat bukan jalur `/register`.

---

## 8. Private Students (`studentPrivate`)

**Apa:** Les privat — satu siswa, satu kelas privat. Satu-satunya jalur create privat di pusat ini (FB-01). Sama dengan Owner; Admin terbatas satu pusat.

**Yang dapat dilakukan:** satu kali tambah menyimpan bersama: data siswa, **harga paket + jumlah sesi** (bukan harga per pertemuan, FB-02), sisa sesi, jadwal (hari jamak, tiap hari punya jam mulai dan jam selesai), pelatih beserta perannya, lokasi pusat atau titik sendiri lewat peta; mengubah sisa sesi; menugaskan pelatih; menambah sesi paket; menghapus. Kelas privat **tidak** tampil di **Class**.

Ubah jadwal, lokasi, atau pelatih: absensi baru memakai konfigurasi baru; absensi lama utuh (FB-03). Sisa sesi = `students.remaining_sessions` setelah pengurang peladen yang sama (FB-04). Generate tagihan bulanan **Payments** tidak mencakup `private`.

**Dampak ke peran lain:** pelatih memakai pin kelas untuk GPS; Student melihat sisa sesi.

**Jangan:** tarif per pertemuan; jalur tersembunyi dari Student/impor/Accounts.

---

## 9. Announcements (`announce`)

**Apa:** Pengumuman satu pusat.

**Yang dapat dilakukan:** judul, isi, semua kelas atau kelas tertentu, `target_roles` (`student | coach | admin | school`), masa berlaku, aktif/nonaktif, hapus.

**Dampak ke peran lain:**

- **Student / Coach:** kartu di beranda jika peran termasuk dan (semua kelas atau kelas mereka)
- **School:** peran dapat ditargetkan, tetapi panel School **tidak memiliki tab atau kartu pengumuman**. Hanya Bell jika ada pemberitahuan ke akun sekolah
- Bukan CMS landing Owner

---

## 10. Leave Requests (`izin`)

**Apa:** Antrian pengajuan Sick dan Izin, satu pusat. Tiga sub-tab. Rincian mesin: `docs/03-alur/03-absensi-izin-honor.md` bab 4.

Owner punya menu yang sama persis di panel Owner (`docs/04-panel/01-owner.md` §11), lintas pusat, sebagai jaring pengaman kalau Admin pusat itu belum sempat menindak. Satu tabel `pending`/`approved`/`rejected`, dua pintu masuk: siapa pun yang menyetujui atau menolak lebih dulu, Admin atau Owner, itu yang berlaku. Yang datang belakangan melihat baris itu sudah diputuskan, bukan galat.

### A. Coach

Menyetujui atau menolak pengajuan pelatih. Wajib pengganti **per sesi** dari daftar seluruh pelatih semua cabang. Admin boleh mengganti nama pengganti sebelum setuju. Tolak wajib alasan. Setelah `approved`, jadwal sesi **otomatis** masuk Class/Home pengganti; clock-in pelatih asli mati.

### B. Student

Menyetujui atau menolak. Tanpa pengganti. Setuju → sisipan hasil **Sick** atau **Izin** pada tanggal yang jatuh di `schedule_days`. Tipe pengajuan `ujian`/`lainnya` menjadi hasil **Izin**. Bukan status absensi (FB-05).

### C. Staff

Hanya pengajuan **tanggal nanti**. Tanpa pengganti. Setuju → staf tidak bisa clock-in di tanggal itu. Sick/Izin **hari ini** tidak masuk antrian ini (staf mencatat langsung di Home; Bell Admin).

**Yang dapat dilakukan:** setuju, tolak plus alasan, ganti pengganti (hanya Coach), membuat pengajuan atas nama pelatih/siswa/staf.

**Dampak ke peran lain:** pelatih, siswa, staf mengajukan dari panel mereka; pengganti tampil di **Class Activity** dan jadwal Class pengganti; roster siswa mendapat baris Sick/Izin. **Owner:** dapat menyetujui atau menolak pengajuan pusat ini juga lewat menunya sendiri; keputusan itu tercatat seperti keputusan Admin.

**Jangan:** mencampur tiga sub-tab jadi satu tabel. Jangan mengartikan Supported sebagai pengganti. Libur kelas bukan di sini. Jangan membuat tahap "Owner menyetujui ulang" sesudah Admin menyetujui — satu pengajuan hanya ditutup sekali.

---

## 11. Attendance (`absensi`)

**Apa:** Rekap kehadiran pelatih, siswa, dan staf satu pusat. Daftar mengikuti penyerahan absensi; rincian menampilkan foto jika ada (FB-06, FB-07).

### A. Pelatih

Daftar `coach_attendances` (saringan pelatih, kelas, tanggal). Input manual hadir/telat/absen (`is_manual`); sunting; hapus. Rincian menampilkan swafoto jika `selfie_url` terisi. Jarak GPS dicatat, tidak menolak.

### B. Student

Daftar `student_attendances` (kelas, status, bulan, nama). Hampir hanya baca. Baris `sakit`/`izin` otomatis dari **Leave Requests** yang disetujui. Status sah: `hadir | telat | izin | sakit | tidak_hadir`.

### C. Staff

Daftar `staff_attendances`. Rincian menampilkan swafoto yang sudah dikompres dan tersimpan (FB-07). Status: Present / Sick / Izin / Absent. Hari ini dari Home staf; tanggal nanti dari Leave Requests → Staff.

**Dampak ke peran lain:** clock-in GPS pelatih; Student tidak memindai sendiri — pelatih yang memindai QR; sesi pelatih `present`/`late` menjadi item invoice jika tarif sudah diisi; Owner **Attendance** membaca kejadian yang sama.

**Jangan:** salinan daftar yang lebih baru di satu panel. Jangan menambal Excel sekolah sebelum tabel ini benar (FB-05). Jangan mencampur tiga tabel absensi.

---

## 12. Payments (`pay`)

**Apa:** Tagihan siswa (`bills`) satu pusat. Hilang dari bilah sisi jika Owner mematikan sakelar (Manager Center tetap melihat). Wewenang tetap dicek di peladen.

**Yang dapat dilakukan:**

- tab belum lunas / lunas / semua;
- **membuat tagihan bulanan** — hanya siswa `reguler` yang masuk kelas; satu tagihan per pasangan siswa×kelas; melewati yang sudah ada pada periode itu; pemberitahuan ke Student;
- menambah tagihan manual: bulanan / session pack (dari `class_packages`) / khusus; diskon;
- menandai lunas: tanggal, metode (`transfer | cash | qris`), **unggah bukti dari sisi Admin**; pemberitahuan ke Student;
- rincian dan pratinjau bukti (URL bertanda tangan).

**Tidak** dibuat otomatis: `school_affiliate` (biasanya `school_covered`) dan `private`.

**Dampak ke peran lain:** Student melihat tagihan, rekening pusat (Owner **Centers**), dan mengonfirmasi lewat WhatsApp. **Tidak ada unggah bukti di panel Student.** Owner **Financial → Income** membaca tagihan yang diverifikasi.

**Jangan:** generate bulanan mengenai privat atau afiliasi (KPI-03). Jangan menambah gerbang pembayaran.

---

## 13. Report Cards (`rapor`)

**Apa:** Periode isi rapor, unduh PDF, ulasan pelatih.

**Yang dapat dilakukan:** membuka periode (menutup periode terbuka lain di pusat itu), menyunting, menutup, membuka lagi; daftar siswa (saringan kelas/pelatih/status); pratinjau; unduh PDF satu atau zip; melihat ulasan bintang (identitas pemberi ulasan disamarkan di peladen).

ZIP hanya memuat rapor `locked`; nama berkas memuat identitas siswa; tidak campur berkas rusak atau belum dikunci (FB-09, mesin yang sama dengan School).

**Dampak ke peran lain:** pelatih mengisi hanya jika periode `is_open`; Student dan School mengunduh PDF; Owner hanya templat level dan tanda tangan.

---

## 14. Competitions (`competitions`)

**Apa:** Lomba satu pusat. Komponen sama dengan Owner, `branch_id` terisi, jadi peserta, medali, dan daftar siswa terkunci ke pusat ini.

**Yang dapat dilakukan:** sama persis dengan Owner, rinciannya di `docs/04-panel/01-owner.md` §10: tiga kartu angka, tab **Awards** dan **Competitions**, modal riwayat prestasi per siswa, formulir hasil peserta, gandakan, serta simpan dan tambah lagi.

**Bedanya dengan Owner:** tidak ada saringan cabang. Semua yang tampil sudah pasti milik pusat ini.

**Dampak ke peran lain:** Owner melihat semua pusat; Student melihat riwayat di rapor; pelatih dapat menjadi pendamping.

---

## 15. Financial (`financial`) — hanya Manager Center

**Apa:** Buku keuangan satu pusat. Bukan menu Admin biasa. Lebih kurus dari Owner.

**Yang dapat dilakukan:** pemasukan (tagihan + manual), pengeluaran manual (tanda reimburse plus bukti), kategori dari Owner Master Data. Saringan tanggal dan ekspor mengikuti saringan yang sedang tampil (FB-11), sama rantai Owner.

**Tidak** ada: slip gaji, kasbon, menyetujui `staff_reimbursements`, menandai invoice pelatih lunas. Itu Owner. Antarmuka **menulis** bahwa reimburse staf diproses Owner.

**Dampak ke peran lain:** transaksi tampil di Owner **Financial** lintas pusat.

**Jangan:** menyetujui honor atau reimburse dari sini. Jangan studenti Admin biasa akses lewat URL.

---

## 16. Settings (`settings`)

**Apa:** Identitas operasional pusat. Dapat dibuka meski `branch_id` belum siap. Tetap di dasar: Admin jarang membuat pusat baru setiap hari, dan Owner yang membuat cabang.

**Yang dapat dilakukan:** nama, alamat, pin peta, WhatsApp Admin, logo; daftar staf hanya baca (`staff` + `manager_center`) plus rekening mereka.

**Tidak** di sini: rekening pembayaran siswa dan sakelar Payments (Owner **Centers**).

**Dampak ke peran lain:** WhatsApp ke Student **Bills** dan School; lintang/bujur ke GPS pelatih; logo di bilah sisi Admin.

---

## Matriks silang Admin → peran lain

| Fitur Admin | Owner | Coach | Staff | Student | School | Publik |
|---|---|---|---|---|---|---|
| Dashboard | Pratinjau | Clock-in; izin tertunda | — | Hadir hari ini; izin tertunda | — | Pendaftaran tertunda |
| School Panel | Schools + Accounts | — | — | Pilih sekolah afiliasi | Masuk panel School | — |
| Coach | Accounts + tarif/slip | Masuk; sertifikat tertunda | — | — | — | Landing pelatih **bukan** dari sini |
| Class | Kelas lintas pusat; paket sesi hanya Admin | Ampu | — | Jadwal/tagihan | Rapor kelas | — |
| Class Activity | — | Libur; tampil sebagai pengganti | — | — | — | — |
| Student | Accounts (bukan privat) | Siswa di kelas mereka | — | Masuk + QR | Afiliasi + jenjang | — |
| Approvals | — | Status sertifikat | — | Akun setelah disetujui | — | `/register` |
| Private Students | Tab sama, semua pusat | Kelas privat + GPS kelas | — | Sesi privat | — | — |
| Announcements | — | Beranda jika ditarget | — | Beranda jika ditarget | Tidak ada tab; hanya Bell | — |
| Leave Requests | Menu sama lintas pusat; siapa lebih dulu menyetujui yang berlaku | Ajukan; jadwal pengganti otomatis | Sub-tab Staff (tanggal nanti); hari ini Bell saja | Ajukan; absensi otomatis | — | — |
| Attendance | Hub semua pusat + foto | GPS; invoice sesi | Swafoto + riwayat | QR dipindai pelatih | Rekap afiliasi | — |
| Payments | Financial Income; sakelar | — | — | Bills + WA, bukan unggah bukti | Afiliasi tidak digenerate | — |
| Report Cards | Level + tanda tangan | Isi rapor | — | PDF + ulasan | PDF/ZIP afiliasi | — |
| Competitions | Semua pusat | Pendamping | — | Riwayat rapor | — | — |
| Financial (MC) | Financial lintas pusat | — | Reimburse di Owner | Tagihan sebagai pemasukan | — | — |
| Settings | Centers (rekening + sakelar) | GPS | Daftar tim | WA di Bills | WA di kaki | — |

---

## Alur silang (mengikuti rantai create)

**1. Sekolah mitra sampai siswa afiliasi.** **School Panel** membuat akun → Owner unggah logo/tanda tangan → **Student** tipe `school_affiliate` plus jenjang wajib plus masuk kelas → panel School melihat nama. Tab **Bills** siswa disembunyikan.

**2. Daftar publik menjadi les reguler.** `/register` → **Approvals** menyetujui (bukan privat) → gerbang foto Student → masuk kelas → **Payments** membuat tagihan bulan berjalan → Student **Bills** plus pemberitahuan → transfer sesuai rekening → konfirmasi WhatsApp → Admin menandai lunas (bukti dapat diunggah Admin).

**3. Les privat.** **Private Students** membuat akun plus kelas (bukan formulir Student) → tidak tampil di **Class** → pelatih absensi dengan GPS kelas → sisa sesi di Student. Tidak kena generate tagihan bulanan.

**4. Izin pelatih plus pengganti.** Pelatih mengajukan Sick/Izin plus pengganti per sesi (daftar semua cabang) → **Leave Requests** menyetujui → **Class Activity** dan tab **Class** pengganti menampilkan sesi itu otomatis. Honor ke pengganti yang clock-in. Rincian: `docs/03-alur/03-absensi-izin-honor.md`.

**5. Periode rapor.** Rubrik Owner sudah ada → Admin membuka periode → pelatih mengisi → Admin/School/Student mengunduh PDF atau ZIP tertata.

**6. Absensi sampai honor.** Pelatih/staf/siswa tercatat → **Attendance** (plus foto) → Owner membuka periode invoice → pelatih/staf mengajukan. Admin **tidak** meninjau honor.

---

## Selisih vs kode

| Sekarang di kode | Konsep terkunci |
|---|---|
| Urutan: Dashboard, Class Activity, Class, Student, Private, Coach, Competitions, Attendance, Announcements, Leave, Approvals, Payments, Financial, Report Cards, School, Settings | Urutan tabel susunan menu di atas |
| Formulir Student dan impor masih opsi `private` | Privat hanya **Private Students** |
| Attendance dua sub-tab (pelatih, siswa); staf tidak ada | Tiga sub-tab plus foto |
| Leave Requests hanya pelatih dan siswa; staf dilarang | Tiga sub-tab; staf tanggal nanti masuk; hari ini tetap langsung |
| Pengganti hanya kartu kalender/beranda | Setelah approve, sesi masuk Class pengganti |
| Jenjang afiliasi opsional | Jenjang wajib |
| Placeholder pencarian di bilah atas | Dihapus |
| Financial MC tanpa jaminan Excel = saringan | Rantai FB-11 |
