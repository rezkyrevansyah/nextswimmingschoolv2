# Student Panel — Konsep terkunci

> Status: konsep panel terkunci. Niat produk: `docs/01-prd.md`. Umpan balik: `docs/02-umpan-balik.md`.
> Peran `student` (bahasa produk: **Student**). Utama untuk ponsel. Tiga tipe: `reguler` · `private` · `school_affiliate`.
> Sumber perilaku yang sudah ada: `src/app/student/page.tsx`.
> Tiga tipe siswa dan pintu create: `docs/03-alur/02-siswa.md`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan siswa
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Student**
- **Jangan** — wewenang atau tab yang dilarang

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Student · School · Publik (`/register`)

## Lingkup dan tipe siswa

Siswa tidak membuat kelas atau tagihan. Yang dibuat siswa: unggah foto (gerbang), pengajuan izin, ulasan rapor. Urutan menu mengikuti apa yang sudah disiapkan Admin/pelatih, lalu apa yang siswa boleh submit.

| Tipe | Masuk dari | Tagihan | Kelas |
|---|---|---|---|
| `reguler` | Admin **Student** atau **Approvals** dari `/register` | Generate bulanan Admin **Payments** | Kelas reguler |
| `private` | Admin atau Owner **Private Students** saja | Bukan generate bulanan; paket sesi | Satu kelas `class_type=private` |
| `school_affiliate` | Admin **Student** (sekolah plus jenjang wajib) | Tab **Bills** **disembunyikan**; biasanya `school_covered` | Kelas reguler |

- Satu pusat (`students.branch_id` atau metadata).
- **Gerbang foto:** jika `is_profile_complete` belum true **dan** belum ada `avatar_url` → wajib unggah foto. Cukup salah satu (avatar atau lengkap) untuk membuka panel.
- **Penangguhan** (`suspend_until`): spanduk plus hitung mundur. Tab **tidak** dikunci (beda pelatih). Pemindaian QR pelatih menolak siswa yang ditangguhkan.
- Student **tidak** mencatat hadir sendiri. Hadir = pelatih memindai QR atau absensi manual. Izin = diajukan, Admin menyetujui (FB-05).

### Per tipe yang dikunci

| Tipe | Yang ditonjolkan | Yang disembunyikan |
|---|---|---|
| Reguler | Jadwal, tagihan, izin | Sisa sesi paket privat |
| Privat | Sisa sesi dari `students.remaining_sessions`, jadwal lentur, peringatan sisa ≤ 1 | Generate tagihan bulanan |
| Afiliasi | Jadwal, rapor, izin | Tab **Bills**; kartu tagihan `unpaid` di Home |

## Susunan menu terkunci

| No. | Menu | `id` tab | Alasan urutan |
|---|---|---|---|
| 1 | Home | `home` | Beranda |
| 2 | Schedule | `schedule` | Kelas yang sudah dibuat Admin |
| 3 | Attendance | `absen` | Hasil pindai pelatih; hanya baca |
| 4 | Leave | `leave` | Create pengajuan izin |
| 5 | Bills | `bills` | Tagihan yang sudah digenerate Admin; disembunyikan untuk afiliasi |
| 6 | Report Card | `rapor` | Rapor yang sudah dikunci pelatih |
| 7 | Profile | `profile` | Dasar; QR untuk dipindai pelatih |

Ponsel: Home, Schedule, Attendance, Report Card, plus **Menu** (Leave, Bills jika bukan afiliasi, Profile).

## Aturan satu pintu

- Tidak ada pemindai di panel Student. QR ada di **Profile**; yang memindai = pelatih.
- Tidak ada unggah bukti bayar. Konfirmasi lewat WhatsApp; Admin yang menandai lunas.
- Tidak ada WA laporkan kutu (FB-13).
- Jangan menambah tab. Jangan menambah pilih pelatih sendiri.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:** desktop: Home, Schedule, Attendance, Leave, Bills (kecuali afiliasi), Report Card, Profile. Ponsel: Home, Schedule, Attendance, Report, plus **Menu** (Leave, Bills jika bukan afiliasi, Profile). Pengalih bahasa, Bell, avatar.

**Dampak ke peran lain:** Bell menerima pemberitahuan tagihan baru dan tagihan yang ditandai lunas dari Admin **Payments** (bukan untuk afiliasi).

---

## Gerbang: Unggah foto (`ProfileGate`)

Memilih foto, mengunggah avatar (dikompres), lanjut ke panel, keluar. Mengunggah foto membuka panel.

**Dampak ke peran lain:** avatar tampil di Admin, daftar siswa pelatih, dan PDF rapor.

---

## 1. Home (`home`)

**Apa:** Ringkasan. Tidak ada ubahan data.

**Yang dapat dilakukan:**

- jumlah hadir bulan ini (`hadir`);
- reguler atau afiliasi: jumlah kelas aktif. Privat: sisa sesi dari `students.remaining_sessions` (FB-04);
- reguler dan privat: kartu tagihan `unpaid` terbaru → **Bills** atau WhatsApp Admin;
- **afiliasi: kartu tagihan `unpaid` tidak tampil**, meskipun ada baris `unpaid` di basis data;
- privat sisa ≤ 1: peringatan perpanjang paket plus WhatsApp;
- pengumuman (Admin, peran `student`, semua kelas atau kelas siswa);
- empat sesi terdekat; lencana izin jika tanggal jatuh pada izin `approved`.

Sisa sesi privat **dilarang** dihitung dari `bills.sessions_used` atau dari jumlah baris di antarmuka. Sumber = kolom setelah pengurang peladen yang sama dengan absensi privat yang sah.

**Dampak ke peran lain:** pengumuman, tagihan, sesi privat, dan izin disetujui dari panel lain mengisi beranda ini.

---

## 2. Schedule (`schedule`)

**Apa:** Kelas yang diikuti plus sesi empat minggu ke depan.

**Yang dapat dilakukan:** kartu kelas (hari/jam termasuk `schedule_times`, lokasi pusat atau eksternal plus peta, tujuan, deskripsi, pelatih plus WhatsApp); daftar sesi; libur hari ini; sesi dalam rentang izin disetujui = lencana izin. Tidak menyunting jadwal.

Untuk privat, jadwal mengikuti konfigurasi **Private Students** yang berlaku sekarang; absensi lama tidak diubah dari sini (FB-03).

**Dampak ke peran lain:** jadwal dari Admin/Owner **Classes** atau **Private Students**; libur dari **Class Activity**; izin dari **Leave Requests**.

---

## 3. Attendance (`absen`)

**Apa:** Riwayat kehadiran. **Hanya baca.** Status: **Present**, **Late**, **Absent**, **Sick**, **Izin**. Rincian: `docs/03-alur/03-absensi-izin-honor.md` bab 2 dan 5.2.

**Yang dapat dilakukan:** saringan bulan dan kelas; angka tiap status; pintasan ke **Leave**.

Tidak ada pemindai QR di panel Student. QR ada di **Profile**; yang memindai = pelatih (asli atau pengganti yang sudah clock-in). **Absent** muncul hanya setelah pelatih mengunci roster sesi (sisa nama, dengan konfirmasi), bukan karena siswa tidak menekan tombol.

**Dampak ke peran lain:** pelatih QR atau roster; Admin izin disetujui → **Sick**/**Izin** praterisi di roster, tidak ditimpa Present.

**Jangan:** tombol hadir, pemindai, atau “absen sendiri” (FB-05).

---

## 4. Leave (`leave`)

**Apa:** Pengajuan **Sick** atau **Izin** (Supported). Bukan absensi sendiri. Create yang boleh dilakukan siswa, sebelum melihat tagihan. Alur approval: `docs/03-alur/03-absensi-izin-honor.md` bab 4.2.

**Yang dapat dilakukan:** mengajukan (minimal satu kelas, tanggal, jenis Sick atau Izin; `ujian`/`lainnya` sebagai alasan yang hasilnya **Izin**); status awal `pending`; riwayat plus alasan tolak; pintasan ke Attendance. Tidak ada pengganti.

Tipe pengajuan **bukan** status absensi. Setelah Admin menyetujui, hasil rekaman hanya **Sick** atau **Izin**.

**Dampak ke peran lain:** Admin **Leave Requests** menyetujui → sisipan otomatis absensi; **Home** dan **Schedule** menampilkan lencana. Beda dengan izin pelatih (wajib delegasi) dan staf (hari ini langsung; tanggal nanti antrian Staff).

---

## 5. Bills (`bills`) — disembunyikan untuk `school_affiliate`

**Apa:** Tagihan iuran. Konfirmasi lewat **transfer plus WhatsApp**, **bukan** unggah bukti di aplikasi.

**Yang dapat dilakukan:**

- tab aktif: `unpaid` / `partial` — nominal, diskon, total, rekening pusat (Owner **Centers**), nomor WhatsApp Admin (**Settings** atau **Centers**);
- paket sesi privat: sisa dari `students.remaining_sessions` (bukan `bills.sessions_used`);
- tombol WhatsApp ke Admin (pesan berisi periode dan nama) — ini **bukan** WA laporkan kutu;
- tab riwayat: `paid` plus tanggal verifikasi plus metode;
- muat ulang otomatis saat Admin mengubah tagihan.

Tidak ada formulir unggah bukti. Admin yang dapat mengunggah bukti saat menandai lunas.

**Dampak ke peran lain:** Admin **Payments** membuat dan menandai lunas; Owner **Financial → Income**; pelatih yang mengurangi sesi privat mengubah sisa di kartu paket.

**Jangan:** menampilkan tab ini atau kartu tagihan Home kepada afiliasi.

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

**Apa:** Identitas, `public_id`, QR absensi, data yang boleh diubah siswa.

**Yang dapat dilakukan:** avatar (dikompres); nama, umur, `public_id` (contoh `NEXT.001.ST.26`, tidak bisa disunting), tanggal mulai, data wali (dari `registrations` jika daftar publik); QR permanen unduh plus WhatsApp minta cetak; menyunting telepon, alamat, catatan kesehatan (**bukan** nama, tanggal lahir, gender; itu Admin); ganti kata sandi (≥ 6 karakter); keluar.

**Tidak** ada tombol, ikon, atau tautan “laporkan kutu” / “WA Report Bug” (FB-13). WhatsApp yang sah hanya tagihan ke Admin (dari **Bills**) dan minta cetak QR.

**Dampak ke peran lain:** nilai QR harus cocok saat pelatih memindai; Admin **Student** untuk data induk dan penangguhan.

---

## Matriks silang Student → peran lain

| Fitur Student | Owner | Admin / Manager Center | Coach | Staff | School | Publik |
|---|---|---|---|---|---|---|
| Gerbang foto | — | Avatar di Student | Daftar siswa | — | PDF rapor | — |
| Home | — | Pengumuman, tagihan (bukan afiliasi), sesi privat | Jadwal | — | — | — |
| Schedule | Kelas induk | Kelas + libur + izin | Nama/HP pelatih | — | — | — |
| Attendance | — | Rekap + otomatis dari izin | QR / manual | — | Rekap afiliasi | — |
| Leave | — | Setuju/tolak | — | Bukan alur ini | — | — |
| Bills | Rekening + Financial | Generate/verifikasi; bukti di sisi Admin | Sisa sesi privat | — | Tab disembunyikan | — |
| Report Card | Level + tanda tangan | Periode + PDF | Isi rapor + terima ulasan | — | PDF afiliasi | — |
| Profile / QR | Accounts | CRUD siswa | Pindai QR | — | — | `/register` → wali |

---

## Alur silang (mengikuti rantai create)

**1. Daftar publik menjadi les reguler.** `/register` → Admin menyetujui → gerbang foto → masuk kelas → Admin membuat tagihan → **Bills** plus rekening plus WhatsApp → Admin menandai lunas.

**2. Hadir di kolam.** Tunjukkan QR **Profile** → pelatih memindai (bukan ditangguhkan, terdaftar di kelas pelatih) → `hadir`/`telat` di Attendance. Privat: sisa sesi berkurang di kolom sumber; beranda mengingatkan jika sisa ≤ 1.

**3. Sick / Izin.** Ajukan kelas plus tanggal → Admin **Leave Requests** menyetujui → Attendance mendapat **Sick** atau **Izin**; roster pelatih praterisi; Schedule/Home mendapat lencana. Ditolak = alasan di riwayat. Absent hanya setelah pelatih kunci roster.

**4. Rapor.** Admin membuka periode → pelatih mengisi → Student melihat dan mengunduh PDF. Periode masih terbuka → ulasan pelatih. Tutup periode → histori, ulasan tertutup.

**5. Afiliasi versus privat.** Afiliasi: tidak ada tab **Bills** dan tidak ada kartu `unpaid` di Home; rapor memakai logo dan tanda tangan sekolah. Privat: kelas tidak di tab **Class** Admin; beranda menampilkan sisa sesi dari `remaining_sessions`; perpanjang lewat Admin **Private Students** plus WhatsApp, bukan generate bulanan.

---

## Selisih vs kode

| Sekarang di kode | Konsep terkunci |
|---|---|
| Desktop: Home, Schedule, Attendance, Bills, Leave, Report Card, Profile | Leave sebelum Bills |
| Afiliasi: tab Bills disembunyikan, tetapi kartu `unpaid` di Home masih bisa tampil | Kartu tagihan Home juga disembunyikan |
| Sisa sesi kadang bisa salah sumber | Hanya `students.remaining_sessions` setelah pengurang peladen |
| WA laporkan kutu sudah dihapus | Tetap terhapus; jangan dihidupkan |
| Absent siswa tidak dijelaskan sumbernya | Absent hanya setelah pelatih kunci roster |
| Riwayat perlombaan dan medali tampil sebagai kartu di **Home** | Riwayat kompetisi tetap di tab **Report Card**. Home tidak menampilkannya |
