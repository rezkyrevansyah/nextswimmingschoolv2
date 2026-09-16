# Tiga mesin uang — konsep terkunci

**Produk:** Next Swimming School  
**Kode dokumen:** ALUR-NSS-004  
**Versi:** 1.0  
**Status:** Konsep operasional terkunci  
**Tanggal:** 16 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI

Dokumen ini adalah **sumber kebenaran** pemisahan uang. Ada tiga mesin yang namanya di percakapan sehari-hari sering jadi “bayar”, tetapi **bukan satu tabel**.

Langkah clock-in sampai invoice sampai slip (termasuk sesi covering dan invoice nominal staf) sudah terkunci di `docs/03-alur/03-absensi-izin-honor.md` bab 6–7. Dokumen ini tidak mengulang langkah itu. Ia menjelaskan **kapan** masing-masing mesin boleh jalan, **siapa** yang menyentuh, dan **apa** yang dilarang disatukan.

Tipe siswa: `docs/03-alur/02-siswa.md`. Pusat dan rekening: `docs/03-alur/01-jaringan.md`. Layar: `docs/04-panel/02-admin.md` Payments/Financial, `docs/04-panel/01-owner.md` Payslips/Financial, panel Honor pelatih/staf.

Jika panel bertentangan dengan dokumen ini untuk pemisahan `bills` / invoice honor / slip / Financial, **dokumen ini menang**. Jika dokumen ini bertentangan dengan PRD, **PRD menang** sampai ada addendum.

---

## 1. Mengapa tiga mesin

Uang masuk dari orang tua (iuran kelas). Uang keluar ke pelatih (sesi hadir) dan staf (nominal + nota). Buku keuangan **merekap** keduanya setelah terjadi. Menyatukan ketiganya ke satu tabel membuat iuran siswa masuk gaji, atau sebaliknya.

| Mesin | Nama dokumen | Label UI | Tabel | Siapa yang “bayar” |
|---|---|---|---|---|
| A. Iuran kelas | Tagihan siswa | **Payments** / **Bills** | `bills` | Orang tua (di luar aplikasi) |
| B. Honor orang | Invoice honor lalu slip gaji | **Honor** / **Payslips** | `coach_invoices`, `payslips` | Owner ke pelatih/staf |
| C. Buku | Keuangan | **Financial** | Bacaan A + B + transaksi manual | Tidak menagih, tidak terbit slip |

Periode rapor ≠ periode invoice. Kasbon (`coach_loans`) bukan mesin keempat: itu potongan di draf slip (sub-tab **Payslips → Loans**).

---

## 2. Mesin A — tagihan siswa

**Konteks.** Produk sengaja **tidak** punya gerbang pembayaran. Konfirmasi tetap di WhatsApp. Admin yang menyatakan lunas. TBD-06: gerbang daring ditolak untuk versi ini.

Syarat: siswa **reguler** sudah masuk kelas; rekening dan WA pusat terisi di Owner **Centers**.

### 2.1 Generate bulanan

Yang mengerjakan: Admin atau Manager Center, menu **Payments**.

- Hanya `reguler` yang masuk kelas.
- Satu baris per pasangan siswa × kelas × periode. Yang sudah ada dilewati (KPI-03).
- **Tidak** dibuat: `private`, `school_affiliate` (afiliasi biasanya `school_covered`).
- Pemberitahuan ke Student.

Admin boleh menambah tagihan manual: bulanan, session pack dari `class_packages` (kelas reguler), atau khusus, plus diskon.

Menu **Payments** Admin biasa mengikuti sakelar pusat. Manager Center **selalu** melihat menu itu. Wewenang dicek di peladen (FB-12).

### 2.2 Siswa membayar

1. Tab **Bills** (disembunyikan untuk afiliasi; kartu `unpaid` Home afiliasi juga hilang).
2. Melihat nominal, rekening pusat, tombol WhatsApp Admin (pesan berisi periode dan nama).
3. Transfer di bank/e-wallet. **Tidak** ada unggah bukti di panel Student.
4. Admin menandai lunas: tanggal, metode `transfer` \| `cash` \| `qris`, bukti boleh diunggah **dari sisi Admin**; URL bertanda tangan.
5. Status sah: `unpaid`, `partial`, `paid`, `school_covered`, `free`.
6. Owner **Financial → Income** membaca baris yang sudah diverifikasi.

Sisa sesi privat **bukan** dari `bills.sessions_used`. Lihat `docs/03-alur/02-siswa.md` bab 4.2.

---

## 3. Mesin B — honor pelatih dan staf

**Konteks.** Pelatih dibayar per sesi yang **ia** hadir (Present atau Late), termasuk sesi yang ia cover. Staf dibayar nominal ketik, plus nota terpisah. Admin **tidak** meninjau. Bell honor masuk Owner, bukan Admin.

Syarat bersama: Owner mengisi tarif kelas (untuk pelatih) dan **membuka periode invoice**. Tanpa periode, formulir klaim tertutup; riwayat lama tetap kelihatan.

### 3.1 Pelatih

Langkah lengkap: `docs/03-alur/03-absensi-izin-honor.md` bab 6.

Ringkas: tarif terisi → periode terbuka → klaim sesi Present/Late milik sendiri (termasuk covering; tarif pengganti, bukan tarif pelatih asli) → `pending` → Owner setuju/tolak → draf slip (pajak, kasbon, lain) → **publish** → pelatih melihat hanya `published`; invoice `paid`; cicilan kasbon periode itu tertutup; Financial pengeluaran.

Kelas tanpa tarif tidak dapat diklaim. Draf tidak tampil ke pelatih.

### 3.2 Staf

Langkah lengkap: `docs/03-alur/03-absensi-izin-honor.md` bab 7.

Ringkas: periode terbuka → ketik nominal + uraian + bukti opsional → `pending` → Owner setuju/tolak → draf slip → publish. Reimburse = tabel `staff_reimbursements`, diproses Owner **Financial**, bukan Manager Center, bukan baris invoice.

Payslip staf: `payslips` hanya `published`, plus `staff_salaries` jika Owner mengisi **Financial → Payroll**.

Periode terbuka pada kode staf tidak disaring `branch_id` (PRD US-09). Bukan improvisasi.

### 3.3 Kasbon

Owner **Payslips → Loans** (bukan menu sendiri). Status `active` jadi opsi potongan draf. Setelah slip terbit, pelatih/staf melihatnya di slip, bukan tab kasbon.

---

## 4. Mesin C — Financial

**Konteks.** Buku ini **membaca** mesin A dan B, plus transaksi manual. Bukan tempat generate tagihan, bukan tempat terbit slip, bukan tempat menyetujui invoice pelatih.

| Siapa | Cakupan | Yang tidak ada |
|---|---|---|
| Owner | Semua pusat; lima sub-tab termasuk setuju reimburse dan Payroll | Generate tagihan harian (itu Admin Payments) |
| Manager Center | Satu pusat; pemasukan + pengeluaran manual | Setuju `staff_reimbursements`; menandai invoice pelatih lunas; slip; kasbon |
| Admin biasa | Tidak ada menu Financial | — |

Antarmuka Manager Center **menulis** bahwa reimburse staf diproses Owner.

Saringan tanggal (FB-11): default bulan berjalan; pengguna dapat ganti rentang. Rantai wajib:

`saringan tanggal → kueri → daftar → total → ekspor Excel`

Excel hanya berisi rentang yang sedang tampil. Dilarang: data luar rentang ikut, data dalam rentang hilang, total beda antara layar dan berkas.

Kategori transaksi manual sama dengan Owner **Master Data**.

---

## 5. Siapa menyentuh apa

| Langkah | Owner | Admin | MC | Pelatih | Staf | Siswa |
|---|---|---|---|---|---|---|
| Generate tagihan | Baca di Income | Jika sakelar | Selalu | — | — | Lihat Bills* |
| Tandai lunas + bukti | Baca | Ya | Ya | — | — | WA, bukan unggah |
| Buka periode invoice | Ya | Tidak | Tidak | Klaim jika terbuka | Klaim jika terbuka | — |
| Setuju invoice / terbit slip | Ya | Tidak | Tidak | Lihat published | Lihat published + salaries | — |
| Setuju reimburse | Financial | Tidak | Tidak | — | Ajukan | — |
| Financial | Semua pusat | Tidak | Satu pusat, kurus | — | — | — |

\*Afiliasi tanpa tab Bills.

---

## 6. Jangan tertukar

1. Tagihan siswa ≠ invoice honor ≠ slip gaji.
2. Periode rapor ≠ periode invoice.
3. `class_packages` (tagihan session pack reguler) ≠ sisa sesi privat.
4. Reimburse staf ≠ invoice staf ≠ extra pelatih.
5. Bell Owner (honor) ≠ Bell Admin (operasi pusat).
6. Sakelar Payments tidak mengenai Manager Center.
7. Financial merekap; ia tidak menagih orang tua dan tidak menggaji orang.

## 7. Bukan tujuan

- Gerbang pembayaran dalam aplikasi.
- Unggah bukti oleh siswa.
- Menyatukan `bills` ke satu tabel Financial.
- Admin atau Manager Center meninjau honor / menerbitkan slip.
- Mengisi honor pelatih sebagai gaji bulanan di Payroll (Payroll `staff_salaries` untuk staf).
- Kasbon sebagai menu bilah sisi sendiri.
