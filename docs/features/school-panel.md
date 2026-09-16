# School Panel — Daftar Fitur

> Sumber: `src/app/school/page.tsx` serta panel Admin, Owner, Coach, dan Member.
> Peran `school` (sekolah mitra). Panel ini untuk **memantau dan mengunduh**, bukan operasional harian.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan akun sekolah
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya School**

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Member · School · Publik

---

## Lingkup dan batas wewenang

Akun sekolah dibuat Admin (**School Panel**) atau Owner (**Account Master Data**), lalu dihubungkan ke satu baris `schools` (`profile_id` = pengguna yang masuk). Satu akun terikat **satu sekolah** dan **satu pusat** (`schools.branch_id`).

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
- melihat atau menagih iuran (tab **Bills** Member disembunyikan untuk `school_affiliate`).

Jika masuk tanpa baris `schools` yang cocok, tampil layar bahwa data sekolah tidak ditemukan; pengguna diminta menghubungi Admin pusat.

Admin dapat menargetkan peran `school` di **Announcements**, tetapi panel School **tidak memiliki tab atau kartu pengumuman**. Hanya Bell jika ada pemberitahuan ke akun ini.

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

- mencari nama siswa, nama kelas, atau nama pelatih;
- menyaring kelas, pelatih, dan status (lengkap / belum lengkap);
- mengurutkan: nama, kelas, pelatih, status;
- kolom: siswa (avatar dan nama), jenjang sekolah (`school_grade`), kelas, pelatih penandatangan, status, tindakan;
- membagi halaman 15 baris;
- di layar sempit: kartu per siswa (jenjang, kelas, pelatih).

Daftar = semua `members` dengan `school_id` sekolah ini, plus kelas (`member_classes`) dan pelatih penandatangan (`rapor_signer_coach_id`; jika kosong memakai pelatih kepala kelas).

**Dampak ke peran lain:** Admin **Member** (tipe `school_affiliate`, `school_id`, `school_grade`); Admin atau Owner **Classes** (nama kelas dan penandatangan); pelatih mengunci entri mengubah status menjadi lengkap.

### 1.2 Pratinjau satu siswa

Tombol lihat hanya aktif jika rapor lengkap. Modal menampilkan identitas, kriteria penilaian (Owner **Report Levels**), catatan pelatih, kepribadian, motivasi, capaian belajar, rekam waktu terbaik, dan blok tanda tangan sesuai Owner **Schools**: pelatih (`show_coach_sig`), Head of NEXT (`show_head_sig`), perwakilan sekolah dari `school_signatures` yang aktif (`show_school_sig`). Logo sekolah di PDF berasal dari unggahan Owner, bukan dari tab ini.

**Dampak ke peran lain:** PDF yang sama dapat diunduh Admin dan Member.

### 1.3 Unduh PDF dan ZIP

**Yang dapat dilakukan:** unduh PDF satu siswa (hanya yang lengkap); ZIP semua yang lengkap; ZIP hasil saringan; mode pilih lalu ZIP pilihan. Mesin unduh sama dengan Admin (`downloadRaporPdf` / `downloadRaporZip`).

---

## 2. Student Attendance (`absensi`)

**Apa:** Rekap kehadiran **hanya** siswa afiliasi sekolah ini. Hanya baca; tidak ada tombol hadir, izin, atau pindai QR.

**Yang dapat dilakukan:**

- kartu ringkasan pada rentang tanggal (sebelum saringan siswa atau status): jumlah tanggal latihan, total hadir, izin atau sakit, tidak hadir;
- pintasan rentang: satu minggu (Senin sampai hari ini), satu bulan berjalan, tiga bulan;
- saringan tanggal, siswa, status (`hadir`, `izin`, `sakit`, `tidak_hadir`, `telat`);
- tabel desktop: tanggal, siswa, kelas, status, metode (`qr` / `selfie` / `manual`);
- kartu ponsel: tanggal, status, nama, kelas, metode;
- halaman 20 baris;
- ekspor Excel atas **hasil saringan saat ini**, termasuk kolom jenjang sekolah. Nama berkas: `Absensi-{nama-sekolah}-{dari}-sd-{sampai}.xlsx`.

Batas muat 2.000 baris kehadiran pada rentang tanggal. Jenjang tampil di Excel, **bukan** sebagai kolom tabel desktop.

**Dampak ke peran lain:** pelatih memindai QR atau mencatat manual; Admin menyetujui izin member → baris `izin` atau `sakit` metode `manual`; Member melihat riwayat pribadi.

---

## Yang sengaja tidak ada di School

| Kebutuhan | Dikerjakan di |
|---|---|
| Membuat akun sekolah dan PIC | Admin **School Panel** / Owner **Accounts** |
| Logo dan tanda tangan rapor | Owner **Schools** |
| Membuat siswa afiliasi dan jenjang | Admin **Member** (`school_affiliate`) |
| Membuka atau menutup periode rapor | Admin **Report Cards** |
| Mengisi rapor | Coach **Report Card** |
| Templat kriteria dan waktu standar | Owner **Report Levels** |
| Iuran siswa | Admin **Payments** (afiliasi biasanya tidak ditagih bulanan) |
| Pengumuman ke sekolah | Admin **Announcements** (tidak ada tab di panel School) |

---

## Matriks silang School → peran lain

| Fitur School | Owner | Admin / Manager Center | Coach | Staff | Member |
|---|---|---|---|---|---|
| Cangkang / WhatsApp Admin | Centers: nomor WA | Settings: nomor WA | — | — | — |
| Daftar siswa rapor | Accounts; Schools (logo/tanda tangan) | Member afiliasi + jenjang; buka periode | Kunci rapor = status lengkap | — | Siswa afiliasi; tab Bills disembunyikan |
| Pratinjau / PDF rapor | Master Data + Schools | Unduh PDF/ZIP yang sama | Isi skor + tanda tangan pelatih | — | Unduh PDF sendiri |
| Rekap kehadiran | — | Rekap pusat; izin disetujui | QR / manual | — | Riwayat pribadi |
| Ekspor Excel | — | — | Sumber baris kehadiran | — | — |

---

## Alur silang (contoh)

**1. Sekolah mitra baru.** Admin membuat sekolah plus akun masuk → Owner mengunggah logo dan mengatur tiga slot tanda tangan → Admin mendaftarkan siswa `school_affiliate` (sekolah plus jenjang) dan memasukkan ke kelas → akun School melihat nama siswa di kedua tab.

**2. Rapor semester.** Admin membuka periode rapor → pelatih mengisi dan mengunci → di School, status menjadi lengkap → sekolah mengunduh PDF atau ZIP. Tanda tangan di PDF mengikuti sakelar Owner. Siswa afiliasi juga dapat mengunduh dari panel Member.

**3. Pantau kehadiran.** Pelatih memindai QR atau mencatat manual; Admin menyetujui izin siswa → School membuka tab Absensi, menyaring rentang, mengekspor Excel untuk arsip sekolah.

**4. Tanpa periode rapor.** Jika Admin belum membuka periode, hero menampilkan bahwa tidak ada periode aktif. Daftar siswa tetap ada, tetapi tombol lihat atau unduh rapor tidak aktif sampai pelatih mengunci entri pada periode yang terbuka.
