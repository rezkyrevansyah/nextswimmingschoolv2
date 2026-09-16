# Member Panel — Daftar Fitur

> Sumber: `src/app/member/page.tsx` serta panel Admin, Coach, Owner, dan School.
> Peran `member`. Utama untuk ponsel. Tiga tipe: `reguler` · `private` · `school_affiliate`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan member
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Member**

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Member · School · Publik (`/register`)

---

## Lingkup dan tipe member

| Tipe | Masuk dari | Tagihan | Kelas |
|---|---|---|---|
| `reguler` | Admin **Member** atau **Approvals** dari `/register` | Generate bulanan Admin **Payments** | Kelas reguler |
| `private` | Admin atau Owner **Private Members** | Bukan generate bulanan; paket sesi | Satu kelas `class_type=private` |
| `school_affiliate` | Admin **Member** (sekolah plus jenjang) | Tab **Bills** **disembunyikan**; biasanya `school_covered` | Kelas reguler |

- Satu pusat (`members.branch_id` atau metadata).
- **Gerbang foto:** jika `is_profile_complete` belum true **dan** belum ada `avatar_url` → wajib unggah foto. Cukup salah satu (avatar atau lengkap) untuk membuka panel.
- **Penangguhan** (`suspend_until`): spanduk plus hitung mundur. Tab **tidak** dikunci (beda pelatih). Pemindaian QR pelatih menolak member yang ditangguhkan.
- Member **tidak** mencatat hadir sendiri. Hadir = pelatih memindai QR atau absensi manual. Izin = diajukan, Admin menyetujui.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:** desktop: Home, Schedule, Attendance, Bills (kecuali afiliasi), Leave, Report Card, Profile. Ponsel: Home, Schedule, Attendance, Report, plus **Menu** (Profile, Bills jika bukan afiliasi, Leave). Pengalih bahasa, Bell, avatar.

**Dampak ke peran lain:** Bell menerima pemberitahuan tagihan baru dan tagihan yang ditandai lunas dari Admin **Payments**.

---

## Gerbang: Unggah foto (`ProfileGate`)

Memilih foto, mengunggah avatar, lanjut ke panel, keluar. Mengunggah foto membuka panel.

**Dampak ke peran lain:** avatar tampil di Admin, daftar siswa pelatih, dan PDF rapor.

---

## 1. Home (`home`)

**Apa:** Ringkasan. Tidak ada ubahan data.

**Yang dapat dilakukan:**

- jumlah hadir bulan ini (`hadir`);
- reguler atau afiliasi: jumlah kelas aktif. Privat: sisa sesi;
- kartu tagihan `unpaid` terbaru → **Bills** atau WhatsApp Admin. **Catatan:** siswa afiliasi tidak punya tab **Bills**, tetapi kartu ini tetap dapat tampil jika ada baris `unpaid`;
- privat sisa ≤ 1: peringatan perpanjang paket plus WhatsApp;
- pengumuman (Admin, peran `member`, semua kelas atau kelas member);
- empat sesi terdekat; lencana izin jika tanggal jatuh pada izin `approved`.

**Dampak ke peran lain:** pengumuman, tagihan, sesi privat, dan izin disetujui dari panel lain mengisi beranda ini.

---

## 2. Schedule (`schedule`)

**Apa:** Kelas yang diikuti plus sesi empat minggu ke depan.

**Yang dapat dilakukan:** kartu kelas (hari/jam termasuk `schedule_times`, lokasi pusat atau eksternal plus peta, tujuan, deskripsi, pelatih plus WhatsApp); daftar sesi; libur hari ini; sesi dalam rentang izin disetujui = lencana izin. Tidak menyunting jadwal.

**Dampak ke peran lain:** jadwal dari Admin/Owner **Classes** atau **Private Members**; libur dari **Class Activity**; izin dari **Leave Requests**.

---

## 3. Attendance (`absen`)

**Apa:** Riwayat kehadiran. **Hanya baca.**

**Yang dapat dilakukan:** saringan bulan dan kelas; angka hadir/izin/sakit/tidak hadir; baris status `hadir | telat | izin | sakit | tidak_hadir`; pintasan ke **Leave**.

Tidak ada pemindai QR di panel Member. QR ada di **Profile**; yang memindai = pelatih.

**Dampak ke peran lain:** pelatih QR atau manual; Admin izin disetujui → baris sakit/izin otomatis.

---

## 4. Bills (`bills`) — disembunyikan untuk `school_affiliate`

**Apa:** Tagihan iuran. Konfirmasi lewat **transfer plus WhatsApp**, **bukan** unggah bukti di aplikasi.

**Yang dapat dilakukan:**

- tab aktif: `unpaid` / `partial` — nominal, diskon, total, rekening pusat (Owner **Centers**), nomor WhatsApp Admin (**Settings** atau **Centers**);
- paket sesi: sisa dari `members.remaining_sessions` (bukan `bills.sessions_used`);
- tombol WhatsApp ke Admin (pesan berisi periode dan nama);
- tab riwayat: `paid` plus tanggal verifikasi plus metode;
- muat ulang otomatis saat Admin mengubah tagihan.

Tidak ada formulir unggah bukti. Admin yang dapat mengunggah bukti saat menandai lunas.

**Dampak ke peran lain:** Admin **Payments** membuat dan menandai lunas; Owner **Financial → Income**; pelatih yang mengurangi sesi privat mengubah sisa di kartu paket.

---

## 5. Leave (`leave`)

**Apa:** Pengajuan tidak hadir. Bukan absensi sendiri.

**Yang dapat dilakukan:** mengajukan (minimal satu kelas, tanggal, tipe `izin | sakit | ujian | lainnya`, alasan); status awal `pending`; riwayat plus alasan tolak; pintasan ke Attendance.

**Dampak ke peran lain:** Admin **Leave Requests** menyetujui → sisipan otomatis absensi; **Home** dan **Schedule** menampilkan lencana. Beda dengan izin pelatih (wajib pengganti) dan sakit staf (catat sendiri hari ini).

---

## 6. Report Card (`rapor`)

**Apa:** Melihat rapor, mengulas pelatih, prestasi lomba.

**Yang dapat dilakukan:**

- sub-tab Rapor / Review;
- periode terbuka: kartu aktif. Periode tutup: histori;
- pratinjau skor, catatan, kepribadian/motivasi/capaian, waktu terbaik, kriteria;
- unduh atau cetak PDF (tanda tangan pelatih, Head of NEXT, sekolah jika afiliasi);
- ulasan: bintang plus pesan per pelatih di kelas, **hanya saat periode masih `is_open`**;
- riwayat kompetisi.

**Dampak ke peran lain:** Admin membuka periode; pelatih mengisi; Owner templat dan tanda tangan; kompetisi dari Admin/Owner; School mengunduh rapor afiliasi.

---

## 7. Profile (`profile`)

**Apa:** Identitas, QR absensi, data yang boleh diubah member.

**Yang dapat dilakukan:** avatar; nama, umur, nomor member, tanggal mulai, data wali (dari `registrations` jika daftar publik); QR (`members.qr_code`) unduh plus WhatsApp minta cetak; menyunting telepon, alamat, catatan kesehatan (**bukan** nama, tanggal lahir, gender — itu Admin); ganti kata sandi (≥ 6 karakter); keluar.

**Dampak ke peran lain:** nilai QR harus cocok saat pelatih memindai; Admin **Member** untuk data induk dan penangguhan.

---

## Matriks silang Member → peran lain

| Fitur Member | Owner | Admin / Manager Center | Coach | Staff | School | Publik |
|---|---|---|---|---|---|---|
| Gerbang foto | — | Avatar di Member | Daftar siswa | — | PDF rapor | — |
| Home | — | Pengumuman, tagihan, sesi privat | Jadwal | — | — | — |
| Schedule | Kelas induk | Kelas + libur + izin | Nama/HP pelatih | — | — | — |
| Attendance | — | Rekap + otomatis dari izin | QR / manual | — | — | — |
| Bills | Rekening + Financial | Generate/verifikasi; bukti di sisi Admin | Sisa sesi privat | — | Tab disembunyikan | — |
| Leave | — | Setuju/tolak | — | Bukan alur ini | — | — |
| Report Card | Level + tanda tangan | Periode + PDF | Isi rapor + terima ulasan | — | PDF afiliasi | — |
| Profile / QR | Accounts | CRUD member | Pindai QR | — | — | `/register` → wali |

---

## Alur silang (contoh)

**1. Daftar publik menjadi les reguler.** `/register` → Admin menyetujui → gerbang foto → masuk kelas → Admin membuat tagihan → **Bills** plus rekening plus WhatsApp → Admin menandai lunas.

**2. Hadir di kolam.** Tunjukkan QR **Profile** → pelatih memindai (bukan ditangguhkan, terdaftar di kelas pelatih) → `hadir`/`telat` di Attendance. Privat: sisa sesi berkurang; beranda mengingatkan jika sisa ≤ 1.

**3. Izin.** Ajukan kelas plus tanggal → Admin menyetujui → Attendance mendapat baris izin/sakit; Schedule/Home mendapat lencana. Ditolak = alasan di riwayat.

**4. Rapor.** Admin membuka periode → pelatih mengisi → Member melihat dan mengunduh PDF. Periode masih terbuka → ulasan pelatih. Tutup periode → histori, ulasan tertutup.

**5. Afiliasi versus privat.** Afiliasi: tidak ada tab **Bills**; rapor memakai logo dan tanda tangan sekolah. Privat: kelas tidak di tab **Class** Admin; beranda menampilkan sisa sesi; perpanjang lewat Admin **Private Members** plus WhatsApp, bukan generate bulanan.
