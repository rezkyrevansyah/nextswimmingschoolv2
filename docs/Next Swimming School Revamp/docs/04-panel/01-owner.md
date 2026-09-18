# Owner Panel — Konsep terkunci

> Status: konsep panel terkunci. Niat produk: `docs/01-prd.md`. Umpan balik: `docs/02-umpan-balik.md`.
> Peran `owner` melihat **semua pusat**. Admin dan Manager Center melihat **satu pusat**.
> Sumber perilaku yang sudah ada: `src/app/owner/`.
> Jaringan: `docs/03-alur/01-jaringan.md`. Uang: `docs/03-alur/04-uang.md`. Rapor: `docs/03-alur/05-rapor-sekolah.md`. Honor langkah: `docs/03-alur/03-absensi-izin-honor.md`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan Owner
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Owner**
- **Jangan** — jalur ganda atau wewenang yang dilarang

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Student · School · Publik (halaman landing)

Manager Center memakai panel Admin (`/admin`), bukan panel Owner. Manager Center selalu melihat menu **Payments** dan **Financial**. Admin biasa tidak memiliki **Financial**; menu **Payments**-nya dapat disembunyikan per pusat (lihat **Centers**).

Masuk pertama kali memanggil `POST /api/owner/init-profile` agar baris profil Owner ada.

Owner **tidak** mengisi absensi harian di kolam, tidak membuat tagihan siswa per pusat, dan tidak mengisi rapor.

## Rantai create di panel ini

1. Pusat
2. Aturan global (kategori keuangan, tanda tangan Head, rubrik rapor, CMS)
3. Akun lintas pusat
4. Logo dan tanda tangan sekolah mitra
5. Kelas reguler
6. Siswa privat (akun + kelas privat)
7. Tarif honor
8. Pantau absensi
9. Tinjau izin lintas pusat (jaring pengaman kalau Admin pusat terkait belum sempat)
10. Periode invoice, slip, kasbon
11. Buku keuangan
12. Arsip berkas dan log

## Susunan menu terkunci

Dashboard di puncak. Storage dan Activity Log di dasar. Kasbon bukan menu sendiri.

| No. | Menu | `id` tab | Alasan urutan |
|---|---|---|---|
| 1 | Dashboard | `dashboard` | Beranda |
| 2 | Centers | `branches` | Induk semua `branch_id` |
| 3 | Master Data | `master` | Kategori keuangan dan tanda tangan Head |
| 4 | Account Master Data | `accounts` | Orang; butuh pusat |
| 5 | Schools | `schools` | Logo dan tanda tangan; butuh akun `school` |
| 6 | Report Levels | `levels` | Rubrik global; sebelum periode rapor diisi |
| 7 | Classes | `classes` | Kelas reguler; butuh pusat dan pelatih |
| 8 | Private Students | `studentPrivate` | Akun plus kelas privat; butuh pelatih |
| 9 | Coach Rates | `rates` | Tarif; butuh kelas |
| 10 | Competitions | `competitions` | Prestasi; butuh siswa |
| 11 | Leave Requests | `izin` | Jaring pengaman lintas pusat; sama mesin dengan Admin |
| 12 | Attendance | `absensi` | Membaca absensi setelah izin dan orang ada (FB-06) |
| 13 | Payslips | `invoices` | Periode, invoice, slip; kasbon sebagai sub-tab |
| 14 | Financial | `financial` | Rekap pemasukan dan pengeluaran yang sudah terjadi |
| 15 | Landing | `landing` | CMS publik; tidak mengunci operasional kolam |
| 16 | System Storage | `storage` | Arsip berkas |
| 17 | Activity Log | `activity` | Jejak terakhir |

## Aturan satu pintu

- **Accounts** dan **Private Students** tidak digabung. Satu formulir untuk semua tipe siswa adalah sumber rancu FB-01.
- **Classes** dan **Private Students** tidak digabung.
- Formulir tambah Accounts **tidak** membuat `type=private`. Privat hanya dari **Private Students**.
- **Master Data** tetap menu sendiri. Kategori tidak dipindah ke Financial; tanda tangan Head tidak dipindah ke Schools.
- **Loan List** bukan menu bilah sisi. Create/cicilan/hapusbuku kasbon hidup sebagai sub-tab **Payslips**.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:**

- bilah sisi 17 menu dan keluar;
- bilah atas: judul, Bell, pengalih bahasa (EN/ID), avatar — **tanpa** kotak pencarian;
- Bell (`notifications`): invoice honor baru dari pelatih atau staf;
- umpan balik beta jika bendera aktif;
- dari **Centers**: **Open Admin Panel** menyimpan `sessionStorage.ownerPreviewBranch` lalu membuka `/admin` (mode pratinjau).

**Jangan:** kotak pencarian placeholder yang mengesankan pencarian global (F-AKN-08).

**Dampak ke peran lain:**

- **Coach / Staff:** mengajukan invoice → pemberitahuan di Bell Owner
- **Admin:** pratinjau panel Admin untuk satu pusat, dengan tombol kembali ke Owner

---

## 1. Dashboard (`dashboard`)

**Apa:** Ringkasan angka lintas pusat. Tidak ada ubahan data.

**Yang dapat dilakukan:**

- jumlah siswa, pelatih, dan kelas aktif (semua pusat);
- jumlah invoice honor berstatus `pending`;
- tabel per pusat (siswa, pelatih, kelas);
- daftar invoice masuk terbaru (paling banyak 4, status `pending`).

**Dampak ke peran lain:** invoice `pending` dari pelatih atau staf muncul di kartu ini.

---

## 2. Centers (`branches`)

**Apa:** Data induk pusat. Hampir semua akun, kelas, dan invoice terikat `branch_id`.

**Yang dapat dilakukan:**

- membuat atau mengubah: nama, kota, alamat, pin peta (lintang/bujur), nomor WhatsApp Admin, rekening (bank, nomor, nama pemegang);
- sakelar **Show Payments menu to Admin** (tidak berlaku bagi Manager Center);
- mengarsipkan atau memulihkan;
- menghapus permanen (`DELETE /api/owner/branches/:id`) — data pusat dan akun masuk terkait ikut terhapus;
- membuka pratinjau panel Admin.

**Dampak ke peran lain:**

- **Admin:** nama, alamat, dan WhatsApp di **Settings**; sakelar menyembunyikan menu **Payments**
- **Manager Center:** tetap melihat **Payments** dan **Financial**
- **Coach:** lintang/bujur pusat = titik pembanding GPS clock-in (kelas privat dapat memakai pin khusus kelas). Jarak dicatat, clock-in tidak ditolak karena jauh
- **Student:** WhatsApp = tombol hubungi Admin; rekening = instruksi transfer di tab **Bills** (bukan unggah bukti di aplikasi)
- **Publik:** pusat aktif dapat ditampilkan di landing (CMS tab **Branches**)

**Jangan:** mengandalkan sakelar Payments sebagai keamanan satu-satunya — wewenang dicek di peladen (FB-12).

---

## 3. Master Data (`master`)

**Apa:** Pengaturan global: profil Head of NEXT dan kategori transaksi manual.

**Yang dapat dilakukan:**

- mengubah nama, jabatan, dan tanda tangan digital (`owner_settings`);
- menambah, mengubah, menghapus, dan mengurutkan kategori pemasukan/pengeluaran (`manual_transaction_categories`).

**Dampak ke peran lain:**

- **School / Admin / Coach / Student:** tanda tangan Head tampil di PDF rapor jika sekolah mengaktifkan `show_head_sig` (diatur di **Schools**)
- **Owner Financial** dan **Financial** Manager Center memakai kategori yang sama

**Jangan:** memecah menu ini. Kategori dan tanda tangan Head adalah aturan global yang dipakai sebelum akun, rapor, dan buku keuangan.

---

## 4. Account Master Data (`accounts`)

**Apa:** Semua akun di sistem, lintas pusat — kecuali pembuatan siswa privat.

**Yang dapat dilakukan:**

- menyaring peran, pusat, arsip, dan kata kunci;
- membuat akun (`POST /api/admin/users`): `admin | manager_center | coach | student | school | staff`. Formulir tambah **tidak** dapat membuat Owner;
- saat membuat Admin atau Manager Center: opsi otomatis membuat Staff (surel `namastaff@…`);
- tipe siswa di formulir tambah: `reguler | school_affiliate` (plus sekolah dan **jenjang wajib** jika afiliasi);
- rincian: mengubah profil, peran, dan pusat (peran **dapat** diubah menjadi `owner`), mengatur ulang kata sandi, menonaktifkan atau mengaktifkan (`is_archived`), menghapus;
- kartu QR: satu, banyak (zip), cetak;
- data rekening untuk `coach | staff | admin | manager_center`.

**Dampak ke peran lain:**

- akun masuk ke panel sesuai peran;
- **Admin** dapat membuat pengguna, tetapi tidak dapat membuat Owner atau Admin;
- rekening pelatih/staf dipakai di invoice dan slip gaji;
- QR siswa untuk absensi;
- peran `school` masuk panel School.

**Jangan:** opsi `private` di formulir ini. Siswa privat hanya dari **Private Students** (FB-01). Jangan menggabungkan Accounts dan Private Students menjadi satu tabel.

---

## 5. Schools (`schools`)

**Apa:** Logo dan tanda tangan rapor per sekolah mitra. **Bukan** pembuatan akun sekolah — akun dibuat di **Account Master Data** atau Admin **School Panel**.

**Yang dapat dilakukan:**

- mengunggah logo;
- menambah, mengubah, menghapus `school_signatures` (nama, jabatan, gambar, aktif/nonaktif);
- sakelar tampilan tanda tangan pelatih / Head / sekolah beserta judulnya.

**Dampak ke peran lain:**

- PDF rapor di School, Admin, Coach, dan Student memakai logo dan tiga slot tanda tangan sesuai sakelar
- Siswa `school_affiliate` terikat `school_id` dari akun, bukan dari tab ini

---

## 6. Report Levels (`levels`)

**Apa:** Cetakan rubrik rapor global, bukan isi rapor per siswa.

**Yang dapat dilakukan:**

- menambah, mengubah, mengaktifkan, mengurutkan level;
- kriteria: `score_10 | score_100 | choice | text` (termasuk ubah jenis massal);
- waktu standar: jarak, gaya, target;
- cakupan: semua kelas (`all_classes`) atau kelas tertentu (`rapor_level_classes`).

**Dampak ke peran lain:** pelatih memakai level aktif yang berlaku untuk kelasnya; PDF rapor Admin, School, dan Student memakai kriteria dan waktu standar itu.

---

## 7. Classes (`classes`)

**Apa:** Kelas reguler lintas pusat. Kelas privat dikelola di **Private Students**.

**Yang dapat dilakukan:**

- membuat, mengubah, mengarsipkan, memulihkan, menghapus kelas: jadwal (hari jamak, tiap hari punya jam mulai dan jam selesai sendiri), kapasitas, harga bulanan atau per sesi, foto, lokasi pusat atau titik sendiri lewat peta (geser pin atau cari nama tempat);
- menugaskan pelatih beserta perannya. Satu pelatih otomatis menjadi kepala; dua pelatih dipilih mana kepala dan mana asisten; lebih dari dua, sisanya menjadi coaching staff. Aturan lengkap di `docs/06-teknis/SCHEMA.md` bagian `class_coaches`;
- rincian: info, daftar pelatih, daftar siswa, tautan spreadsheet per pelatih;
- menetapkan `rapor_signer_coach_id` (penandatangan rapor resmi kelas);
- melihat tautan spreadsheet per pelatih.

**Tidak** ada UI paket sesi (`class_packages`). Paket itu hanya di Admin **Class**, dipakai saat menambah tagihan tipe session pack.

Absensi pelatih/siswa di rincian kelas **bukan** pengganti menu **Attendance**. Hub lintas peran ada di nomor 11.

**Dampak ke peran lain:**

- **Admin:** kelas pusat sendiri
- **Coach:** kelas yang diampu → absensi, rapor, invoice per sesi
- **Student:** jadwal, absensi, tagihan
- **School:** rapor siswa di kelas terkait

**Jangan:** menaruh siswa privat sebagai baris biasa di sini.

---

## 8. Private Students (`studentPrivate`)

**Apa:** Les privat — satu siswa berpasangan dengan satu kelas `class_type=private`. Komponen sama dengan Admin; Owner melihat semua pusat plus saringan pusat. Satu-satunya jalur create siswa privat (FB-01).

**Yang dapat dilakukan:**

- satu kali tambah menyimpan bersama: data siswa, **harga paket + jumlah sesi** (bukan harga per pertemuan, FB-02), sisa sesi, jadwal (hari jamak, tiap hari punya jam mulai dan jam selesai), pelatih beserta perannya, lokasi pusat atau titik sendiri lewat peta;
- mengubah data siswa, sisa sesi, jadwal, lokasi, pelatih;
- kelas privat **tidak** tampil di menu **Classes** Owner maupun Admin.

Setiap perubahan jadwal, lokasi, atau pelatih berlaku untuk absensi **baru**. Absensi **lama** menyimpan konfigurasi saat kejadian; tidak ditimpa (FB-03). Jika lokasi berubah dari A ke B, acuan jarak clock-in sesi berikutnya adalah B. Tanpa pin, jarak tidak dihitung. Pergantian pelatih tidak menghapus clock-in sebelumnya dan tidak memindahkan honor sesi yang sudah dikunci invoice.

Sisa sesi = `students.remaining_sessions` setelah pengurang peladen yang sama dengan absensi privat yang sah (FB-04). Empat angka yang harus konsisten: sesi awal paket, sesi terpakai, sisa, tampilan di panel Student.

**Dampak ke peran lain:**

- **Admin:** fitur sama, satu pusat
- **Coach:** kelas privat di absensi dan kelas; GPS clock-in memakai pin kelas, bukan pin pusat
- **Student:** sisa sesi, jadwal, lokasi privat

Paket sesi privat **bukan** `class_packages` di menu Class Admin.

**Jangan:** harga per sesi; salinan jadwal yang hanya hidup di satu panel; membuat privat dari Accounts, Student, atau impor Excel.

---

## 9. Coach Rates (`rates`)

**Apa:** Tarif honor pelatih per kelas. Dipakai saat pelatih membuat invoice.

**Yang dapat dilakukan:**

- tarif umum per kelas (`coach_id` kosong);
- tarif khusus per pelatih per kelas;
- tarif extra (`coach_extra_rates`) untuk sesi di luar jadwal;
- saringan lengkap / belum lengkap / belum ada tarif extra.

**Dampak ke peran lain:** pelatih memakai tarif ini untuk sesi reguler dan extra. Kelas tanpa tarif tidak dapat diklaim. Tidak tampil ke Student atau School.

---

## 10. Competitions (`competitions`)

**Apa:** Lomba dan prestasi siswa. Komponen yang sama dipakai Admin. Owner memasangnya tanpa `branch_id` terkunci, jadi datanya lintas pusat **dan** Owner mendapat saringan cabang yang tidak ada di Admin.

**Susunan halaman:** tiga kartu angka di atas (jumlah lomba, jumlah partisipasi, jumlah medali) yang tetap tampil di kedua tab, lalu dua tab: **Awards** (bawaan) dan **Competitions**.

### 10A. Awards (bawaan, mulai dari siswa)

Alurnya cari siswa dulu, baru lihat atau isi prestasinya. Bukan cari lomba dulu.

**Yang dapat dilakukan:**

- tabel pemilih siswa: cari nama atau nomor anggota, saring tipe (`reguler` \| `private` \| `school_affiliate`), saring cabang (hanya Owner), halaman 10 baris;
- klik satu baris membuka modal riwayat prestasi siswa itu (ukuran `xl`, judul = nama siswa);
- di dalam modal: tambah prestasi, dan per baris ada gandakan, sunting, hapus;
- kolom riwayat: lomba (nama dan tanggal), kategori (plus kelompok usia), waktu, peringkat, penghargaan, sertifikat, aksi.

**Gandakan** memakai baris yang ada sebagai cetakan: siswa, lomba, pendamping, dan kelompok usia tetap; kategori, waktu, peringkat, dan penghargaan dikosongkan. Ini untuk siswa yang menang beberapa kategori di lomba yang sama.

### 10B. Competitions (daftar lomba)

**Yang dapat dilakukan:**

- cari lomba, saring level;
- tambah atau sunting lomba: nama (wajib), penyelenggara, level, lokasi, kota, tanggal mulai (wajib), tanggal selesai, catatan;
- kolom: nama lomba (plus deskripsi), tanggal (plus lokasi dan kota), penyelenggara, level, jumlah peserta, jumlah medali, aksi;
- buka rincian peserta satu lomba: informasi lomba di kepala, lalu tabel peserta (siswa dengan foto dan cabang, kategori, waktu, peringkat, hasil, pendamping, sertifikat, aksi).

### 10C. Formulir hasil peserta

Satu formulir, dua pintu. Dari tab Competitions lombanya sudah pasti, jadi pemilih lomba disembunyikan. Dari tab Awards pemilih lomba muncul, lengkap dengan tombol buat lomba baru dan sunting lomba di tempat, supaya tidak perlu keluar dari formulir hanya karena lombanya belum terdaftar atau namanya salah ketik.

Medan: lomba (wajib jika dari Awards), siswa (wajib), kategori (wajib), kelompok usia, gaya, jarak, waktu hasil, peringkat, status hasil, penghargaan, label khusus (muncul hanya jika penghargaan `custom`), pendamping, sertifikat, catatan.

Saat menambah baru ada dua tombol simpan. **Simpan** menutup modal. **Simpan dan tambah lagi** menahan modal tetap terbuka dan **mengunci** siswa, pendamping, lomba, dan kelompok usia, lalu mengosongkan kategori, waktu, peringkat, dan penghargaan. Tombol kedua tidak muncul saat menyunting.

**Jangan:** meminta unggah sertifikat per kategori. Satu berkas per pasangan siswa dan lomba sudah cukup dan otomatis terpakai di semua kategori lomba itu.

**Dampak ke peran lain:**

- **Admin:** komponen sama, satu pusat
- **Student:** riwayat lomba di tab rapor
- **Coach:** dapat tercatat sebagai pendamping

---

## 11. Leave Requests (`izin`)

**Apa:** Antrian Sick dan Izin yang sama dengan Admin **Leave Requests**, tetapi lintas pusat: semua pengajuan pending dari semua pusat, dengan saringan pusat opsional (default semua). Bukan menu terpisah untuk peran; sama tiga sub-tab dengan Admin: **Coach**, **Student**, **Staff**. Mesin persetujuan, jenis pengajuan, dan efek ke absensi identik dengan `docs/03-alur/03-absensi-izin-honor.md` bab 4. Rincian mekanisme tidak diulang di sini, hanya bedanya dengan Admin.

**Kenapa Owner butuh ini juga:** Admin hanya melihat pusatnya sendiri. Kalau pelatih mengajukan izin dan Admin pusat itu sedang tidak sempat menindak, tidak ada jalan lain sebelum menu ini — pengajuan menumpuk tanpa ada yang bisa menyetujui selain satu orang. Owner melihat semua pusat sehingga bisa turun tangan di pusat mana pun tanpa harus membuka pratinjau Admin dulu.

**Yang dapat dilakukan:**

- tiga sub-tab: **Coach** (plus pemilihan atau penggantian pengganti per sesi, daftar lintas cabang seperti di Admin), **Student**, **Staff** (khusus tanggal nanti; sakit/izin hari ini staf tidak pernah masuk antrian ini di panel mana pun);
- saring pusat (default semua pusat), status, dan rentang tanggal;
- setuju, tolak plus alasan, ganti pengganti (hanya sub-tab Coach) — tindakan yang persis sama dengan Admin, bukan versi ringkas;
- membuat pengajuan atas nama pelatih, siswa, atau staf, sama seperti Admin dapat lakukan.

**Satu pengajuan, satu keputusan:** status `pending` hanya bisa ditutup sekali. Begitu Admin **atau** Owner menyetujui atau menolak satu baris, baris itu langsung berpindah status untuk kedua panel. Kalau dua orang membuka baris yang sama bersamaan, siapa yang menekan tombol lebih dulu yang menentukan; yang kedua melihat pesan bahwa baris itu sudah diputuskan (oleh siapa dan kapan), bukan galat generik atau baris yang diproses dua kali. Log aktivitas mencatat peran dan pusat aktor, sehingga selalu jelas keputusan itu berasal dari Admin pusat terkait atau dari Owner.

**Jangan:** membuat mesin persetujuan kedua yang terpisah dari milik Admin. Ini satu tabel `pending`/`approved`/`rejected`/`cancelled` yang sama, dua pintu masuk. Jangan menambah tahap "Owner menyetujui ulang" setelah Admin menyetujui — begitu diputuskan salah satu, selesai.

**Dampak ke peran lain:**

- **Admin:** kehilangan eksklusivitas menyetujui pusatnya sendiri; keputusan Owner atas pusat itu terlihat sama seperti keputusan Admin sendiri
- **Coach / Student / Staff:** tidak berubah — pengajuan tetap dari panel masing-masing, tidak tahu dan tidak perlu tahu siapa yang menyetujui
- Bell Owner **tidak** ikut menyala untuk antrian ini. Bell Owner tetap khusus invoice honor pelatih/staf. Owner memantau menu ini lewat kunjungan langsung, bukan notifikasi, sama seperti Attendance tidak punya Bell sendiri.

---

## 12. Attendance (`absensi`)

**Apa:** Hub kehadiran lintas peran, semua pusat. Bukan tempat clock-in. Menutup lubang FB-06: daftar mengikuti penyerahan absensi, rincian menampilkan foto jika ada.

**Yang dapat dilakukan:**

### A. Coach

Daftar `coach_attendances` (saringan pelatih, kelas, pusat, tanggal). Input manual hadir/telat/absen (`is_manual`); sunting; hapus. Rincian menampilkan swafoto jika `selfie_url` terisi. Jarak GPS dicatat dan diwarnai; **bukan** pagar yang menolak.

### B. Student

Daftar `student_attendances` (kelas, status, bulan, nama, pusat). Hampir hanya baca. Baris `sakit`/`izin` otomatis dari Admin **Leave Requests** yang disetujui. Status sah: `hadir | telat | izin | sakit | tidak_hadir` (FB-05).

### C. Staff

Daftar `staff_attendances` (pusat, tanggal, status Present / Sick / Izin / Absent). Rincian menampilkan swafoto jika ada (FB-07). Hari ini dicatat staf langsung; tanggal nanti lewat Admin **Leave Requests** → Staff.

Setelah pelatih, staf, atau (lewat pelatih) siswa tercatat hadir, baris muncul di sini dan di Admin pusat itu **tanpa** langkah sinkron manual. Tidak ada salinan daftar yang “lebih baru” di satu panel.

**Dampak ke peran lain:** clock-in pelatih dan staf, pindai QR, absensi manual, dan izin siswa yang disetujui mengisi hub ini. Sesi pelatih **Present**/**Late** (termasuk sesi covering) menjadi item invoice jika tarif sudah diisi. Pelatih asli tidak klaim sesi yang sudah didelegasikan. Rincian: `docs/03-alur/03-absensi-izin-honor.md`.

**Jangan:** menambal Excel atau Financial sebelum status di tabel ini benar (FB-05). Jangan mencampur tiga tabel absensi. Jangan mencampur baris staf ke sub-tab pelatih.

---

## 13. Payslips (`invoices`)

**Apa:** Meninjau invoice pelatih dan staf, menerbitkan slip gaji, mengelola periode pengajuan, dan kasbon. Invoice staf memakai tabel yang sama (`coach_invoices`, `coach_id` = id staf). Alur ujung-ke-ujung: `docs/03-alur/03-absensi-izin-honor.md` bab 6–7. Sesi covering hanya muncul di invoice **pengganti**.

### A. Daftar invoice dan slip

Alur: `pending` → setujui atau tolak → buat slip (draf) → sunting potongan (pajak, kasbon, lain) → terbitkan.

**Yang dapat dilakukan:**

- menyetujui, menolak, atau membatalkan persetujuan invoice;
- membuat slip dari invoice yang disetujui, atau manual tanpa invoice (pelatih atau staf);
- untuk staf manual: Owner dapat memakai jumlah hari `present` di `staff_attendances` sebagai acuan;
- menyunting draf: kotor, potongan, catatan;
- menerbitkan: `payslips.status = published`; invoice terkait menjadi `paid`; cicilan kasbon periode itu ditutup;
- mencetak; menghapus slip (ikut menghapus turunan).

### B. Periods (`invoice_periods`)

**Yang dapat dilakukan:** membuka periode (satu pusat atau semua pusat), mengubah label/tanggal/cakupan, menutup atau membuka lagi. Periode tertutup = pelatih dan staf tidak dapat mengajukan invoice baru.

### C. Loans (`coach_loans`)

Sub-tab, bukan menu bilah sisi. Kasbon pelatih **dan** staf.

**Yang dapat dilakukan:** membuat kasbon (pokok, tenor, cicilan otomatis, alasan), menyaring pusat/peran/status, mencatat cicilan, menghapusbukukan sisa, membatalkan jika belum ada pembayaran. Status: `active | paid_off | written_off | cancelled`.

Kasbon `active` menjadi opsi potongan di draf slip; setelah diterbitkan, pelatih/staf melihatnya di slip (bukan tab kasbon tersendiri).

**Dampak ke peran lain:**

- **Coach:** tab Invoice hanya jika periode terbuka (pusat ini atau global); tab Payslip hanya `published`; beranda menampilkan spanduk tenggat
- **Staff:** tab Invoice (periode terbuka); tab Payslip hanya `published` plus `staff_salaries`
- Bell Owner; **Financial** mencatat pengeluaran setelah `paid` atau `published`

**Jangan:** Admin meninjau invoice honor. Kasbon tidak dikembalikan menjadi menu sendiri.

---

## 14. Financial (`financial`)

**Apa:** Buku keuangan lintas pusat. Lima sub-tab. Bukan tempat generate tagihan siswa (itu Admin **Payments**) dan bukan tempat terbit slip (itu **Payslips**).

**Yang dapat dilakukan:**

- **Overview** — ringkasan pemasukan dan pengeluaran
- **Income** — tagihan siswa (`bills`) plus transaksi manual pemasukan. Saringan status (`unpaid | paid | partial | school_covered | free`), jenis, metode, tanggal, pusat
- **Expenses** — honor pelatih, gaji staf, reimburse staf, transaksi manual pengeluaran. Menyetujui, menolak, atau menandai dibayar pada `staff_reimbursements`
- **Payroll** — daftar siap ditransfer versus sudah dibayar; input `staff_salaries` per periode
- **Money flow** — rekap bulanan pemasukan, pengeluaran, bersih
- transaksi manual dan kategori (sama dengan Master Data)

Saringan tanggal (FB-11): default bulan berjalan; pengguna dapat ganti ke bulan lalu, rentang bebas, atau beberapa bulan. Rantai wajib utuh: `saringan tanggal → kueri → daftar → hitungan total → ekspor Excel`. Excel hanya berisi data dalam rentang yang sedang aktif. Beberapa lembar diperbolehkan jika memisahkan pemasukan, pengeluaran, dan rekap. Dilarang: data di luar rentang ikut masuk, data dalam rentang hilang, baris ganda, total beda antara panel dan berkas.

**Dampak ke peran lain:**

- **Admin:** **Payments** (jika sakelar pusat hidup) untuk tagihan siswa satu pusat. **Tidak** ada menu Financial
- **Manager Center:** Payments dan Financial selalu ada, satu pusat, lebih kurus (tidak menyetujui reimburse, tidak menandai invoice lunas)
- **Student:** tab **Bills** menampilkan rekening; konfirmasi lewat WhatsApp. Admin yang memverifikasi lunas (dapat mengunggah bukti dari sisi Admin). Tidak ada unggah bukti di panel Student
- **Staff:** mengajukan reimburse; gaji tampil di tab Payslip staf
- **Coach:** honor lewat invoice, bukan input di sini

**Jangan:** menyatukan `bills` ke satu tabel dengan honor. Jangan merapikan template Excel sebelum kueri saringan benar. Jangan studenti Admin biasa akses Financial (FB-12).

---

## 15. Landing Page (`landing`)

**Apa:** Pengelola konten halaman publik `/`. Sembilan tab, lalu `POST /api/owner/revalidate`. Tidak ada tab Hero tersendiri (bagian hero diatur di kode halaman publik).

| Tab CMS | Isi |
|---|---|
| Programs | program les |
| Coaches | sorotan pelatih (bukan daftar pelatih operasional) |
| Video | tautan YouTube |
| Why Next | poin keunggulan |
| Testimonials | testimoni dan foto |
| Partners | logo mitra |
| Branches | pajangan pusat di landing |
| FAQ | tanya jawab |
| Footer | slogan, alamat, WhatsApp, surel, media sosial, hak cipta, pesan WhatsApp mengambang |

**Dampak ke peran lain:** hanya halaman publik. Tidak masuk panel internal.

---

## 16. System Storage (`storage`)

**Apa:** Pemantauan dan cadangan berkas di penyimpanan (ember publik dan privat).

**Yang dapat dilakukan:** statistik (`/api/storage/stats`), daftar cadangan per kategori, unduh, hapus.

Hapus berkas bersifat merusak dan harus disengaja (FB-14). Foto absensi dikompres **sebelum** masuk penyimpanan, bukan disimpan utuh.

**Dampak ke peran lain:** antarmuka hanya Owner. Berkas yang dihapus dapat merusak avatar, bukti bayar Admin, sertifikat, tanda tangan, atau foto kelas di peran lain.

---

## 17. Activity Log (`activity`)

**Apa:** Riwayat ubahan (`activity_logs`) lintas pusat.

**Yang dapat dilakukan:** menyaring pusat, entitas, aksi, peran, tanggal, label; halaman; angka hari ini dan tujuh hari; membuka rincian.

**Dampak ke peran lain:** antarmuka hanya Owner. Entri ditulis dari aksi Owner dan peran lain yang memanggil `logActivity`.

---

## Matriks silang Owner → peran lain

| Fitur Owner | Admin / Manager Center | Coach | Staff | Student | School | Publik |
|---|---|---|---|---|---|---|
| Dashboard | — | Invoice `pending` | Invoice `pending` | — | — | — |
| Centers | Settings; sakelar Payments (Admin). MC selalu Payments+Financial | GPS clock-in | — | WA + rekening di Bills | — | Pajangan pusat |
| Master Data | Kategori Financial MC; tanda tangan Head | Tanda tangan Head di PDF | — | Tanda tangan Head di PDF | Tanda tangan Head di PDF | — |
| Accounts | Akun Admin/MC; **bukan** create privat | Masuk + rekening | Masuk + rekening | Masuk + QR (reguler/afiliasi) | Akun school | — |
| Schools | Logo dan tanda tangan di PDF | Sama | — | Sama | Sama | — |
| Report Levels | PDF memakai rubrik | Formulir rapor | — | PDF | PDF | — |
| Classes | Kelas pusat sendiri; **paket sesi hanya di Admin** | Ampu → absensi/rapor/invoice | — | Jadwal/absensi/tagihan | Rapor kelas | — |
| Private Students | UI sama, satu pusat | Kelas privat + GPS kelas | — | Sesi/jadwal privat | — | — |
| Coach Rates | — | Hitung invoice | — | — | — | — |
| Competitions | UI sama, satu pusat | Pendamping | — | Riwayat di rapor | — | — |
| Leave Requests | Keputusan Owner = keputusan Admin; satu pengajuan satu penutup | Ajukan izin/sakit | Ajukan izin/sakit tanggal nanti | Ajukan izin/sakit | — | — |
| Attendance | Hub pusat sendiri; foto | Clock-in + QR | Clock-in + swafoto | Dipindai pelatih | Rekap afiliasi | — |
| Payslips (+ Loans) | — | Ajukan invoice; lihat slip terbit | Ajukan invoice; lihat slip terbit + `staff_salaries` | — | — | — |
| Financial | Admin: Payments. MC: Payments+Financial kurus | Honor via invoice | Reimburse + gaji | Tagihan + WA, bukan unggah bukti | — | — |
| Landing | — | — | — | — | — | Halaman `/` |
| Storage | Berkas bersama | Sama | Sama | Sama | Sama | Berkas landing |
| Activity Log | Aksi tercatat | Aksi tercatat | Aksi tercatat | — | — | — |

---

## Alur silang (mengikuti rantai create)

**1. Pusat baru sampai Admin bisa bekerja.** Owner membuat **Centers** (pin, WA, rekening, sakelar Payments) → **Accounts** membuat Admin/MC/pelatih/staf → pratinjau **Open Admin Panel** jika perlu.

**2. Sekolah mitra.** **Accounts** atau Admin **School Panel** membuat akun `school` → Owner **Schools** unggah logo dan tiga slot tanda tangan → Admin mendaftarkan siswa afiliasi plus jenjang wajib.

**3. Les privat.** **Private Students** (bukan Accounts, bukan Classes) menyimpan siswa + paket + jadwal + pelatih + pin → pelatih clock-in memakai pin kelas → sisa sesi di Student. Tidak kena generate tagihan bulanan.

**4. Honor pelatih.** **Classes** plus **Coach Rates** → pelatih (atau pengganti covering) clock-in Present/Late → Owner membuka periode di **Payslips → Periods** → pelatih mengajukan Invoice sesi miliknya → Owner setujui, draf (pajak/kasbon dari sub-tab Loans), terbitkan. Pelatih melihat slip `published`. **Financial** mencatat pengeluaran. Sesi yang didelegasikan tidak masuk invoice pelatih asli. Rincian: `docs/03-alur/03-absensi-izin-honor.md`.

**5. Rekening dan peta pusat.** Owner mengisi rekening dan pin di **Centers**. Student melihat rekening di **Bills** dan mengonfirmasi lewat WhatsApp. Pelatih clock-in membandingkan GPS dengan pin pusat (kelas privat: pin kelas).

**6. Tanda tangan rapor.** Owner mengatur Head of NEXT di **Master Data** dan sakelar di **Schools**. PDF di School, Admin, Coach, dan Student mengikuti `show_coach_sig` / `show_head_sig` / `show_school_sig`.

---

## Selisih vs kode

Konsep di atas adalah yang dikunci. Perilaku sekarang yang belum mengikutinya:

| Sekarang di kode | Konsep terkunci |
|---|---|
| Urutan bilah: Dashboard, Master Data, Centers, Schools, Accounts, Private, Classes, Competitions, Report Levels, Rates, Payslips, Loan List, Financial, Landing, Storage, Log | Urutan tabel susunan menu di atas |
| Tidak ada menu Attendance; absensi hanya di rincian kelas | Menu **Attendance** setelah Leave Requests |
| Tidak ada menu Leave Requests di Owner; hanya Admin per pusat yang bisa menyetujui | Menu **Leave Requests** baru, lintas pusat, setuju/tolak sama seperti Admin. Satu pengajuan cuma bisa ditutup sekali, siapa pun yang lebih dulu |
| Loan List menu sendiri | Sub-tab **Payslips** |
| Kotak pencarian bilah atas = placeholder | Dihapus |
| Accounts/formulir siswa masih bisa `private` | Privat hanya dari **Private Students** |
| Financial belum menjamin Excel = saringan rentang | Rantai FB-11 wajib utuh |
| Honor sesi covering tidak diatur | Klaim hanya pengganti yang Present/Late |
