# Tiga tipe siswa — konsep terkunci

**Produk:** Next Swimming School  
**Kode dokumen:** ALUR-NSS-003  
**Versi:** 1.0  
**Status:** Konsep operasional terkunci  
**Tanggal:** 16 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI

Dokumen ini adalah **sumber kebenaran** bagaimana orang menjadi siswa, apa yang mereka lihat, dan bagaimana iuran serta sesi dihitung. Ada **tiga tipe**, bukan satu formulir untuk semua.

Bahasa produk: **Student**. Peran di basis data, rute, dan tabel juga `student` / `/student` / `students` (direname dari `member`). Jangan menulis “Member” di prosa.

Jaringan (pusat, pelatih, kelas reguler, sekolah mitra) harus ada dulu: `docs/03-alur/01-jaringan.md`. Tagihan sebagai mesin uang: `docs/03-alur/04-uang.md`. Absensi: `docs/03-alur/03-absensi-izin-honor.md`. Rapor: `docs/03-alur/05-rapor-sekolah.md`. Layar: `docs/04-panel/05-student.md`, `docs/04-panel/02-admin.md`.

Jika panel bertentangan dengan dokumen ini untuk tipe siswa, pintu create, atau sisa sesi, **dokumen ini menang**. Jika dokumen ini bertentangan dengan PRD, **PRD menang** sampai ada addendum.

---

## 1. Mengapa tiga tipe, bukan satu tabel

Sekolah renang NEXT menerima:

- anak yang daftar sendiri lalu masuk kelas bersama (**reguler**);
- anak yang les 1:1 dengan paket sesi (**privat**);
- anak dari sekolah mitra yang iurannya ditanggung sekolah, bukan orang tua di aplikasi (**afiliasi**).

Iterasi lama menyatukan ketiganya di formulir **Student** plus opsi `private`. Akibatnya: generate tagihan bulanan mengenai privat, sisa sesi salah sumber, dan sekolah mitra melihat tagihan. FB-01 sampai FB-04 dan FB-08 menahan kesalahan itu.

Satu aturan: **satu pintu create per tipe**. Jangan menggabungkan Student dan Private menjadi satu tabel hanya karena keduanya “siswa”.

---

## 2. Matriks tiga tipe

| | Reguler `reguler` | Privat `private` | Afiliasi `school_affiliate` |
|---|---|---|---|
| Pintu create | Admin **Student** atau **Approvals** dari `/register` | Hanya **Private Students** (Admin satu pusat, Owner semua pusat) | Admin **Student**, setelah akun sekolah ada |
| Kelas | Kelas reguler (`Class`) | Satu kelas `class_type=private`, tidak di **Class** | Kelas reguler |
| Tagihan | Generate bulanan Admin **Payments** | Bukan generate bulanan; paket harga + jumlah sesi | Tidak digenerate; biasanya `school_covered`; tab **Bills** hilang |
| Sisa sesi | Tidak ditonjolkan (boleh session pack kelas lewat `class_packages`) | `students.remaining_sessions` setelah pengurang peladen yang sama | Tidak |
| Jenjang sekolah | Tidak wajib | Tidak | **Wajib** (`school_grade`) |
| Panel Student menonjolkan | Jadwal, tagihan, izin | Sisa sesi, jadwal lentur, peringatan sisa ≤ 1 | Jadwal, rapor, izin |
| Panel Student menyembunyikan | Sisa paket privat | Generate tagihan bulanan | Tab **Bills** dan kartu `unpaid` di Home |
| School | Tidak | Tidak | Rapor + absensi hanya `school_id` ini |

Gerbang foto berlaku untuk ketiga tipe: jika `is_profile_complete` belum true **dan** `avatar_url` kosong, wajib unggah foto. Cukup salah satu untuk membuka panel.

Penangguhan: spanduk plus hitung mundur; tab tidak dikunci; pindai QR ditolak.

Siswa **tidak** menandai hadir sendiri, **tidak** mengunggah bukti bayar, **tidak** memilih pelatih sendiri, **tidak** punya WA laporkan kutu (FB-13).

---

## 3. Alur siswa reguler

**Konteks.** Ini alur kritis KPI-01 nomor 1. Calon tidak boleh masuk panel sebelum Admin menyetujui. Iuran tercatat tanpa gerbang pembayaran.

### 3.1 Dari situs publik

1. Calon atau wali mengisi `/register` → baris `registrations` tertunda.
2. Calon **tidak** dapat masuk panel.
3. Admin **Approvals** menyunting, menyetujui, menolak, atau menghapus. Lencana Approvals = pendaftaran tertunda + sertifikat pelatih tertunda (izin orang tidak masuk).
4. Setuju → akun `student` tipe `reguler`. Tolak → tidak ada akun.
5. Siswa masuk → gerbang foto jika perlu.
6. Admin memasukkan ke kelas reguler.
7. Admin **Payments** membuat tagihan bulan berjalan (satu baris per pasangan siswa × kelas × periode; yang sudah ada dilewati).
8. Siswa melihat **Bills**: rekening pusat, tombol WhatsApp Admin, tanpa unggah bukti.
9. Transfer di luar aplikasi → konfirmasi WhatsApp → Admin menandai lunas (tanggal, metode `transfer` \| `cash` \| `qris`, bukti boleh dari sisi Admin).
10. Owner **Financial → Income** membaca tagihan yang diverifikasi.

### 3.2 Dari Admin langsung

Admin **Student** membuat akun reguler (kontak, kesehatan, kelas, avatar) tanpa `/register`. Lanjut dari langkah 5.

Impor Excel hanya untuk `reguler` dan `school_affiliate`. **Bukan** privat.

---

## 4. Alur siswa privat

**Konteks.** Les privat bukan kelas reguler yang dikecilkan. Satu siswa, satu kelas privat, jadwal dan lokasi bisa berganti, pelatih bisa diganti, sesi dihitung dari **paket** (harga paket + jumlah sesi). Bukan harga per pertemuan (FB-02). Bukan `class_packages`.

### 4.1 Satu kali tambah

Hanya menu **Private Students**.

Satu kali simpan harus bersama:

- data siswa;
- harga paket dan jumlah sesi awal;
- sisa sesi (awal = jumlah sesi paket);
- jadwal: hari jamak, dan tiap hari yang dipilih punya jam mulai dan jam selesai sendiri;
- pelatih beserta perannya (satu pelatih otomatis kepala; lebih dari satu, peran dipilih);
- lokasi: memakai pin pusat, atau titik sendiri yang dipilih lewat peta dengan menggeser pin atau mencari nama tempat.

Kelas yang tercipta `class_type=private` **tidak** tampil di **Class**. Generate tagihan bulanan **tidak** mengenai `private`.

### 4.2 Sisa sesi (satu sumber)

Sumber tampilan di mana pun = `students.remaining_sessions` setelah pengurang peladen yang sama dengan absensi privat yang sah (FB-04).

Pengurang sah: pelatih clock-in lalu pindai atau catat sesi privat; RPC sekali per hari; duplikat ditolak (US-04).

Empat angka yang harus sama di basis data, Home Student, Private Students, dan (jika ada) kartu paket: sesi awal, sesi terpakai, sisa, tampilan.

**Dilarang** menghitung sisa dari `bills.sessions_used` atau dari jumlah baris di antarmuka.

Uji wajib: paket 8 → absen sah 1 kali → sisa 7 di kolom **dan** di layar. Absen duplikat hari yang sama tidak memotong dua kali.

Peringatan di Home jika sisa ≤ 1, plus WhatsApp perpanjang. Perpanjang = Admin/Owner **Private Students** menambah sesi, bukan generate bulanan.

### 4.3 Ubah jadwal, lokasi, pelatih

Rantai: `siswa privat → jadwal → lokasi/pin → pelatih → absensi`.

- Absensi **baru** memakai konfigurasi yang berlaku sekarang.
- Absensi **lama** menyimpan konfigurasi saat kejadian; tidak ditimpa (FB-03).
- Pin clock-in sesi berikutnya = lokasi baru. Tanpa pin, jarak tidak dihitung.
- Ganti pelatih tidak menghapus clock-in lama dan tidak memindahkan honor sesi yang sudah dikunci invoice.

---

## 5. Alur siswa afiliasi

**Konteks.** Sekolah mitra memantau, bukan menagih. Operator sekolah butuh jenjang (“kelas berapa di SD”), bukan nama kelas les (FB-08).

Syarat: akun `school` dan baris `schools` sudah ada (Admin **School Panel** atau Owner **Accounts**), plus logo/tanda tangan di Owner **Schools** jika rapor akan diunduh.

1. Admin **Student** membuat `school_affiliate`: sekolah wajib, **jenjang wajib**.
2. Masukkan ke kelas reguler.
3. Panel Student: tab **Bills** disembunyikan; kartu `unpaid` di Home **tidak** tampil meski ada baris tagihan di basis data.
4. Generate tagihan bulanan tidak mengenai afiliasi (biasanya `school_covered`).
5. Akun School melihat nama di rapor dan absensi. Tidak mengubah data siswa, tidak mengisi rapor, tidak menagih.

Izin dan jadwal tetap ada: siswa afiliasi tetap manusia yang kadang sakit.

---

## 6. Yang siswa boleh submit sendiri

Bukan kelas, bukan tagihan.

| Tindakan | Tab | Catatan |
|---|---|---|
| Unggah foto gerbang | ProfileGate | Membuka panel |
| Pengajuan Sick / Izin | **Leave** | Admin setuju → hasil absensi; lihat `docs/03-alur/03-absensi-izin-honor.md` |
| Ulasan pelatih | **Report Card** | Hanya saat periode rapor `is_open` |
| Ganti kata sandi, telepon, alamat, catatan kesehatan | **Profile** | Nama, tanggal lahir, gender = Admin |
| Tunjukkan QR | **Profile** | Yang memindai = pelatih |

---

## 7. Dampak ke peran lain

| Tipe | Admin | Pelatih | Owner | School |
|---|---|---|---|---|
| Reguler | Student, Approvals, Payments | QR, rapor | Financial Income | — |
| Privat | Private Students saja | Kelas privat, pin kelas, −1 sesi | Private Students semua pusat | — |
| Afiliasi | Student + jenjang; School Panel | QR, rapor | Schools logo/tanda tangan | Rapor + Excel |

---

## 8. Jangan tertukar

1. Tiga tipe siswa ≠ tiga panel. Satu panel Student, tampilan berbeda.
2. Pintu privat hanya **Private Students**. Bukan Student, bukan impor, bukan Accounts, bukan Class.
3. Paket privat ≠ `class_packages`.
4. Jenjang sekolah ≠ nama kelas les.
5. Tab Bills hilang untuk afiliasi **dan** kartu unpaid Home juga hilang.
6. Sisa sesi benar di kolom sumber, bukan di teks kartu.
7. Siswa tidak absen sendiri (FB-05).

## 9. Bukan tujuan

- Opsi `private` di formulir Student atau impor Excel.
- Harga per pertemuan untuk privat.
- Generate tagihan bulanan untuk `private` atau `school_affiliate`.
- Gerbang pembayaran atau unggah bukti oleh siswa.
- Siswa memilih pelatih atau menandai hadir.
- WA laporkan kutu.
- Tab baru di panel Student.
