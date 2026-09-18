# CLAUDE.md

Next Swimming School. Baca berkas ini dulu sebelum menulis kode, CSS, atau frame UI. Niat produk tetap di `docs/`. Ini hanya aturan kerja agen.

---

## 1. Mulai dari sini

Urutan baca: `docs/README.md` lalu `docs/01-prd.md` lalu `docs/02-umpan-balik.md` lalu alur terkait di `docs/03-alur/` lalu panel di `docs/04-panel/` lalu `docs/05-desain/` lalu `docs/06-teknis/` lalu `docs/07-ui/`.

Jangan mulai dari berkas panel. Jangan memakai usulan IA lama sebagai sumber menu.

Kalau dokumen bentrok:

1. `docs/01-prd.md` untuk niat, KPI, bukan-tujuan, bahasa UI.
2. `docs/02-umpan-balik.md` untuk FB-01 sampai FB-14.
3. `docs/03-alur/` untuk mesin lintas peran.
4. `docs/04-panel/` untuk menu dan tindakan layar.
5. `docs/05-desain/` plus `docs/07-ui/` untuk token dan frame.
6. Kode untuk perilaku yang sudah jalan sekarang. Kalau beda dari konsep, catat di lampiran Selisih vs kode pada panel. Jangan anggap fitur sudah hidup.

Nilai TBD-01, TBD-02, TBD-04, TBD-05, TBD-06 di PRD tidak boleh diisi sendiri. Basis data dan auth sudah dikunci di bagian 3 berkas ini (bukan TBD-03 lagi).

---

## 2. Tugas yang diminta

| Permintaan | Yang dilakukan |
|---|---|
| Buat proyek dari ulang | Baca rantai di atas, lalu `docs/06-teknis/STACK.md` |
| Ubah satu layar | Baca alur terkait, berkas panel itu, dan baris di `docs/07-ui/SCREENS.md`. Jangan mengarang langkah yang bertentangan dengan alur |
| Desain / token | `docs/05-desain/DESIGN.md` plus `docs/07-ui/COMPONENTS.md` |
| Data / hitungan | `docs/06-teknis/SCHEMA.md` plus `docs/03-alur/` |
| Endpoint | `docs/06-teknis/API.md` |
| Ubah skema database | Edit `drizzle/schema.ts` (atau pecahan schema di folder itu), lalu jalankan sendiri lewat terminal. Jangan minta manusia klik SQL Editor di dashboard Supabase |

Satu prompt = satu tab atau satu alur. Jangan membangun seluruh aplikasi dalam satu langkah.

---

## 3. Stack yang terkunci

Rincian folder dan rute: `docs/06-teknis/STACK.md`.

- Semua paket stack: rilis **stabil terbaru** di npm saat scaffolding atau saat menambah dependensi. Bukan canary. Bukan beta. Bukan versi lama dari tutorial.
- Next.js App Router terbaru plus TypeScript. React mengikuti `create-next-app` terbaru. Bukan Pages Router.
- Tailwind CSS v4 terbaru. Token di `src/app/globals.css` (`@theme inline`). Tidak ada `tailwind.config.ts`.
- Panel memakai tab `useState` di dalam satu halaman, bukan rute Next.js per menu.
- Komponen UI di `src/components/ui/`: `<Btn>`, `<Status>`, `<Card>`, `Field`.
- Path peran: `/owner`, `/admin` (admin dan manager_center), `/coach`, `/staff`, `/student` (Student), `/school`, publik `/` dan `/register`.
- Auth, Postgres, dan storage: **Supabase**. Query dan migrasi: **Drizzle ORM** terbaru plus `drizzle-kit` terbaru. Bukan Prisma. Bukan klik manual di dashboard untuk perubahan skema.

### File kecil, kode modular

Nama konsep: **modularization** (pecah tanggung jawab). Satu file = satu urusan. Bukan satu `page.tsx` berisi seluruh panel.

Proyek lama pecah karena semua tab Owner/Admin/Coach hidup di satu berkas sampai ribuan baris. Itu dilarang di rebuild.

Batas yang mengikat:

- Satu berkas sumber `.ts` / `.tsx` maksimal sekitar **300 baris**. Di atas 400 baris, pecah dulu sebelum menambah fitur.
- `page.tsx` per peran hanya cangkang: auth, tab `useState`, render tab aktif. Tidak berisi formulir, tabel, atau overlay.
- Satu `id` tab = satu folder atau satu modul, contoh `src/app/owner/tabs/payslips/`.
- Sub-tab (Periods, Loans) file sendiri di dalam folder tab itu.
- Overlay (clock-in, izin, pindai QR, gerbang profil) file sendiri.
- Query Drizzle, hitungan uang, dan pemetaan status jangan dicampur di file UI. Taruh di `src/lib/` atau `src/server/` per domain (`bills`, `honor`, `attendance`).
- Schema Drizzle boleh dipecah `drizzle/schema/*.ts` lalu di-export dari `drizzle/schema/index.ts`. Jangan satu schema 2000 baris.

Saat menambah kode ke file yang sudah gemuk: pindahkan dulu, baru edit. Jangan "nanti dirapikan".

---

## 4. Wording: terdengar manusia, bukan mesin

Berlaku untuk salinan UI, komentar, commit, toast, README yang agen tulis, dan teks di kode.

- Tulis seperti orang yang sedang menjelaskan ke rekan kerja. Pendek, konkret, tanpa basa-basi.
- Dilarang memakai tanda penghubung em dash `—` di mana pun: UI, komentar, markdown, commit, nama file, isi string.
- Ganti dengan titik, koma, titik dua, atau pecah jadi dua kalimat.
- Jangan pola khas keluaran model: "Furthermore", "Moreover", "In conclusion", "It is important to note", "delve", "leverage", "robust", "seamless", "comprehensive solution", "unlock", "empower", "in today’s fast-paced world".
- Jangan tumpuk kata sifat. Jangan membuka setiap paragraf dengan "Pastikan" atau "Wajib".
- Label UI tetap bahasa Inggris (lihat bagian 5). Yang dilarang adalah gaya kaku, bukan bahasa Inggrisnya.
- Nama orang, pusat, dan merek NEXT biarkan apa adanya.

Contoh salah: `Welcome — let’s get started on your journey.`
Contoh benar: `Welcome. Add your photo to continue.`

---

## 5. Bahasa: tiga lapis, jangan ditukar

Rincian: `docs/01-prd.md` bab 4.6 dan `docs/06-teknis/I18N.md`.

| Lapis | Bahasa |
|---|---|
| `docs/` | Indonesia PUEBI |
| String JSX, placeholder, toast, label menu | Inggris |
| Tampilan ID di perangkat | Injeksi Google Translate, bukan kamus `locales/id` |

- Jangan membuat `locales/id`. Jangan mengeraskan teks Indonesia di JSX. Jangan rute `/id/...`.
- Pengalih **EN | ID** di setiap cangkang panel.
- `translate="no"` / `notranslate` / `<NoTranslate>`: nama orang, nama pusat, rekening, QR, status mentah, merek NEXT.
- Bahasa produk untuk siswa: **Student**. Peran, rute, dan tabel database juga `student` / `/student` / `students` (sudah direname dari `member`, bukan sekadar label). Jangan menulis "Member" di prosa dokumen.

Kalau `docs/05-desain/DESIGN.md` bab 10 masih menyebut padanan `id/` di berkas i18n, PRD 4.6 yang dipakai.

---

## 6. Supabase plus Drizzle (agen yang menjalankan migrasi)

Tujuan: manusia tidak membuka dashboard Supabase untuk mengubah tabel. Agen mengedit schema, lalu menjalankan perintah di terminal.

### 6.1 Paket

```bash
npm install drizzle-orm postgres
npm install drizzle-kit --save-dev
```

Opsional, agar perintah Supabase lebih akurat:

```bash
npx skills add supabase/agent-skills
```

### 6.2 Variabel lingkungan

Salinan kosong: `.env.example`. Jangan commit `.env`. Jangan menaruh kata sandi di git, di chat, atau di `docs/`.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
```

`DATABASE_URL` memakai transaction-mode pooler IPv4 (port 6543), pola:

`postgresql://postgres.<PROJECT-REF>:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

Isi nilai sungguhan hanya di `.env` lokal. Host pooler proyek ini: `aws-0-ap-southeast-1.pooler.supabase.com`.

Klien runtime (`postgres` dari `postgres.js`):

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

// Transaction pool mode tidak mendukung prefetch
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
```

Kalau `drizzle-kit migrate` atau `db:push` gagal di port 6543, pakai URL session mode (port 5432) atau direct connection hanya untuk perintah kit. Aplikasi tetap memakai 6543 plus `prepare: false`.

### 6.3 Schema

Sumber tabel: `docs/06-teknis/SCHEMA.md`. File Drizzle hidup di `drizzle/schema.ts` atau pecahan `drizzle/*.ts` yang di-export dari situ.

Contoh bentuk file (bukan tabel yang boleh dipakai apa adanya). Jangan menyalin tabel `users` dari tutorial. Pakai `profiles`, `branches`, `students`, dan seterusnya.

```ts
import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name"),
  phone: varchar("phone", { length: 256 }),
});
```

Kolom status hanya nilai di PRD 4.4. Jangan menambah status "supaya lengkap".

### 6.4 Perintah yang agen jalankan sendiri

Setelah `drizzle.config.ts` ada, agen yang menjalankan (sesuaikan skrip di `package.json` kalau sudah ditulis):

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Untuk iterasi lokal yang disepakati memakai push:

```bash
npx drizzle-kit push
```

Jangan minta manusia copy-paste SQL ke Supabase SQL Editor. Jangan mengubah skema lewat Table Editor. Jangan memakai Prisma. Jangan membuat tabel demo `users` di produksi.

Auth memakai kunci `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di klien. `SUPABASE_SERVICE_ROLE_KEY` hanya di peladen. Jangan impor service role ke komponen klien.

Storage berkas (avatar, bukti Admin, tanda tangan, swafoto staf) memakai bucket Supabase. Hapus berkas tetap lewat alur Owner System Storage plus konfirmasi.

RLS tetap wajib untuk isolasi `branch_id` (KPI-02). Drizzle tidak mengganti wewenang di peladen.

---

## 7. Dilarang mengarang

Jangan menambah hal di bawah kecuali addendum PRD tertulis.

- Gerbang pembayaran daring. Unggah bukti oleh siswa.
- Pagar GPS yang menolak clock-in (jarak hanya dicatat dan diwarnai).
- Siswa menandai hadir sendiri, atau pemindai di panel Student.
- Panel School mengoperasikan kolam, menagih iuran, atau tab pengumuman.
- Admin meninjau honor pelatih atau staf. Admin atau formulir tambah membuat Owner.
- Menu Owner Database Manager.
- Pencarian global di bilah atas (placeholder saja).
- Fitur AI di dalam produk (chat, skor otomatis, OCR).
- Harga per sesi untuk privat (FB-02). Paket = harga paket plus jumlah sesi.
- Menyatukan Class dengan Private Students, atau Accounts dengan Private Students.
- Kasbon sebagai menu sendiri (sub-tab Payslips).
- Panel ketiga untuk Manager Center.
- Interpolasi class Tailwind.
- Hex merek lepas (pengecualian: `Btn variant="wa"` `#25D366`).
- `alert()` atau `confirm()` peramban. Tombol `<button>` ad-hoc untuk aksi merek.
- Tangga semantik yang tidak ada (`ok-300`, `danger-200`).
- Tanda `—` di salinan mana pun.

---

## 8. Aturan yang tidak boleh tertukar

1. Tagihan siswa (`bills`) bukan invoice honor (`coach_invoices`) dan bukan slip (`payslips`).
2. Periode rapor bukan periode invoice.
3. Admin bukan Manager Center dan bukan Owner.
4. Kelas reguler bukan kelas privat dan bukan jenjang sekolah (`school_grade`).
5. Izin pelatih bukan izin siswa, bukan sakit staf, bukan libur kelas.
6. Clock-in pelatih bukan clock-in staf.
7. Yang meninjau invoice honor hanya Owner. Bell honor ke Owner, bukan Admin.
8. Slip pelatih dan staf di panel mereka hanya `published`.
9. Paling banyak satu `rapor_periods.is_open = true` per `branch_id`.
10. Izin (Leave Requests) punya dua pintu setuju/tolak: Admin pusat terkait dan Owner lintas pusat. Satu pengajuan `pending` hanya boleh ditutup sekali; siapa pun yang lebih dulu itu yang berlaku, dan tidak ada tahap "Owner menyetujui ulang" sesudahnya.
11. Wewenang dicek di peladen. Menyembunyikan menu tidak cukup (FB-12).
12. Setiap create akun wajib generate `public_id` plus QR. Format `NEXT.<3-digit>.<kode>.<YY>`. Kode: OW, AD, MC, CO, ST (Student), SC, SF (Staff). ID dan QR tidak berganti kecuali akun dihapus. Jangan pakai `ST` untuk Staff.

---

## 9. Cangkang dan token (sebelum CSS atau JSX)

- Owner dan Admin: Sidebar plus Topbar, tanpa kotak pencarian.
- Coach dan Student: `MobileNav` bawah. Tab sekunder di lembar Menu.
- Staff: Sidebar plus `MobileNav`. Payslip tidak punya slot nav bawah sendiri.
- School: tajuk plus tab, `max-w-6xl`.
- Publik boleh `water-bg` atau `caustics`. Panel tenang.

Satu aksi primer per pandangan: `ocean-600`. Status lewat `<Status>`. Kartu: `bg-white rounded-2xl border border-line shadow-card`.

Cek UI: `docs/05-desain/DESIGN.md` bab 11.

---

## 10. Definisi selesai untuk agen

Sebelum mengklaim tab atau alur selesai:

- [ ] Kriteria penerimaan cerita terkait di PRD tercentang.
- [ ] Status hanya nilai di PRD 4.4 / `docs/06-teknis/SCHEMA.md`.
- [ ] Isolasi `branch_id` (KPI-02) tidak bocor.
- [ ] State kosong, kunci profil, dan periode tertutup ada (`docs/07-ui/STATES.md`).
- [ ] Item bab 2.7 PRD tidak ikut terkirim.
- [ ] Tidak ada pemanggilan model AI di produk.
- [ ] Label UI bahasa Inggris. Nama tab sama dengan `id` di panel.
- [ ] Tidak ada karakter `—` di string yang baru ditulis.
- [ ] Perubahan skema sudah di-generate atau di-push dari terminal, bukan dari dashboard Supabase.

Uji alur kritis: `docs/08-qa/KPI-01.md`.
