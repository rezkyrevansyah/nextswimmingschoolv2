# Fitur per peran — acuan rebuild

Folder ini adalah acuan **apa yang ada di setiap panel saat ini**, berdasarkan kode, bukan backlog. Dipakai manusia (produk, QA) dan agen AI (jangan mengarang menu yang tidak ada).

## Berkas

| Berkas | Peran | Path kode | Cakupan data |
|---|---|---|---|
| [owner-panel.md](./owner-panel.md) | `owner` | `src/app/owner/` | Semua pusat |
| [admin-panel.md](./admin-panel.md) | `admin` dan `manager_center` | `src/app/admin/` | Satu pusat |
| [coach-panel.md](./coach-panel.md) | `coach` | `src/app/coach/page.tsx` | Kelas yang diampu; bisa banyak pusat |
| [staff-panel.md](./staff-panel.md) | `staff` | `src/app/staff/page.tsx` | Satu pusat |
| [member-panel.md](./member-panel.md) | `member` | `src/app/member/page.tsx` | Satu pusat; tiga tipe siswa |
| [school-panel.md](./school-panel.md) | `school` | `src/app/school/page.tsx` | Siswa afiliasi satu sekolah |

Manager Center memakai panel Admin (`/admin`), bukan panel Owner. Beda menu: lihat `admin-panel.md`.

Navigasi panel memakai **tab di dalam halaman** (`useState`), bukan rute Next.js per menu.

## Cara baca tiap berkas

- **Apa** — fungsi menu
- **Yang dapat dilakukan** — tindakan di UI
- **Dampak ke peran lain** — data atau layar yang berubah di panel lain
- Label UI (bahasa Inggris, bawaan aplikasi) ditulis **tebal**; pengenal kode dalam `backtick`

Jangan memakai `docs/manual-test-flow-semua-role.md` sebagai sumber menu Owner **Database Manager** — fitur itu sudah dihapus.

## Glosarium

| Istilah di dokumen | Label UI / kode | Arti |
|---|---|---|
| Pusat | Centers, `branches` | Cabang sekolah renang |
| Tagihan siswa | Payments / Bills, `bills` | Iuran member (bukan gaji pelatih) |
| Invoice honor | Payslips / Invoice, `coach_invoices` | Klaim bayaran pelatih atau staf ke Owner |
| Slip gaji | Payslips, `payslips` | Slip yang Owner terbitkan; pelatih hanya melihat yang `published` |
| Periode invoice | Periods di menu Payslips, `invoice_periods` | Jendela waktu pelatih/staf boleh mengajukan invoice |
| Periode rapor | Report Cards, `rapor_periods` | Jendela waktu pelatih mengisi rapor (satu yang terbuka per pusat) |
| Kasbon | Loan List, `coach_loans` | Pinjaman pelatih atau staf; potongan di slip gaji |
| Les privat | Private Members, `class_type=private` | Satu siswa, satu kelas; tidak di menu Class biasa |
| Siswa afiliasi | `school_affiliate` | Member terikat sekolah mitra; tab tagihan disembunyikan |
| Manager Center | `manager_center` | Panel Admin; selalu melihat Payments dan Financial |
| Kunci profil | `is_profile_complete` | Staf: seluruh panel tertutup. Pelatih: sebagian tab terkunci |
| GPS pelatih | Clock-In | Jarak dicatat dan diwarnai; **bukan** pagar geografis (clock-in tetap diterima) |

**Jangan tertukar:** tagihan siswa (`bills`) ≠ invoice honor (`coach_invoices`) ≠ slip gaji (`payslips`). Periode rapor ≠ periode invoice.
