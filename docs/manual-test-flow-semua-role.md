# Panduan Testing Manual End-to-End — Semua Role

> Disusun 2026-09-01 dengan membaca langsung source code saat ini (schema, komponen panel, middleware, route API) — **bukan** turunan dari `docs/test-scenarios.md` lama. Dokumen ini adalah panduan test manual dari sistem benar-benar kosong sampai seluruh flow CRUD di 6 role (**Owner, Admin, Coach, Member, School, Staff**) bisa dijalankan berurutan tanpa terhambat data yang belum ada.

## Cara pakai dokumen ini

- Kerjakan **berurutan dari Fase 0** — setiap fase menyediakan data yang dibutuhkan fase berikutnya. Jangan lompat ke Fase Coach sebelum Fase Admin selesai membuat Class + assign Coach, misalnya.
- Kolom **Hasil Aktual** dikosongkan untuk diisi tester saat eksekusi (✅ Lolos / ❌ Gagal + catatan).
- Prioritas: 🔴 Kritis (blocker, harus bekerja) · 🟡 Tinggi (fitur inti) · 🟢 Medium (pelengkap/nice-to-have).
- ⚠️ **Known issue** — ditandai pada langkah yang **sudah diverifikasi terhadap kode saat ini** masih berpotensi bermasalah. Klaim bug lama yang saat verifikasi ternyata **sudah fixed** (contoh: middleware role-guard sempat dicurigai hilang, `reviewed_by` sempat dicurigai tidak diisi, periode rapor dobel terbuka) **tidak disebut** di dokumen ini karena sudah tidak relevan.
- Setiap role dibuat lewat `POST /api/admin/users` oleh Admin/Owner — **tidak ada self-registrasi** untuk role selain Member (Member pun harus melalui approval Admin sebelum akun login benar-benar aktif).

---

## Fase 0 — Bootstrap Sistem Kosong (Owner Pertama)

Saat database benar-benar kosong, **tidak ada UI apa pun untuk membuat akun Owner** — harus dibuat manual satu kali di Supabase Dashboard.

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| F0-01 | 🔴 | Di Supabase Dashboard → Authentication → Users → **Add user**, isi email & password, lalu di **User Metadata** tambahkan `{"role": "owner", "full_name": "Nama Owner"}`. | User Auth baru terbuat, `user_metadata.role = "owner"`. |  |
| F0-02 | 🔴 | Buka `/login`, login dengan email/password owner yang baru dibuat. | Redirect otomatis ke `/owner` (logic baca `user_metadata.role`, fallback `/member` kalau role tidak ada). |  |
| F0-03 | 🔴 | Amati network request saat halaman Owner pertama kali load. | `POST /api/owner/init-profile` terpanggil otomatis; response `{ok:true, created:true}`. Row baru muncul di tabel `profiles` dengan `role="owner"` dan `user_no` terisi format terstruktur (`NEXT.xxx.OW.yy`, via RPC `generate_user_no`). |  |
| F0-04 | 🟡 | Refresh halaman Owner lagi. | `init-profile` dipanggil lagi tapi response `{ok:true, created:false}` (idempotent, tidak insert dobel). |  |
| F0-05 | 🟡 | Cek Dashboard Owner (`tab dashboard`). | Semua angka KPI menunjukkan 0 (0 branch, 0 admin, 0 member, dst) karena sistem masih kosong. |  |

---

## Fase 1 — Owner: Setup Awal

Owner adalah prasyarat **semua** role lain — minimal harus ada 1 Branch sebelum Admin/Coach/Member/School/Staff bisa dibuat (semua terikat `branch_id`).

### 1.1 Branches (`tab branches`) — prasyarat wajib

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-01 | 🔴 | Create branch baru: nama, alamat, koordinat lat/lng, nomor WA admin. | Branch tersimpan status `active`, muncul di seluruh dropdown branch (Accounts, Classes, dst). |  |
| OW-02 | 🟡 | Edit branch: ubah alamat & koordinat. | Perubahan tersimpan; koordinat ini nanti dipakai untuk validasi jarak GPS clock-in Coach. |  |
| OW-03 | 🟡 | Archive branch (soft-delete, `status:"archived"`). | Branch hilang dari pilihan aktif tapi data historis tetap ada. |  |
| OW-04 | 🟢 | Hard delete branch lewat `DELETE /api/owner/branches/:id` (pakai branch dummy tanpa data anak). | Branch terhapus permanen; ulangi test dengan branch yang **sudah** punya Admin/Class — pastikan ditolak/diproteksi FK, bukan cascade delete diam-diam. |  |

### 1.2 Accounts (`tab accounts`) — buat semua role turunan

`OwnerAccountsMaster` → `OwnerAccountDetail`, lewat `POST /api/admin/users` / `PATCH` / `DELETE /api/admin/users/:id`.

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-05 | 🔴 | Create akun **Admin** baru untuk branch OW-01. | Akun Admin aktif, `profiles.role="admin"`, terikat ke branch. |  |
| OW-06 | 🟡 | Saat create Admin, aktifkan opsi **auto-create Staff** (`auto_staff`) dengan email/password terpisah. | Dua akun sekaligus terbuat: Admin + Staff dengan `staff.linked_admin_id` menunjuk ke Admin tersebut. |  |
| OW-07 | 🔴 | Create akun **Coach** langsung dari Owner. | `profiles.role="coach"` + row `coach_branches` terbuat. |  |
| OW-08 | 🟡 | Create akun **Member**, **School**, **Staff** langsung dari Owner (masing-masing). | Semua role bisa dibuat Owner tanpa batasan (berbeda dari Admin yang dibatasi ke `coach/member/school/staff` saja). |  |
| OW-09 | 🟡 | Buka `OwnerAccountDetail` salah satu akun, reset password. | `PATCH /api/admin/users/:id` sukses; akun bisa login dengan password baru. |  |
| OW-10 | 🟡 | Ubah role/branch akun via detail page. | Field ter-update, dan akun yang login ulang diarahkan ke panel sesuai role baru. |  |
| OW-11 | 🟢 | Delete salah satu akun percobaan. | `DELETE /api/admin/users/:id` sukses, akun tidak bisa login lagi. |  |
| OW-12 | 🔴 | Login sebagai **Owner** lagi, coba create akun role **owner** lain via Accounts. | Berhasil (Owner satu-satunya role yang boleh membuat Owner baru). |  |

### 1.3 Master Data & Schools config

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-13 | 🟢 | Tab `master`: create kategori transaksi manual global. | Kategori muncul di dropdown `AdminFinancial`/`OwnerFinancial`. |  |
| OW-14 | 🟢 | Tab `schools`: update konfigurasi signature sekolah (toggle tampil/sembunyi, ubah judul signature). | Perubahan tampil di PDF rapor yang didownload School nanti (Fase 6). |  |

### 1.4 Classes (cross-branch)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-15 | 🟡 | Tab `classes`: lihat semua class lintas-branch, assign role head/assistant coach. | Sinkron dengan `class_coaches`, terlihat juga di Admin panel branch terkait. |  |
| OW-16 | 🟢 | Set `rapor_signer_coach_id` untuk salah satu class. | Coach tersebut ditandai sebagai penandatangan rapor resmi untuk class itu. |  |

### 1.4b Competitions (`tab competitions`, lintas-branch)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-16b | 🟢 | Buka tab Competitions sebagai Owner (memakai komponen yang sama dengan Admin, tapi tanpa filter `branch_id`). | Menampilkan kompetisi dari **semua** branch sekaligus, berbeda dari Admin yang hanya melihat branch sendiri (AD-50). |  |

### 1.5 Rapor Levels (`tab levels`) — rubric CRUD

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-17 | 🟡 | Create level baru (misal "Level 1 — Dasar"), tandai aktif. | Row baru di `rapor_levels`, muncul di pilihan Coach saat isi rapor. |  |
| OW-18 | 🟡 | Tambah kriteria (`rapor_level_criteria`) dengan tipe `score_10`, `score_100`, `choice`, dan `text` — satu dari tiap jenis. | Semua jenis kriteria tersimpan dan tampil sesuai tipe input-nya di form Coach. |  |
| OW-19 | 🟢 | Tambah `rapor_level_distances` & `rapor_level_strokes` (jarak & gaya renang) untuk level ini. | Data referensi ini nanti dipakai di `member_best_times`. |  |
| OW-20 | 🟢 | Tambah `rapor_level_best_time_targets` (target waktu per jarak/gaya). | Muncul sebagai pembanding saat Coach input best time member. |  |
| OW-21 | 🟢 | Scope level ke class tertentu via `rapor_level_classes`. | Hanya class yang di-assign yang bisa memilih level ini saat isi rapor. |  |
| OW-22 | 🟢 | Reorder / nonaktifkan / hapus salah satu kriteria. | Urutan & status ter-update; kriteria yang dihapus tidak lagi muncul di rapor baru (rapor lama tetap menyimpan datanya). |  |

### 1.6 Coach Rates (`tab rates`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-23 | 🟡 | Set tarif per class per coach (`coach_rates`) untuk Coach OW-07 di class dari OW-15. | Tersimpan; dipakai sebagai basis hitung invoice Coach (Fase 4). |  |
| OW-24 | 🟢 | Set tarif ekstra (`coach_extra_rates`) untuk sesi tambahan di luar jadwal reguler. | Tersimpan, dipakai saat Coach klaim invoice sesi extra. |  |

### 1.7 Invoices (`tab invoices`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-25 | 🔴 | Buka `invoice_period` baru (bulan berjalan). | Status `is_open=true`; ini prasyarat Coach bisa submit invoice (Fase 4). |  |
| OW-26 | 🟡 | Setelah Coach submit invoice (Fase 4), approve salah satu invoice. | Status `coach_invoices` → `approved`, notifikasi terkirim ke Coach. |  |
| OW-27 | 🟡 | Reject invoice lain dengan alasan. | Status → `rejected`, Coach menerima notifikasi + alasan. |  |
| OW-28 | 🟡 | Mark invoice yang approved sebagai `paid`. | Status → `paid`; muncul di riwayat payslip Coach. |  |
| OW-29 | 🟢 | Tutup invoice period. | `is_open=false`; Coach tidak bisa submit invoice baru untuk period ini. |  |

### 1.8 Loans (`tab loans` — `payroll/CoachLoans.tsx`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-30 | 🟡 | Buat pinjaman/kasbon untuk Coach OW-07: `principal_amount`, `tenor_months`, `installment_amount`. | Row `coach_loans` status `active`. |  |
| OW-31 | 🟡 | Catat pembayaran installment (`coach_loan_payments`, kind `installment`). | Sisa pinjaman (`remaining`) berkurang sesuai jumlah dibayar. |  |
| OW-32 | 🟢 | Tandai lunas (`paid_off`) setelah semua installment terbayar. | Status berubah, tidak bisa ditambah pembayaran lagi. |  |
| OW-33 | 🟢 | Coba **write-off** pinjaman yang masih ada sisa. | Payment kind `write_off` tercatat sebesar sisa, status → `written_off`. ⚠️ **Known issue**: proses ini insert payment write-off dulu baru update status — kalau update status gagal setelah payment berhasil, akan ada payment write-off "menggantung" pada loan yang masih tampil `active`. Uji dengan mematikan koneksi tepat setelah insert payment untuk konfirmasi. |  |
| OW-34 | 🟢 | Cancel pinjaman yang belum ada pembayaran. | Status → `cancelled`. |  |

### 1.9 Financial (`tab financial`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-35 | 🟡 | Create manual transaction jenis `income` dan `expense`, lintas branch. | Tersimpan di `manual_transactions`, muncul di rekap keuangan lintas-branch. |  |
| OW-36 | 🟡 | Edit & delete salah satu transaksi. | Perubahan/hapus tersimpan. |  |
| OW-37 | 🟡 | Input `staff_salaries` untuk Staff yang dibuat di OW-06/OW-08. | Data gaji tersimpan — prasyarat tab Payslip Staff (Fase 7) menampilkan data. |  |
| OW-38 | 🟡 | Setelah Staff mengajukan reimbursement (Fase 7), approve → mark paid. | Status `staff_reimbursements` berubah sesuai aksi, urutan `pending → approved → paid` (atau `rejected`). |  |
| OW-39 | 🟢 | Kelola `manual_transaction_categories` (edit/hapus kategori dari OW-13). | Kategori ter-update; transaksi lama yang memakai kategori terhapus tidak error saat ditampilkan. |  |

### 1.10 Landing CMS (`tab landing`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-40 | 🟡 | CRUD salah satu section (misal `landing_testimonials`): tambah, edit, upload foto, hapus. | Perubahan tersimpan + tampil di landing page publik setelah revalidate. |  |
| OW-41 | 🟡 | Ulangi CRUD untuk section lain: partners, programs, coaches spotlight, why-next, FAQ, branch showcase, `landing_config` global. | Semua section punya CRUD independen dan konsisten. |  |
| OW-42 | 🟡 | Setelah simpan, cek `POST /api/owner/revalidate` terpanggil. | Landing page publik (`/`) menampilkan perubahan tanpa perlu redeploy. |  |

### 1.11 Storage, Activity, Database Manager

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| OW-43 | 🟢 | Tab `storage`: lihat statistik, download, delete salah satu backup/file lewat `/api/storage/*`. | Aksi berhasil sesuai ekspektasi. |  |
| OW-44 | 🟢 | Tab `activity`: filter activity log per branch/entity type. | Menunjukkan histori aksi OW-01 s.d. OW-43 yang sudah dilakukan (ditulis lewat `logActivity`). |  |
| OW-45 | 🔴 | Tab `database`: coba edit satu row tabel non-kritis via `/api/owner/db` (raw table editor). | Berhasil edit — **catatan risiko**: fitur ini "God mode", uji HANYA di data dummy/staging, jangan di data produksi nyata. |  |

---

## Fase 2 — Admin: Setup Operasional

Login sebagai Admin dari OW-05. Urutan berikut mengikuti dependency nyata — Class harus ada sebelum Member bisa dienroll, dan seterusnya.

### 2.1 Settings (`tab settings`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-01 | 🟡 | Update info branch sendiri: alamat, koordinat, nomor WA. | Tersimpan; nomor WA ini yang dipakai tombol WhatsApp di seluruh panel Member/Coach cabang ini. |  |
| AD-02 | 🟢 | Update profil sendiri (nama, foto) via `PATCH /api/admin/users/:id`. | Tersimpan. |  |

### 2.2 Classes (`tab classes`) — prasyarat Coach & Member

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-03 | 🔴 | Create class baru: nama, jadwal hari, jam, kapasitas, `class_type` (`reguler`/`private`), lokasi. | Class tersimpan status `active`. |  |
| AD-04 | 🔴 | Assign Coach (dari OW-07) ke class ini dengan role `head`. | Row `class_coaches` terbuat. ⚠️ **Sudah diverifikasi fixed**: kegagalan insert sekarang menampilkan toast error eksplisit ("Coach assignment failed" + detail), tidak lagi silent-fail — jadi kalau langkah ini gagal, error PASTI terlihat, bukan hilang senyap. |  |
| AD-05 | 🟡 | Tambah Coach kedua dengan role `assistant`, lalu ubah role assistant ↔ head. | Promosi head baru terjadi lebih dulu sebelum demote yang lama (urutan sengaja dibalik di kode untuk menghindari momen "tanpa head coach") — pastikan hasil akhir selalu ada tepat 1 head. |  |
| AD-06 | 🟡 | Create class fee package (`class_packages`) untuk class bertipe `private`. | Package tersimpan, muncul sebagai pilihan saat generate bill session-pack (Fase Member). |  |
| AD-07 | 🟢 | Archive class, lalu restore. | Status `archived` → `active` lagi, data historis tetap utuh. |  |
| AD-08 | 🟢 | Coba enroll member sampai `capacity` penuh, lalu enroll 1 lagi. | Sistem menampilkan warning kapasitas penuh (uji juga di Fase Member saat proses enroll). |  |

### 2.3 Coaches (`tab coaches`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-09 | 🔴 | Create akun Coach baru (Admin hanya bisa untuk branch sendiri). | Akun terbuat + `coach_branches`, popup kredensial (email + password yang **admin ketik sendiri**, ditampilkan lagi di modal `coachCredential` untuk dikirim manual via WA). |  |
| AD-10 | 🟡 | Upload sertifikasi untuk coach ini. | Row `certifications` status `pending`, menunggu approval (lihat AD-24 di Approvement). |  |
| AD-11 | 🟡 | Suspend coach, lalu unsuspend. | `suspend_until`/status ter-update. Coach yang disuspend **tetap bisa login** (tidak diblok middleware) tapi fitur terkunci di dalam halaman Coach — uji lanjutan di Fase Coach (CO-01). |  |
| AD-12 | 🟢 | Archive coach, unarchive. | Status berubah, histori tetap ada. |  |
| AD-13 | 🟢 | Reset password coach lewat modal reset. | Coach bisa login pakai password baru. |  |
| AD-14 | 🟢 | Assign coach yang sama ke branch kedua (multi-branch coach). | Coach muncul di kedua branch, bisa pilih context branch saat login/lihat data. |  |
| AD-15 | 🟢 | Delete akun coach percobaan. | Akun terhapus, tidak bisa login lagi. |  |

### 2.4 Members (`tab members`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-16 | 🔴 | Create member **langsung** (tanpa lewat registrasi publik), tipe `reguler`. | Akun + row `members` terbuat, `pay_status` awal sesuai default. |  |
| AD-17 | 🔴 | Enroll member ini ke class AD-03 (`member_classes`), aktifkan toggle **generate bill**. | Bill pertama otomatis terbuat (`bills`, type `monthly` atau `session_pack` sesuai package). Uji juga enroll ke **2 class sekaligus** dan pastikan bill terbuat untuk **setiap** class (bukan hanya class pertama) — ini titik yang perlu diverifikasi cermat saat eksekusi karena kode referensi ke class memakai `member_classes?.[0]` di salah satu jalur package. |  |
| AD-18 | 🟡 | Create member tipe `private`, enroll ke class `private` dari AD-03, pilih `class_packages` dari AD-06. | Bill dibuat sesuai harga package, bukan harga per-sesi biasa. |  |
| AD-19 | 🟢 | Bulk import member via `/api/admin/import-members` (CSV/Excel). | Semua baris valid terbuat sebagai akun member; baris invalid dilaporkan errornya, tidak membuat data setengah jadi. |  |
| AD-20 | 🟢 | Edit profil member (kontak, kesehatan), resend/ubah email login. | Tersimpan. |  |
| AD-21 | 🟢 | Delete akun member percobaan. | Akun terhapus. |  |

### 2.5 School Panel (`tab school`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-22 | 🔴 | Create akun School baru. | `profiles.role="school"` + row `schools` terbuat. |  |
| AD-23 | 🟡 | Tandai salah satu member (dari AD-16) sebagai `type="school_affiliate"` dengan `school_id` menunjuk ke AD-22. | Member ini nanti muncul di panel School (Fase 6). |  |
| AD-24 | 🟢 | Update info school, lalu delete akun school percobaan lain. | Perubahan/hapus tersimpan; `schools` row ikut terhapus. |  |

### 2.6 Approvement (`tab approve`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-25 | 🔴 | Submit registrasi publik dulu (lihat MB-01 di Fase Member), lalu approve dari sini. | Akun member baru terbuat via `POST /api/admin/users` dengan `registration_id`, `registrations.status → approved`. ⚠️ **Known issue (confirmed)**: password sementara di-generate acak (`Math.random()...`) tapi **tidak pernah ditampilkan ke Admin** setelah approve (tidak ada popup kredensial seperti di alur Coach) — Admin tidak punya cara menyampaikan password ini ke member baru kecuali melakukan reset password manual dulu di tab Members. |  |
| AD-26 | 🟡 | Reject registrasi dengan alasan. | Status → `rejected`, alasan tersimpan/ditampilkan ke calon member. |  |
| AD-27 | 🟡 | Submit registrasi duplikat/approve dua kali pada registrasi yang sama. | Ditolak dengan guard `ALREADY_APPROVED`, tidak membuat akun dobel. |  |
| AD-28 | 🟡 | Approve sertifikasi coach dari AD-10. | Status `certifications → approved`. |  |
| AD-29 | 🟡 | Reject sertifikasi lain dengan alasan. | Status → `rejected` + alasan tersimpan. |  |
| AD-30 | 🟡 | Cek badge counter pending di sidebar saat hanya ada sertifikasi pending (registrasi = 0). | Badge tetap muncul (menghitung `registrations.length + certs.length`, bukan hanya registrasi). |  |

### 2.7 Absensi Coach Manual (`tab absensi`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-31 | 🟡 | Input manual attendance coach (`coach_attendances`) untuk tanggal lampau. | Tersimpan status `present`/`absent`/`late`. |  |
| AD-32 | 🟢 | Edit & delete record attendance ini. | Perubahan/hapus tersimpan. |  |
| AD-33 | 🟢 | Load data dengan banyak baris (>1 halaman), klik "Load More"/paginasi. | Tidak ada baris duplikat di halaman terakhir (pagination range sudah pakai `-1` yang benar). |  |

### 2.8 Announcement (`tab announce`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-34 | 🟡 | Buat announcement untuk **semua member** branch. | Muncul di Home Member (Fase 5) semua member branch ini. |  |
| AD-35 | 🟡 | Buat announcement **khusus** untuk class tertentu (`announcement_classes`). | Hanya member class tersebut yang melihatnya. |  |
| AD-36 | 🟢 | Toggle non-aktifkan, lalu delete announcement. | Hilang dari Home Member. |  |

### 2.9 Izin (`tab izin`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-37 | 🟡 | Admin buat izin **coach** langsung (tanpa request dari coach), pilih pengganti per class. | `coach_leaves` status `approved` langsung, substitute tercatat per class. |  |
| AD-38 | 🟡 | Admin buat izin **member** langsung. | `member_leaves` status `approved`, `created_by_admin=true`. |  |
| AD-39 | 🔴 | Setelah Coach submit leave request (Fase 4), approve dari sini. | Status → `approved`, `reviewed_by` terisi admin yang approve, `reviewed_at` terisi, attendance pengganti otomatis dibuat (`autoCreateMemberAttendances`), notifikasi terkirim ke coach & tiap substitute. |  |
| AD-40 | 🟡 | Reject leave request coach dengan alasan. | Status → `rejected`, `reject_reason` tersimpan, notifikasi ke coach berisi alasan. |  |
| AD-41 | 🟡 | Approve/reject leave request **member** (dari Fase 5 MB-06). | Notifikasi terkirim ke `member.profile_id` yang benar (bukan `member_id`) — verifikasi member yang bersangkutan (bukan orang lain) yang menerima notifikasi. |  |
| AD-42 | 🟢 | Submit leave dari Coach dengan `type: "lainnya"` (opsi yang hanya ada di form Coach, tidak ada di form Admin yang cuma punya `sakit/izin/cuti`). | Cek tampilan value `"lainnya"` di panel Admin ini — pastikan tidak crash/blank karena logic Admin hanya eksplisit menangani `sakit`/`izin`. |  |

### 2.10 Pembayaran (`tab pay`)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-43 | 🔴 | Generate bill bulanan massal untuk semua member aktif periode ini. | Bill baru terbuat untuk tiap member yang belum punya bill periode tersebut (tidak dobel untuk yang sudah ada). |  |
| AD-44 | 🔴 | Verifikasi pembayaran salah satu bill (mark paid). | Status → `paid`, notifikasi terkirim ke member. |  |
| AD-45 | 🟢 | Tandai bill sebagai `partial`, `school_covered`, dan `free` masing-masing pada member berbeda. | Status tersimpan sesuai, tampil benar di Fase Member (MB-05). |  |

### 2.11 Financial, Rapor, Competitions, Dashboard (branch-scoped)

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| AD-46 | 🟡 | CRUD manual transaction (`tab financial`) khusus branch ini. | Hanya transaksi branch ini yang terlihat (dibandingkan Owner yang lintas-branch). |  |
| AD-47 | 🔴 | Buka periode rapor baru (`tab rapor`). | Periode sebelumnya (jika masih terbuka) otomatis ditutup dulu sebelum yang baru dibuka — sudah diverifikasi ada logic ini, konfirmasikan hanya 1 periode `is_open=true` per branch setiap saat. |  |
| AD-48 | 🟢 | Reopen periode yang sudah ditutup. | Periode lain otomatis ditutup lagi, tetap hanya 1 yang aktif. |  |
| AD-49 | 🟢 | `AdminRaporList`: pantau progres pengisian rapor coach untuk periode aktif. | Menampilkan status "sudah isi" / "belum isi" per member/class secara akurat. |  |
| AD-50 | 🟡 | Create competition (`tab competitions`) untuk branch ini, tambah partisipasi member, upload dokumen/sertifikat. | Tersimpan; hanya muncul untuk branch ini (filter `branch_id` aktif, sudah diverifikasi ada di kode). |  |
| AD-51 | 🟢 | Hapus partisipasi/kompetisi percobaan. | Terhapus bersih. |  |
| AD-52 | 🟢 | Cek Dashboard Admin. | KPI branch (jumlah member/coach/class aktif) mencerminkan seluruh data yang dibuat AD-01 s.d. AD-51. |  |

---

## Fase 3 — Coach

Login sebagai Coach dari AD-09 (sudah di-assign ke class AD-03 lewat AD-04).

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| CO-01 | 🔴 | Login sebagai coach yang **sedang disuspend** (dari AD-11). | Login **berhasil** (tidak diblok middleware — beda dari member), tapi tampil banner suspend & fitur-fitur terkunci di dalam halaman Coach. |  |
| CO-02 | 🔴 | Tab Home: lihat kelas hari ini. | Menampilkan class AD-03 sesuai jadwal hari ini, tombol clock-in aktif sesuai jendela waktu (mis. tidak aktif jauh sebelum jam kelas). |  |
| CO-03 | 🔴 | Tab Absen → Clock-In: ambil selfie + izinkan GPS. | `coach_attendances` terbuat; status `present` jika ≤15 menit dari jam mulai, `late` jika lebih. Untuk class dengan `location_type="external"`, validasi jarak GPS ke koordinat branch **dilewati**. |  |
| CO-04 | 🟡 | Submit leave request, pilih 1+ class, wajib isi pengganti (substitute) tiap class. | Tombol submit terkunci sampai **semua** class yang dicentang punya substitute (`canSubmit`). `coach_leaves` + `coach_leave_classes` per-class tersimpan. |  |
| CO-05 | 🟢 | Submit leave dengan `type: "lainnya"`. | Tersimpan; lanjutkan verifikasi tampilannya di AD-42. |  |
| CO-06 | 🔴 | Setelah leave di-approve Admin (AD-39), cek notifikasi & jadwal. | Coach menerima notifikasi approve; substitute yang ditugaskan juga menerima notifikasi terpisah. |  |
| CO-07 | 🔴 | Tab Absen → Scan QR member (member sudah generate QR di profil, lihat MB-11). | `member_attendances` upsert dengan `method="qr"`, status `hadir`/`telat` sesuai jam scan vs jam mulai kelas. ⚠️ **Perlu verifikasi**: logic memilih "class yang aktif sekarang" berdasarkan hari jadwal — kalau coach mengajar **2 class berbeda di hari & jam yang berdekatan**, uji eksplisit apakah scan QR tercatat ke class yang benar, bukan class lain yang jadwalnya juga cocok hari ini. |  |
| CO-08 | 🟡 | Input attendance member manual (bukan QR) untuk 1 sesi, lalu coba input dobel di tanggal/class/member yang sama. | Input kedua ditolak dengan pesan "sudah tercatat" (duplicate check aktif). |  |
| CO-09 | 🟡 | Untuk member `private` (class package), input sesi manual. | `remaining_sessions` di `members` berkurang 1 setiap sesi tercatat. |  |
| CO-10 | 🟡 | Tab Kelas: update link spreadsheet tracking untuk class AD-03. | `classes.spreadsheet_filled` ter-update, terlihat sebagai reminder di Home jika belum diisi. |  |
| CO-11 | 🔴 | Tab Invoice: buat invoice bulanan (item type `class`) sesuai `coach_rates` dari OW-23. | `coach_invoices` + `coach_invoice_items` terbuat, status `pending`, notifikasi ke Owner. |  |
| CO-12 | 🟡 | Tambah item `extra` (sesi tambahan, pakai `coach_extra_rates` dari OW-24). | Item extra ikut terhitung di total invoice. |  |
| CO-13 | 🟡 | Tambah item `reimburse` dengan bukti (link Drive/upload). | Item reimburse masuk invoice, terpisah dari sesi kelas. |  |
| CO-14 | 🟡 | Setelah invoice diapprove/reject Owner (OW-26/OW-27), cek status di tab ini. | Status ter-refresh sesuai aksi Owner. |  |
| CO-15 | 🔴 | Tab Rapor: pilih periode aktif (dari AD-47), pilih level (dari OW-17), isi tiap jenis kriteria (`score_10`, `score_100`, `choice`, `text`). | `rapor_entries` tersimpan lengkap sesuai kriteria level yang dipilih. |  |
| CO-16 | 🟡 | Input best time (`member_best_times`) untuk jarak/gaya dari OW-19, bandingkan ke target OW-20. | Tersimpan, tampil dengan indikator lebih cepat/lambat dari target. |  |
| CO-17 | 🟢 | Lock rapor entry setelah selesai diisi. | Entry tidak bisa diedit lagi tanpa unlock eksplisit. |  |
| CO-18 | 🟢 | Tab Payslip: lihat & print payslip (setelah Owner proses invoice → payroll). | Data payslip sesuai invoice yang sudah `paid`. |  |
| CO-19 | 🟢 | Tab Profile: update data diri, CRUD sertifikasi (tambah baru, hapus yang salah upload). | Tersimpan; sertifikasi baru masuk antrian approval Admin (AD-10/AD-28). |  |
| CO-20 | 🟢 | Tab My Reviews: lihat review/rating dari member (setelah MB-10). | Review yang diberikan member tampil di sini. |  |

---

## Fase 4 — Member

### 4.1 Registrasi publik & approval

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| MB-01 | 🔴 | Buka `/register` (belum login), isi form 3-step lengkap (data diri, kontak, kesehatan). | Row `registrations` status `pending` terbuat — **belum ada akun login**. Lanjutkan ke AD-25 untuk approve. |  |
| MB-02 | 🟡 | Submit form dengan field wajib kosong. | Validasi menahan submit, pesan error jelas per field. |  |
| MB-03 | 🔴 | Setelah AD-25 approve, login dengan email registrasi + password sementara (Admin harus dapatkan lewat reset password manual — lihat catatan known issue di AD-25). | Login sukses, redirect ke `/member`. |  |

### 4.2 Panel Member

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| MB-04 | 🔴 | Tab Home: lihat statistik attendance, bill belum lunas, announcement aktif. | Data konsisten dengan yang dibuat Admin di Fase 2 (AD-17, AD-34, AD-43). |  |
| MB-05 | 🔴 | Tab Schedule: lihat class terdaftar, kontak coach via WA. | Menampilkan class dari AD-17, tombol WA memakai `waLink()` dan nomor dari AD-01. |  |
| MB-06 | 🟡 | Tab Absen: lihat riwayat attendance, filter per bulan/class. | Sinkron dengan attendance yang dicatat Coach (CO-07/CO-08). |  |
| MB-07 | 🔴 | Tab Bills: lihat bill aktif (dari AD-17/AD-43), klik CTA "konfirmasi bayar via WA". | Membuka WhatsApp dengan pesan pre-filled ke nomor admin — **bukan** pembayaran online, murni link WA manual. |  |
| MB-08 | 🟡 | Setelah Admin verifikasi bayar (AD-44), cek bill ini. | Bill berpindah ke riwayat "lunas", tidak lagi di daftar aktif. |  |
| MB-09 | 🔴 | Tab Leave: ajukan izin baru. | `member_leaves` + `member_leave_classes` terbuat, status `pending`. |  |
| MB-10 | 🟡 | Setelah Admin approve/reject (AD-41), cek status & alasan reject. | Status ter-update, alasan reject (jika ada) tampil jelas ke member yang benar (verifikasi notifikasi masuk ke akun member ini sendiri, sesuai perbaikan `member_profile_id`). |  |
| MB-11 | 🟡 | Tab Rapor: lihat hasil rapor (setelah CO-15/CO-17), beri review bintang + pesan ke coach. | `member_reviews` insert/update tersimpan, muncul di CO-20. |  |
| MB-12 | 🟢 | Lihat QR code di Profile, tunjukkan ke Coach untuk scan (CO-07). | QR valid dan dikenali scanner. |  |
| MB-13 | 🟢 | Tab Profile: update kontak (telepon, alamat, catatan kesehatan). | Tersimpan. |  |

---

## Fase 5 — School

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| SC-01 | 🔴 | Login sebagai School (dari AD-22), pastikan member AD-23 (`school_affiliate`) sudah dienroll ke class & rapor-nya sudah diisi Coach (CO-15). | Login sukses, redirect `/school`. |  |
| SC-02 | 🔴 | Tab Rapor: lihat daftar siswa afiliasi, filter by class/coach/status. | Hanya member `school_affiliate` milik school ini yang tampil — **tidak ada data finansial** di panel ini. |  |
| SC-03 | 🟡 | Download PDF rapor 1 siswa. | PDF terbuka/terdownload sesuai signature config dari OW-14. |  |
| SC-04 | 🟡 | Pilih beberapa siswa (select-mode), download ZIP bulk. | ZIP berisi PDF tiap siswa terpilih. |  |
| SC-05 | 🟡 | Tab Absensi: filter rentang tanggal, filter per member/status. | Menampilkan attendance siswa afiliasi sesuai data CO-07/CO-08. |  |
| SC-06 | 🟢 | Export attendance ke Excel. | File `.xlsx` terdownload dengan data sesuai filter aktif. |  |

---

## Fase 6 — Staff

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| ST-01 | 🔴 | Login sebagai Staff (dari OW-06 auto-created, atau OW-08 mandiri). | Redirect otomatis ke `/staff`. |  |
| ST-02 | 🟡 | Tab Home: lihat ringkasan (clock-in status hari ini, dsb). | Tampil sesuai data terkini. |  |
| ST-03 | 🔴 | Tab Absen: clock-in, lalu clock-out. | `staff_attendances` tersimpan status `present`/`absent`/`izin`/`sakit` sesuai aksi. |  |
| ST-04 | 🟡 | Tab Payslip: lihat gaji (setelah OW-37 diisi Owner). | Data payslip tampil sesuai `staff_salaries`. |  |
| ST-05 | 🟡 | Tab Expenses: ajukan reimbursement baru. | `staff_reimbursements` status `pending`, menunggu Owner (OW-38). |  |
| ST-06 | 🟡 | Setelah Owner approve/reject/mark-paid, cek status di sini. | Status ter-refresh sesuai aksi Owner. |  |
| ST-07 | 🟢 | Tab Profile: update data diri. | Tersimpan. |  |

---

## Fase 7 — Lintas-Role & Edge Case

### 7.1 Security — role vs route

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| EDG-01 | 🔴 | Login sebagai **Member**, lalu manual ketik URL `/admin`, `/owner`, `/coach`, `/school`, `/staff` di address bar. | ⚠️ **Perlu diverifikasi eksplisit**: middleware **hanya** mengecek "sudah login atau belum" dan suspend status untuk `/member/*` — **tidak ada** pengecekan "role user cocok dengan panel yang diakses". Uji apakah shell halaman lain benar-benar kosong/gagal load data (karena mengandalkan RLS Supabase di level database), atau ada kebocoran data yang sempat tampil sebelum query gagal. Ulangi untuk kombinasi role×panel lainnya. |  |
| EDG-02 | 🔴 | Ulangi EDG-01 untuk role Coach, School, Staff mencoba akses panel role lain. | Sama seperti di atas — dokumentasikan tiap kombinasi yang bocor data sebagai temuan baru, bukan asumsikan aman. |  |
| EDG-03 | 🟡 | Akses `/member`, `/admin`, dst tanpa login sama sekali. | Redirect ke `/login`. |  |

### 7.2 Suspend & status

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| EDG-04 | 🔴 | Suspend member yang sedang login (AD-11 setara untuk member), coba akses halaman apa pun di `/member/*`. | Dipaksa logout (`supabase.auth.signOut()`) + redirect `/login?suspended=1`. Berlaku untuk **semua** sub-path `/member/...`, tidak hanya `/member` persis. |  |
| EDG-05 | 🟡 | Set `suspend_until` member ke tanggal **besok** (belum lewat). | Member tetap dianggap suspended (perbandingan `suspend_until >= now`), tidak bisa masuk. |  |
| EDG-06 | 🟡 | Query gagal/error saat cek status member (simulasikan, misal RLS ketat/koneksi terputus). | Sistem **fail closed** — tetap redirect ke `/login?suspended=1` daripada meloloskan member yang sebenarnya berstatus tidak jelas. |  |

### 7.3 Lainnya

| No | Prioritas | Langkah Test | Hasil yang Diharapkan | Hasil Aktual |
|---|---|---|---|---|
| EDG-07 | 🟢 | Enroll member ke class yang `capacity` sudah penuh. | Sistem menampilkan warning kapasitas, baik dari sisi Admin (AD-08) maupun alur lain yang menyentuh enrollment. |  |
| EDG-08 | 🟢 | Coba akses `/login` saat sudah login. | Redirect otomatis ke `/${role}` sesuai `user_metadata.role`. |  |
| EDG-09 | 🟢 | Logout dari tiap role, pastikan kembali ke `/login` dan tidak bisa back-button ke panel sebelumnya. | Session benar-benar berakhir. |  |

---

## Lampiran A — Referensi Nilai Enum/Status

Direverse-engineer langsung dari kode (tipe Supabase generated di `src/types/database.ts` masih stub `any`, jadi tidak bisa dipakai sebagai referensi type-safe — nilai di bawah ini diverifikasi dari literal string yang benar-benar dipakai di query/insert).

| Domain | Nilai yang valid |
|---|---|
| `profiles.role` | `owner`, `admin`, `coach`, `member`, `school`, `staff` |
| `members.type` | `reguler`, `private`, `school_affiliate` |
| `members.status` | `active`, `suspended` |
| Bill/pay status | `unpaid`, `paid`, `partial`, `school_covered`, `free` |
| `bills.type` | `monthly`, `session_pack` |
| `member_attendances.status` | `hadir`, `telat`, `izin`, `sakit`, `tidak_hadir` |
| `member_attendances.method` | `qr`, `selfie`, `manual` |
| `coach_attendances.status` | `present`, `absent`, `late` |
| `staff_attendances.status` | `present`, `absent`, `izin`, `sakit` |
| `certifications.status` | `pending`, `approved`, `rejected` |
| Leave status (`coach_leaves`/`member_leaves`) | `pending`, `approved`, `rejected` |
| Leave type — form Admin | `sakit`, `izin`, `cuti` |
| Leave type — form Coach (self-request) | `izin`, `sakit`, `lainnya` ⚠️ set opsi berbeda dari form Admin — lihat AD-42/CO-05 |
| `coach_invoices`/`staff_invoices`/`staff_reimbursements.status` | `pending`, `approved`, `paid`, `rejected`, `cancelled` |
| `coach_invoice_items.item_type` | `class`, `extra`, `reimburse` |
| `coach_loans.status` | `active`, `paid_off`, `written_off`, `cancelled` |
| `coach_loan_payments.kind` | `installment`, `manual_adjustment`, `write_off` |
| `payslip_deductions.type` | `tax`, `loan`, `bpjs`, `absence_penalty`, `other` |
| `payslips.status` | `draft`, `published` |
| `tax_settings.mode` | `percent`, `fixed` |
| `class_criteria.kind` / `rapor_level_criteria.kind` | `score_10`, `score_100`, `choice`, `text` |
| `class_coaches.role` | `head`, `assistant` |
| `classes.status` / `branches.status` | `active`, `archived` |
| `classes.class_type` | `reguler`, `private` |
| `registrations.status` | `pending`, `approved`, `rejected` |
| `registrations.phone_owner` | `self`, `parent` |
| `notifications.kind` | `info`, `warn`, `danger`, `success` |
| `manual_transactions.kind` | `income`, `expense` |
| `rapor_signature_assignments.context` | `reguler`, `private`, `school` |
| `profiles.gender` | `male`, `female` |
| `profiles.locale` | `en`, `id` |
| Competition `level` | `internal`, `local`, `regional`, `national`, `international` |
| Competition `result_status` | `finished`, `finalist`, `dq`, `dns`, `dnf` |
| Competition `award` | `participant`, `gold`, `silver`, `bronze`, `fourth_place`, `finalist`, `custom` (+ `custom_award_label` teks bebas) |

## Lampiran B — Rantai Dependency Data (ringkasan)

```
Owner: buat Branch
  → Owner/Admin: buat Coach account
    → Admin: buat Class + assign Coach
      → Admin: buat/approve Member + enroll ke Class → auto-generate Bill
        → Admin: buat School account + tandai Member sebagai school_affiliate
Owner: set Coach Rates + buka Invoice Period  → prasyarat Coach submit Invoice
Admin: buka Rapor Period (+ Owner sudah setup Rapor Levels) → prasyarat Coach isi Rapor
Owner/Admin: buat Staff account (independen) → Owner isi Staff Salaries → prasyarat tab Payslip Staff
```

## Lampiran C — Automated testing yang sudah ada

Proyek ini juga punya Playwright e2e suite di `tests/e2e/*.spec.ts` (project: `public`, `owner`, `admin`, `coach`, `member`, `school`, `flow-owner`, `flow-admin`, `flow-coach`, `flow-member`) yang menggunakan storage-state login per role via `tests/global-setup.ts` (butuh env `TEST_<ROLE>_EMAIL`/`TEST_<ROLE>_PASSWORD` di `.env.test`). Cocok dipakai sebagai **regression check cepat** setelah suatu perubahan kode, tapi **tidak menggantikan** panduan manual ini — suite tersebut belum mencakup role Staff maupun modul-modul baru Owner (levels, rates, invoices, loans, financial, landing CMS, database manager).
