# Admin Panel — Daftar Fitur

> Sumber: `src/app/admin/` dan panel peran lain.
> Peran `admin`: satu pusat (`profiles.branch_id`).
> Manager Center memakai panel yang sama (`/admin`); beda dua menu, lihat kotak di bawah.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan Admin
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Admin**

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Member · School · Publik (landing dan `/register`)

---

## Lingkup: Admin versus Manager Center

Semua kueri disaring ke **satu** `branch_id`. Owner dapat membuka panel ini lewat **Open Admin Panel** (spanduk pratinjau dan tombol kembali).

| | Admin biasa | Manager Center |
|---|---|---|
| Panel | `/admin` | `/admin` (komponen sama) |
| **Payments** (`pay`) | Tampil jika `branches.show_payments_to_admin = true` | **Selalu** tampil |
| **Financial** (`financial`) | **Tidak ada** | **Selalu** tampil |
| Slip gaji, kasbon, landing, penyimpanan | Tidak. Itu Owner | Tidak. Itu Owner |

Lencana **Approvals** = jumlah `registrations` tertunda **plus** `certifications` pelatih tertunda di pusat itu (langsung). Izin **tidak** masuk lencana ini (ada menu **Leave Requests**).

Admin **tidak** dapat: membuat Owner atau Admin, menerbitkan slip gaji, membuka periode invoice honor, mengelola kasbon, menyunting landing, menghapus berkas penyimpanan.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:** bilah sisi, keluar, judul, placeholder pencarian, Bell, pengalih bahasa, avatar. Logo bilah sisi = logo pusat (**Settings**), cadangan logo NEXT. Spanduk pratinjau Owner jika dibuka dari **Centers**.

**Dampak ke peran lain:** Bell Admin untuk operasional pusat, **bukan** invoice pelatih/staf (itu Bell Owner).

---

## 1. Dashboard (`dashboard`)

**Apa:** Ringkasan satu pusat. Tidak ada ubahan data.

**Yang dapat dilakukan:**

- angka: member aktif, pelatih aktif (bukan arsip, bukan sedang ditangguhkan), kelas aktif;
- hitungan tertunda: pendaftaran, sertifikat pelatih, izin pelatih, izin member;
- peringatan kelas tanpa pelatih aktif;
- peringatan tagihan `unpaid` lebih dari 30 hari;
- kelas hari ini (`schedule_days`) plus lencana libur;
- kehadiran langsung: clock-in pelatih hari ini dan member `hadir` hari ini.

**Dampak ke peran lain:** clock-in pelatih, kehadiran member, izin tertunda, dan `/register` yang belum disetujui mengisi kartu ini.

---

## 2. Class Activity (`activity`)

**Apa:** Kalender mingguan kelas aktif (kisi pukul 06.00–22.00).

**Yang dapat dilakukan:**

- menggeser minggu;
- melihat acara kelas dan pelatih; pengganti dari izin pelatih `approved` tampil sebagai acara pengganti;
- menandai **satu tanggal** libur per kelas (`class_holidays.holiday_date`);
- membatalkan libur.

Libur kelas **bukan** izin orang (itu **Leave Requests**).

**Dampak ke peran lain:** pelatih tidak perlu clock-in pada tanggal libur kelas itu; dasbor Admin menampilkan lencana libur; pengganti izin tampil di kalender.

---

## 3. Class (`classes`)

**Apa:** Kelas reguler satu pusat. Kelas `class_type=private` **tidak** di sini — lihat **Private Members**.

**Yang dapat dilakukan:**

- membuat dan mengubah: jadwal (hari dan jam, dapat berbeda per hari), kapasitas, harga, foto, lokasi pusat atau eksternal;
- menugaskan pelatih kepala atau asisten;
- mengarsipkan atau memulihkan;
- **paket sesi** (`class_packages`): nama, jumlah sesi, harga, aktif/nonaktif — **hanya di sini**, tidak di Owner **Classes**;
- melihat absensi member per kelas; tautan spreadsheet pelatih;
- menampilkan atau menyembunyikan arsip.

**Dampak ke peran lain:** Owner melihat kelas lintas pusat tanpa UI paket; pelatih mengampu; Member melihat jadwal dan tagihan; **Payments** memakai paket saat menambah tagihan session pack; School memakai kelas untuk rapor afiliasi.

---

## 4. Member (`members`)

**Apa:** Member pusat **kecuali** `type=private` (itu **Private Members**). Formulir tambah masih memuat opsi `private`, tetapi daftar ini menyembunyikan mereka — gunakan **Private Members**.

**Yang dapat dilakukan:**

- saringan: semua / reguler / school_affiliate / ditangguhkan;
- membuat (`POST /api/admin/users`): kontak, kesehatan, masuk kelas, avatar; afiliasi wajib sekolah, jenjang opsional;
- rincian: sunting, atur ulang kata sandi, tangguhkan atau cabut, hapus;
- menambah sesi (opsional membuat tagihan dari paket kelas);
- melihat absensi, tagihan, bukti daftar, kompetisi;
- unduh QR (satu atau banyak);
- impor Excel (templat dan unggah).

**Dampak ke peran lain:** Member masuk panel; afiliasi tampil di School; tagihan ke **Payments** dan Owner **Financial**; jalur lain masuk = **Approvals** dari `/register`.

---

## 5. Private Members (`memberPrivate`)

**Apa:** Les privat — satu siswa, satu kelas privat. Sama dengan Owner; Admin terbatas satu pusat.

**Yang dapat dilakukan:** membuat akun plus kelas (jadwal, GPS khusus, pelatih, paket sesi, harga); mengubah sisa sesi; menugaskan pelatih; menambah sesi; menghapus. Kelas privat **tidak** tampil di **Class**.

**Dampak ke peran lain:** pelatih memakai pin kelas untuk GPS; Member melihat sisa sesi; generate tagihan bulanan **Payments** tidak mencakup `private`.

---

## 6. Coach (`coaches`)

**Apa:** Pelatih yang terikat pusat ini.

**Yang dapat dilakukan:** membuat pelatih (profil, rekening, bio, pendidikan, avatar, sertifikat awal `pending`); menyunting; mengatur ulang kata sandi; menangguhkan; mengarsipkan; menghapus; **menautkan** pelatih yang sudah ada di pusat lain (`coach_branches`) atau melepas tautan; menugaskan ke kelas.

**Dampak ke peran lain:** sertifikat tertunda ke **Approvals**; menangguhkan semua pelatih suatu kelas memicu peringatan dasbor; rekening ke Owner slip gaji; sorotan pelatih di landing **bukan** dari sini (itu CMS Owner).

---

## 7. Competitions (`competitions`)

**Apa:** Kompetisi satu pusat. Komponen sama dengan Owner, `branchId` terisi.

**Yang dapat dilakukan:** kompetisi, partisipasi, medali/waktu, dokumen.

**Dampak ke peran lain:** Owner melihat semua pusat; Member melihat riwayat di rapor; pelatih dapat menjadi pendamping.

---

## 8. Attendance (`absensi`)

**Apa:** Rekap kehadiran pelatih dan member. Dua sub-tab.

### A. Pelatih

Daftar `coach_attendances` (saringan pelatih, kelas, tanggal). Input manual hadir/telat/absen (`is_manual`); sunting; hapus.

### B. Member

Daftar `member_attendances` (kelas, status, bulan, nama). Hampir hanya baca. Baris `sakit`/`izin` otomatis dari **Leave Requests** yang disetujui.

**Dampak ke peran lain:** clock-in GPS pelatih (jarak dicatat, tidak menolak); Member tidak memindai sendiri — pelatih yang memindai QR; staf **tidak** di sini; sesi pelatih `present`/`late` menjadi item invoice jika tarif sudah diisi.

---

## 9. Announcements (`announce`)

**Apa:** Pengumuman satu pusat.

**Yang dapat dilakukan:** judul, isi, semua kelas atau kelas tertentu, `target_roles` (`member | coach | admin | school`), masa berlaku, aktif/nonaktif, hapus.

**Dampak ke peran lain:**

- **Member / Coach:** kartu di beranda jika peran termasuk dan (semua kelas atau kelas mereka)
- **School:** peran dapat ditargetkan, tetapi panel School **tidak memiliki tab atau kartu pengumuman**. Hanya Bell jika ada pemberitahuan ke akun sekolah
- Bukan CMS landing Owner

---

## 10. Leave Requests (`izin`)

**Apa:** Antrian izin. Sub-tab pelatih (`coach_leaves`) dan member (`member_leaves`).

**Yang dapat dilakukan:**

- menyetujui izin pelatih: wajib pengganti **per kelas**;
- menolak plus alasan;
- membuat izin atas nama pelatih atau member;
- menyetujui izin member → sisipan otomatis `member_attendances` `sakit` atau `izin` pada tanggal yang jatuh di `schedule_days` kelas.

**Dampak ke peran lain:** pelatih dan member mengajukan dari panel mereka; pengganti tampil di **Class Activity**; absensi member mendapat baris izin. Beda dengan libur kelas dan dengan sakit staf (staf mencatat sendiri hari ini).

---

## 11. Approvals (`approve`)

**Apa:** Antrian persetujuan. Lencana = pendaftaran tertunda + sertifikat tertunda.

### A. Pendaftaran (`registrations`)

Dari `/register`. Menyunting data, menyetujui (membuat akun member), menolak, menghapus, tautan WhatsApp.

### B. Sertifikasi pelatih

Menyetujui atau menolak unggahan dari **Coach** (Admin atau pelatih sendiri).

**Dampak ke peran lain:** publik `/register`; Member dapat masuk setelah disetujui; status sertifikat di profil pelatih.

---

## 12. Payments (`pay`)

**Apa:** Tagihan siswa (`bills`) satu pusat. Hilang dari bilah sisi jika Owner mematikan sakelar (Manager Center tetap melihat).

**Yang dapat dilakukan:**

- tab belum lunas / lunas / semua;
- **membuat tagihan bulanan** — hanya member `reguler` yang masuk kelas; satu tagihan per pasangan member×kelas; melewati yang sudah ada pada periode itu; pemberitahuan ke Member;
- menambah tagihan manual: bulanan / session pack (dari `class_packages`) / khusus; diskon;
- menandai lunas: tanggal, metode (`transfer | cash | qris`), **unggah bukti dari sisi Admin**; pemberitahuan ke Member;
- rincian dan pratinjau bukti (URL bertanda tangan).

**Tidak** dibuat otomatis: `school_affiliate` (biasanya `school_covered`) dan `private`.

**Dampak ke peran lain:** Member melihat tagihan, rekening pusat (Owner **Centers**), dan mengonfirmasi lewat WhatsApp. **Tidak ada unggah bukti di panel Member.** Owner **Financial → Income** membaca tagihan yang diverifikasi.

---

## 13. Financial (`financial`) — hanya Manager Center

**Apa:** Buku keuangan satu pusat. Bukan menu Admin biasa.

**Yang dapat dilakukan:** pemasukan (tagihan + manual), pengeluaran manual (tanda reimburse plus bukti), kategori dari Owner Master Data.

**Tidak** ada: slip gaji, kasbon, menyetujui `staff_reimbursements`, menandai invoice pelatih lunas. Itu Owner.

**Dampak ke peran lain:** transaksi tampil di Owner **Financial** lintas pusat. Reimburse staf diproses Owner, bukan di sini.

---

## 14. Report Cards (`rapor`)

**Apa:** Periode isi rapor, unduh PDF, ulasan pelatih.

**Yang dapat dilakukan:** membuka periode (menutup periode terbuka lain di pusat itu), menyunting, menutup, membuka lagi; daftar siswa (saringan kelas/pelatih/status); pratinjau; unduh PDF satu atau zip; melihat ulasan bintang (identitas pemberi ulasan disamarkan di peladen).

**Dampak ke peran lain:** pelatih mengisi hanya jika periode `is_open`; Member dan School mengunduh PDF; Owner hanya templat level dan tanda tangan.

---

## 15. School Panel (`school`)

**Apa:** Sekolah mitra satu pusat plus akun masuk `school`.

**Yang dapat dilakukan:** membuat (nama, surel, kata sandi, PIC) → `POST /api/admin/users` plus baris `schools`; menampilkan kredensial sekali plus WhatsApp; menyunting; menghapus (menghapus pengguna masuk jika ada `profile_id`).

**Bukan** di sini: logo dan tanda tangan rapor (Owner **Schools**).

**Dampak ke peran lain:** akun masuk panel School; Member afiliasi memakai `school_id`; Owner **Accounts** juga dapat membuat akun sekolah.

---

## 16. Settings (`settings`)

**Apa:** Identitas operasional pusat. Dapat dibuka meski `branch_id` belum siap.

**Yang dapat dilakukan:** nama, alamat, pin peta, WhatsApp Admin, logo; daftar staf hanya baca (`staff` + `manager_center`) plus rekening mereka.

**Tidak** di sini: rekening pembayaran member dan sakelar Payments (Owner **Centers**).

**Dampak ke peran lain:** WhatsApp ke Member **Bills** dan School; lintang/bujur ke GPS pelatih; logo di bilah sisi Admin.

---

## Matriks silang Admin → peran lain

| Fitur Admin | Owner | Coach | Staff | Member | School | Publik |
|---|---|---|---|---|---|---|
| Dashboard | Pratinjau | Clock-in; izin tertunda | — | Hadir hari ini; izin tertunda | — | Pendaftaran tertunda |
| Class Activity | — | Libur; tampil sebagai pengganti | — | — | — | — |
| Class | Kelas lintas pusat; paket sesi hanya Admin | Ampu | — | Jadwal/tagihan | Rapor kelas | — |
| Member | Accounts | Member di kelas mereka | — | Masuk + QR | Afiliasi | — |
| Private Members | Tab sama, semua pusat | Kelas privat + GPS kelas | — | Sesi privat | — | — |
| Coach | Accounts + tarif/slip | Masuk; sertifikat tertunda | — | — | — | Landing pelatih **bukan** dari sini |
| Competitions | Semua pusat | Pendamping | — | Riwayat rapor | — | — |
| Attendance | Rincian kelas Owner | GPS; invoice sesi | Absensi staf **bukan** di sini | QR dipindai pelatih | — | — |
| Announcements | — | Beranda jika ditarget | — | Beranda jika ditarget | Tidak ada tab; hanya Bell | — |
| Leave Requests | — | Ajukan; pengganti | — | Ajukan; absensi otomatis | — | — |
| Approvals | — | Status sertifikat | — | Akun setelah disetujui | — | `/register` |
| Payments | Financial Income; sakelar | — | — | Bills + WA, bukan unggah bukti | Afiliasi tidak digenerate | — |
| Financial (MC) | Financial lintas pusat | — | Reimburse di Owner | Tagihan sebagai pemasukan | — | — |
| Report Cards | Level + tanda tangan | Isi rapor | — | PDF + ulasan | PDF afiliasi | — |
| School Panel | Schools + Accounts | — | — | Pilih sekolah afiliasi | Masuk panel School | — |
| Settings | Centers (rekening + sakelar) | GPS | Daftar tim | WA di Bills | WA di kaki | — |

---

## Alur silang (contoh)

**1. Daftar publik menjadi member aktif.** `/register` → **Approvals** menyetujui → akun member → masuk kelas → **Payments** membuat tagihan bulan berjalan → Member **Bills** plus pemberitahuan → transfer sesuai rekening → konfirmasi WhatsApp → Admin menandai lunas (bukti dapat diunggah Admin).

**2. Izin pelatih plus pengganti.** Pelatih mengajukan → **Leave Requests** menyetujui plus pengganti per kelas → **Class Activity** menampilkan pengganti.

**3. Periode rapor.** Admin membuka periode → pelatih mengisi rubrik Owner → Admin/School/Member mengunduh PDF.

**4. Les privat.** **Private Members** membuat akun plus kelas → tidak tampil di **Class** → pelatih absensi dengan GPS kelas → sisa sesi di Member. Tidak kena generate tagihan bulanan reguler.
