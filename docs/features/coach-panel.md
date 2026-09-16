# Coach Panel — Daftar Fitur

> Sumber: `src/app/coach/page.tsx` dan panel peran lain.
> Peran `coach`. Utama untuk ponsel (navigasi bawah plus lembar **Menu** untuk Invoice, Payslip, Profile).
> Kelas yang tampil = kelas yang diampu (`class_coaches`), termasuk kelas privat.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan pelatih
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Coach**

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Member · School · Publik

---

## Lingkup dan kunci operasional

- Pelatih dapat terikat **lebih dari satu pusat** (`coach_branches`). Jika lebih dari satu, tajuk menampilkan pemilih cabang (bawaan: primer).
- Kelas diambil dari semua penugasan; saringan “hari ini” mengikuti cabang aktif.
- **Profil wajib lengkap** sebelum clock-in, absensi, invoice, dan rapor: telepon, gender, tanggal lahir, bank, nomor rekening, nama pemegang. Sertifikat opsional.
- **Penangguhan** (`suspend_until` masih berlaku): tab Absen, Invoice, Rapor, dan overlay clock-in terkunci. Beranda, Kelas, Payslip, Profile, dan formulir izin **tetap terbuka**.
- Pelatih **tidak** membuat kelas, member, tagihan siswa, periode rapor, tarif, atau slip gaji. Itu Admin atau Owner.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:** tujuh tab di desktop; di ponsel: Home, Attendance, Class, Report Card, plus **Menu** (Invoice, Payslip, Profile). Pengalih bahasa, Bell, avatar ke Profile. Overlay: clock-in, formulir izin, riwayat izin.

**Dampak ke peran lain:** mengajukan invoice → Bell **Owner**, bukan Bell Admin.

---

## 1. Home (`home`)

**Apa:** Ringkasan hari ini. Perubahan data lewat overlay atau pindah tab.

**Yang dapat dilakukan:**

- spanduk periode invoice terbuka (Owner **Payslips → Periods**): pintasan ke Invoice, atau status sudah diajukan;
- pengumuman terbaru yang `target_roles` memuat `coach`;
- kelas hari ini: libur / sedang izin / sudah clock-in / tombol clock-in (jendela: **tiga jam sebelum `time_start` sampai `time_end`**);
- kelas pengganti hari ini (izin pelatih lain `approved`, pelatih ini = pengganti) plus clock-in untuk kelas itu;
- angka bulan ini: hadir/telat, absen, jumlah tugas pengganti;
- peringatan spreadsheet program belum diisi;
- pintasan: ajukan izin, riwayat izin, hubungi surel (`landing_config.contact_email`).

Clock-in ditolak jika: libur kelas, izin disetujui untuk kelas itu, sudah clock-in kelas+tanggal itu, di luar jendela jam, profil belum lengkap, atau akun ditangguhkan. **Jarak GPS tidak menolak clock-in.**

**Dampak ke peran lain:** Owner membuka periode invoice; Admin mengatur libur, izin, dan pengumuman; clock-in tampil di dasbor dan absensi Admin.

---

## Overlay: Clock-in

Bukan tab. Dipanggil dari Home atau Attendance.

**Yang dapat dilakukan:**

- memilih kelas (atau terkunci jika sudah dipilih dari kartu);
- GPS: jarak ke pin **pusat kelas** (reguler) atau pin **kelas** (lokasi eksternal atau privat). Eksternal tanpa pin = jarak tidak dihitung. Warna: ≤500 m, ≤2 km, atau lebih. Nilai disimpan di `distance_meters`. **Bukan pagar geografis** — jauh tetap dapat dikirim;
- swafoto opsional; gagal unggah tetap menyimpan absensi tanpa foto;
- kirim → `coach_attendances`: `present` jika paling lambat 15 menit setelah `time_start`, selain itu `late`;
- duplikat kelas+tanggal ditolak.

**Dampak ke peran lain:** Admin absensi dan dasbor; sesi `present`/`late` yang `invoice_id` masih kosong dapat diklaim di Invoice; pin dari Owner **Centers** atau Admin **Settings**.

---

## Overlay: Izin (`leave` dan `leave-history`)

**Yang dapat dilakukan:** mengajukan sakit/izin/lainnya, tanggal, kelas terdampak, **wajib pengganti per kelas** (pelatih aktif, lintas pusat, bukan diri sendiri). Status awal `pending`. Melihat riwayat, alasan tolak, nama pengganti.

**Dampak ke peran lain:** Admin **Leave Requests** menyetujui (dapat mengganti pengganti) atau menolak; kalender Admin menampilkan pengganti; beranda pelatih pengganti mendapat kartu tugas.

---

## 2. Attendance (`absen`)

**Terkunci** jika ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:**

- kartu kelas hari ini plus clock-in atau pindai QR (setelah sudah clock-in);
- **pindai QR member:** mencocokkan member ke kelas pelatih ini (hari ini, atau kelas pertama jika tidak ada jadwal hari ini). Member ditangguhkan ditolak. Telat siswa jika lebih dari 1 menit setelah `time_start` (`hadir` / `telat`). Kelas privat: RPC `consume_private_session` (cek duplikat dulu, sekali per hari);
- **absensi manual member** (bukan GPS): pilih kelas dan tanggal jadwal (56 hari ke belakang), status per siswa aktif, simpan metode `manual`;
- **sesi privat:** mencatat sesi plus mengurangi 1 sesi berbayar;
- riwayat clock-in sendiri (termasuk yang diisi Admin, `is_manual`);
- riwayat sesi member plus rincian nama lewat `/api/coach/attendance-detail`.

**Dampak ke peran lain:** Member melihat hadir/telat; privat mengurangi sisa sesi; Admin absensi; invoice honor hanya memakai clock-in pelatih, bukan absensi member.

---

## 3. Class (`kelas`)

**Tidak terkunci** saat ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:** daftar kelas yang diampu (reguler dan privat); rincian lokasi, tujuan, deskripsi, daftar siswa (`/api/coach/class-members` karena RLS); mengisi tautan spreadsheet (`class_coach_spreadsheets`, satu per pelatih per kelas) sehingga `spreadsheet_filled = true`; melihat spreadsheet pelatih lain; rincian satu member plus riwayat absensinya.

**Tidak** dapat membuat, mengubah harga, atau menugaskan pelatih. Itu Admin atau Owner.

**Dampak ke peran lain:** tautan spreadsheet tampil di rincian kelas Admin/Owner; beranda pelatih memperingatkan jika spreadsheet sendiri kosong.

---

## 4. Invoice (`invoice`)

**Terkunci** jika ditangguhkan atau profil belum lengkap.

**Apa:** Klaim honor sesi, extra, dan reimburse operasional. Bukan gaji staf (staf punya tab reimburse sendiri).

**Yang dapat dilakukan:**

- hanya jika Owner memiliki `invoice_periods` `is_open` (pusat ini **atau** global). Tanpa periode: formulir tertutup, riwayat lama tetap kelihatan;
- memilih sesi `present`/`late` bulan itu yang belum `invoice_id`;
- tarif: khusus pelatih, jika kosong memakai tarif umum kelas (Owner **Coach Rates**). Kelas tanpa tarif **tidak dapat** diklaim;
- menambah extra (wajib `coach_extra_rates`) dan reimburse (uraian, nominal, bukti);
- kirim → `coach_invoices` `pending`, klaim atomik `invoice_id` pada absensi, pemberitahuan Owner;
- rekening dari Profile;
- membatalkan invoice tertunda (`cancel_coach_invoice`, melepaskan klaim sesi);
- riwayat: `pending | approved | rejected | paid`.

**Dampak ke peran lain:** Owner meninjau, membuat draf slip, menerbitkan; dasbor dan Bell Owner; slip pelatih baru muncul setelah **diterbitkan**, bukan saat disetujui saja. Admin tidak meninjau invoice pelatih.

---

## 5. Report Card (`rapor`)

**Terkunci** jika ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:**

- hanya jika Admin membuka `rapor_periods` `is_open` di **cabang aktif**;
- rintisan `rapor_entries` otomatis untuk setiap member di kelas pelatih ini;
- mengisi: level (Owner; semua kelas atau kelas ini), skor, catatan, kepribadian/motivasi/capaian, waktu terbaik;
- menyimpan → `locked = true`;
- pratinjau dan unduh PDF (tanda tangan pelatih, Head of NEXT, konfigurasi sekolah);
- mengunggah tanda tangan digital (`profiles.signature_url`);
- melihat ulasan bintang dari member (identitas disamarkan, `/api/rapor/coach-reviews`).

**Dampak ke peran lain:** Admin daftar terisi/belum dan unduh; Member dan School mengunduh PDF; tanpa periode terbuka tidak dapat mengisi.

---

## 6. Payslip (`payslip`)

**Tidak terkunci** saat ditangguhkan atau profil belum lengkap.

**Yang dapat dilakukan:** daftar `payslips` **hanya** `status=published`; merinci kotor, potongan (pajak, kasbon, lain), bersih, catatan; mencetak.

Draf Owner **tidak** tampil. Kasbon tidak punya tab — hanya baris potongan di slip terbit.

**Dampak ke peran lain:** Owner menerbitkan; **Financial** mencatat pengeluaran.

---

## 7. Profile (`profile`)

**Tidak terkunci** (tempat melengkapi data agar tab lain terbuka).

**Yang dapat dilakukan:** menyunting nama panggilan, gender, tanggal lahir, telepon, spesialisasi, bio, alamat, pendidikan; rekening (wajib untuk membuka kunci); kata sandi; avatar; sertifikat (awal `pending` → Admin **Approvals**); menampilkan QR/`user_no`; keluar.

**Dampak ke peran lain:** Admin **Coach** dan **Approvals**; rekening di invoice dan slip; CMS landing pelatih **bukan** dari sini.

---

## Matriks silang Coach → peran lain

| Fitur Coach | Owner | Admin / Manager Center | Staff | Member | School |
|---|---|---|---|---|---|
| Home | Spanduk periode invoice | Libur, izin, pengumuman, kehadiran langsung | — | — | — |
| Clock-in | Sesi klaim invoice | Absensi + dasbor | — | — | — |
| Izin | — | Leave Requests + kalender | — | — | — |
| Attendance | Sesi honor | Absensi pelatih/member | — | QR hadir/telat; privat −1 sesi | — |
| Class | Spreadsheet di rincian kelas | Spreadsheet + daftar siswa | — | Rincian + riwayat absen | — |
| Invoice | Setuju/tolak/slip/Bell | Tidak meninjau | — | — | — |
| Report Card | Level + tanda tangan Head | Periode + PDF + ulasan | — | PDF + memberi ulasan | PDF afiliasi |
| Payslip | Terbit = tampil di sini | — | — | — | — |
| Profile | Rekening di slip | CRUD pelatih + Approvals | — | — | — |

---

## Alur silang (contoh)

**1. Clock-in menjadi honor.** Lengkapi profil termasuk rekening → clock-in dalam jendela jam (GPS dicatat, tidak menolak) → Owner mengisi tarif → Owner membuka periode invoice → pelatih mengajukan Invoice → Owner menyetujui, membuat, dan menerbitkan slip → tab **Payslip**.

**2. QR member.** Sudah clock-in → pindai. Reguler: `hadir`/`telat`. Privat: satu sesi terpakai, duplikat hari yang sama ditolak. Member ditangguhkan tidak dapat dipindai.

**3. Izin plus pengganti.** Ajukan plus pengganti per kelas → Admin menyetujui → beranda pengganti mendapat kartu plus boleh clock-in → kalender Admin menampilkan pengganti.

**4. Rapor.** Admin membuka periode di cabang aktif → pelatih mengisi dan mengunci → Admin/Member/School mengunduh PDF. Member dapat mengulas selama periode masih terbuka.

**5. Penangguhan atau profil kosong.** Absen, Invoice, Rapor, clock-in terkunci. Kelas, Payslip, Profile, izin tetap dapat. Dasbor Admin dapat memperingatkan kelas tanpa pelatih aktif.
