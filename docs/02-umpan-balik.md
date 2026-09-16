# Umpan balik klien yang tidak boleh diulang

**Produk:** Next Swimming School  
**Kode dokumen:** FB-NSS-001  
**Versi:** 1.0  
**Status:** Acuan rebuild  
**Tanggal dicatat:** 16 September 2026  
**Sumber:** audit klien atas iterasi sebelumnya  
**Bahasa:** Bahasa Indonesia sesuai PUEBI  
**Pembaca:** manusia (produk, desain, rekayasa, QA) dan agen AI

---

## 0. Cara memakai dokumen ini

Dokumen ini menahan **kesalahan yang sudah pernah terjadi** agar rebuild tidak mengulanginya. Bukan backlog fitur baru dan bukan pengganti PRD.

1. Baca **prinsip audit** di bab 1 sebelum mengubah alur, skema, atau ekspor.
2. Tiap butir bab 2 adalah keputusan tetap. Jika kode baru bertentangan dengan butir ini, kode yang salah.
3. Mulai dari `docs/README.md`. Niat di `docs/01-prd.md`. Alur di `docs/03-alur/`. Menu layar di `docs/04-panel/`.
4. Jangan menambal tampilan saja. Klien secara eksplisit menolak perbaikan kosmetik tanpa audit alur → basis data → logika → tampilan → integrasi antarperan → ekspor.

### 0.1 Status butir

| Status | Arti untuk rebuild |
|---|---|
| **Wajib tertanam** | Harus benar sejak rancangan, bukan patch belakangan |
| **Sudah di PRD, rawan diulang** | Keputusan produk sudah ada; iterasi lama tetap gagal menaatinya |
| **Koreksi istilah klien** | Kalimat klien rancu; yang berlaku adalah kolom “Keputusan tetap” |

### 0.2 Istilah klien → istilah dokumen

Klien menulis dalam campuran Inggris dan “Member”. Di dokumen proyek, pakai kolom kanan.

| Tulisan klien | Istilah dokumen / label UI / kode |
|---|---|
| Member / Member Private / Member Panel | Student / siswa privat / panel Student (`member`) |
| Session Left | Sisa sesi (`members.remaining_sessions`) |
| Price per session (privat) | **Dilarang.** Paket = harga paket + jumlah sesi |
| Supported / Izin | `izin` |
| Present / Late / Absent / Sick | `hadir` / `telat` / `tidak_hadir` / `sakit` |
| Tempat renang / lokasi | Lokasi kelas atau pin kelas privat |
| Kelas (siswa sekolah) | Jenjang sekolah (`school_grade`), **bukan** nama kelas les |
| Nama Kelas | Nama kelas les (`classes.name`) |
| WA Laporkan Bug | Fitur yang **dihapus** dari panel Student |
| Manager Center | Peran `manager_center`; panel `/admin` |

---

## 1. Prinsip audit yang diminta klien

Prinsip ini berlaku untuk **setiap** fitur di rebuild, bukan hanya 14 butir di bawah.

1. **Audit utuh, bukan tambal sulam.** Urutan wajib: alur awal → basis data → logika → tampilan → integrasi antarperan → keluaran atau ekspor.
2. **Satu sumber kebenaran.** Angka di panel Student, Admin, Owner, Coach, School, dan berkas Excel harus berasal dari kolom atau hitungan yang sama. Meluruskan angka di antarmuka tanpa memperbaiki sumber data = mengulang bug.
3. **Ekspor belakangan.** Jangan merapikan Excel atau PDF sebelum logika induknya benar. Berkas yang rapi tetapi salah angka lebih berbahaya daripada tampilan yang belum jadi.
4. **Perubahan ke depan, arsip ke belakang.** Mengubah jadwal, lokasi, atau pelatih tidak boleh merusak absensi lama, dan absensi baru tidak boleh memakai konfigurasi yang sudah tidak berlaku.
5. **Wewenang di peladen.** Menyembunyikan menu di antarmuka tidak cukup. Pengguna tanpa izin tidak boleh membaca atau menulis lewat URL atau API langsung.
6. **Foto mahal.** Swafoto dikompres sebelum masuk penyimpanan. Jangan mengulang penyimpanan berkas utuh yang menaikkan biaya tanpa perlu.

---

## 2. Butir umpan balik

### FB-01 — Alur siswa privat dibangun utuh

**Status:** Wajib tertanam  
**Peran:** Admin, Owner, pelatih, siswa privat

**Konteks.** Les privat bukan kelas reguler yang dikecilkan. Satu siswa, satu kelas `class_type=private`, jadwal dan lokasi bisa berganti, pelatih bisa diganti, sesi dihitung dari paket. Iterasi lama merancukan pembuatan akun, penyimpanan jadwal, sisa sesi, dan dampak ke absensi. Perbaikan UI di **Private Students** tidak menyelesaikan akarnya.

**Keputusan tetap.**

- Siswa privat hanya masuk lewat **Private Students** (Admin satu pusat, Owner semua pusat). Jangan menaruh mereka sebagai baris biasa di **Class** atau mengandalkan opsi `private` di formulir **Student** sebagai jalur utama.
- Satu kali “tambah siswa privat” harus menyimpan bersama: data siswa, harga paket, jumlah sesi awal, sisa sesi, jadwal, pelatih, lokasi atau pin.
- Setiap perubahan jadwal, lokasi, atau pelatih punya jejak ke absensi (lihat FB-03) tanpa menimpa baris absensi yang sudah ada.
- Panel Student, pelatih, Admin, dan Owner membaca data yang sama. Jangan ada salinan jadwal yang hanya hidup di satu panel.

**Jangan diulang:** menambal kartu sisa sesi atau formulir privat tanpa menelusuri penyimpanan jadwal, pelatih, lokasi, dan pengurang sesi.

---

### FB-02 — Privat memakai paket, bukan harga per sesi

**Status:** Sudah di PRD, rawan diulang  
**Peran:** Admin, Owner, siswa privat

**Konteks.** Klien menolak konsep harga per sesi untuk privat. Generate tagihan bulanan juga **tidak** boleh mengenai `private` (KPI-03, US-07). Sisa sesi siswa privat tinggal di `members.remaining_sessions`, bukan di `class_packages` (paket `class_packages` hanya untuk kelas reguler di Admin **Class**).

**Keputusan tetap.**

- Input wajib: **harga paket + jumlah sesi**, plus data siswa, jadwal, pelatih, lokasi.
- Di mana pun formulir “tambah siswa privat” muncul, konsepnya sama. Jangan ada jalur tersembunyi yang masih meminta tarif per pertemuan.
- Empat angka yang harus konsisten: sesi awal paket, sesi terpakai, sisa sesi, tampilan sisa di panel Student.
- Pengurang sisa sesi hanya absensi privat yang sah (lihat US-04: sekali per hari, duplikat ditolak).
- Panel Student tidak boleh menghitung sisa dari `bills.sessions_used` atau dari jumlah baris di antarmuka.

**Jangan diulang:** harga per sesi untuk privat; sumber sisa sesi yang berbeda antara basis data dan kartu Student.

---

### FB-03 — Jadwal, lokasi, dan pelatih privat mudah diubah

**Status:** Wajib tertanam  
**Peran:** Admin, Owner, pelatih, siswa privat

**Konteks.** Privat jauh lebih lentur daripada kelas reguler. Admin harus mengganti hari, tanggal, jam, lokasi kolam, dan pelatih tanpa merusak arsip. Bug khas iterasi lama: lokasi diganti ke B, tetapi validasi jarak clock-in pelatih masih memakai pin lokasi A; atau absensi lama ikut tertimpa.

**Keputusan tetap.**

Rantai ketergantungan yang wajib utuh:

`Siswa privat → jadwal → lokasi/pin → pelatih → absensi → basis data`

- Absensi **baru** (setelah perubahan) memakai jadwal, lokasi, dan pelatih yang berlaku saat itu.
- Absensi **lama** tetap menyimpan konfigurasi saat kejadian (lokasi, pelatih, jam), jangan ditulis ulang.
- Jika lokasi privat berubah dari A ke B, acuan jarak clock-in pelatih untuk sesi berikutnya adalah B. Tanpa pin, jarak tidak dihitung (US-03).
- Pergantian pelatih tidak menghapus clock-in pelatih sebelumnya dan tidak memindahkan honor sesi yang sudah dikunci invoice.

**Jangan diulang:** mengubah satu kolom di formulir privat tanpa menelusuri dampak ke GPS, daftar kelas pelatih, dan pengurang sesi.

---

### FB-04 — Sisa sesi di panel Student harus benar di sumber data

**Status:** Wajib tertanam  
**Peran:** siswa privat, Admin, Owner

**Konteks.** “Session Left” di panel Student pernah menampilkan angka salah. Klien menolak perbaikan yang hanya mengganti angka di frontend.

**Keputusan tetap.**

- Sumber tampilan sisa sesi = `members.remaining_sessions` setelah pengurang yang sama dengan absensi privat yang berhasil.
- Sesi terpakai = sesi awal paket minus sisa, atau hitungan setara yang disepakati di satu fungsi peladen; jangan dihitung ulang secara berbeda di tiap panel.
- Uji wajib: tambah paket 8 → absen sah 1 kali → sisa 7 di basis data **dan** di Home/Bills Student **dan** di **Private Students**. Absen duplikat hari yang sama tidak memotong dua kali.

**Jangan diulang:** mengeraskan angka di komponen React agar “terlihat benar”.

---

### FB-05 — Absensi satu konsep, banyak peran

**Status:** Wajib tertanam; ada koreksi istilah klien  
**Peran:** pelatih, staf, siswa, Admin, Owner, sekolah mitra

**Konteks.** Iterasi lama mencampur status, metode, dan pelaku. Klien meminta status Present, Late, Absent, Sick, Supported/Izin. Di produk, status siswa yang sah adalah `hadir`, `telat`, `tidak_hadir`, `sakit`, `izin`. Tipe pengajuan izin siswa (`izin`, `sakit`, `ujian`, `lainnya`) **bukan** status absensi; yang masuk tabel absensi setelah disetujui hanya `sakit` atau `izin`.

**Koreksi istilah klien.** Kalimat “bagaimana Member melakukan attendance” **tidak** berarti siswa menandai hadir sendiri. Siswa **tidak** memindai QR dan **tidak** menekan hadir. Absensi siswa = pelatih memindai QR atau mencatat manual; izin = siswa mengajukan, Admin menyetujui, baris absensi tersisip. Jangan menambah pemindai di panel Student karena kalimat klien.

**Keputusan tetap.**

- Satu sumber kebenaran per jenis absensi: siswa di `member_attendances`, pelatih di absensi kelas/clock-in, staf di `staff_attendances`. Jangan mencampur tabel.
- Status dipakai konsisten di semua panel dan di ekspor.
- Pelatih: jendela clock-in dan aturan `present`/`late` tetap US-03. GPS dicatat dan diwarnai, **bukan** pagar yang menolak.
- Staf: clock-in/out harian plus sakit/izin hari ini yang dicatat sendiri; bukan **Leave Requests**.
- Swafoto pelatih opsional (gagal unggah tetap menyimpan baris). Swafoto staf wajib sebagai bagian alur yang diminta klien (FB-07).
- School, Financial, honor, dan Excel hanya membaca status yang sudah benar. Jangan “memperbaiki” ekspor lebih dulu.

**Jangan diulang:** status berbeda per panel; siswa absen sendiri; menambal Excel sebelum tabel absensi beres.

---

### FB-06 — Daftar absensi Admin dan Owner mengikuti kejadian nyata

**Status:** Wajib tertanam  
**Peran:** Admin, Owner, pelatih, staf, siswa

**Konteks.** Menu Attendance di Admin/Owner pernah terlambat, kosong, atau tanpa foto. Klien menuntut daftar yang mengikuti penyerahan absensi, lalu rincian yang menampilkan swafoto jika alur itu memakai kamera.

**Keputusan tetap.**

Rantai yang wajib utuh:

`penyerahan absensi → basis data → daftar Admin/Owner → rincian → foto jika ada`

- Setelah pelatih, staf, atau (lewat pelatih) siswa tercatat hadir, baris muncul di daftar Admin pusat itu dan di Owner tanpa langkah sinkron manual.
- Rincian clock-in pelatih atau staf menampilkan foto jika `selfie_url` (atau setara) terisi.
- Tidak ada salinan daftar yang “lebih baru” di satu panel dan “lebih lama” di panel lain.

**Jangan diulang:** daftar teks tanpa rincian foto; cache yang membuat Owner melihat data kemarin.

---

### FB-07 — Swafoto staf harus tersimpan dan dikompres

**Status:** Wajib tertanam  
**Peran:** staf, Admin, Owner

**Konteks.** Di iterasi lama, panel staf **meminta** swafoto sebelum clock-in, tetapi penyimpanan **tidak** menulis berkas (berbeda pelatih yang menulis `selfie_url`). Akibatnya Admin/Owner tidak bisa membuka foto. Ini bug alur, bukan kekurangan tombol.

**Keputusan tetap.**

Rantai yang wajib utuh:

`kamera staf → kompresi → penyimpanan → rekaman absensi → rincian Admin/Owner`

1. Foto berhasil diambil.
2. Foto dikompres **sebelum** atau pada saat unggah, bukan disimpan utuh lalu “nanti dikompres”.
3. URL tersimpan di rekaman absensi staf.
4. Admin/Owner dapat membuka foto itu lagi.
5. Kompresi tidak merusak berkas sampai tidak terbaca.

**Jangan diulang:** pratinjau kamera tanpa unggahan; menyimpan JPEG asli berukuran besar; menghapus foto dari rincian “supaya hemat” tanpa kompresi.

---

### FB-08 — Siswa sekolah mitra wajib punya jenjang

**Status:** Sudah di PRD sebagai `school_grade`, rawan diulang  
**Peran:** Admin, Owner, sekolah mitra, siswa afiliasi

**Konteks.** Klien menulis “kelas berapa”. Itu **jenjang sekolah** (`school_grade`, contoh kelas 3 SD), bukan nama kelas les. Iterasi lama kadang menampilkan jenjang di satu layar dan menghilangkannya di Excel atau di formulir tambah.

**Keputusan tetap.**

- Jenjang dapat diisi saat menambah siswa `school_affiliate`, tersimpan di basis data, tampil di tabel siswa panel School, ikut ke data absensi yang relevan, dan tampil di ekspor Excel absensi sekolah.
- Jangan menambah kolom hanya di tabel antarmuka. Jika skema belum punya kolom, ubah skema dulu.
- Nama kelas les tetap kolom terpisah (lihat FB-10).

**Jangan diulang:** jenjang “hiasan frontend”; mencampur jenjang sekolah dengan nama kelas renang.

---

### FB-09 — Sekolah mitra mengunduh rapor satu-satu dan sekaligus

**Status:** Sudah di PRD, rawan diulang  
**Peran:** sekolah mitra

**Konteks.** Panel School sudah punya unduh PDF satu siswa dan ZIP banyak siswa. Klien tetap meminta fitur ini karena di lapangan operator sekolah kesulitan, atau hasil ZIP tidak tertata. Rebuild harus membuat alur ini **jelas dan teratur**, bukan menganggap “sudah ada ZIP” selesai.

**Keputusan tetap.**

- Operator dapat mengunduh rapor satu murid.
- Operator dapat mengunduh beberapa atau semua rapor yang sudah dikunci, lewat pilihan atau ZIP hasil saringan.
- Isi arsip terorganisasi (nama berkas memuat identitas siswa; tidak campur file rusak atau rapor belum dikunci).
- Hanya rapor `locked` milik `school_id` akun itu.

**Jangan diulang:** tombol ZIP yang menghasilkan arsip kosong, tidak terurut, atau memuat siswa sekolah lain.

---

### FB-10 — Ekspor absensi sekolah: satu baris per murid, kolom tanggal

**Status:** Wajib tertanam (format ini yang diminta klien; iterasi lama tidak menepatinya)  
**Peran:** sekolah mitra, siswa afiliasi, pelatih, Admin, Owner

**Konteks.** Ekspor lama memakai hasil saringan dan batas muat 2.000 baris, cenderung **satu baris per kejadian absensi**. Operator sekolah meminta lembar **horizontal**: satu baris satu murid, tanggal menjadi kolom, rekap di kanan. Klien juga menekankan: jangan merapikan Excel sebelum logika absensi (FB-05) dan relasi siswa–sekolah–kelas–jenjang benar.

**Keputusan tetap.**

- Rentang tanggal dipilih dulu; hanya tanggal dalam rentang yang menjadi kolom.
- Struktur kolom:

| Nama murid | Jenjang (`school_grade`) | Nama kelas les | Tanggal 1 | Tanggal 2 | … | Hadir | Telat | Tidak hadir | Sakit | Izin |
|---|---|---|---|---|---|---|---|---|---|---|

- Baris = satu murid afiliasi sekolah itu.
- Sel tanggal memakai status yang sama dengan basis data (`hadir`, `telat`, `tidak_hadir`, `sakit`, `izin`), bukan label bebas.
- Kolom kanan = jumlah tiap status pada rentang itu.
- Nama berkas tetap bermakna, contoh `Absensi-{nama-sekolah}-{dari}-sd-{sampai}.xlsx`.

**Jangan diulang:** merapikan header Excel sementara status masih salah; meniadakan jenjang; mengekspor kejadian sebagai baris panjang yang operator tidak bisa rekap.

---

### FB-11 — Keuangan: saring rentang dulu, ekspor mengikuti saringan

**Status:** Wajib tertanam  
**Peran:** Owner; Manager Center untuk satu pusat

**Konteks.** Menu Financial default-nya bulan berjalan. Klien ingin rentang: bulan ini, bulan lalu, rentang bebas, beberapa bulan sekaligus. Bug yang ditakuti: angka di layar benar, Excel membawa bulan lain, atau total tidak sama dengan daftar.

**Keputusan tetap.**

Rantai yang wajib utuh:

`saringan tanggal → kueri → daftar Financial → hitungan total → ekspor Excel`

- Default tetap boleh “bulan berjalan”, tetapi pengguna dapat mengganti rentang.
- Excel hanya berisi data dalam rentang yang sedang aktif di layar. Beberapa lembar (sheet) diperbolehkan jika memisahkan pemasukan, pengeluaran, dan rekap.
- Dilarang: data di luar rentang ikut masuk, data dalam rentang hilang, baris ganda, total beda antara panel dan berkas.

**Jangan diulang:** merapikan template Excel sebelum kueri saringan benar; Admin biasa mengakses Financial (itu wewenang Manager Center dan Owner).

---

### FB-12 — Manager Center dan wewenang per pusat

**Status:** Sudah di PRD, rawan diulang  
**Peran:** Owner, Admin, Manager Center

**Konteks.** Klien menulis “tambahkan peran Manager Center”. Peran itu **sudah ada** di PRD dan di panel `/admin`. Yang gagal di iterasi lama biasanya: menu hanya disembunyikan di frontend, atau sakelar Payments tidak dihormati API.

**Keputusan tetap.**

| Peran | Financial | Payments | Catatan |
|---|---|---|---|
| Admin biasa | Tidak | Hanya jika `branches.show_payments_to_admin = true` | Tidak membuat Owner/Admin; tidak slip, kasbon, landing, penyimpanan |
| Manager Center | Ya, satu pusat | Selalu | Bukan Owner |
| Owner | Semua pusat | Semua pusat | Mengatur sakelar Payments per pusat; sakelar **tidak** berlaku bagi Manager Center |

- Wewenang dicek di peladen. Membuka `/admin?tab=financial` atau memanggil API keuangan sebagai Admin biasa harus ditolak.
- Pratinjau Owner ke panel Admin tidak mengubah wewenang akun Admin sungguhan.

**Jangan diulang:** menganggap “role baru” belum ada lalu membuat panel ketiga; mengandalkan `hidden` di menu sebagai keamanan.

---

### FB-13 — Hapus “WA Laporkan Bug” dari panel Student

**Status:** Wajib tertanam  
**Peran:** siswa

**Konteks.** Panel Student pernah menampilkan pintasan WhatsApp untuk melapor kutu. Klien meminta fitur itu diangkat. Tombol WhatsApp **tagihan ke Admin pusat** tetap ada; yang dihapus hanya alur laporkan kutu.

**Keputusan tetap.**

- Tidak ada menu, tombol, atau tautan “laporkan kutu” / “WA Report Bug” di panel Student.
- Tidak ada sisa rute, komponen, atau salinan pesan yang masih mengarah ke alur itu.

**Jangan diulang:** menyisakan ikon di menu ponsel atau di kaki profil.

---

### FB-14 — Infrastruktur dan penyimpanan dipikirkan sejak awal

**Status:** Wajib sebagai catatan operasional; angka produksi masih TBD-03  
**Lingkup:** hosting, basis data, penyimpanan, lalu lintas

**Konteks.** Swafoto staf/pelatih, avatar, PDF rapor, dan pertumbuhan multi-pusat menaikkan penyimpanan. Iterasi lama menyimpan foto tanpa kompresi dan tidak punya patokan biaya. PRD belum mengunci vendor produksi (TBD-03) dan belum mengukur latensi (TBD-05). Dokumen ini **tidak** mengarang angka server.

**Keputusan tetap.**

- Foto absensi dikompres sebelum masuk penyimpanan (FB-07).
- Owner tetap memantau pemakaian penyimpanan; hapus berkas bersifat merusak dan harus disengaja.
- Sebelum rilis produksi: catat perkiraan pertumbuhan basis data dan penyimpanan, lalu isi TBD-03. Jangan mengasumsikan “konfigurasi sekarang cukup”.
- Jangan menambah layanan AI atau gerbang pembayaran diam-diam dengan alasan “infrastruktur sudah kuat”.

**Jangan diulang:** menunda kompresi “sampai biaya terasa”; mengunci vendor di kode tanpa menulisnya di PRD.

---

## 3. Ringkasan agar tidak dilupakan

| Kode | Inti yang mudah dilupakan |
|---|---|
| FB-01 | Privat adalah alur sendiri, bukan Class mini |
| FB-02 | Privat = paket (harga + sesi), bukan tarif pertemuan |
| FB-03 | Ubah lokasi/jadwal/pelatih → absensi baru ikut; absensi lama utuh |
| FB-04 | Sisa sesi benar di kolom sumber, bukan di teks kartu |
| FB-05 | Siswa tidak absen sendiri; status seragam sebelum ekspor |
| FB-06 | Daftar Admin/Owner mengikuti kejadian plus foto |
| FB-07 | Swafoto staf benar-benar tersimpan dan dikompres |
| FB-08 | Jenjang sekolah wajib sampai Excel, terpisah dari nama kelas les |
| FB-09 | Rapor satu dan banyak, arsip rapi, hanya yang terkunci |
| FB-10 | Excel sekolah: 1 baris 1 murid, tanggal jadi kolom |
| FB-11 | Excel keuangan = saringan yang sedang tampil |
| FB-12 | Manager Center sudah ada; wewenang di API |
| FB-13 | Tidak ada WA laporkan kutu di Student |
| FB-14 | Kompres foto; jangan mengarang kapasitas produksi |

---

## 4. Yang sengaja tidak diubah oleh umpan balik ini

Umpan balik klien **tidak** membatalkan keputusan PRD berikut.

- Tidak ada gerbang pembayaran dalam aplikasi; siswa tidak mengunggah bukti.
- Tidak ada pagar geografis yang menolak clock-in.
- Tidak ada menu Owner **Database Manager**.
- Tidak ada fitur kecerdasan buatan pada versi ini.
- Bahasa prosa: Student, bukan Member.
- Navigasi panel: tab di dalam halaman, bukan rute per menu.
- Tagihan siswa ≠ invoice honor ≠ slip gaji.
- Periode rapor ≠ periode invoice.
