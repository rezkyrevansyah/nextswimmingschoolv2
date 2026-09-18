# Panel per peran

Wewenang **layar**. Jangan mengarang langkah bisnis di sini — itu `docs/03-alur/`.

Cara baca tiap berkas: **Apa** / **Yang dapat dilakukan** / **Dampak ke peran lain** / **Jangan**. Label UI Inggris **tebal**. Pengenal kode `backtick`. Lampiran **Selisih vs kode** = belum dibangun.

Navigasi panel: tab `useState` di dalam halaman, bukan rute Next.js per menu.

Manager Center memakai `/admin`, bukan panel Owner. Beda menu: [02-admin.md](./02-admin.md).

| No. | Berkas | Peran | Path kode |
|---|---|---|---|
| 01 | [01-owner.md](./01-owner.md) | `owner` | `src/app/owner/` |
| 02 | [02-admin.md](./02-admin.md) | `admin`, `manager_center` | `src/app/admin/` |
| 03 | [03-coach.md](./03-coach.md) | `coach` | `src/app/coach/page.tsx` |
| 04 | [04-staff.md](./04-staff.md) | `staff` | `src/app/staff/page.tsx` |
| 05 | [05-student.md](./05-student.md) | Student (`student`) | `src/app/student/page.tsx` |
| 06 | [06-school.md](./06-school.md) | `school` | `src/app/school/page.tsx` |

Glosarium dan urutan baca: `docs/README.md`.
