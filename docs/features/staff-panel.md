# Staff Panel — Daftar Fitur

> Sumber: `src/app/staff/page.tsx` serta panel Owner dan Admin.
> Peran `staff`. Satu pusat (`profiles.branch_id`). Bukan pelatih: tidak ada kelas, QR member, rapor, atau GPS.

## Cara baca

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan staf
- **Dampak ke peran lain** — jika tidak ada, ditulis **hanya Staff**

## Peran dalam sistem

Owner · Admin · Manager Center · Coach · Staff · Member · School · Publik

---

## Lingkup dan kunci operasional

- Akun dibuat Owner atau Admin (`POST /api/admin/users`, peran `staff`). Membuat Admin atau Manager Center dapat otomatis membuat Staff (surel `namastaff@…`).
- **Gerbang masuk:** jika `is_profile_complete = false`, seluruh panel diganti formulir wajib (telepon, gender, tanggal lahir, bank, nomor rekening, nama pemegang). Baru setelah itu tab muncul. Beda dengan pelatih (kunci per tab).
- Tidak ada pemilih banyak pusat. Tidak ada kunci tab karena penangguhan seperti pelatih.
- Honor **bukan** per sesi kelas. Invoice staf = nominal ketik. Reimburse operasional = tab terpisah (`staff_reimbursements`).
- Sakit atau izin staf **bukan** antrian Admin **Leave Requests** (itu pelatih dan member). Staf mencatat sendiri untuk **hari ini** di `staff_attendances`.

---

## Cangkang (bukan tab)

**Yang dapat dilakukan:**

- desktop: Home, Daily Attendance, Invoice, Payslip, Reimburse, Profile;
- navigasi bawah ponsel: Home, Absen, Invoice, Reimburse, Profile (**Payslip tidak ada di navigasi bawah** — buka dari Home atau bilah sisi);
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

**Apa:** Status shift hari ini dan pintasan.

**Yang dapat dilakukan:**

- status: belum clock-in / sedang bertugas / sudah clock-out;
- clock-in → overlay swafoto → baris `staff_attendances` `present` plus jam masuk plus catatan opsional;
- clock-out → mengisi jam keluar (catatan tambahan digabung);
- sakit atau izin hari ini (konfirmasi) → satu baris tanpa jam masuk, hanya jika **belum** ada catatan hari itu;
- kartu: jumlah hari `present` bulan ini, slip terbaru, jumlah klaim reimburse.

Antarmuka meminta swafoto sebelum konfirmasi clock-in. Penyimpanan **tidak** menulis berkas ke storage (berbeda pelatih yang menulis `selfie_url`). Tidak ada GPS.

**Dampak ke peran lain:** Owner, saat membuat slip staf manual, dapat memakai jumlah hari `present`. Admin **tidak** punya tab absensi staf.

---

## Overlay: Clock-in swafoto

Kamera, pratinjau, ambil ulang, konfirmasi. Konfirmasi memanggil clock-in Home. Tidak ada jarak ke pusat.

---

## 2. Daily Attendance (`absen`)

**Apa:** Riwayat `staff_attendances` milik sendiri. Clock-in tidak di tab ini (itu Home).

**Yang dapat dilakukan:** saringan bulan; tabel atau kartu: tanggal, jam masuk, jam keluar, status (`present | sakit | izin | absent`), catatan.

**Dampak ke peran lain:** hari hadir menjadi acuan gaji manual Owner.

---

## 3. Invoice (`invoice`)

**Apa:** Klaim gaji atau honor **nominal ketik**. Bukan daftar sesi kelas. Tetap tabel `coach_invoices` dengan `coach_id` = id staf.

**Yang dapat dilakukan:**

- periode (bulan), uraian, nominal, bukti opsional;
- kirim hanya jika ada `invoice_periods` `is_open`. Di kode staf, kueri **tidak** menyaring `branch_id` (periode terbuka mana pun mencukupi). Pelatih menyaring pusat atau global;
- sisipan invoice `pending` plus butir `manual_fee`, cuplikan rekening;
- pemberitahuan ke Owner;
- riwayat; membatalkan yang `pending` atau `rejected` (`cancel_coach_invoice`).

**Dampak ke peran lain:** Owner **Payslips** (saringan peran staf) → setujui → buat slip → terbitkan. Dasbor dan Bell Owner. Admin tidak meninjau.

---

## 4. Payslip (`payslip`)

**Apa:** Slip yang diterbitkan manajemen.

**Yang dapat dilakukan:**

- gabungan `staff_salaries` (input Owner **Financial → Payroll**) **dan** `payslips` (`coach_id` = staf). Kueri slip **tidak** membatasi `published` seperti pelatih — draf dapat tampil;
- kolom: periode, pokok, tunjangan, reimburse, potongan, bersih, status;
- cetak (mesin yang sama dengan Owner dan pelatih).

Kasbon tidak punya tab — potongan muncul di slip.

**Dampak ke peran lain:** Owner menerbitkan slip atau mengisi `staff_salaries`; **Loan List** menjadi potongan.

---

## 5. Reimburse / Expenses (`expenses`)

**Apa:** Klaim biaya operasional. Bukan invoice gaji.

**Yang dapat dilakukan:**

- mengajukan: uraian, nominal, tanggal nota, kategori (dari Owner Master Data jenis pengeluaran; cadangan Operasional/Perlengkapan/Konsumsi/Lainnya), foto nota;
- hanya jika ada periode invoice terbuka (aturan yang sama dengan Invoice staf);
- sisipan `staff_reimbursements` (nomor `RB-…`);
- daftar status `pending | approved | rejected | cancelled | paid`.

**Dampak ke peran lain:** Owner **Financial** menyetujui, menolak, atau menandai dibayar. Kategori dari Master Data. **Financial** Manager Center **bukan** antrian ini. Tidak masuk tab Invoice.

---

## 6. Profile (`profile`)

**Apa:** Data diri, rekening, QR.

**Yang dapat dilakukan:** menyunting nama, telepon, gender, tanggal lahir, bank; `is_profile_complete` dihitung ulang; menampilkan QR; keluar.

**Tidak** ada unggah sertifikat (itu pelatih) dan **tidak** ada ganti kata sandi di UI ini.

**Dampak ke peran lain:** Owner **Accounts** dan slip; Admin **Settings** (tim pusat).

---

## Matriks silang Staff → peran lain

| Fitur Staff | Owner | Admin / Manager Center | Coach | Member | School |
|---|---|---|---|---|---|
| Gerbang / Profile | Accounts + rekening invoice | Settings: tim + rekening | — | — | — |
| Clock-in/out | Hari hadir → acuan gaji manual | — | — | — | — |
| Sakit/izin hari ini | Tercatat di `staff_attendances` | **Bukan** Leave Requests | — | — | — |
| Attendance | Hitungan hari hadir | — | — | — | — |
| Invoice | Setuju/tolak/slip/Bell | Tidak meninjau | Tabel sama, butir berbeda | — | — |
| Payslip | Terbit / `staff_salaries` / kasbon | — | — | — | — |
| Reimburse | Financial setuju/tolak/lunas | Bukan antrian MC | — | — | — |

---

## Alur silang (contoh)

**1. Staf baru hingga gaji.** Owner atau Admin membuat staf → gerbang profil (HP dan rekening) → clock-in harian → Owner membuka periode invoice → staf mengajukan Invoice nominal → Owner menyetujui, membuat, dan menerbitkan slip (plus potongan kasbon jika ada) → tab **Payslip**.

**2. Reimburse operasional.** Periode terbuka → tab **Expenses** plus nota → Owner **Financial** menyetujui lalu menandai lunas.

**3. Sakit hari ini versus izin pelatih.** Staf menekan Sakit di Home → langsung baris hari ini, tidak ke Admin. Pelatih izin harus disetujui Admin plus pengganti.

**4. Beda honor pelatih versus staf.** Pelatih mengklaim sesi × tarif kelas. Staf mengetik nominal plus uraian. Keduanya `coach_invoices`; Owner membedakan lewat `profiles.role`.
