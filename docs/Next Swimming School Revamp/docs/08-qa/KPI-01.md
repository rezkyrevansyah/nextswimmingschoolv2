# Uji enam alur kritis (KPI-01)

Sumber: `docs/01-prd.md` bab 2.3. Lulus = 6/6 tanpa langkah dilewati.

Pakai ini sebagai definisi selesai rilis, bukan sebagai sumber menu.

---

## Alur 1 — Daftar publik → les reguler

1. `/register` tersimpan `registrations` tertunda.
2. Calon tidak masuk `/student`.
3. Admin Approvals: sunting / setuju / tolak / hapus.
4. Setuju → akun `student` reguler.
5. Gerbang foto jika perlu (US-02).
6. Masuk kelas reguler.
7. Generate tagihan: 0 duplikat, 0 baris private (KPI-03).
8. Student Bills: rekening + WhatsApp, tanpa unggah bukti.
9. Admin menandai lunas (`transfer` \| `cash` \| `qris`).
10. Owner Financial Income membaca baris terverifikasi.

## Alur 2 — Hadir di kolam

1. Profil pelatih lengkap.
2. Clock-in dalam jendela (KPI-05): T−3 jam 1 menit tolak; T+15 `present`; T+16 `late`.
3. GPS diwarnai, tidak menolak.
4. Pindai QR → `hadir`/`telat`, atau privat `consume_private_session` sekali per hari.
5. Panel Student tidak berisi pemindai.

## Alur 3 — Izin pelatih

1. Pengajuan + pengganti per kelas.
2. Status `pending`.
3. Admin setuju (atau ganti nama pengganti).
4. Kalender Admin menampilkan acara pengganti.
5. Beranda pengganti: kartu clock-in.
6. Honor sesi covering ke pelatih yang mengajar.

## Alur 4 — Honor pelatih

1. Tarif kelas terisi.
2. Periode invoice terbuka.
3. Klaim hanya sesi `present`/`late` milik sendiri (termasuk covering) yang belum terkunci.
4. `pending` → Bell Owner.
5. Owner setuju → draf slip → potongan → `published`.
6. Invoice `paid`. Pelatih hanya melihat `published`.

## Alur 5 — Rapor

1. Rubrik Owner Report Levels.
2. Admin buka periode; periode lain di pusat itu tertutup (KPI-04).
3. Pelatih isi lalu `locked`.
4. PDF sakelar TTD.
5. Unduh di Admin / Student / School (afiliasi hanya miliknya).

## Alur 6 — Sekolah mitra

1. Akun `school` + logo/TTD.
2. Siswa `school_affiliate` + `school_grade`.
3. Tab rapor dan absensi School.
4. Tab Bills siswa tersembunyi.
5. Excel: 1 baris 1 murid, kolom tanggal, ikut saringan (FB-10).

---

## KPI lain yang tidak boleh mundur

| Kode | Cek singkat |
|---|---|
| KPI-02 | Dua pusat; Admin A tidak melihat data B |
| KPI-03 | Generate sekali; 0 duplikat; 0 private |
| KPI-04 | Buka periode kedua → pertama tertutup |
| KPI-05 | Tiga cap waktu clock-in di atas |

Item bab 2.7 PRD yang lolos ke rilis = gagal QA, bukan “bonus”.
---
