# School Panel — Konsep terkunci

> Status: konsep panel terkunci. Niat produk: `docs/01-prd.md`. Umpan balik: `docs/02-umpan-balik.md`.
> Peran `school` (sekolah mitra). Panel ini untuk **memantau dan mengunduh**, bukan operasional harian.
> Sumber perilaku yang sudah ada: `src/app/school/page.tsx`.
> Rapor, ZIP, Excel: `docs/03-alur/05-rapor-sekolah.md`. Siswa afiliasi: `docs/03-alur/02-siswa.md`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan akun sekolah
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya School**
- **Jangan** — wewenang yang dilarang

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Student · School · Publik

## Lingkup dan batas wewenang

Akun sekolah dibuat Admin (**School Panel**) atau Owner (**Account Master Data**), lalu dihubungkan ke satu baris `schools` (`profile_id` = pengguna yang masuk). Satu akun terikat **satu sekolah** dan **satu pusat** (`schools.branch_id`).

Sekolah tidak membuat siswa atau rapor. Menu hanya membaca apa yang sudah dicreate Admin dan pelatih.

Yang **boleh** dilakukan:

- melihat daftar siswa yang `members.school_id` sama dengan sekolah ini;
- melihat rapor **periode yang sedang dibuka** Admin;
- mengunduh PDF atau ZIP rapor yang sudah dikunci pelatih;
- melihat dan mengekspor rekap kehadiran siswa tersebut.

Yang **tidak** boleh dilakukan:

- menambah atau mengubah data siswa, kelas, atau pelatih;
- mengisi atau mengunci rapor (itu pelatih);
- mencatat kehadiran atau memindai kode QR (itu pelatih);
- menyetujui izin (itu Admin);
- mengatur logo dan tanda tangan rapor (itu Owner, menu **Schools**);
- melihat atau menagih iuran (tab **Bills** Student disembunyikan untuk `school_affiliate`);
- pengumuman sebagai tab atau kartu (hanya Bell jika ada pemberitahuan).

Jika masuk tanpa baris `schools` yang cocok, tampil layar bahwa data sekolah tidak ditemukan; pengguna diminta menghubungi Admin pusat.

Admin dapat menargetkan peran `school` di **Announcements**, tetapi panel School **tidak memiliki tab atau kartu pengumuman**.

## Susunan menu terkunci

| No. | Menu | `id` tab | Alasan urutan |
|---|---|---|---|
| 1 | Student Report Cards | `rapor` | Rapor yang sudah dikunci; unduh satu atau banyak |
| 2 | Student Attendance | `absensi` | Absensi yang sudah tercatat; ekspor Excel |

Rapor di atas absensi karena operator sekolah lebih sering mengambil arsip rapor semester daripada rekap harian. Keduanya hanya baca.

Jangan menambah tab.

---

## Cangkang (bukan tab)

**Apa:** kerangka halaman untuk kedua tab.

**Yang dapat dilakukan:**

- tajuk tetap: logo (tautan ke `/`), judul School Panel, nama sekolah, pengalih bahasa, Bell, avatar inisial nama sekolah, keluar;
- kartu hero: periode rapor `is_open` di pusat itu (label dan rentang tanggal), atau teks bahwa belum ada periode aktif; jumlah siswa; jumlah rapor lengkap (`rapor_entries.locked = true`); jumlah belum lengkap;
- dari hero: unduh ZIP semua rapor yang sudah lengkap; jika ada pencarian atau saringan, unduh ZIP subset yang lengkap;
- dua tab: **Student Report Cards** (`rapor`) dan **Student Attendance** (`absensi`);
- di kaki: tombol WhatsApp ke nomor Admin pusat (`branches.wa_numbers[0]`) dengan pesan siap kirim.

**Dampak ke peran lain:** nomor WhatsApp dari Admin **Settings** atau Owner **Centers**; periode terbuka dari Admin **Report Cards**.

---

## 1. Student Report Cards (`rapor`)

**Apa:** Daftar rapor berenang siswa afiliasi untuk **periode yang sedang dibuka** di pusat itu. Status lengkap = pelatih sudah mengunci entri (`locked`). Tanpa periode terbuka, siswa tetap tercantum, tetapi hampir semua berstatus belum lengkap karena entri periode tidak dimuat.

### 1.1 Daftar dan saringan

**Yang dapat dilakukan:**

- mencari nama siswa, nama kelas les, atau nama pelatih;
- menyaring kelas, pelatih, dan status (lengkap / belum lengkap);
- mengurutkan: nama, kelas, pelatih, status;
- kolom: siswa (avatar dan nama), **jenjang sekolah** (`school_grade`, wajib ada di data, FB-08), nama kelas les, pelatih penandatangan, status, tindakan;
- membagi halaman 15 baris;
- di layar sempit: kartu per siswa (jenjang, kelas les, pelatih).

Jenjang sekolah ≠ nama kelas les. Jangan meniadakan jenjang di tabel hanya karena sudah ada di Excel.

Daftar = semua `members` dengan `school_id` sekolah ini, plus kelas (`member_classes`) dan pelatih penandatangan (`rapor_signer_coach_id`; jika kosong memakai pelatih kepala kelas).

**Dampak ke peran lain:** Admin **Student** (tipe `school_affiliate`, `school_id`, `school_grade` wajib); Admin atau Owner **Classes** (nama kelas dan penandatangan); pelatih mengunci entri mengubah status menjadi lengkap.

### 1.2 Pratinjau satu siswa

Tombol lihat hanya aktif jika rapor lengkap. Modal menampilkan identitas, jenjang, kriteria penilaian (Owner **Report Levels**), catatan pelatih, kepribadian, motivasi, capaian belajar, rekam waktu terbaik, dan blok tanda tangan sesuai Owner **Schools**: pelatih (`show_coach_sig`), Head of NEXT (`show_head_sig`), perwakilan sekolah dari `school_signatures` yang aktif (`show_school_sig`). Logo sekolah di PDF berasal dari unggahan Owner, bukan dari tab ini.

**Dampak ke peran lain:** PDF yang sama dapat diunduh Admin dan Student.

### 1.3 Unduh PDF dan ZIP (FB-09)

**Yang dapat dilakukan:**

- unduh PDF satu siswa (hanya yang lengkap);
- ZIP semua yang lengkap;
- ZIP hasil saringan;
- mode pilih lalu ZIP pilihan.

Syarat arsip:

- hanya rapor `locked` milik `school_id` akun itu;
- nama berkas memuat identitas siswa;
- tidak campur berkas rusak atau rapor belum dikunci;
- tidak memuat siswa sekolah lain.

Mesin unduh sama dengan Admin (`downloadRaporPdf` / `downloadRaporZip`). Tombol ZIP yang menghasilkan arsip kosong atau tidak terurut = gagal, bukan “sudah ada ZIP”.

---

## 2. Student Attendance (`absensi`)

**Apa:** Rekap kehadiran **hanya** siswa afiliasi sekolah ini. Hanya baca; tidak ada tombol hadir, izin, atau pindai QR.

**Yang dapat dilakukan:**

- kartu ringkasan pada rentang tanggal (sebelum saringan siswa atau status): jumlah tanggal latihan, total hadir, izin atau sakit, tidak hadir;
- pintasan rentang: satu minggu (Senin sampai hari ini), satu bulan berjalan, tiga bulan;
- saringan tanggal, siswa, status (`hadir`, `izin`, `sakit`, `tidak_hadir`, `telat`);
- tabel desktop: nama, **jenjang**, kelas les, plus ringkasan status pada rentang (bukan satu baris per kejadian sebagai tampilan utama);
- kartu ponsel: nama, jenjang, kelas les, ringkasan;
- ekspor Excel atas **hasil saringan rentang saat ini**.

Jangan merapikan Excel sebelum logika absensi (FB-05) dan relasi siswa–sekolah–kelas–jenjang benar.

### 2.1 Format Excel terkunci (FB-10)

Rentang tanggal dipilih dulu; hanya tanggal dalam rentang yang menjadi kolom. **Satu baris per murid**, tanggal menjadi kolom, rekap di kanan.

| Nama murid | Jenjang (`school_grade`) | Nama kelas les | Tanggal 1 | Tanggal 2 | … | Hadir | Telat | Tidak hadir | Sakit | Izin |
|---|---|---|---|---|---|---|---|---|---|---|

- Baris = satu murid afiliasi sekolah itu.
- Sel tanggal memakai status yang sama dengan basis data (`hadir`, `telat`, `tidak_hadir`, `sakit`, `izin`), bukan label bebas.
- Kolom kanan = jumlah tiap status pada rentang itu.
- Nama berkas: `Absensi-{nama-sekolah}-{dari}-sd-{sampai}.xlsx`.

**Dampak ke peran lain:** pelatih memindai QR atau mencatat manual; Admin menyetujui izin siswa → baris `izin` atau `sakit` metode `manual`; Student melihat riwayat pribadi.

**Jangan:** mengekspor satu baris per kejadian sebagai format resmi; meniadakan jenjang; merapikan header sementara status masih salah.

---

## Yang sengaja tidak ada di School

| Kebutuhan | Dikerjakan di |
|---|---|
| Membuat akun sekolah dan PIC | Admin **School Panel** / Owner **Accounts** |
| Logo dan tanda tangan rapor | Owner **Schools** |
| Membuat siswa afiliasi dan jenjang | Admin **Student** (`school_affiliate`, jenjang wajib) |
| Membuka atau menutup periode rapor | Admin **Report Cards** |
| Mengisi rapor | Coach **Report Card** |
| Templat kriteria dan waktu standar | Owner **Report Levels** |
| Iuran siswa | Admin **Payments** (afiliasi biasanya tidak ditagih bulanan) |
| Pengumuman ke sekolah | Admin **Announcements** (tidak ada tab di panel School) |

---

## Matriks silang School → peran lain

| Fitur School | Owner | Admin / Manager Center | Coach | Staff | Student |
|---|---|---|---|---|---|
| Cangkang / WhatsApp Admin | Centers: nomor WA | Settings: nomor WA | — | — | — |
| Daftar siswa rapor | Accounts; Schools (logo/tanda tangan) | Siswa afiliasi + jenjang wajib; buka periode | Kunci rapor = status lengkap | — | Siswa afiliasi; tab Bills disembunyikan |
| Pratinjau / PDF / ZIP rapor | Master Data + Schools | Unduh PDF/ZIP yang sama, arsip tertata | Isi skor + tanda tangan pelatih | — | Unduh PDF sendiri |
| Rekap kehadiran | Attendance hub | Rekap pusat; izin disetujui | QR / manual | — | Riwayat pribadi |
| Ekspor Excel 1 baris/murid | — | Sumber jenjang dan kelas | Sumber status | — | — |

---

## Alur silang (mengikuti rantai create)

**1. Sekolah mitra baru.** Admin membuat sekolah plus akun masuk → Owner mengunggah logo dan mengatur tiga slot tanda tangan → Admin mendaftarkan siswa `school_affiliate` (sekolah plus jenjang wajib) dan memasukkan ke kelas → akun School melihat nama siswa di kedua tab.

**2. Rapor semester.** Admin membuka periode rapor → pelatih mengisi dan mengunci → di School, status menjadi lengkap → sekolah mengunduh PDF satu murid atau ZIP tertata. Tanda tangan di PDF mengikuti sakelar Owner. Siswa afiliasi juga dapat mengunduh dari panel Student.

**3. Pantau kehadiran.** Pelatih memindai QR atau mencatat manual; Admin menyetujui izin siswa → School membuka tab Absensi, menyaring rentang, mengekspor Excel horizontal (1 baris 1 murid) untuk arsip sekolah.

**4. Tanpa periode rapor.** Jika Admin belum membuka periode, hero menampilkan bahwa tidak ada periode aktif. Daftar siswa tetap ada, tetapi tombol lihat atau unduh rapor tidak aktif sampai pelatih mengunci entri pada periode yang terbuka.

---

## Selisih vs kode

| Sekarang di kode | Konsep terkunci |
|---|---|
| Dua tab rapor lalu absensi | Tetap; tidak ditambah tab |
| Jenjang di tabel rapor; di Excel absensi sebagai kolom, **bukan** kolom tabel desktop absensi | Jenjang di tabel rapor, kartu, dan Excel |
| Excel absensi cenderung 1 baris per kejadian, batas 2.000 baris | 1 baris 1 murid, tanggal = kolom, rekap kanan (FB-10) |
| ZIP rapor sudah ada | ZIP harus tertata: nama berkas identitas, hanya `locked`, tidak campur rusak (FB-09) |
