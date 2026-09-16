# Absensi, izin, delegasi, dan honor — konsep terkunci

**Produk:** Next Swimming School  
**Kode dokumen:** ALUR-NSS-001  
**Versi:** 1.0  
**Status:** Konsep operasional terkunci  
**Tanggal:** 16 September 2026  
**Bahasa:** Bahasa Indonesia sesuai PUEBI

Dokumen ini adalah **sumber kebenaran** lima alur lintas peran: status kehadiran, delegasi sesi pelatih, persetujuan Sick/Izin, invoice pelatih sampai slip terbit, invoice staf sampai slip terbit, dan absensi siswa/pelatih/staf.

Menu layar: `docs/04-panel/`. Mulai baca: `docs/README.md`. Niat dan KPI tetap di `docs/01-prd.md`. Kesalahan yang tidak boleh diulang tetap di `docs/02-umpan-balik.md` (terutama FB-05). Ambang menit clock-in mengikuti KPI-05 / US-03 / US-04 di PRD; dokumen ini tidak mengarang ulang angka itu. Saudara: `docs/03-alur/01-jaringan.md` (pusat/akun/kelas), `docs/03-alur/02-siswa.md` (tiga tipe), `docs/03-alur/04-uang.md` (pemisah tiga mesin uang), `docs/03-alur/05-rapor-sekolah.md` (rapor dan Excel).

Jika panel bertentangan dengan dokumen ini untuk kelima alur di atas, **dokumen ini menang**. Jika dokumen ini bertentangan dengan PRD, **PRD menang** sampai ada addendum. Addendum disarankan untuk: jadwal pengganti otomatis, honor ke pelatih yang mengajar, dan izin staf tanggal nanti.

---

## 1. Tiga lapisan yang tidak boleh dicampur

| Lapisan | Pertanyaan | Contoh |
|---|---|---|
| **Pengajuan** | Siapa bilang tidak bisa datang, kapan, alasan apa? | Pelatih mengajukan Sick untuk sesi Rabu 16.00 |
| **Delegasi** | Siapa yang mengajar sesi yang kosong? | Hanya pelatih. Bukan arti kata Supported |
| **Hasil absensi** | Apa yang tercatat setelah sesi atau shift terjadi? | Present, Late, Absent, Sick, Izin |

**Supported / Izin** = alasan resmi tidak hadir (bukan sakit). Bukan “didukung pengganti”. Pengganti adalah syarat *sampingan* yang wajib hanya untuk pelatih, karena kelas tidak boleh tanpa pengajar.

Libur kelas (`class_holidays`) bukan pengajuan orang. Kelas libur = tidak ada sesi = tidak ada clock-in, tidak ada pindai, tidak ada honor.

---

## 2. Kosakata status

Label klien di kolom kiri. Istilah dokumen di tengah. Label UI Inggris.

| Label klien | Istilah dokumen | Label UI | Pelatih | Staf | Siswa |
|---|---|---|---|---|---|
| Present | hadir | **Present** | Ya, dari clock-in | Ya, dari clock-in | Ya, dari pindai atau roster pelatih |
| Late | telat | **Late** | Ya, clock-in setelah ambang PRD masih dalam jendela | Tidak. Staf tidak punya jam sesi kelas | Ya, dipindai setelah ambang PRD |
| Absent | tidak hadir | **Absent** | Ya, tidak clock-in dan tidak ada pengajuan sah | Ya, tidak clock-in dan tidak ada pengajuan sah | Ya, sisa roster yang dikunci pelatih |
| Sick | sakit | **Sick** | Ya, pengajuan + wajib delegasi | Ya, pengajuan tanpa delegasi | Ya, pengajuan tanpa delegasi |
| Supported / Izin | izin | **Izin** | Ya, pengajuan + wajib delegasi | Ya, pengajuan tanpa delegasi | Ya, pengajuan tanpa delegasi |

Siswa **tidak** menandai Present sendiri dan **tidak** memindai QR sendiri (FB-05).

Tipe pengajuan siswa (`izin`, `sakit`, `ujian`, `lainnya`) **bukan** status absensi. Setelah disetujui, hasil yang masuk rekaman hanya **Sick** atau **Izin**. `ujian` dan `lainnya` menjadi **Izin**.

Tiga rekaman tetap terpisah: pelatih, siswa, staf. Jangan mencampur tabel. Hub Admin/Owner membaca ketiganya.

---

## 3. Delegasi sesi pelatih

Kelas renang tidak boleh tanpa pengajar. Setiap pengajuan Sick atau Izin pelatih **wajib** menunjuk siapa yang mengajar setiap sesi terdampak.

### 3.1 Siapa yang boleh menjadi pengganti

Daftar = **seluruh pelatih aktif di semua cabang** jaringan NEXT.

Syarat masuk daftar:

- peran `coach`;
- bukan arsip;
- bukan sedang ditangguhkan;
- profil lengkap (agar bisa clock-in);
- **bukan** diri sendiri.

Tampilan: dikelompokkan per pusat, bisa dicari nama. Cabang berbeda dari pelatih yang izin **boleh** dipilih. Pelatih yang sudah terikat banyak pusat tidak diduplikasi; satu orang satu baris plus label pusat primernya.

### 3.2 Cara memilih

- Wajib **per sesi** (kelas + tanggal + jam), bukan satu nama untuk seluruh rentang.
- Satu pengajuan boleh banyak sesi; tiap sesi boleh pengganti berbeda.
- Jika pengganti sudah punya sesi di jam yang sama (kelas sendiri atau covering lain): **blokir**. Jangan hanya peringatan yang bisa dilewati.
- Sesi di tanggal libur kelas tidak bisa diajukan.

### 3.3 Sebelum disetujui (`pending`)

- Pelatih asli **tetap** bertanggung jawab. Tombol clock-in masih hidup.
- Pengganti **belum** melihat sesi itu di Class atau Home.
- Admin pusat **kelas itu** (bukan pusat pengganti) yang meninjau.
- Admin boleh mengganti nama pengganti sebelum setuju. Tolak wajib alasan.

### 3.4 Setelah `approved` — jadwal otomatis

Tanpa langkah tambahan dari pengganti:

1. Sesi muncul di tab **Class** pengganti: “Menggantikan {nama pelatih asli} · {nama kelas} · {pusat kelas} · {jam}”.
2. Kartu clock-in muncul di **Home** pengganti pada hari itu, jendela jam sama dengan sesi kelas (KPI-05).
3. Pelatih asli: sesi itu **Sick** atau **Izin**, clock-in mati, nama pengganti tampil.
4. **Class Activity** Admin menampilkan acara pengganti di kisi jam itu.
5. Jadwal siswa tidak hilang. Nama pelatih yang mengajar hari itu = pengganti.
6. GPS clock-in pengganti memakai pin **kelas itu** (pusat kelas, atau pin privat/eksternal), bukan pin pusat primer pengganti.

Ini menutup lubang “hanya kartu di beranda”. Jadwal sesi pengganti adalah data yang sama, bukan salinan yang diketik ulang.

### 3.5 Honor sesi covering

Yang berhak klaim = pelatih yang **clock-in Present atau Late** di sesi itu.

- Pelatih asli **tidak** boleh klaim sesi yang sudah didelegasikan dan disetujui.
- Pengganti klaim memakai: (1) tarif khusus pengganti untuk kelas itu jika ada, else (2) tarif umum kelas, else tidak dapat diklaim sampai Owner mengisi tarif.
- Jangan memakai tarif khusus pelatih asli.

### 3.6 Jika pengganti gagal hadir

- Sampai `time_end` tanpa clock-in: pengganti **Absent** untuk sesi covering.
- Pelatih asli tetap Sick/Izin.
- Dasbor Admin memperingatkan “kelas tanpa clock-in”.
- Jika pengganti kemudian Sick/Izin pada sesi covering: ia mengajukan izin **baru** plus pengganti baru. Pelatih asli **tidak** otomatis kembali mengajar.

### 3.7 Batal setelah disetujui

Hanya jika pengganti **belum** clock-in. Pelatih asli atau Admin dapat membatalkan. Sesi hilang dari jadwal pengganti. Tanggung jawab dan clock-in kembali ke pelatih asli. Jika pengganti sudah clock-in, izin tidak dapat dibatalkan; koreksi lewat Admin **Attendance** manual.

---

## 4. Alur persetujuan Sick dan Izin

Satu mesin status: `pending` → `approved` | `rejected` | `cancelled`.

```
Pelatih / siswa / staf (tanggal nanti)
        │
        ▼
   pengajuan pending
        │
        ├── Admin setuju ──► approved ──► efek absensi (+ delegasi jika pelatih)
        ├── Admin tolak  ──► rejected  (+ alasan; tidak ada efek absensi)
        └── pemohon batal ──► cancelled (hanya selama pending)
```

Staf **hari ini** tidak masuk mesin ini. Lihat 4.3.

### 4.1 Pelatih

1. Buka overlay izin (bukan tab).
2. Pilih jenis: **Sick** atau **Izin**.
3. Pilih sesi terdampak (kelas + tanggal yang ada di jadwalnya, termasuk sesi covering yang sudah disetujui).
4. Untuk tiap sesi: pilih pengganti dari daftar seluruh cabang (bab 3).
5. Kirim → `pending`.
6. Admin pusat kelas: setuju / ganti pengganti lalu setuju / tolak plus alasan.
7. Jika setuju: bab 3.4 jalan otomatis.

### 4.2 Siswa

1. Tab **Leave**: jenis Sick atau Izin (plus ujian/lainnya sebagai alasan; hasil absensi tetap Izin).
2. Minimal satu kelas dan satu tanggal.
3. Kirim → `pending`. Tidak ada pengganti.
4. Admin pusat siswa setuju atau tolak plus alasan.
5. Jika setuju: pada setiap tanggal yang jatuh di `schedule_days` kelas itu, sisip hasil **Sick** atau **Izin**. Home dan Schedule menampilkan lencana. Pelatih melihat baris itu praterisi di roster; tidak boleh menimpa jadi Present.

### 4.3 Staf

**Hari ini.** Tombol Sick atau Izin di Home. Langsung tercatat, tanpa menunggu Admin. Bell Admin. Tidak ada delegasi. Tidak bisa jika hari itu sudah ada baris Present.

**Tanggal nanti.** Pengajuan `pending` ke Admin **Leave Requests** sub-tab Staff. Tanpa delegasi. Setelah `approved`, clock-in di tanggal itu ditolak. Setelah `rejected`, staf masih bisa clock-in.

Staf tidak masuk antrian yang sama sebagai baris pelatih. Satu menu Leave Requests, **tiga sub-tab**: Coach · Student · Staff.

### 4.4 Yang tidak masuk antrian ini

- Libur kelas.
- Sertifikat pelatih dan pendaftaran `/register` (itu **Approvals**).
- Invoice honor (itu Owner).

---

## 5. Alur absensi

### 5.1 Pelatih

```
Profil lengkap, tidak ditangguhkan, sesi bukan libur, bukan Sick/Izin approved
        │
        ▼
Clock-in dalam jendela PRD (3 jam sebelum time_start sampai time_end)
        │
        ├── dalam ambang Present PRD ──► Present
        └── masih dalam jendela, lewat ambang ──► Late
        │
        ▼
Langsung ke pindai QR kelas itu
```

- GPS dicatat dan diwarnai; jauh **tidak** menolak.
- Swafoto opsional, dikompres; gagal unggah tetap menyimpan baris.
- Duplikat kelas+tanggal ditolak.
- Sampai `time_end` tanpa clock-in dan tanpa Sick/Izin `approved` → **Absent** (sistem).
- Sick/Izin `approved` → clock-in mati.
- Sesi covering memakai aturan yang sama; pin = lokasi kelas yang digantikan.
- Admin dapat input manual Present/Late/Absent (`is_manual`) di hub Attendance.

### 5.2 Siswa

Siswa tidak punya tombol hadir dan tidak punya pemindai.

```
Pelatih (asli atau pengganti) sudah Present atau Late
        │
        ▼
Roster sesi:
  - Sick/Izin approved sudah praterisi, terkunci
  - Pindai QR → Present atau Late (ambang PRD)
  - Ditangguhkan → ditolak
  - Privat sah → Remaining sessions −1, sekali per hari
        │
        ▼
Pelatih kunci roster
        │
        └── nama yang masih kosong, setelah konfirmasi ──► Absent
```

Tanpa kunci roster, sisa nama **bukan** otomatis Absent (hindari hukuman karena pelatih lupa memindai). Absensi manual Admin/pelatih untuk tanggal jadwal tetap ada, mundur sesuai US-04.

### 5.3 Staf

Tidak ada kelas, QR siswa, atau GPS.

```
Gerbang profil lengkap
        │
        ├── Clock-in + swafoto kompres ──► Present (+ jam masuk)
        │         └── Clock-out ──► jam keluar
        ├── Sick/Izin hari ini ──► Sick atau Izin (bab 4.3)
        ├── Sick/Izin tanggal nanti approved ──► tidak bisa clock-in
        └── Akhir hari tanpa baris sah ──► Absent
```

Tidak ada Late untuk staf.

### 5.4 Siapa melihat hasilnya

| Hasil | Pelatih | Staf | Siswa | Admin / Owner | School |
|---|---|---|---|---|---|
| Present / Late / Absent / Sick / Izin | Hub Attendance; invoice hanya Present/Late | Hub Attendance; acuan hari hadir | Tab Attendance hanya baca | Hub tiga sub-tab + foto | Excel afiliasi, status sama |

---

## 6. Invoice pelatih sampai payslip terbit

Honor pelatih = sesi yang **ia** clock-in Present atau Late, termasuk sesi covering. Bukan gaji bulanan. Bukan tagihan siswa.

```
Owner mengisi Coach Rates (umum kelas dan/atau khusus pelatih)
        │
        ▼
Owner membuka periode invoice (satu pusat atau global)
        │
        ▼
Pelatih, periode terbuka, profil lengkap, tidak ditangguhkan:
  pilih sesi Present/Late milik sendiri yang invoice_id kosong
  (+ extra jika ada tarif extra; + reimburse operasional opsional)
        │
        ▼
Kirim → invoice pending
  sesi terkunci ke invoice itu
  Bell Owner (bukan Bell Admin)
        │
        ├── Owner tolak + alasan ──► sesi dilepas, boleh diklaim lagi
        └── Owner setuju
                │
                ▼
        Buat draf slip (satu atau gabungan invoice disetujui;
        atau manual tanpa invoice)
                │
                ▼
        Sunting potongan: pajak, kasbon, lain
                │
                ▼
        Publish
                │
                ├── payslips.status = published
                ├── invoice terkait = paid
                ├── cicilan kasbon periode itu tertutup
                ├── Financial mencatat pengeluaran
                └── pelatih melihat slip di Honor → Payslip
                    (draf tidak tampil)
```

Tanpa periode terbuka: formulir tertutup, riwayat lama tetap kelihatan. Kelas tanpa tarif tidak dapat diklaim. Admin **tidak** meninjau.

---

## 7. Invoice manual staf sampai payslip terbit

Honor staf = nominal ketik, bukan sesi × tarif. Reimburse nota adalah klaim terpisah, bukan baris invoice.

```
Owner membuka periode invoice
        │
        ▼
Staf (profil lengkap):
  periode + uraian + nominal + bukti opsional
        │
        ▼
Kirim → invoice pending (butir manual_fee)
  Bell Owner
        │
        ├── Owner tolak + alasan
        └── Owner setuju
                │
                ▼
        Draf slip
          (boleh gabung beberapa invoice disetujui;
           reimburse yang approved/paid boleh jadi baris)
                │
                ▼
        Potongan termasuk kasbon
                │
                ▼
        Publish
                │
                ├── payslips published
                ├── invoice paid
                ├── Financial pengeluaran
                └── staf melihat Honor → Payslip
                    hanya published, plus staff_salaries
                    jika Owner mengisi Financial → Payroll
```

Jalur reimburse: Honor → Reimburse → `staff_reimbursements` → Owner **Financial** setuju/tolak/lunas. Manager Center **bukan** antrian ini. Periode terbuka memakai aturan PRD US-09 (kueri staf tidak menyaring `branch_id`).

---

## 8. Jangan tertukar

1. Present/Late/Absent/Sick/Izin adalah **hasil absensi**, bukan jenis tombol yang sama untuk semua peran.
2. Supported = Izin. Bukan delegasi.
3. Delegasi hanya pelatih. Siswa dan staf tidak menunjuk pengganti.
4. Izin pelatih ≠ izin siswa ≠ izin staf ≠ libur kelas.
5. Clock-in pelatih ≠ clock-in staf. Siswa tidak clock-in.
6. Yang boleh masuk invoice pelatih hanya Present dan Late miliknya, termasuk covering.
7. Invoice staf bukan daftar sesi.
8. Tagihan siswa (`bills`) ≠ invoice honor ≠ slip gaji.
9. Bell Owner (honor) ≠ Bell Admin (izin dan operasi pusat).
10. Admin tidak meninjau honor. Owner tidak mengisi absensi harian di kolam.

## 9. Bukan tujuan

- Siswa menandai hadir sendiri atau memindai QR sendiri.
- Pagar GPS yang menolak clock-in.
- Satu orang pengganti otomatis untuk semua sesi tanpa dipilih.
- Pelatih asli tetap menerima honor sesi yang sudah didelegasikan.
- Staf memakai Leave Requests pelatih sebagai baris yang sama.
- Manager Center menyetujui invoice atau reimburse.
- Gerbang pembayaran atau unggah bukti oleh siswa.

---

## 10. Dampak ke menu panel

| Alur | Dimana diajukan | Dimana disetujui | Dimana terlihat hasilnya |
|---|---|---|---|
| Delegasi + Sick/Izin pelatih | Coach overlay izin | Admin **Leave Requests** → Coach | Class/Home pengganti; Attendance; Class Activity |
| Sick/Izin siswa | Student **Leave** | Admin **Leave Requests** → Student | Roster pelatih; Student Attendance; School Excel |
| Sick/Izin staf hari ini | Staff Home | Tidak menunggu; Bell Admin | Attendance Staff |
| Sick/Izin staf tanggal nanti | Staff (pengajuan) | Admin **Leave Requests** → Staff | Clock-in dikunci di tanggal itu |
| Absensi sesi | Coach Attendance (QR/roster) | — | Hub Admin/Owner; Student; School |
| Invoice pelatih → slip | Coach **Honor** → Invoice | Owner **Payslips** | Coach **Honor** → Payslip; Financial |
| Invoice staf → slip | Staff **Honor** → Invoice | Owner **Payslips** | Staff **Honor** → Payslip; Financial |
| Reimburse staf | Staff **Honor** → Reimburse | Owner **Financial** | Payslip (baris) jika sudah paid |

Rincian wewenang layar: `docs/04-panel/01-owner.md`, `docs/04-panel/02-admin.md`, `docs/04-panel/03-coach.md`, `docs/04-panel/04-staff.md`, `docs/04-panel/05-student.md`.
