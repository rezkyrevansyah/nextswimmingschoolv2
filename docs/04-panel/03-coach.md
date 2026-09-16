# Coach Panel — Konsep terkunci

> Status: konsep panel terkunci. Niat produk: `docs/01-prd.md`. Umpan balik: `docs/02-umpan-balik.md`.
> Peran `coach`. Utama untuk ponsel.
> Kelas yang tampil = kelas yang diampu (`class_coaches`), termasuk kelas privat, plus sesi covering yang sudah disetujui. Alur absensi/izin/honor: `docs/03-alur/03-absensi-izin-honor.md`.
> Sumber perilaku yang sudah ada: `src/app/coach/page.tsx`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan pelatih
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Coach**
- **Jangan** — wewenang yang dilarang

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Student · School · Publik

## Lingkup dan kunci operasional

- Pelatih dapat terikat **lebih dari satu pusat** (`coach_branches`). Jika lebih dari satu, tajuk menampilkan pemilih cabang (bawaan: primer).
- Kelas diambil dari semua penugasan; saringan “hari ini” mengikuti cabang aktif.
- **Profil wajib lengkap** sebelum clock-in, absensi, invoice, dan rapor: telepon, gender, tanggal lahir, bank, nomor rekening, nama pemegang. Sertifikat opsional.
- **Penangguhan** (`suspend_until` masih berlaku): tab Absen, Honor → Invoice, Rapor, dan overlay clock-in terkunci. Beranda, Kelas, Honor → Payslip, Profile, dan formulir izin **tetap terbuka**.
- Pelatih **tidak** membuat kelas, siswa, tagihan siswa, periode rapor, tarif, atau slip gaji. Itu Admin atau Owner.

Pelatih hampir tidak membuat data induk. Yang “dicreate” berurutan di lapangan: profil lengkap → clock-in → absensi siswa → (opsional) rapor → klaim honor → melihat slip.

## Susunan menu terkunci

| No. | Menu | `id` tab | Alasan urutan |
|---|---|---|---|
| 1 | Home | `home` | Beranda; kartu clock-in hari ini |
| 2 | Attendance | `absen` | Clock-in dan pindai QR; create absensi |
| 3 | Class | `kelas` | Membaca kelas yang sudah diampu; isi tautan spreadsheet |
| 4 | Report Card | `rapor` | Mengisi rapor; butuh periode Admin dan siswa di kelas |
| 5 | Honor | `honor` | Payung: Invoice dulu (create klaim), Payslip kemudian (hasil) |
| 6 | Profile | `profile` | Dasar; tempat melengkapi data agar tab lain terbuka |

Izin tetap overlay, bukan tab. Diajukan sebelum pengganti clock-in, tetapi bukan data induk.

Di ponsel: Home, Attendance, Class, Report Card, plus **Menu** (Honor, Profile).

## Aturan satu pintu

- Invoice dan Payslip tidak menjadi dua menu setara di bilah. Payung **Honor**, urutan dalam payung: Invoice → Payslip.
- Setelah clock-in berhasil, layar langsung ke pindai QR kelas itu. Jangan menambah langkah “kembali ke daftar dulu”.
- Jangan menambah wewenang membuat kelas, tarif, atau tagihan siswa.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:** enam slot menu di desktop (Honor satu slot); di ponsel: Home, Attendance, Class, Report Card, plus **Menu** (Honor, Profile). Pengalih bahasa, Bell, avatar ke Profile. Overlay: clock-in, formulir izin, riwayat izin.

**Dampak ke peran lain:** mengajukan invoice → Bell **Owner**, bukan Bell Admin.

---

## 1. Home (`home`)

**Apa:** Ringkasan hari ini. Perubahan data lewat overlay atau pindah tab.

**Yang dapat dilakukan:**

- spanduk periode invoice terbuka (Owner **Payslips → Periods**): pintasan ke Honor → Invoice, atau status sudah diajukan;
- pengumuman terbaru yang `target_roles` memuat `coach`;
- kelas hari ini: libur / sedang izin / sudah clock-in / tombol clock-in (jendela: **tiga jam sebelum `time_start` sampai `time_end`**);
- kelas pengganti hari ini (izin pelatih lain `approved`, pelatih ini = pengganti) plus clock-in untuk kelas itu;
- angka bulan ini: hadir/telat, absen, jumlah tugas pengganti;
- peringatan spreadsheet program belum diisi;
- pintasan: ajukan izin, riwayat izin, hubungi surel (`landing_config.contact_email`).

Clock-in ditolak jika: libur kelas, izin disetujui untuk kelas itu, sudah clock-in kelas+tanggal itu, di luar jendela jam, profil belum lengkap, atau akun ditangguhkan. **Jarak GPS tidak menolak clock-in.**

**Dampak ke peran lain:** Owner membuka periode invoice; Admin mengatur libur, izin, dan pengumuman; clock-in tampil di dasbor dan **Attendance** Admin/Owner.

---

## Overlay: Clock-in

Bukan tab. Dipanggil dari Home atau Attendance.

**Yang dapat dilakukan:**

- memilih kelas (atau terkunci jika sudah dipilih dari kartu);
- GPS: jarak ke pin **pusat kelas** (reguler) atau pin **kelas** (lokasi eksternal atau privat). Eksternal tanpa pin = jarak tidak dihitung. Warna: ≤500 m, ≤2 km, atau lebih. Nilai disimpan di `distance_meters`. **Bukan pagar geografis** — jauh tetap dapat dikirim;
- swafoto opsional, dikompres sebelum unggah (FB-14); gagal unggah tetap menyimpan absensi tanpa foto;
- kirim → `coach_attendances`: `present` jika paling lambat 15 menit setelah `time_start`, selain itu `late`;
- duplikat kelas+tanggal ditolak;
- **setelah berhasil, layar langsung ke pindai QR kelas itu.**

Jika lokasi privat berubah, acuan jarak sesi berikutnya adalah pin baru; absensi lama tidak ditimpa (FB-03).

**Dampak ke peran lain:** Admin/Owner **Attendance** dan dasbor; sesi `present`/`late` yang `invoice_id` masih kosong dapat diklaim di Honor → Invoice; pin dari Owner **Centers** atau Admin **Settings**.

---

## Overlay: Izin (`leave` dan `leave-history`)

Rincian mesin: `docs/03-alur/03-absensi-izin-honor.md` bab 3–4. **Sick** dan **Izin** (Supported) keduanya wajib delegasi. Supported ≠ pengganti.

**Yang dapat dilakukan:**

- mengajukan **Sick** atau **Izin**, pilih sesi terdampak (kelas + tanggal + jam);
- untuk **tiap sesi**, wajib pilih pengganti dari **seluruh pelatih aktif semua cabang** (bukan arsip, bukan ditangguhkan, bukan diri sendiri), dikelompokkan per pusat, bisa dicari; cabang berbeda **boleh**;
- bentrok jam persis dengan sesi pengganti **diblokir**;
- kirim → `pending` (pelatih asli masih boleh clock-in);
- melihat riwayat, alasan tolak, nama pengganti;
- membatalkan yang `pending`; membatalkan yang `approved` hanya jika pengganti belum clock-in.

**Dampak ke peran lain:** Admin pusat **kelas itu** menyetujui (boleh ganti pengganti) atau menolak plus alasan. Setelah `approved`, sesi **otomatis** masuk tab **Class** dan **Home** pengganti; clock-in asli mati; Class Activity menampilkan pengganti; jadwal siswa tetap dengan nama pelatih hari itu = pengganti. Honor sesi itu hanya pengganti yang Present/Late.

---

## 2. Attendance (`absen`)

**Terkunci** jika ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:**

- kartu kelas hari ini plus clock-in atau pindai QR (setelah sudah clock-in);
- **pindai QR siswa:** mencocokkan siswa ke kelas pelatih ini (hari ini, atau kelas pertama jika tidak ada jadwal hari ini). Siswa ditangguhkan ditolak. Telat siswa jika lebih dari 1 menit setelah `time_start` (`hadir` / `telat`). Kelas privat: RPC `consume_private_session` (cek duplikat dulu, sekali per hari) — ini pengurang sisa sesi yang sah (FB-04);
- **absensi manual siswa** (bukan GPS): pilih kelas dan tanggal jadwal (56 hari ke belakang), status per siswa aktif, simpan metode `manual`;
- **sesi privat:** mencatat sesi plus mengurangi 1 sesi berbayar;
- riwayat clock-in sendiri (termasuk yang diisi Admin, `is_manual`);
- riwayat sesi siswa plus rincian nama lewat `/api/coach/attendance-detail`.

Siswa **tidak** memindai sendiri dan **tidak** menekan hadir (FB-05).

**Dampak ke peran lain:** Student melihat hadir/telat; privat mengurangi `members.remaining_sessions`; Admin/Owner **Attendance**; invoice honor hanya memakai clock-in pelatih, bukan absensi siswa.

---

## 3. Class (`kelas`)

**Tidak terkunci** saat ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:** daftar kelas yang diampu (reguler dan privat) **plus sesi covering** yang sudah `approved` (“Menggantikan {nama} · {kelas} · {pusat} · {jam}”); rincian lokasi, tujuan, deskripsi, daftar siswa (`/api/coach/class-members` karena RLS); mengisi tautan spreadsheet (`class_coach_spreadsheets`, satu per pelatih per kelas) sehingga `spreadsheet_filled = true`; melihat spreadsheet pelatih lain; rincian satu siswa plus riwayat absensinya.

**Tidak** dapat membuat, mengubah harga, atau menugaskan pelatih. Itu Admin atau Owner.

**Dampak ke peran lain:** tautan spreadsheet tampil di rincian kelas Admin/Owner; beranda pelatih memperingatkan jika spreadsheet sendiri kosong.

---

## 4. Report Card (`rapor`)

**Terkunci** jika ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:**

- hanya jika Admin membuka `rapor_periods` `is_open` di **cabang aktif**;
- rintisan `rapor_entries` otomatis untuk setiap siswa di kelas pelatih ini;
- mengisi: level (Owner; semua kelas atau kelas ini), skor, catatan, kepribadian/motivasi/capaian, waktu terbaik;
- menyimpan → `locked = true`;
- pratinjau dan unduh PDF (tanda tangan pelatih, Head of NEXT, konfigurasi sekolah);
- mengunggah tanda tangan digital (`profiles.signature_url`);
- melihat ulasan bintang dari siswa (identitas disamarkan, `/api/rapor/coach-reviews`).

**Dampak ke peran lain:** Admin daftar terisi/belum dan unduh; Student dan School mengunduh PDF; tanpa periode terbuka tidak dapat mengisi.

---

## 5. Honor (`honor`)

Payung dua sub-tab. **Terkunci** (bagian Invoice) jika ditangguhkan atau profil belum lengkap. Payslip **tidak** terkunci.

### A. Invoice

**Apa:** Klaim honor sesi, extra, dan reimburse operasional. Bukan gaji staf (staf punya Honor sendiri). Create klaim; tampil lebih dulu dalam payung. Alur sampai publish: `docs/03-alur/03-absensi-izin-honor.md` bab 6.

**Yang dapat dilakukan:**

- hanya jika Owner memiliki `invoice_periods` `is_open` (pusat ini **atau** global). Tanpa periode: formulir tertutup, riwayat lama tetap kelihatan;
- memilih sesi **Present**/**Late** miliknya yang belum `invoice_id`, **termasuk sesi covering**; bukan Sick/Izin/Absent; bukan sesi pelatih lain;
- tarif: khusus **pelatih yang klaim** untuk kelas itu, jika kosong memakai tarif umum kelas (Owner **Coach Rates**). Sesi covering **jangan** memakai tarif pelatih asli. Kelas tanpa tarif **tidak dapat** diklaim;
- menambah extra (wajib `coach_extra_rates`) dan reimburse (uraian, nominal, bukti);
- kirim → `coach_invoices` `pending`, klaim atomik `invoice_id` pada absensi, pemberitahuan Owner;
- rekening dari Profile;
- membatalkan invoice tertunda (`cancel_coach_invoice`, melepaskan klaim sesi);
- riwayat: `pending | approved | rejected | paid`.

**Dampak ke peran lain:** Owner meninjau, membuat draf slip, menerbitkan; dasbor dan Bell Owner. Admin tidak meninjau invoice pelatih.

### B. Payslip

**Apa:** Hasil setelah Owner menerbitkan. Hanya `payslips.status = published`.

**Yang dapat dilakukan:** daftar slip terbit; merinci kotor, potongan (pajak, kasbon, lain), bersih, catatan; mencetak.

Draf Owner **tidak** tampil. Kasbon tidak punya tab — hanya baris potongan di slip terbit.

**Dampak ke peran lain:** Owner menerbitkan; **Financial** mencatat pengeluaran.

---

## 6. Profile (`profile`)

**Tidak terkunci** (tempat melengkapi data agar tab lain terbuka).

**Yang dapat dilakukan:** menyunting nama panggilan, gender, tanggal lahir, telepon, spesialisasi, bio, alamat, pendidikan; rekening (wajib untuk membuka kunci); kata sandi; avatar; sertifikat (awal `pending` → Admin **Approvals**); menampilkan QR/`user_no`; keluar.

**Dampak ke peran lain:** Admin **Coach** dan **Approvals**; rekening di invoice dan slip; CMS landing pelatih **bukan** dari sini.

---

## Matriks silang Coach → peran lain

| Fitur Coach | Owner | Admin / Manager Center | Staff | Student | School |
|---|---|---|---|---|---|
| Home | Spanduk periode invoice | Libur, izin, pengumuman, kehadiran langsung | — | — | — |
| Clock-in | Sesi klaim invoice; Attendance + foto | Attendance + dasbor | — | Lanjut ke QR | — |
| Izin / delegasi | — | Leave Requests + Class Activity + jadwal pengganti otomatis | — | Nama pelatih hari itu | — |
| Attendance | Sesi honor; hub absensi | Absensi pelatih/siswa | — | QR hadir/telat; privat −1 sesi | — |
| Class | Spreadsheet di rincian kelas | Spreadsheet + daftar siswa | — | Rincian + riwayat absen | — |
| Report Card | Level + tanda tangan Head | Periode + PDF + ulasan | — | PDF + memberi ulasan | PDF afiliasi |
| Honor → Invoice | Setuju/tolak/slip/Bell | Tidak meninjau | — | — | — |
| Honor → Payslip | Terbit = tampil di sini | — | — | — | — |
| Profile | Rekening di slip | CRUD pelatih + Approvals | — | — | — |

---

## Alur silang (mengikuti rantai create)

**1. Clock-in menjadi honor.** Lengkapi profil termasuk rekening → clock-in dalam jendela jam (GPS dicatat, tidak menolak) → **langsung pindai QR** → Owner mengisi tarif → Owner membuka periode invoice → pelatih mengajukan Honor → Invoice → Owner menyetujui, membuat, dan menerbitkan slip → Honor → Payslip.

**2. QR siswa.** Sudah clock-in → pindai. Reguler: `hadir`/`telat`. Privat: satu sesi terpakai lewat pengurang peladen, duplikat hari yang sama ditolak. Siswa ditangguhkan tidak dapat dipindai. Siswa tidak absen sendiri.

**3. Izin plus pengganti.** Ajukan Sick/Izin plus pengganti per sesi dari daftar semua cabang → Admin pusat kelas menyetujui → jadwal sesi **otomatis** masuk Class dan Home pengganti → pengganti clock-in → honor ke pengganti. Rincian: `docs/03-alur/03-absensi-izin-honor.md`.

**4. Rapor.** Admin membuka periode di cabang aktif → pelatih mengisi dan mengunci → Admin/Student/School mengunduh PDF. Student dapat mengulas selama periode masih terbuka.

**5. Penangguhan atau profil kosong.** Absen, Honor → Invoice, Rapor, clock-in terkunci. Kelas, Honor → Payslip, Profile, izin tetap dapat. Dasbor Admin dapat memperingatkan kelas tanpa pelatih aktif.

---

## Selisih vs kode

| Sekarang di kode | Konsep terkunci |
|---|---|
| Tujuh tab setara: Home, Attendance, Class, Invoice, Report Card, Payslip, Profile | Enam slot: Report Card sebelum Honor; Invoice+Payslip = payung Honor |
| Urutan desktop: Invoice sebelum Report Card | Report Card (nomor 4) lalu Honor (nomor 5) |
| Setelah clock-in, pelatih memilih pindai sendiri | Langsung ke pindai QR kelas itu |
| Swafoto opsional tanpa jaminan kompres | Kompres sebelum unggah |
| Pengganti “boleh lintas pusat”; hanya kartu Home | Daftar **seluruh** pelatih semua cabang; jadwal masuk Class pengganti setelah approve |
| Honor sesi covering tidak dijelaskan | Klaim hanya oleh pengganti yang Present/Late |
