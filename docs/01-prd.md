# Dokumen Persyaratan Produk (PRD)

**Produk:** Next Swimming School  
**Kode dokumen:** PRD-NSS-001  
**Versi:** 1.2  
**Status:** Acuan kerja  
**Tanggal:** 16 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI  
**Pembaca:** manusia (produk, desain, rekayasa, QA) dan agen AI  

---

## 0. Cara memakai dokumen ini

Dokumen ini adalah **sumber kebenaran niat produk**. Agen mulai dari `docs/README.md`. Alur lintas peran: `docs/03-alur/`. Menu per layar: `docs/04-panel/`. Aturan visual: `docs/05-desain/`.

### 0.1 Untuk manusia

1. Baca **Ringkasan eksekutif**, **glosarium**, lalu **aturan yang tidak boleh tertukar**.
2. Pakai persona dan cerita pengguna sebelum menambah menu.
3. Nilai yang bertanda **TBD** belum ditetapkan pemilik produk. Jangan mengisi sendiri.

### 0.2 Untuk agen AI

1. Mulai dari `docs/README.md`. Jangan mengarang menu, peran, status, alur, KPI, atau stack yang tidak tertulis di sini, di `docs/03-alur/`, atau di `docs/04-panel/`.
2. **Tiga lapis bahasa — jangan ditukar.** (1) Dokumen di `docs/` berbahasa Indonesia PUEBI. (2) Semua string antarmuka **ditulis dalam bahasa Inggris** (bahasa sumber). (3) Tampilan Indonesia di perangkat pengguna lewat **injeksi Google Translate**, bukan berkas kamus `id`. Jangan membuat `locales/id`, jangan mengeraskan teks Indonesia di JSX, jangan memakai rute `/id/...`. Rincian: bab 4.6.
3. Pengenal kode ditulis dalam `backtick`. Jangan mengubah nama tabel atau status tanpa migrasi skema.
4. Jika PRD bertentangan dengan kode: **kode menang untuk perilaku saat ini**; **PRD menang untuk niat**. Catat selisihnya.
5. Jangan memakai dokumen uji lama sebagai sumber menu Owner **Database Manager**. Fitur itu sudah dihapus.
6. Navigasi panel memakai **tab di dalam halaman** (`useState`), bukan rute Next.js per menu.
7. Produk **tidak** memiliki fitur kecerdasan buatan pada versi ini. Jangan menambah model, prompt, atau API AI.
8. Bahasa produk untuk siswa adalah **Student**. Peran di database, rute, dan tabel tetap `member` / `/member` / `members`. Jangan menulis “Member” di prosa.

### 0.3 Berkas terkait

| Berkas | Isi |
|---|---|
| `docs/README.md` | **Mulai di sini.** Urutan baca, glosarium |
| `docs/02-umpan-balik.md` | Kesalahan yang tidak boleh diulang |
| `docs/03-alur/` | Mesin lintas peran (jaringan, siswa, absensi/izin/honor, uang, rapor) |
| `docs/04-panel/` | Menu dan wewenang per layar |
| `docs/05-desain/` | Token dan aturan visual |

Rincian operasional terkunci di `docs/03-alur/`. Enam alur uji KPI-01 tetap acuan penerimaan. Addendum disarankan agar US-05 mencatat jadwal pengganti otomatis dan honor ke pelatih yang mengajar, serta US-09 mencatat izin staf tanggal nanti.

### 0.4 Hal yang belum ditetapkan pemilik produk

Nilai berikut **tidak** boleh diasumsikan agen atau pengembang.

| Kode | Pertanyaan | Status |
|---|---|---|
| TBD-01 | Target bisnis kuantitatif (jumlah pusat, siswa, pelatih) | Belum ada |
| TBD-02 | Anggaran infrastruktur dan tenggat rilis formal | Belum ada |
| TBD-03 | Penyedia auth, basis data, dan penyimpanan berkas di produksi (kode memakai Next.js + API sendiri; nama vendor produksi belum dicatat di PRD) | Belum dikunci di dokumen ini |
| TBD-04 | Kebijakan retensi data dan dasar hukum privasi yang dipakai organisasi | Belum ada |
| TBD-05 | Ambang waktu respons API di produksi (p50/p95) | Belum diukur |
| TBD-06 | Apakah akan ada gerbang pembayaran daring pada versi mendatang | Ditolak untuk versi ini; dibuka lagi hanya lewat keputusan Owner |

---

## 1. Ringkasan eksekutif

### 1.1 Pernyataan masalah

Sekolah renang NEXT mengelola beberapa pusat, pelatih lintas pusat, staf, tiga tipe siswa, dan sekolah mitra. Tanpa satu sistem dengan wewenang tegas, data kelas, absensi, iuran, honor, dan rapor tercerai sehingga tagihan ganda, honor salah hitung, dan rapor tidak dapat diunduh sekolah mitra.

### 1.2 Usulan solusi

Membangun aplikasi operasional bermerek NEXT dengan tujuh peran, data terikat pusat, absensi yang dapat diaudit, iuran yang diverifikasi Admin di luar gerbang pembayaran, honor pelatih berbasis sesi hadir, gaji staf berbasis nominal, serta rapor berperiode yang dapat diunduh sebagai PDF.

### 1.3 Kriteria keberhasilan

Keberhasilan diukur dari angka dan pemeriksaan yang dapat diulang, bukan dari kesan “mudah” atau “cepat”. Target bisnis jumlah pengguna (TBD-01) belum ditetapkan; KPI di bawah ini adalah **ambang operasional wajib** yang sudah tertanam di produk.

| Kode | KPI | Ambang | Cara ukur |
|---|---|---|---|
| KPI-01 | Enam alur kritis lulus uji penerimaan tanpa langkah yang dilewati | 6/6 alur pada setiap rilis | Skrip uji atau daftar periksa bab 2.3: daftar publik, hadir di kolam, izin pelatih, honor pelatih, rapor, sekolah mitra |
| KPI-02 | Isolasi data per pusat | 0 rekaman `branch_id` lain yang terbaca peran `admin`, `manager_center`, `staff`, `member`, `school` | Uji dengan dua pusat; akun A tidak melihat siswa, tagihan, atau kelas pusat B |
| KPI-03 | Generate tagihan bulanan tanpa duplikat dan tanpa salah sasaran | 0 baris ganda untuk pasangan siswa × kelas × periode; 0 baris `private` dari generate bulanan | Hitung `bills` setelah satu kali generate pada data uji |
| KPI-04 | Periode rapor unik per pusat | Tepat 0 atau 1 baris `rapor_periods.is_open = true` per `branch_id` | Buka periode kedua; periode pertama harus tertutup |
| KPI-05 | Aturan waktu clock-in pelatih | Jendela = 3 jam sebelum `time_start` sampai `time_end`; `present` jika selisih ke `time_start` ≤ 15 menit; selain itu `late` jika masih dalam jendela | Uji tiga cap waktu: T−3 jam 1 menit (tolak), T+15 menit (present), T+16 menit (late) |

Ambang latensi API (contoh 200 ms) **tidak** ditulis sebagai syarat karena belum diukur (TBD-05).

---

## 2. Pengalaman pengguna dan fungsi

### 2.1 Persona

| ID | Persona | Pekerjaan | Tujuan utama | Batas yang disengaja |
|---|---|---|---|---|
| P-OWN | Owner NEXT | Pemilik jaringan pusat | Melihat semua pusat, tarif, slip, kasbon, keuangan, CMS landing | Tidak mengisi absensi harian di kolam |
| P-ADM | Admin pusat | Operasional satu kolam | Kelas, siswa, izin, persetujuan daftar, tagihan, periode rapor | Tidak membuat Owner/Admin; tidak terbitkan slip |
| P-MC | Manager Center | Manajer satu pusat | Sama dengan Admin plus **Payments** dan **Financial** selalu tampil | Bukan Owner; tidak slip, kasbon, landing, penyimpanan sistem |
| P-COA | Pelatih | Mengajar satu atau banyak pusat | Clock-in, pindai QR, rapor, klaim honor | Tidak membuat kelas, tarif, tagihan siswa, atau slip |
| P-STF | Staf pusat | Operasional nonpengajar | Clock-in/out harian, honor nominal, reimburse | Tidak ada kelas, QR siswa, rapor, atau GPS |
| P-STU-R | Siswa reguler | Les kelas | Jadwal, hadir, tagihan, izin, rapor | Tidak menandai hadir sendiri; tidak unggah bukti bayar |
| P-STU-P | Siswa privat | Les 1:1 | Sisa sesi, jadwal privat, izin, rapor | Tidak kena generate tagihan bulanan |
| P-STU-S | Siswa afiliasi | Siswa sekolah mitra | Jadwal, hadir, rapor | Tab **Bills** disembunyikan |
| P-SCH | PIC sekolah mitra | Administrasi sekolah | Unduh rapor dan ekspor absensi siswa afiliasi | Tidak mengubah data siswa atau menagih iuran |
| P-PUB | Calon siswa / wali | Pengunjung situs | Membaca landing dan mendaftar | Akun aktif hanya setelah Admin menyetujui |

Owner tidak dibuat dari formulir tambah akun biasa. Masuk pertama memanggil `POST /api/owner/init-profile`.

### 2.2 Cerita pengguna dan kriteria penerimaan

Format: **sebagai** peran, **saya ingin** tindakan, **agar** manfaat. Kriteria penerimaan bersifat lulus/gagal.

#### US-01 — Daftar publik menjadi siswa

**Sebagai** calon siswa atau wali, **saya ingin** mengisi `/register`, **agar** Admin pusat dapat meninjau data sebelum akun aktif.

Kriteria penerimaan:

- [ ] Formulir tersimpan dengan status tertunda di `registrations`.
- [ ] Calon tidak dapat masuk panel siswa sebelum disetujui.
- [ ] Admin dapat menyunting, menyetujui, menolak, atau menghapus.
- [ ] Persetujuan membuat akun `member`; penolakan tidak membuat akun.
- [ ] Lencana **Approvals** = jumlah pendaftaran tertunda + sertifikat pelatih tertunda; izin orang tidak masuk lencana.

#### US-02 — Gerbang foto siswa

**Sebagai** siswa baru, **saya ingin** wajib unggah foto jika profil belum lengkap dan belum ada avatar, **agar** daftar siswa dan PDF rapor punya identitas visual.

Kriteria penerimaan:

- [ ] Jika `is_profile_complete = false` **dan** `avatar_url` kosong, panel diganti gerbang foto.
- [ ] Cukup salah satu (avatar atau profil lengkap) untuk membuka panel.
- [ ] Avatar tampil di Admin, daftar siswa pelatih, dan PDF rapor.

#### US-03 — Clock-in pelatih

**Sebagai** pelatih, **saya ingin** clock-in pada kelas hari ini, **agar** kehadiran saya tercatat untuk honor.

Kriteria penerimaan:

- [ ] Tombol hanya hidup dari 3 jam sebelum `time_start` sampai `time_end`.
- [ ] `present` jika cap waktu ≤ 15 menit setelah `time_start`; selain itu `late`.
- [ ] Ditolak jika libur kelas, izin disetujui untuk kelas itu, duplikat kelas+tanggal, profil belum lengkap, atau akun ditangguhkan.
- [ ] Jarak GPS disimpan di `distance_meters` dan diwarnai (≤500 m / ≤2 km / lebih), tetapi jarak jauh **tidak** menolak.
- [ ] Swafoto opsional; gagal unggah tetap menyimpan baris absensi tanpa foto.
- [ ] Kelas privat atau lokasi eksternal memakai pin kelas; tanpa pin = jarak tidak dihitung.

#### US-04 — Pindai kehadiran siswa

**Sebagai** pelatih yang sudah clock-in, **saya ingin** memindai QR siswa, **agar** kehadiran siswa tercatat tanpa siswa menandai sendiri.

Kriteria penerimaan:

- [ ] Panel siswa tidak berisi pemindai.
- [ ] Siswa ditangguhkan ditolak.
- [ ] Reguler: `hadir` jika ≤ 1 menit setelah `time_start`, selain itu `telat`.
- [ ] Privat: `consume_private_session` sekali per hari; duplikat ditolak; `remaining_sessions` berkurang 1.
- [ ] Absensi manual diizinkan untuk tanggal jadwal hingga 56 hari ke belakang.

#### US-05 — Izin pelatih plus pengganti

**Sebagai** pelatih, **saya ingin** mengajukan izin dengan pengganti per kelas, **agar** kelas tetap berjalan.

Kriteria penerimaan:

- [ ] Setiap kelas terdampak wajib punya pengganti: pelatih aktif, bukan diri sendiri, boleh lintas pusat.
- [ ] Status awal `pending`.
- [ ] Admin dapat menyetujui, menolak plus alasan, atau mengganti nama pengganti.
- [ ] Setelah disetujui, kalender Admin menampilkan acara pengganti; beranda pengganti mendapat kartu clock-in.

#### US-06 — Izin siswa

**Sebagai** siswa, **saya ingin** mengajukan tidak hadir, **agar** Admin dapat menyetujui dan absensi terisi otomatis.

Kriteria penerimaan:

- [ ] Tipe sah: `izin`, `sakit`, `ujian`, `lainnya`; minimal satu kelas dan tanggal.
- [ ] Persetujuan menyisipkan `member_attendances` `sakit` atau `izin` pada tanggal yang jatuh di `schedule_days`.
- [ ] Beranda dan jadwal siswa menampilkan lencana pada tanggal itu.
- [ ] Alur ini bukan izin pelatih dan bukan sakit staf.

#### US-07 — Tagihan siswa reguler

**Sebagai** Admin, **saya ingin** membuat tagihan bulan berjalan untuk siswa reguler, **agar** iuran tercatat tanpa gerbang pembayaran dalam aplikasi.

Kriteria penerimaan:

- [ ] Generate hanya `reguler` yang masuk kelas; satu baris per pasangan siswa × kelas × periode; yang sudah ada dilewati.
- [ ] `private` tidak masuk generate bulanan.
- [ ] `school_affiliate` tidak masuk generate bulanan (biasanya `school_covered`).
- [ ] Siswa melihat rekening pusat dan tombol WhatsApp; **tidak** ada unggah bukti di panel siswa.
- [ ] Admin menandai lunas dengan tanggal dan metode `transfer` | `cash` | `qris`; bukti boleh diunggah dari sisi Admin.
- [ ] Menu **Payments** Admin biasa mengikuti sakelar pusat; Manager Center selalu melihat menu itu.

#### US-08 — Honor pelatih menjadi slip

**Sebagai** pelatih, **saya ingin** mengklaim sesi hadir pada periode invoice terbuka, **agar** Owner dapat menerbitkan slip.

Kriteria penerimaan:

- [ ] Formulir tertutup jika tidak ada `invoice_periods.is_open` untuk pusat pelatih atau bersifat global.
- [ ] Hanya sesi `present`/`late` dengan `invoice_id` kosong.
- [ ] Tarif khusus pelatih mengalahkan tarif umum kelas; kelas tanpa tarif tidak dapat diklaim.
- [ ] Kirim menghasilkan `coach_invoices` `pending`, mengunci sesi, dan masuk Bell Owner (bukan Bell Admin).
- [ ] Owner: `pending` → setujui/tolak → draf slip → potongan → `payslips.status = published`; invoice menjadi `paid`; cicilan kasbon periode itu tertutup.
- [ ] Tab Payslip pelatih hanya menampilkan `published`.

#### US-09 — Honor dan reimburse staf

**Sebagai** staf, **saya ingin** mengajukan nominal ketik dan reimburse nota, **agar** Owner membayar di luar hitungan sesi kelas.

Kriteria penerimaan:

- [ ] Jika `is_profile_complete = false`, seluruh panel diganti formulir wajib (telepon, gender, tanggal lahir, bank, nomor rekening, nama pemegang).
- [ ] Invoice staf memakai `coach_invoices` dengan `coach_id` = id staf dan butir `manual_fee`.
- [ ] Pada kode staf, periode terbuka tidak disaring `branch_id`.
- [ ] Reimburse masuk `staff_reimbursements` (nomor `RB-…`); yang memproses adalah Owner **Financial**, bukan Manager Center.
- [ ] Sakit/izin staf dicatat sendiri untuk **hari ini** di `staff_attendances`; bukan **Leave Requests**.

#### US-10 — Rapor semester

**Sebagai** pelatih, **saya ingin** mengisi rubrik pada periode terbuka, **agar** siswa dan sekolah mitra dapat mengunduh PDF.

Kriteria penerimaan:

- [ ] Admin membuka periode; periode terbuka lain di pusat yang sama tertutup.
- [ ] Pelatih mengisi hanya di cabang aktif yang periodenya `is_open`, lalu `locked = true`.
- [ ] PDF mengikuti sakelar `show_coach_sig`, `show_head_sig`, `show_school_sig`.
- [ ] Ulasan bintang siswa hanya saat periode terbuka; identitas pengulas disamarkan di peladen.
- [ ] Sekolah mitra mengunduh PDF/ZIP hanya untuk entri terkunci milik `school_id`-nya.

#### US-11 — Sekolah mitra memantau siswa

**Sebagai** PIC sekolah, **saya ingin** melihat rapor dan absensi siswa afiliasi, **agar** sekolah punya arsip tanpa mengoperasikan kolam.

Kriteria penerimaan:

- [ ] Daftar = `members.school_id` sekolah itu saja.
- [ ] Tidak ada ubahan siswa, kelas, pelatih, izin, atau iuran.
- [ ] Tidak ada tab pengumuman.
- [ ] Ekspor absensi Excel memakai hasil saringan saat ini; batas muat 2.000 baris; nama berkas `Absensi-{nama-sekolah}-{dari}-sd-{sampai}.xlsx`.
- [ ] Jika baris `schools` tidak cocok, tampil layar data tidak ditemukan.

#### US-12 — Owner mengatur jaringan pusat

**Sebagai** Owner, **saya ingin** mengelola pusat, akun, tarif, slip, kasbon, keuangan lintas pusat, CMS, penyimpanan, dan log, **agar** operasional cabang tidak tercerai.

Kriteria penerimaan:

- [ ] Hampir semua akun, kelas, dan invoice terikat `branch_id`.
- [ ] Sakelar **Show Payments menu to Admin** tidak berlaku bagi Manager Center.
- [ ] Pratinjau Admin menyimpan `sessionStorage.ownerPreviewBranch` dan menampilkan tombol kembali.
- [ ] Menghapus pusat menghapus data pusat dan akun masuk terkait.
- [ ] Pencarian bilah atas adalah placeholder, bukan pencarian global.

### 2.3 Enam alur kritis (uji KPI-01)

1. **Daftar publik → les reguler:** `/register` → Approvals → gerbang foto → masuk kelas → generate tagihan → Bills + WhatsApp → Admin menandai lunas → Financial Income.
2. **Hadir di kolam:** profil pelatih lengkap → clock-in dalam jendela → pindai QR → `hadir`/`telat` atau privat −1 sesi.
3. **Izin pelatih:** pengajuan + pengganti per kelas → Admin setuju → kalender pengganti → clock-in pengganti.
4. **Honor pelatih:** tarif terisi → periode invoice terbuka → klaim sesi → Owner setuju → slip `published`.
5. **Rapor:** rubrik Owner → periode Admin → pelatih kunci → PDF di Admin/Siswa/Sekolah.
6. **Sekolah mitra:** akun school + logo/tanda tangan → siswa `school_affiliate` → tab rapor dan absensi; tab Bills siswa tersembunyi.

### 2.4 Matriks wewenang ringkas

| Tindakan | Owner | Admin | Manager Center | Pelatih | Staf | Siswa | Sekolah |
|---|---|---|---|---|---|---|---|
| Semua pusat | Ya | Tidak | Tidak | Jika ditautkan | Tidak | Tidak | Tidak |
| Membuat Admin | Ya | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak |
| Payments / Bills | Financial Income | Jika sakelar hidup | Selalu | Tidak | Tidak | Bills* | Tidak |
| Financial | Semua pusat | Tidak | Satu pusat | Tidak | Tidak | Tidak | Tidak |
| Terbitkan slip | Ya | Tidak | Tidak | Lihat terbit | Lihat gabungan | Tidak | Tidak |
| Buka periode invoice | Ya | Tidak | Tidak | Ajukan jika terbuka | Ajukan jika terbuka | Tidak | Tidak |
| Buka periode rapor | Tidak | Ya | Ya | Isi jika terbuka | Tidak | Unduh | Unduh afiliasi |
| Pindai QR siswa | Tidak | Rekap / manual | Sama | Ya | Tidak | Tidak | Tidak |
| Setujui izin orang | Tidak | Ya | Ya | Ajukan | Catat sendiri hari ini | Ajukan | Tidak |

\*Tab **Bills** disembunyikan untuk `school_affiliate`.

### 2.5 Kunci operasional

| Kondisi | Dampak yang wajib terjadi |
|---|---|
| Pelatih profil belum lengkap atau ditangguhkan | Absen, Invoice, Rapor, clock-in terkunci. Kelas, Payslip, Profile, izin tetap terbuka. |
| Staf profil belum lengkap | Seluruh panel diganti formulir wajib. |
| Siswa ditangguhkan | Spanduk plus hitung mundur; tab tidak dikunci; pindai QR ditolak. |
| Tidak ada periode invoice terbuka | Formulir invoice tertutup; riwayat lama tetap kelihatan. |
| Tidak ada periode rapor terbuka | Pelatih tidak dapat mengisi; unduhan rapor sekolah tidak aktif. |

### 2.6 Persyaratan fungsional (kode)

Prioritas semua butir: **wajib** untuk perilaku yang sudah ada. Rincian layar: `docs/04-panel/`. Alur: `docs/03-alur/`.

#### Akun dan sesi

| Kode | Persyaratan | Cerita |
|---|---|---|
| F-AKN-01 | Peran sah: `owner`, `admin`, `manager_center`, `coach`, `staff`, `member`, `school`. | US-12 |
| F-AKN-02 | Formulir tambah tidak membuat Owner; suntingan peran **dapat** diubah menjadi `owner`. | US-12 |
| F-AKN-03 | Admin tidak dapat membuat Owner atau Admin. | US-12 |
| F-AKN-04 | Membuat Admin atau Manager Center dapat otomatis membuat Staff (surel `namastaff@…`). | US-12 |
| F-AKN-05 | Akun dapat `is_archived`, `suspend_until`, atur ulang kata sandi, atau dihapus sesuai wewenang. | US-12 |
| F-AKN-06 | Pelatih dapat banyak pusat (`coach_branches`). | US-03 |
| F-AKN-07 | Siswa punya nomor dan QR absensi. | US-04 |
| F-AKN-08 | Kotak pencarian bilah atas bukan pencarian global. | US-12 |

#### Pusat, kelas, kehadiran, izin

| Kode | Persyaratan | Cerita |
|---|---|---|
| F-PST-01 | Pusat punya nama, kota, alamat, pin, WhatsApp Admin, rekening, logo, sakelar Payments. | US-12 |
| F-PST-02 | Hampir semua akun, kelas, dan invoice terikat `branch_id`. | KPI-02 |
| F-PST-03 | Hapus pusat menghapus data pusat dan akun masuk terkait. | US-12 |
| F-KLS-01 | Kelas reguler: jadwal (dapat berbeda per hari), kapasitas, harga, foto, lokasi, pelatih, penandatangan rapor. | US-12 |
| F-KLS-02 | `class_packages` hanya di Admin **Class**, bukan Owner **Classes**. | US-07 |
| F-KLS-03 | Les privat hanya di **Private Students**; tidak tampil di Class. | US-04 |
| F-KLS-04 | Satu tanggal libur per kelas; pelatih tidak clock-in pada tanggal itu. | US-03 |
| F-HDR-01 s.d. F-HDR-10 | Sesuai kriteria US-03 dan US-04. | US-03, US-04 |
| F-IZN-01 s.d. F-IZN-05 | Sesuai kriteria US-05, US-06, US-09. | US-05, US-06, US-09 |

#### Tagihan, honor, rapor

| Kode | Persyaratan | Cerita |
|---|---|---|
| F-TAG-01 s.d. F-TAG-07 | Sesuai kriteria US-07. | US-07 |
| F-HNR-01 s.d. F-HNR-12 | Sesuai kriteria US-08 dan US-09. | US-08, US-09 |
| F-RPR-01 | Owner mengelola rubrik: `score_10`, `score_100`, `choice`, `text`, waktu standar, cakupan kelas. | US-10 |
| F-RPR-02 s.d. F-RPR-07 | Sesuai kriteria US-10 dan US-11 plus catatan kompetisi di riwayat rapor. | US-10, US-11 |
| F-KMN-01 | Pengumuman per pusat menyasar `member`, `coach`, `admin`, `school`. | — |
| F-KMN-02 | Panel School tidak punya tab pengumuman. | US-11 |
| F-KMN-03 | CMS landing: program, sorotan pelatih, video, keunggulan, testimoni, mitra, cabang, FAQ, kaki. | US-12 |
| F-KMN-04 | Sorotan pelatih landing bukan daftar pelatih operasional. | US-12 |
| F-KMN-05 | Owner memantau penyimpanan dan `activity_logs`. Hapus berkas bersifat merusak. | US-12 |

### 2.7 Bukan tujuan (sengaja tidak dibangun)

| Item | Alasan |
|---|---|
| Gerbang pembayaran dalam aplikasi dan unggah bukti oleh siswa | Konfirmasi tetap di WhatsApp; Admin yang memverifikasi |
| Pagar geografis yang menolak clock-in | Jarak hanya dicatat dan diwarnai |
| Siswa menandai hadir sendiri | Absensi hanya pelatih (QR atau manual) |
| Satu panel untuk semua peran | Kunci operasional berbeda |
| Sekolah mitra menagih iuran atau mengisi rapor | Peran pantau, bukan operasi kolam |
| Admin meninjau honor pelatih/staf | Urusan Owner |
| Admin atau formulir tambah membuat Owner | Owner diinisialisasi khusus |
| Menu Owner **Database Manager** | Sudah dihapus |
| Tab pengumuman di panel School | Hanya Bell jika ada pemberitahuan |
| Paket sesi reguler di Owner **Classes** | Paket hanya Admin **Class** |
| Fitur kecerdasan buatan (chat, skor otomatis, OCR bukti) | Di luar versi ini |
| Pencarian global di bilah atas | Placeholder saja |

---

## 3. Persyaratan sistem kecerdasan buatan

**Tidak berlaku pada versi ini.** Next Swimming School tidak memanggil model bahasa, model citra, atau API inferensi.

| Area | Keputusan |
|---|---|
| Tool / API AI | Tidak ada |
| Data latih | Tidak ada |
| Strategi evaluasi output model | Tidak ada |
| Risiko halusinasi / prompt injection | Tidak relevan |

Jika suatu saat Owner meminta fitur AI (contoh: ringkasan keuangan atau draft pengumuman), buat addendum PRD terpisah yang memuat: model, data yang boleh dikirim, metrik mutu, dan uji regresi. Jangan menyisipkan AI ke dalam alur absensi, tagihan, atau slip tanpa addendum itu.

---

## 4. Spesifikasi teknis

### 4.1 Ikhtisar arsitektur

Alur data yang mengikat:

1. Pengguna masuk → sesi memuat `profiles.role` dan `branch_id` (kecuali Owner dan pelatih multitaut).
2. Panel merender tab di dalam satu halaman. Bukan rute per menu.
3. Mutasi menulis tabel domain (`bills`, `coach_attendances`, `member_attendances`, `coach_invoices`, `payslips`, `rapor_entries`, dan seterusnya).
4. Sebagian aksi memanggil `logActivity` → `activity_logs` (UI log hanya Owner).
5. Berkas (avatar, tanda tangan, bukti Admin, foto kelas) masuk ember publik atau privat; Owner memantau lewat **System Storage**.

```
Publik (/ , /register)
        │
        ▼
   Sesi + peran
        │
        ├── Owner (/owner)           → semua branch_id
        ├── Admin / MC (/admin)      → satu branch_id
        ├── Pelatih (/coach)         → class_coaches + coach_branches
        ├── Staf (/staff)            → satu branch_id
        ├── Student (/member)        → satu branch_id + tipe
        └── Sekolah (/school)        → schools.profile_id + school_id
```

Sumber visual: `src/app/globals.css` (`@theme inline`, Tailwind v4). Tidak ada `tailwind.config.ts`.

### 4.2 Titik integrasi yang sudah tertulis di kode

| Jenis | Titik | Catatan |
|---|---|---|
| Rute panel | `src/app/owner/`, `src/app/admin/`, `src/app/coach/page.tsx`, `src/app/staff/page.tsx`, `src/app/member/page.tsx`, `src/app/school/page.tsx` | Tab `useState` |
| API akun | `POST /api/admin/users` | Buat pengguna operasional |
| API Owner | `POST /api/owner/init-profile` | Baris profil Owner |
| API CMS | `POST /api/owner/revalidate` | Setelah sunting landing |
| API penyimpanan | `/api/storage/stats` | Statistik ember |
| API rapor pelatih | `/api/rapor/coach-reviews` | Ulasan disamarkan |
| API kelas pelatih | `/api/coach/class-members`, `/api/coach/attendance-detail` | Karena RLS |
| RPC privat | `consume_private_session` | Sekali per hari |
| RPC batal invoice | `cancel_coach_invoice` | Melepas klaim sesi |
| Pratinjau Admin | `sessionStorage.ownerPreviewBranch` | Bukan cookie |
| Bahasa antarmuka | String Inggris di kode; Google Translate untuk ID | Bukan kamus `locales/id`. Bab 4.6 |
| Font | `src/app/layout.tsx`, `src/lib/fonts.ts` | Display / sans / mono |
| Komponen | `src/components/ui/` | `<Btn>`, `<Status>`, `<Card>` |
| WhatsApp | Nomor Admin pusat, tautan `wa.me` | Bukan API WhatsApp Business yang didokumentasikan di sini |
| Peta / GPS | Pin `branches` atau pin kelas; geolokasi peramban pelatih | Bukan pagar geografis |
| Spreadsheet pelatih | URL di `class_coach_spreadsheets` | Bukan integrasi Google API yang didokumentasikan |

Penyedia auth, basis data, dan objek storage produksi: **TBD-03**. Jangan menulis merek yang tidak ada di repositori.

### 4.3 Keamanan dan privasi

| Aturan | Wajib |
|---|---|
| Isolasi pusat | Peran selain Owner (dan pelatih yang ditautkan) tidak membaca `branch_id` lain (KPI-02). |
| Prinsip wewenang terendah | Admin ≠ Manager Center ≠ Owner meskipun URL `/admin` sama. |
| Slip pelatih | Draf tidak tampil; hanya `published`. |
| Bukti bayar | URL bertanda tangan; unggah hanya dari Admin. |
| Ulasan rapor | Identitas pemberi ulasan disamarkan di peladen. |
| Kata sandi siswa | Minimal 6 karakter pada UI ganti sandi siswa. |
| Berkas | Hapus di **System Storage** dapat merusak avatar, bukti, sertifikat, tanda tangan, foto kelas; wajib konfirmasi. |
| Data kesehatan siswa | Catatan kesehatan hanya diubah siswa atau Admin; tidak tampil di panel School sebagai kolom wajib. |
| Rekening | Dipakai di invoice dan instruksi transfer; jangan ditampilkan ke peran yang tidak butuh. |
| QR siswa | Nilai harus cocok saat dipindai; siswa ditangguhkan ditolak. |

Dasar hukum retensi, persetujuan wali, dan kebijakan cookie: **TBD-04**.

### 4.4 Status data yang sah

| Entitas | Nilai sah |
|---|---|
| Invoice honor | `pending`, `approved`, `rejected`, `paid` |
| Slip gaji | draf hingga `published` |
| Kasbon | `active`, `paid_off`, `written_off`, `cancelled` |
| Reimburse staf | `pending`, `approved`, `rejected`, `cancelled`, `paid` |
| Tagihan siswa | `unpaid`, `partial`, `paid`, `school_covered`, `free` |
| Kehadiran pelatih | `present`, `late` (plus `is_manual`) |
| Kehadiran siswa | `hadir`, `telat`, `izin`, `sakit`, `tidak_hadir` |
| Kehadiran staf | `present`, `sakit`, `izin`, `absent` |
| Metode bayar tagihan | `transfer`, `cash`, `qris` |
| Tipe siswa | `reguler`, `private`, `school_affiliate` |

### 4.5 Aturan antarmuka yang mengikat

1. Jangan interpolasi class Tailwind.
2. Jangan hex lepas untuk merek, kecuali tombol WhatsApp `#25D366`.
3. Tombol lewat `<Btn>`; status lewat `<Status>`.
4. Satu aksi primer per pandangan: `ocean-600`.
5. Landing boleh spektakuler; panel tenang.
6. Semantik warna hanya tangga 50 / 500 / 600.
7. Hormati `prefers-reduced-motion`; jangan menimpa cincin fokus gelombang `#16B0E8`.

### 4.6 Bahasa antarmuka (Inggris sumber, Indonesia lewat Google Translate)

**Konteks.** Pengguna lapangan campur Inggris dan Indonesia. Rebuild menulis **satu** bahasa di kode agar agen tidak merawat dua kamus yang mudah drift. Bahasa kedua adalah lapisan tampilan, bukan salinan produk.

| Lapis | Bahasa | Siapa yang menulis | Jangan |
|---|---|---|---|
| Dokumen (`docs/`) | Indonesia PUEBI | Manusia dan agen di berkas konsep | Menulis PRD/alur dalam bahasa Inggris sebagai sumber |
| Kode antarmuka (JSX, placeholder, toast, menu) | Inggris | Agen saat membangun layar | Teks Indonesia keras di komponen |
| Tampilan untuk pengguna yang pilih ID | Indonesia | Google Translate (injeksi di klien) | Berkas `locales/id/*.ts` atau i18n routing |

Aturan yang mengikat agen saat membuat proyek dari ulang:

1. Bahasa sumber halaman = `en`. Widget Google Translate: `pageLanguage: "en"`, `includedLanguages: "en,id"`.
2. Setiap cangkang panel memasang pengalih **EN | ID** yang memicu widget itu (bukan `next-intl` / kamus kustom).
3. String baru cukup bahasa Inggris. Tidak ada kunci `t("admin.nav.pay")` yang wajib punya padanan `id`.
4. Elemen yang **tidak** boleh diterjemahkan memakai `translate="no"` / kelas `notranslate`: nama orang, nama pusat, nomor rekening, kode QR, nilai status mentah (`pending`, `published`), angka uang yang sudah diformat, merek NEXT.
5. Google Translate mengubah DOM. Siapkan perlindungan agar React tidak pecah saat simpul teks dibungkus `<font>` (sama semangat dengan widget yang sudah ada). Jangan anggap itu fitur AI (bab 3 tetap non-AI).
6. Pilihan EN/ID boleh disimpan di `localStorage` (dan `profiles.locale` jika perlu) agar tidak reset setiap muat. Nilai sah: `en` \| `id`.
7. Landing publik mengikuti aturan yang sama: sumber Inggris, opsi injeksi ID.

Ini **bukan** terjemahan dokumen. Agen yang diminta “buat proyek dari ulang” membaca `docs/` dalam bahasa Indonesia, lalu **menghasilkan UI bahasa Inggris**.

---

## 5. Risiko dan peta rilis

### 5.1 Peta bertahap

Versi di bawah menata **prioritas uji dan perbaikan**, bukan janji kalender (TBD-02). Perilaku yang sudah ada di kode tetap wajib jalan pada semua tahap.

| Tahap | Nama | Isi yang dikunci | Selesai jika |
|---|---|---|---|
| MVP | Operasi kolam | US-01 s.d. US-07, US-11 (pantau absensi), isolasi pusat, dwibahasa dasar | KPI-01 alur 1–3 dan 6 (bagian absensi); KPI-02; KPI-03 |
| v1.1 | Honor dan rapor | US-08, US-09, US-10, kasbon sebagai potongan slip | KPI-01 alur 4–5; KPI-04; slip pelatih hanya `published` |
| v1.2 | Jaringan Owner | US-12 penuh: CMS, storage, activity log, pratinjau Admin, tarif extra | Owner dapat audit berkas dan log tanpa menu yang sudah dihapus |
| v2.0 | Perluasan (opsional) | Hanya setelah keputusan tertulis: gerbang bayar, pencarian global, AI, atau API WhatsApp Business | Addendum PRD disetujui; item bab 2.7 tidak berubah diam-diam |

### 5.2 Risiko teknis

| Risiko | Dampak | Mitigasi yang mengikat |
|---|---|---|
| Tertukarnya `bills`, `coach_invoices`, dan `payslips` | Uang siswa masuk honor atau sebaliknya | Glosarium + uji generate tagihan vs klaim sesi |
| Manager Center dianggap Owner | Slip atau kasbon bocor wewenang | Matriks bab 2.4; uji menu Financial MC tidak memuat terbit slip |
| GPS dianggap pagar geografis | Pelatih jauh ditolak, honor hilang | F-HDR: jarak dicatat, tidak menolak |
| Periode rapor dobel | Dua rubrik aktif, PDF kacau | KPI-04 |
| `consume_private_session` dobel | Sisa sesi terpotong dua kali | Tolak duplikat hari yang sama |
| Hapus berkas storage | Avatar, bukti, tanda tangan rusak | Konfirmasi Owner; catat di log |
| RLS pelatih vs daftar siswa | Daftar kosong atau bocor lintas kelas | Pakai `/api/coach/class-members`, bukan kueri langsung yang melanggar RLS |
| Placeholder pencarian dianggap rusak | Tiket “search tidak jalan” | F-AKN-08: bukan pencarian global |
| Ketergantungan WhatsApp di luar aplikasi | Konfirmasi bayar gagal jika nomor pusat kosong | Validasi nomor di Centers/Settings sebelum mengandalkan tombol |
| Latensi atau kuota belum diukur | Syarat “cepat” tidak dapat diuji | TBD-05; jangan menulis ambang ms sebelum ada angka |

### 5.3 Risiko produk

| Risiko | Mitigasi |
|---|---|
| Scope melebar ke pembayaran daring | Tetap di bab 2.7 sampai TBD-06 diputuskan |
| Sekolah mitra meminta ubah data siswa | Arahkan ke Admin; panel School hanya baca |
| Pelatih menuntut klaim tanpa tarif | Kelas tanpa tarif tidak dapat diklaim |
| Staf dan pelatih memakai tabel invoice yang sama | Bedakan lewat `profiles.role` dan jenis butir |

---

## 6. Glosarium

Istilah kolom kiri wajib di dokumen, tiket, dan instruksi agen. Label UI tetap seperti kolom tengah.

| Istilah dokumen | Label UI / kode | Arti |
|---|---|---|
| Pusat | Centers, `branches` | Cabang sekolah renang |
| Tagihan siswa | Payments / Bills, `bills` | Iuran siswa, bukan gaji pelatih |
| Invoice honor | Payslips / Invoice, `coach_invoices` | Klaim pelatih atau staf ke Owner |
| Slip gaji | Payslips, `payslips` | Slip terbit Owner; pelatih hanya `published` |
| Periode invoice | Periods, `invoice_periods` | Jendela pengajuan invoice honor |
| Periode rapor | Report Cards, `rapor_periods` | Jendela isi rapor; satu terbuka per pusat |
| Kasbon | Loan List, `coach_loans` | Pinjaman; potongan di slip |
| Student | Student panel, peran `member`, rute `/member`, tabel `members` | Bahasa produk untuk siswa. Jangan menulis “Member” di prosa. |
| Les privat | Private Students, `class_type=private` | Satu siswa, satu kelas; bukan menu Class |
| Siswa afiliasi | `school_affiliate` | Terikat sekolah mitra |
| Manager Center | `manager_center` | Panel Admin; selalu Payments + Financial |
| Kunci profil | `is_profile_complete` | Staf: panel tertutup. Pelatih: sebagian tab terkunci |
| GPS pelatih | Clock-In | Jarak dicatat; bukan pagar geografis |
| Libur kelas | `class_holidays` | Satu tanggal per kelas; bukan izin orang |
| Izin orang | Leave Requests | Izin pelatih atau siswa |
| Paket sesi kelas | `class_packages` | Hanya Admin **Class** |
| Paket sesi privat | `members.remaining_sessions` | Bukan `class_packages` |

---

## 7. Aturan yang tidak boleh tertukar

1. Tagihan siswa ≠ invoice honor ≠ slip gaji.
2. Periode rapor ≠ periode invoice.
3. Admin ≠ Manager Center ≠ Owner.
4. Kelas reguler ≠ kelas privat.
5. Izin pelatih ≠ izin siswa ≠ sakit staf ≠ libur kelas.
6. Clock-in pelatih ≠ clock-in staf.
7. Yang meninjau invoice honor hanya Owner.
8. Siswa tidak memindai QR sendiri.
9. Siswa tidak mengunggah bukti bayar.
10. Slip pelatih hanya `published`.
11. Paling banyak satu periode rapor terbuka per pusat.
12. Bell Owner (invoice honor) ≠ Bell Admin (operasi pusat).

---

## 8. Definisi selesai

Fitur selesai hanya jika semua butir ini benar.

1. Cerita terkait di bab 2.2 lulus seluruh kotak kriteria penerimaan.
2. KPI-01 sampai KPI-05 tidak mundur.
3. Dampak ke peran lain sesuai `docs/03-alur/` dan `docs/04-panel/`.
4. Tidak menukar istilah glosarium.
5. Antarmuka mematuhi bab 4.5.
6. Status data hanya memakai nilai bab 4.4.
7. Item bab 2.7 tidak ikut terkirim.
8. Tidak ada pemanggilan model AI.

---

## 9. Riwayat dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 16 September 2026 | Terbit pertama: glosarium, wewenang, persyaratan fungsional. |
| 1.1 | 16 September 2026 | Disusun ulang mengikuti kerangka PRD: masalah–solusi–KPI terukur, persona, cerita pengguna plus kriteria penerimaan, bukan-tujuan, pernyataan non-AI, arsitektur, integrasi, keamanan, risiko, dan peta rilis. Nilai yang belum diukur ditandai TBD. |

---

*Akhir dokumen. Mulai baca: `docs/README.md`. Alur: `docs/03-alur/`. Layar: `docs/04-panel/`. Niat, batas, KPI, dan istilah mengikat: dokumen ini.*
