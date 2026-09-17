# Staff Panel — Konsep terkunci

> Status: konsep panel terkunci. Niat produk: `docs/01-prd.md`. Umpan balik: `docs/02-umpan-balik.md`.
> Peran `staff`. Satu pusat (`profiles.branch_id`). Bukan pelatih: tidak ada kelas, QR siswa, rapor, atau GPS.
> Sumber perilaku yang sudah ada: `src/app/staff/page.tsx`.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan staf
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Staff**
- **Jangan** — wewenang atau alur yang dilarang

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Student · School · Publik

## Lingkup dan kunci operasional

- Akun dibuat Owner atau Admin (`POST /api/admin/users`, peran `staff`). Membuat Admin atau Manager Center dapat otomatis membuat Staff (surel `namastaff@…`).
- **Gerbang masuk:** jika `is_profile_complete = false`, seluruh panel diganti formulir wajib (telepon, gender, tanggal lahir, bank, nomor rekening, nama pemegang). Baru setelah itu tab muncul. Beda dengan pelatih (kunci per tab).
- Tidak ada pemilih banyak pusat. Tidak ada kunci tab karena penangguhan seperti pelatih.
- Honor **bukan** per sesi kelas. Invoice staf = nominal ketik. Reimburse operasional = sub-tab terpisah di Honor (`staff_reimbursements`).
- Sakit atau izin **hari ini** dicatat sendiri di Home, tanpa menunggu Admin; Bell Admin. Bukan baris yang sama dengan izin pelatih.
- Sakit atau izin **tanggal nanti** diajukan ke Admin **Leave Requests** sub-tab Staff. Setelah disetujui, clock-in di tanggal itu ditolak. Rincian: `docs/03-alur/03-absensi-izin-honor.md` bab 4.3 dan 5.3.

Rantai create staf: profil → clock-in hari ini → klaim nominal / nota → melihat slip.

## Susunan menu terkunci

| No. | Menu | `id` tab | Alasan urutan |
|---|---|---|---|
| 1 | Home | `home` | Status shift; clock-in pertama kali dari sini |
| 2 | Daily Attendance | `absen` | Riwayat absensi yang baru saja dibuat |
| 3 | Honor | `honor` | Payung: Invoice → Reimburse → Payslip |
| 4 | Profile | `profile` | Dasar |

Home dan Daily Attendance **tidak** dilebur. Home = status plus clock-in; Attendance = riwayat.

Di ponsel: Home, Absen, Honor, Profile. Payslip tidak perlu slot navigasi bawah sendiri — masuk Honor.

## Aturan satu pintu

- Invoice, Reimburse, dan Payslip tidak menjadi tiga menu setara. Payung **Honor**; tabel tetap terpisah.
- Swafoto clock-in **harus** tersimpan dan dikompres (FB-07). Bukan pratinjau kamera tanpa unggahan.
- Jangan memasukkan staf ke Leave Requests pelatih.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:**

- desktop: Home, Daily Attendance, Honor, Profile;
- navigasi bawah ponsel: Home, Absen, Honor, Profile;
- Bell, pengalih bahasa, avatar;
- overlay clock-in swafoto.

**Dampak ke peran lain:** mengajukan invoice atau reimburse ditujukan ke **Owner**, bukan Admin.

---

## Gerbang: Lengkapi profil (`StaffProfileGate`)

Bukan tab. Tampil jika `is_profile_complete` masih false.

**Yang dapat dilakukan:** mengisi field wajib, menyimpan (`is_profile_complete = true`), keluar.

**Dampak ke peran lain:** rekening dipakai cuplikan `bank_info` di invoice; Admin **Settings** menampilkan tim plus rekening (hanya baca).

---

## 1. Home (`home`)

**Apa:** Status shift hari ini dan pintasan clock-in.

**Yang dapat dilakukan:**

- status: belum clock-in / sedang bertugas / sudah clock-out;
- clock-in → overlay swafoto → kompres → unggah → baris `staff_attendances` `present` plus jam masuk plus `selfie_url` plus catatan opsional;
- clock-out → mengisi jam keluar (catatan tambahan digabung);
- **Sick** atau **Izin hari ini** (konfirmasi) → satu baris tanpa jam masuk, hanya jika **belum** ada catatan hari itu; Bell Admin;
- pengajuan **Sick**/**Izin tanggal nanti** → `pending` di Admin Leave Requests → Staff;
- kartu: jumlah hari Present bulan ini, slip terbaru, jumlah klaim reimburse.

Tidak ada GPS. Jarak tidak dihitung dan tidak menolak.

**Dampak ke peran lain:** Owner, saat membuat slip staf manual, dapat memakai jumlah hari `present`. Admin/Owner **Attendance → Staff** menampilkan baris plus foto.

---

## Overlay: Clock-in swafoto

Kamera, pratinjau, ambil ulang, konfirmasi.

Rantai wajib utuh (FB-07):

`kamera staf → kompresi → penyimpanan → rekaman absensi (`selfie_url`) → rincian Admin/Owner`

1. Foto berhasil diambil.
2. Foto dikompres **sebelum** atau pada saat unggah, bukan disimpan utuh lalu “nanti dikompres”.
3. URL tersimpan di rekaman absensi staf.
4. Admin/Owner dapat membuka foto itu lagi.
5. Kompresi tidak merusak berkas sampai tidak terbaca.

Tidak ada jarak ke pusat.

**Jangan:** pratinjau tanpa unggahan; menyimpan JPEG asli berukuran besar; menghapus foto dari rincian “supaya hemat” tanpa kompresi.

---

## 2. Daily Attendance (`absen`)

**Apa:** Riwayat `staff_attendances` milik sendiri. Clock-in tidak di tab ini (itu Home).

**Yang dapat dilakukan:** saringan bulan; tabel atau kartu: tanggal, jam masuk, jam keluar, status (`present | sakit | izin | absent`), catatan; buka foto sendiri jika ada.

**Dampak ke peran lain:** hari hadir menjadi acuan gaji manual Owner; baris yang sama di Attendance Admin/Owner.

---

## 3. Honor (`honor`)

Payung tiga sub-tab. Urutan dalam payung mengikuti create lalu hasil.

### A. Invoice

**Apa:** Klaim gaji atau honor **nominal ketik**. Bukan daftar sesi kelas. Tetap tabel `coach_invoices` dengan `coach_id` = id staf. Alur sampai publish: `docs/03-alur/03-absensi-izin-honor.md` bab 7.

**Yang dapat dilakukan:**

- periode (bulan), uraian, nominal, bukti opsional;
- kirim hanya jika ada `invoice_periods` `is_open`. Di kode staf, kueri **tidak** menyaring `branch_id` (periode terbuka mana pun mencukupi) — ini perilaku PRD/US-09, bukan improvisasi;
- sisipan invoice `pending` plus butir `manual_fee`, cuplikan rekening;
- pemberitahuan ke Owner;
- riwayat; membatalkan yang `pending` atau `rejected` (`cancel_coach_invoice`).

**Dampak ke peran lain:** Owner **Payslips** (saringan peran staf) → setujui → buat slip → terbitkan. Dasbor dan Bell Owner. Admin tidak meninjau.

### B. Reimburse

**Apa:** Klaim biaya operasional. Bukan invoice gaji. Tabel `staff_reimbursements`.

**Yang dapat dilakukan:**

- mengajukan: uraian, nominal, tanggal nota, kategori (dari Owner Master Data jenis pengeluaran; cadangan Operasional/Perlengkapan/Konsumsi/Lainnya), foto nota (dikompres);
- hanya jika ada periode invoice terbuka (aturan yang sama dengan Invoice staf);
- sisipan dengan nomor `RB-…`;
- daftar status `pending | approved | rejected | cancelled | paid`.

**Dampak ke peran lain:** Owner **Financial** menyetujui, menolak, atau menandai dibayar. **Financial** Manager Center **bukan** antrian ini. Tidak masuk sub-tab Invoice.

### C. Payslip

**Apa:** Hasil setelah Owner menerbitkan.

**Yang dapat dilakukan:**

- `payslips` (`coach_id` = staf) **hanya** `status = published` — sama dengan pelatih; draf tidak tampil;
- plus `staff_salaries` (input Owner **Financial → Payroll**);
- kolom: periode, pokok, tunjangan, reimburse, potongan, bersih, status;
- cetak (mesin yang sama dengan Owner dan pelatih).

Kasbon tidak punya tab — potongan muncul di slip.

**Dampak ke peran lain:** Owner menerbitkan slip atau mengisi `staff_salaries`; kasbon di Owner **Payslips → Loans** menjadi potongan.

---

## 4. Profile (`profile`)

**Apa:** Data diri, rekening, `public_id` plus QR, kata sandi.

**Yang dapat dilakukan:** menyunting nama, telepon, gender, tanggal lahir, bank; `is_profile_complete` dihitung ulang; **ganti kata sandi**; menampilkan `public_id` (kode `SF`, contoh `NEXT.001.SF.26`) dan QR permanen; keluar.

**Tidak** ada unggah sertifikat (itu pelatih).

**Dampak ke peran lain:** Owner **Accounts** dan slip; Admin **Settings** (tim pusat).

---

## Matriks silang Staff → peran lain

| Fitur Staff | Owner | Admin / Manager Center | Coach | Student | School |
|---|---|---|---|---|---|
| Gerbang / Profile | Accounts + rekening invoice | Settings: tim + rekening | — | — | — |
| Clock-in/out + swafoto | Hari hadir → acuan gaji; Attendance + foto | Attendance Staff + foto | — | — | — |
| Sick/Izin hari ini | Tercatat langsung | Bell; bukan antrian | — | — | — |
| Sick/Izin tanggal nanti | — | Leave Requests → Staff | — | — | — |
| Daily Attendance | Hitungan hari hadir | Hub Attendance | — | — | — |
| Honor → Invoice | Setuju/tolak/slip/Bell | Tidak meninjau | Tabel sama, butir berbeda | — | — |
| Honor → Reimburse | Financial setuju/tolak/lunas | Bukan antrian MC | — | — | — |
| Honor → Payslip | Terbit / `staff_salaries` / kasbon | — | — | — | — |

---

## Alur silang (mengikuti rantai create)

**1. Staf baru hingga gaji.** Owner atau Admin membuat staf → gerbang profil (HP dan rekening) → clock-in harian (swafoto tersimpan) → Owner membuka periode invoice → staf mengajukan Honor → Invoice nominal → Owner menyetujui, membuat, dan menerbitkan slip (plus potongan kasbon jika ada) → Honor → Payslip.

**2. Reimburse operasional.** Periode terbuka → Honor → Reimburse plus nota → Owner **Financial** menyetujui lalu menandai lunas. Manager Center tidak memproses.

**3. Sick hari ini versus izin pelatih versus staf tanggal nanti.** Staf menekan Sick di Home → langsung baris hari ini, Bell Admin. Tanggal nanti → Leave Requests sub-tab Staff, tanpa pengganti. Pelatih Sick/Izin wajib delegasi plus persetujuan.

**4. Beda honor pelatih versus staf.** Pelatih mengklaim sesi × tarif kelas. Staf mengetik nominal plus uraian. Keduanya `coach_invoices`; Owner membedakan lewat `profiles.role`.

---

## Selisih vs kode

| Sekarang di kode | Konsep terkunci |
|---|---|
| Enam tab setara: Home, Daily Attendance, Invoice, Payslip, Reimburse, Profile | Empat slot: Home, Daily Attendance, Honor, Profile |
| Payslip di navigasi desktop; tidak di bawah ponsel | Payslip masuk Honor |
| Overlay minta swafoto, penyimpanan **tidak** menulis berkas | Kompres + `selfie_url` + terlihat di Admin/Owner |
| Profile tanpa ganti kata sandi | Ada ganti kata sandi |
| Kueri Payslip tidak membatasi `published` (draf dapat tampil) | `payslips` hanya `published`; `staff_salaries` tetap |
| Izin hanya hari ini; tanggal nanti dilarang | Tanggal nanti masuk Leave Requests → Staff |
