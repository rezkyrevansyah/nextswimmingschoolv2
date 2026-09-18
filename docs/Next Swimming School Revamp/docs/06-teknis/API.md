# Kontrak API yang tertulis di dokumen

**Produk:** Next Swimming School  
**Status:** Hanya endpoint yang sudah disebut PRD/panel/alur  
**Tanggal:** 16 September 2026

Jangan mengarang path baru “supaya rapi” jika perilaku sudah ada di rute lain. Wewenang dicek di peladen (FB-12). Menyembunyikan tab bukan keamanan.

Auth, Postgres, dan storage: Supabase. Akses data lewat Drizzle. Rincian koneksi: `CLAUDE.md` bagian 6.

---

## 1. Aturan bersama

- Isolasi `branch_id` kecuali Owner dan pelatih yang ditautkan.
- Admin biasa ditolak pada Financial / slip / kasbon / landing / storage meskipun URL ditebak.
- Manager Center selalu Payments + Financial satu pusat; tetap bukan Owner.
- Pratinjau Owner memakai `sessionStorage.ownerPreviewBranch`, bukan cookie, dan tidak menaikkan wewenang Admin.
- Bukti bayar: URL bertanda tangan; unggah hanya Admin.
- Ulasan rapor: identitas pengulas disamarkan di peladen.
- Setiap mutasi merusak (hapus pusat, hapus berkas, hapus slip) wajib konfirmasi di UI + penolakan tanpa sesi sah.

---

## 2. Endpoint yang sudah tertulis

| Method | Path | Siapa | Efek |
|---|---|---|---|
| `POST` | `/api/owner/init-profile` | Owner masuk pertama | Membuat baris profil Owner |
| `POST` | `/api/admin/users` | Owner; Admin terbatas | Buat pengguna operasional. Admin **tidak** membuat Owner/Admin. Membuat Admin/MC boleh otomatis membuat Staff (`namastaff@…`) |
| `POST` | `/api/owner/revalidate` | Owner | Setelah sunting CMS landing |
| `GET` | `/api/storage/stats` | Owner | Statistik ember System Storage |
| (lihat kode) | `/api/rapor/coach-reviews` | Pelatih / sistem rapor | Ulasan disamarkan |
| (lihat kode) | `/api/coach/class-students` | Pelatih | Daftar siswa kelas; dipakai karena RLS |
| (lihat kode) | `/api/coach/attendance-detail` | Pelatih | Detail absensi kelas; karena RLS |

"(lihat kode)" = metode HTTP tidak dikunci di PRD. Ikuti kode yang ada. Jangan ganti path.

---

## 3. RPC yang sudah tertulis

| Nama | Siapa / kapan | Aturan |
|---|---|---|
| `consume_private_session` | Absensi siswa privat sah | Sekali per hari; duplikat ditolak; `remaining_sessions` −1 |
| `cancel_coach_invoice` | Owner / alur batal invoice | Melepas kunci sesi yang diklaim |

Jangan memanggil `consume_private_session` dari panel Student.

---

## 4. Perilaku yang wajib ada meski path belum dinamai di PRD

Implementasi boleh hidup sebagai Server Action, Route Handler, atau RPC. Yang dikunci adalah **efek**, bukan gaya framework.

| Kode | Efek | Dilarang |
|---|---|---|
| US-01 | Simpan `registrations` tertunda; setuju → `student`; tolak → tidak membuat akun | Calon masuk panel sebelum setuju |
| US-02 | Gerbang foto siswa jika profil belum lengkap **dan** avatar kosong | Memaksa keduanya jika salah satu sudah ada |
| US-03 | Clock-in pelatih dalam jendela; jarak dicatat | Menolak karena GPS jauh |
| US-04 | Pindai QR / absensi manual oleh pelatih | Endpoint “siswa absen sendiri” |
| US-05 | Izin pelatih + pengganti per kelas; Admin putuskan | Izin tanpa pengganti |
| US-06 | Izin siswa → sisip `student_attendances` setelah setuju | Menandai hadir dari panel Student |
| US-07 | Generate `bills` reguler tanpa duplikat | Generate untuk `private` / afiliasi; unggah bukti siswa |
| US-08 | Klaim sesi → invoice `pending` → Bell Owner → slip `published` | Admin meninjau honor; pelatih melihat draf slip |
| US-09 | Invoice staf nominal + reimburse `RB-…` | MC memproses reimburse; staf tanpa gerbang profil |
| US-10 | Satu periode rapor terbuka per pusat; kunci entri; PDF sakelar TTD | Dua periode terbuka |
| US-11 | School unduh PDF/ZIP + Excel absensi saringan | School mengubah siswa / iuran |
| US-12 | Owner pusat, akun, tarif, slip, kasbon, CMS, storage, log | Database Manager; search global |

---

## 5. Sisi klien yang bukan API

| Mekanisme | Tempat | Catatan |
|---|---|---|
| Pengalih EN/ID | `localStorage` (+ `profiles.locale` jika ada) | Memicu widget Translate, bukan ganti rute |
| Pratinjau Admin | `sessionStorage.ownerPreviewBranch` | Tombol kembali di `/admin` |
| WhatsApp | `wa.me` + nomor pusat | Validasi nomor di Centers/Settings |
| Widget Translate | Setiap cangkang | `pageLanguage: "en"`, `includedLanguages: "en,id"` |

---

## 6. Saat menambah endpoint

1. Cek dulu apakah efeknya sudah ada di tabel atas.
2. Hormati matriks wewenang PRD 2.4.
3. Tulis baris baru di berkas ini pada PR yang sama.
4. Jangan menambah API model AI.
---
