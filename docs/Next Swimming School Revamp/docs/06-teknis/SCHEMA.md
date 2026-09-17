# Skema konsep yang mengikat

**Produk:** Next Swimming School  
**Status:** Kontrak data dari dokumen (bukan dump SQL)  
**Tanggal:** 16 September 2026

Kolom lengkap hanya ada di migrasi repo. Berkas ini mengunci **nama tabel, status sah, dan relasi yang boleh dipakai hitungan**. Jangan menambah status. Jangan menyatukan tiga mesin uang.

Jika kode berbeda: kode = perilaku sekarang; perbarui berkas ini. Jangan mengarang tabel baru untuk menambal UI.

Glosarium: `docs/README.md`. Status: `docs/01-prd.md` bab 4.4. Uang: `docs/03-alur/04-uang.md`.

---

## 0. Aturan umum

- Hampir semua rekaman operasional terikat `branch_id` (KPI-02).
- Pengecualian disengaja: Owner (semua pusat), pelatih multi-pusat (`coach_branches`), periode invoice yang bersifat global.
- Satu sumber angka. Panel Student / Admin / Owner / Coach / School / Excel membaca kolom yang sama (prinsip audit `docs/02-umpan-balik.md`).
- Perubahan jadwal/lokasi/pelatih **tidak** menimpa baris absensi lama (FB-03).
- Jangan menghitung sisa sesi privat dari `bills` atau dari jumlah baris UI (FB-02, FB-04).

---

## 1. Identitas dan jaringan

### `profiles`

Akun masuk. `role` sah: `owner` | `admin` | `manager_center` | `coach` | `staff` | `member` | `school`.

Kolom yang mengunci perilaku:

| Kolom | Arti |
|---|---|
| `role` | Pintu panel |
| `branch_id` | Satu pusat (kecuali owner; pelatih lewat `coach_branches`) |
| `is_profile_complete` | Pelatih: kunci sebagian tab. Staf: gerbang seluruh panel. Siswa: bersama avatar |
| `is_archived` | Nonaktif |
| `suspend_until` | Penangguhan |
| `locale` | Opsional `en` \| `id` |
| `public_id` | ID tampilan permanen. Format di bawah |
| `qr_payload` | Isi QR. Sama dengan `public_id` (atau URL yang memuat itu). Digenerate saat create |

Owner tidak dibuat formulir tambah biasa. Init: `POST /api/owner/init-profile`. Suntingan peran **boleh** diubah menjadi `owner`. `public_id` dan QR **tidak** ikut berubah saat peran disunting.

### ID tampilan dan QR (semua akun)

Setiap akun yang dibuat (Owner lewat init-profile, yang lain lewat create akun) **wajib** dapat `public_id` plus QR pada langkah yang sama. Bukan job belakangan. Bukan hanya siswa.

Template:

`NEXT.<urutan 3-digit>.<kode role>.<2-digit tahun>`

Contoh: `NEXT.001.OW.26`

| Kode | Peran |
|---|---|
| `OW` | Owner |
| `AD` | Admin |
| `MC` | Manager Center |
| `CO` | Coach |
| `ST` | Student (`member`) |
| `SC` | School |
| `SF` | Staff |

`ST` bukan Staff. Staff = `SF`.

Aturan:

- Urutan 3-digit unik per pasangan (kode role + tahun pembuatan). Tahun = dua digit tahun create (`26` untuk 2026).
- Digenerate di peladen saat insert. Manusia tidak mengetik ID atau menggambar QR.
- Permanen sampai akun dihapus. Ganti nama, cabang, peran, atau reset sandi **tidak** mengganti ID atau QR.
- Tampil di Profile peran itu (dan kartu identitas lain jika perlu). Bungkus `NoTranslate`.
- QR siswa tetap yang dipindai pelatih untuk absensi. QR peran lain = identitas, bukan absensi kolam.
- Nilai QR dan `public_id` tidak boleh diterjemahkan widget.

Admin tidak dapat membuat Owner atau Admin.

### `branches` (Pusat / Centers)

Induk `branch_id`. Field konsep: nama, kota, alamat, pin peta, WhatsApp Admin, rekening (bank, nomor, pemegang), logo, sakelar `show_payments_to_admin`.

Sakelar Payments **tidak** berlaku bagi Manager Center. Rekening siswa dan sakelar Payments tetap di Owner Centers; Admin Settings menyunting identitas harian, bukan sakelar itu.

Hapus pusat menghapus data pusat dan akun masuk terkait.

### `coach_branches`

Pelatih ke banyak pusat. Pemilih cabang di panel Coach jika lebih dari satu.

### `schools`

Sekolah mitra. Terikat akun `school` (`schools.profile_id`) dan satu pusat. Logo + tanda tangan untuk PDF rapor. Panel School hanya baca siswa `members.school_id` = sekolah itu.

---

## 2. Kelas dan orang di kolam

### `classes`

Kelas reguler atau privat (`class_type=private`).

| Kunci | Keputusan |
|---|---|
| Reguler | Jadwal (boleh beda per hari), kapasitas, harga, foto, lokasi, pelatih, penandatangan rapor |
| Privat | Satu siswa, satu kelas; **bukan** baris di menu Class |
| Libur | `class_holidays` — satu tanggal per kelas; pelatih tidak clock-in |

#### Jadwal: hari jamak, jam per hari

Satu kelas boleh berjalan di beberapa hari. Bentuk konsepnya `schedule_days` plus `schedule_times`: daftar hari yang dipilih, dan untuk tiap hari sepasang `time_start` dan `time_end`.

- Hari dipilih banyak, bukan satu. Formulir memakai pilihan Senin sampai Minggu yang dapat aktif bersamaan.
- Tiap hari menyimpan jam mulai dan jam selesai sendiri. Dua hari boleh berbeda jam.
- Jam selesai wajib, bukan hiasan. Jendela clock-in dihitung dari `time_start` sampai `time_end` (lihat bab 3), jadi tanpa jam selesai jendela itu tidak punya batas dan KPI-05 tidak dapat diuji.
- Aturan yang sama berlaku untuk kelas privat. Privat lebih lentur soal siapa dan di mana, tetapi bentuk jadwalnya tetap hari jamak plus rentang jam per hari.

#### Lokasi: pusat atau titik sendiri

Dua sumber, dipilih di formulir kelas:

1. **Lokasi pusat.** Memakai pin `branches` milik pusat kelas itu. Kelas tidak menyimpan pin terpisah.
2. **Lokasi lain.** Kelas privat atau kelas di kolam eksternal menyimpan pin sendiri di baris kelas.

Pemilih lokasi menampilkan peta. Pengguna boleh menggeser pin langsung, atau mencari nama tempat lalu memilih hasilnya. Peta dan pencarian tempat memakai Google Maps yang disisipkan di klien. Hasilnya disimpan sebagai lintang dan bujur biasa plus label alamat, jadi baris kelas tidak bergantung pada penyedia peta dan dapat pindah penyedia tanpa migrasi data.

Tanpa pin, jarak clock-in tidak dihitung dan clock-in tetap boleh dikirim. Jarak tidak pernah menolak.

### `class_packages`

Paket sesi **kelas reguler**. Hanya Admin **Class**. Bukan Owner Classes. Bukan sisa sesi privat.

### `class_coaches`

Penugasan pelatih ke kelas. Spreadsheet pelatih: `class_coach_spreadsheets` (URL, bukan integrasi Google API).

#### Peran pelatih di satu kelas

Setiap penugasan menyimpan peran. Tiga nilai sah: `head`, `assistant`, `staff`.

| Jumlah pelatih di kelas | Aturan peran |
|---|---|
| 1 | Otomatis `head`. Tidak ada pilihan, dan tidak ada kelas tanpa kepala |
| 2 | Satu `head`, satu `assistant`. Keduanya dipilih secara sadar, bukan ditebak dari urutan tambah |
| Lebih dari 2 | Satu `head`, satu `assistant`, sisanya `staff` (coaching staff) |

Tepat satu `head` per kelas, selalu. Paling banyak satu `assistant`. `staff` boleh berapa pun, termasuk nol.

Peran ini berlaku di kelas reguler dan kelas privat, dan ikut dipakai saat menambah atau mengganti pelatih di kelas yang sudah jalan. Melepas pelatih `head` sementara masih ada pelatih lain wajib memindahkan peran `head` lebih dulu. Kelas tidak boleh berada dalam keadaan tanpa kepala, walau sesaat.

Peran tidak mengubah tarif. Honor tetap dihitung dari `coach_rates` untuk pelatih yang benar-benar clock-in, jadi `assistant` dan `staff` yang hadir tetap dapat mengklaim sesinya sesuai tarif yang berlaku.

`rapor_signer_coach_id` tetap kolom tersendiri di kelas. Cadangannya pelatih `head`, bukan `assistant`.

### `members` (Student)

Tipe sah: `reguler` | `private` | `school_affiliate`.

| Kolom konsep | Pakai |
|---|---|
| `remaining_sessions` | Sisa sesi **privat** saja |
| `school_id` | Wajib untuk afiliasi |
| `school_grade` | Jenjang sekolah, **bukan** nama kelas les (FB-08) |
| `avatar_url` | Gerbang foto + PDF rapor |
| `public_id` + QR | Sama dengan semua akun. Pelatih memindai QR siswa untuk hadir |

Siswa privat hanya masuk lewat **Private Students** (FB-01). Satu create privat menyimpan: data siswa, harga paket, jumlah sesi awal, sisa sesi, jadwal, pelatih, lokasi/pin.

---

## 3. Absensi dan izin

### `coach_attendances`

Status sah: `present` | `late`. Flag `is_manual` boleh.

Jendela clock-in: 3 jam sebelum `time_start` sampai `time_end`. `present` jika selisih ke `time_start` ≤ 15 menit; selain itu `late` jika masih dalam jendela (KPI-05).

`distance_meters` disimpan dan diwarnai (≤500 m / ≤2 km / lebih). Jarak jauh **tidak** menolak.

Tanpa pin kelas/pusat: jarak tidak dihitung.

Swafoto pelatih opsional; gagal unggah tetap menyimpan baris.

Sesi covering: baris milik **pengganti**. Honor mengikuti pelatih yang mengajar.

### `member_attendances`

Status sah: `hadir` | `telat` | `izin` | `sakit` | `tidak_hadir`.

Reguler: `hadir` jika ≤ 1 menit setelah `time_start`, selain itu `telat`.

Privat: RPC `consume_private_session` sekali per hari; `remaining_sessions` −1; duplikat ditolak.

Absensi manual: tanggal jadwal hingga 56 hari ke belakang.

Siswa ditangguhkan: pindai ditolak.

Baris lama menyimpan konfigurasi saat kejadian (FB-03, FB-06).

### `staff_attendances`

Status sah: `present` | `sakit` | `izin` | `absent`.

Clock-in/out harian. Sakit/izin **hari ini** dicatat sendiri di Home. Swafoto **wajib tersimpan dan dikompres** (FB-07). Tidak ada GPS.

### Izin orang (Leave)

Bukan libur kelas.

| Siapa | Perilaku |
|---|---|
| Pelatih | Pengajuan + **pengganti wajib per kelas**; status awal `pending`; Admin setuju/tolak/ganti nama pengganti |
| Siswa | Tipe `izin` \| `sakit` \| `ujian` \| `lainnya`; persetujuan menyisipkan `member_attendances` |
| Staf tanggal nanti | Diajukan ke Admin Leave Requests sub-tab Staff; setelah disetujui clock-in ditolak |
| Staf hari ini | Bukan Leave Requests; langsung `staff_attendances` |

Pengganti: pelatih aktif, bukan diri sendiri, boleh lintas pusat. Status konsep izin pelatih: `pending` lalu disetujui/ditolak (label UI **Supported** = Izin, bukan “ada pengganti”).

### `registrations`

Calon dari `/register`. Status tertunda sampai Admin setuju (buat `member`) / tolak / hapus. Calon tidak masuk panel sebelum disetujui.

Lencana Approvals = `registrations` tertunda + sertifikat pelatih tertunda. Izin orang **tidak** masuk lencana.

---

## 4. Tiga mesin uang — jangan disatukan

### Mesin A — `bills` (tagihan siswa)

Status sah: `unpaid` | `partial` | `paid` | `school_covered` | `free`.

Metode lunas: `transfer` | `cash` | `qris`.

Generate bulanan: hanya `reguler` yang masuk kelas; satu baris per siswa × kelas × periode; yang ada dilewati (KPI-03). **Tidak** untuk `private` atau `school_affiliate`.

Bukti: unggah hanya Admin; URL bertanda tangan. Siswa tidak unggah bukti.

Tab Bills siswa afiliasi **disembunyikan**.

### Mesin B — honor

#### `invoice_periods`

Jendela klaim honor. Bisa satu pusat atau global. Tanpa periode terbuka: formulir invoice tertutup; riwayat lama tetap kelihatan.

#### `coach_invoices`

Status sah: `pending` | `approved` | `rejected` | `paid`.

Dipakai pelatih **dan** staf (`coach_id` = id staf untuk staf). Butir pelatih = sesi `present`/`late` yang `invoice_id` kosong. Butir staf = `manual_fee` (nominal ketik).

Tarif khusus pelatih mengalahkan tarif umum kelas. Kelas tanpa tarif tidak dapat diklaim. Covering memakai tarif **pengganti**.

Kirim → `pending`, kunci sesi, Bell **Owner**.

#### `payslips`

Hanya `published` yang tampil ke pelatih/staf. Draf tidak boleh bocor.

Terbit: invoice terkait → `paid`; cicilan kasbon periode itu tertutup.

Staf juga punya `staff_salaries` (input Owner Financial / Payroll).

#### `coach_loans` (kasbon)

Status sah: `active` | `paid_off` | `written_off` | `cancelled`.

Bukan menu sendiri. Sub-tab Owner Payslips. Potongan di draf slip. Berlaku pelatih dan staf.

#### `staff_reimbursements`

Nomor `RB-…`. Status sah: `pending` | `approved` | `rejected` | `cancelled` | `paid`.

Diproses Owner **Financial**, bukan Manager Center, bukan Admin.

### Mesin C — Financial

Bukan tabel tagihan dan bukan tempat terbit slip. Membaca A + B + transaksi manual.

Owner: Overview, Income, Expenses, Payroll, Money flow — lintas pusat.

Manager Center: Financial satu pusat, lebih kurus; **tidak** terbit slip / kasbon / reimburse proses Owner.

Saring rentang dulu; ekspor mengikuti saringan (FB-11).

---

## 5. Rapor dan sekolah

### `rapor_periods`

Paling banyak satu `is_open = true` per `branch_id` (KPI-04). Dibuka Admin, bukan Owner. Rubrik global: Owner Report Levels (`score_10`, `score_100`, `choice`, `text`, waktu standar, cakupan kelas).

### `rapor_entries`

Pelatih isi hanya di cabang aktif yang periodenya terbuka, lalu `locked = true`.

PDF mengikuti sakelar `show_coach_sig`, `show_head_sig`, `show_school_sig`.

Sekolah mitra: unduh PDF/ZIP hanya entri terkunci milik `school_id`-nya (FB-09).

Ulasan bintang siswa hanya saat periode terbuka; identitas pengulas disamarkan di peladen.

### Ekspor absensi sekolah

Satu baris per murid, kolom tanggal (FB-10). Mengikuti saringan aktif. Batas muat 2.000 baris. Nama berkas: `Absensi-{nama-sekolah}-{dari}-sd-{sampai}.xlsx`.

---

## 6. Komunikasi, CMS, arsip

### Pengumuman

Per pusat. Sasaran `target_roles`: `member` | `coach` | `admin` | `school`. Panel School **tidak** punya tab pengumuman.

### CMS landing

Program, sorotan pelatih, video, keunggulan, testimoni, mitra, cabang, FAQ, kaki. Sorotan pelatih landing ≠ daftar pelatih operasional.

### `notifications` (Bell)

Bell Owner ≠ Bell Admin. Invoice honor baru → Owner. Operasi pusat (izin, daftar, dll.) → Admin.

### `activity_logs`

UI log hanya Owner. Mutasi penting memanggil `logActivity`.

### Penyimpanan

Avatar, tanda tangan, bukti Admin, foto kelas, swafoto staf (kompres). Hapus di System Storage merusak; wajib konfirmasi (FB-14).

### Kompetisi

Prestasi siswa; catatan kompetisi bisa masuk riwayat rapor. Bukan mesin uang.

Tiga tabel:

| Tabel | Isi |
|---|---|
| `competitions` | Data lomba: nama, penyelenggara, level, lokasi, kota, tanggal mulai, tanggal selesai, catatan |
| `competition_participations` | Satu baris per siswa per kategori: kategori, kelompok usia, gaya, jarak, waktu hasil, peringkat, status hasil, penghargaan, pendamping |
| `competition_documents` | Sertifikat atau foto bukti. **Satu berkas per pasangan siswa dan lomba**, bukan per kategori |

Level lomba: `internal` | `lokal` | `regional` | `nasional` | `internasional`.

Status hasil: `finish` | `finalis` | `dq` | `dns` | `dnf`.

Penghargaan: `peserta` | `emas` | `perak` | `perunggu` | `juara_4` | `finalis` | `custom`. Nilai `custom` menyimpan labelnya sendiri di kolom terpisah.

Aturan yang mudah salah:

- Satu siswa boleh menang beberapa kategori di lomba yang sama. Itu beberapa baris `competition_participations`, bukan satu baris berisi daftar.
- Sertifikat tetap satu berkas untuk pasangan siswa dan lomba itu. Diunggah sekali, terpakai oleh semua baris kategori di lomba tersebut. Jangan meminta unggah ulang per kategori.
- Waktu hasil disimpan setelah diurai dari format waktu renang (contoh `32.41`), bukan sebagai teks bebas.
- Perubahan pada `competitions` tercatat ke `activity_logs`.

---

## 7. Matriks “jangan tertukar”

| Bukan ini | Melainkan |
|---|---|
| `bills` | Iuran siswa |
| `coach_invoices` | Klaim honor |
| `payslips` | Slip terbit |
| `invoice_periods` | Jendela klaim honor |
| `rapor_periods` | Jendela isi rapor |
| `class_packages` | Paket kelas reguler |
| `members.remaining_sessions` | Sisa sesi privat |
| `school_grade` | Jenjang sekolah mitra |
| `classes.name` | Nama kelas les |
---
