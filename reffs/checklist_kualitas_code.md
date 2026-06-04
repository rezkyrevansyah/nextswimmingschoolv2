# Checklist Kualitas Source Code — Next Swimming School

Version 2.0 · Stack: Next.js App Router · Supabase · TypeScript · Tailwind CSS v4 · React 19

> Checklist ini digunakan saat code review sebelum merge. Setiap item harus terpenuhi kecuali ada justifikasi eksplisit yang dicatat reviewer.

---

## A. QSC1 — Umum & Keterbacaan

- [ ] **QSC1-1** Semua identifier (variabel, fungsi, komponen, tipe) menggunakan nama yang deskriptif dan self-explanatory — tidak ada `data2`, `temp`, `x`, `val` tanpa konteks
- [ ] **QSC1-2** Indentasi konsisten 2 spasi (sesuai default Prettier project ini)
- [ ] **QSC1-3** Komponen React menggunakan PascalCase · fungsi/variabel menggunakan camelCase · konstanta global menggunakan SCREAMING_SNAKE_CASE
- [ ] **QSC1-4** Tidak ada magic number atau magic string — gunakan konstanta bernama (`const MAX_SESSIONS = 6`, bukan angka langsung)
- [ ] **QSC1-5** Tidak ada kode yang di-comment-out untuk menonaktifkan — hapus, gunakan git history
- [ ] **QSC1-6** Tidak ada `console.log`, `console.error`, atau `debugger` yang tertinggal di kode produksi
- [ ] **QSC1-7** Tidak ada duplikasi logika — jika blok yang sama muncul ≥2 kali, ekstrak ke fungsi atau hook
- [ ] **QSC1-8** Semua teks user-facing dalam Bahasa Indonesia
- [ ] **QSC1-9** `npx tsc --noEmit` tidak menghasilkan error baru dibanding baseline yang disepakati
- [ ] **QSC1-10** `npx eslint src/` tidak menghasilkan warning atau error baru

---

## B. QSC2 — Struktur Komponen (React / Next.js)

- [ ] **QSC2-1** Setiap komponen hanya memiliki satu tanggung jawab — komponen yang menangani fetch data sekaligus render kompleks harus dipecah
- [ ] **QSC2-2** `"use client"` hanya ditambahkan jika komponen benar-benar membutuhkan interaktivitas browser (useState, useEffect, event handler) — Server Component diutamakan untuk data fetching
- [ ] **QSC2-3** Komponen yang dipakai lebih dari satu tempat diekstrak ke `src/components/` — tidak didefinisikan inline di dalam page
- [ ] **QSC2-4** Props interface/type didefinisikan eksplisit — tidak menggunakan `any` atau `object` tanpa alasan
- [ ] **QSC2-5** Komponen tidak mengandung logika bisnis yang bisa dipisahkan ke custom hook (`useXxx`)
- [ ] **QSC2-6** List render selalu menggunakan `key` yang stabil dan unik — tidak menggunakan array index sebagai key jika urutan bisa berubah
- [ ] **QSC2-7** Tidak ada `useEffect` dengan dependency array kosong `[]` yang menyembunyikan dependency tersembunyi — gunakan `useCallback` dan `useMemo` dengan benar
- [ ] **QSC2-8** Panel pages (owner, admin, coach, member) menggunakan pola internal `useState` tab routing — tidak menggunakan `useRouter` untuk navigasi antar menu dalam satu panel

---

## C. QSC3 — TypeScript

- [ ] **QSC3-1** Tidak ada penggunaan `as unknown as X` kecuali untuk hasil query Supabase yang memang tidak bisa diinfer — dan harus diberi komentar alasan
- [ ] **QSC3-2** Interface untuk data dari Supabase didefinisikan eksplisit di atas komponen yang menggunakannya
- [ ] **QSC3-3** Union type digunakan untuk status field — misal `"active" | "archived" | "suspended"`, bukan `string`
- [ ] **QSC3-4** Tidak ada `!` (non-null assertion) kecuali pada env vars yang dijamin ada — gunakan optional chaining `?.` dan nullish coalescing `??`
- [ ] **QSC3-5** Fungsi async selalu menangani kasus `error` dari Supabase — tidak mengabaikan `const { data, error } = await supabase...` tanpa cek `error`
- [ ] **QSC3-6** Type `any` dilarang — gunakan `unknown` jika tipe belum diketahui, lalu narrowing

---

## D. QSC4 — Fungsi & Custom Hooks

- [ ] **QSC4-1** Nama fungsi berupa kata kerja yang menggambarkan aksi (`loadMembers`, `saveClass`, `openDetail`, `deleteBranch`)
- [ ] **QSC4-2** Fungsi yang melakukan satu hal — tidak boleh fetch data sekaligus update state sekaligus navigasi dalam satu fungsi tanpa pemisahan yang jelas
- [ ] **QSC4-3** Fungsi async yang dipanggil dari event handler menangani loading state — ada `setSaving(true)` / `setSaving(false)` atau equivalent agar user tidak bisa double-submit
- [ ] **QSC4-4** `useCallback` digunakan untuk fungsi yang dijadikan dependency `useEffect` atau diteruskan sebagai props ke child
- [ ] **QSC4-5** Custom hook (`useXxx`) hanya berisi logic — tidak merender JSX
- [ ] **QSC4-6** Fungsi yang tidak lagi digunakan dihapus — tidak dibiarkan sebagai dead code

---

## E. QSC5 — Supabase & Data Fetching

- [ ] **QSC5-1** Query Supabase hanya mengambil kolom yang dibutuhkan — tidak menggunakan `.select("*")` kecuali justifikasi eksplisit
- [ ] **QSC5-2** Query yang menampilkan list selalu memiliki `.order()` yang konsisten — tidak mengandalkan urutan default database
- [ ] **QSC5-3** Query list yang berpotensi besar selalu memiliki `.limit()` — maksimum 200 rows untuk display, lebih dari itu gunakan pagination
- [ ] **QSC5-4** Operasi write (insert/update/delete) selalu mengecek `error` response dan menampilkan feedback ke user via `useToast()`
- [ ] **QSC5-5** Konfirmasi destruktif (hapus data, suspend user) selalu menggunakan `useConfirm()` — tidak menggunakan `window.confirm()`
- [ ] **QSC5-6** `supabase.auth.admin.*` calls hanya boleh ada di Route Handlers (`src/app/api/`) — tidak di komponen client
- [ ] **QSC5-7** Data yang di-fetch ulang setelah mutasi menggunakan fungsi `load()` yang sudah ada — tidak membuat fungsi duplikat hanya untuk refresh
- [ ] **QSC5-8** Tidak ada N+1 query — data relasional di-fetch dengan nested select Supabase, bukan loop dengan query per item

---

## F. QSC6 — Tailwind CSS & Styling

- [ ] **QSC6-1** Tidak ada dynamic class interpolation — dilarang menulis `` `bg-${color}-500` `` atau `"text-" + variant` — selalu tulis class string lengkap agar Tailwind bisa include saat build
- [ ] **QSC6-2** Menggunakan design token dari `globals.css` — warna menggunakan `ocean`, `wave`, `ink`, `paper`, `ok`, `warn`, `danger`, `suspend`, `archive`, `line` — tidak hardcode `blue-500` atau `gray-300` kecuali tidak ada token yang sesuai
- [ ] **QSC6-3** Tidak ada inline `style={{}}` untuk properti yang bisa diekspresikan dengan Tailwind class
- [ ] **QSC6-4** Responsive styling menggunakan breakpoint yang ada (`sm:`, `md:`, `lg:`) — mobile-first (default = mobile, `sm:` = desktop)
- [ ] **QSC6-5** Animasi menggunakan class yang sudah didefinisikan (`anim-in`, `waveShift`, `fadeUp`, `pulseFade`) — tidak mendefinisikan animasi baru kecuali benar-benar diperlukan
- [ ] **QSC6-6** Komponen UI yang sama (button, badge, card) menggunakan komponen dari `src/components/ui/` — tidak membuat ulang button atau badge ad-hoc

---

## G. QSC7 — Performance & UX

- [ ] **QSC7-1** Navigasi antar tab/menu dalam panel tidak memicu skeleton loading ulang jika data sudah di-cache — data yang sudah di-load tidak di-fetch ulang kecuali ada mutasi
- [ ] **QSC7-2** Loading state ditampilkan dengan tepat — komponen menampilkan skeleton atau spinner saat fetch pertama, bukan blank page
- [ ] **QSC7-3** Gambar menggunakan `next/image` dengan `width` dan `height` eksplisit — tidak menggunakan `<img>` langsung kecuali di dalam `"use client"` yang tidak mendukung next/image
- [ ] **QSC7-4** Upload file ke R2 selalu melalui Route Handler (`src/app/api/upload/`) atau hook `useUpload()` — tidak ada direct S3 call dari komponen client
- [ ] **QSC7-5** Operasi yang independent dijalankan paralel dengan `Promise.all()` — tidak di-await satu per satu jika tidak saling bergantung
- [ ] **QSC7-6** Tidak ada re-render berlebih — state yang tidak mempengaruhi render diletakkan di `useRef`, bukan `useState`

---

## H. QSC8 — Keamanan

- [ ] **QSC8-1** Tidak ada secret key, API key, atau credential yang di-hardcode di source code — semua melalui environment variable
- [ ] **QSC8-2** Environment variable yang expose ke client hanya yang memiliki prefix `NEXT_PUBLIC_` — dan dipastikan tidak sensitif
- [ ] **QSC8-3** Input user yang diteruskan ke query Supabase menggunakan parameterized query (default Supabase PostgREST) — tidak ada string concatenation untuk query
- [ ] **QSC8-4** Upload file memvalidasi tipe MIME dan ukuran file sebelum dikirim ke R2
- [ ] **QSC8-5** Aksi destruktif (hapus cabang, hapus member) dilindungi dengan konfirmasi berlapis — `useConfirm()` dengan pesan yang jelas tentang konsekuensinya
- [ ] **QSC8-6** Role-based access dijaga di middleware (`src/middleware.ts`) — tidak hanya mengandalkan UI hide/show

---

## I. QSC9 — Testing

- [ ] **QSC9-1** `npm test` (vitest) dapat dijalankan dengan satu perintah dan semua test pass
- [ ] **QSC9-2** Setiap fungsi utility baru di `src/lib/utils.ts` memiliki minimal 3 test case di `src/lib/utils.test.ts`
- [ ] **QSC9-3** Test case mencakup happy path, edge case (0, empty, null), dan kasus negatif
- [ ] **QSC9-4** Test tidak bergantung pada state global atau urutan eksekusi — setiap test bisa berjalan independen
- [ ] **QSC9-5** Coverage `src/lib/utils.ts` tetap 100% setelah penambahan fungsi baru

---

## J. QSC10 — Dokumentasi & Maintainability

- [ ] **QSC10-1** Logika non-obvious (algoritma kompleks, workaround, keputusan arsitektur) diberi komentar singkat — bukan komentar yang hanya menceritakan ulang kode
- [ ] **QSC10-2** Migration SQL baru disimpan di `docs/migration_0XX_nama.sql` dengan komentar yang menjelaskan tujuan dan cascade chain
- [ ] **QSC10-3** Perubahan yang membutuhkan action manual (jalankan migration, update env var) dicatat di PR description
- [ ] **QSC10-4** Tidak ada `TODO`, `FIXME`, atau `HACK` yang dibiarkan tanpa issue tracker reference
- [ ] **QSC10-5** File baru yang dibuat berada di direktori yang tepat sesuai konvensi project (`src/components/ui/` untuk UI, `src/hooks/` untuk custom hooks, `src/lib/` untuk utilities)

---

## Ringkasan Penilaian

| Kategori | Bobot | Pass jika |
|----------|-------|-----------|
| QSC1 Umum & Keterbacaan | Wajib | Semua item ✅ |
| QSC2 Struktur Komponen | Wajib | Semua item ✅ |
| QSC3 TypeScript | Wajib | Semua item ✅ |
| QSC4 Fungsi & Hooks | Wajib | Semua item ✅ |
| QSC5 Supabase & Data | Wajib | Semua item ✅ |
| QSC6 Tailwind & Styling | Wajib | Semua item ✅ |
| QSC7 Performance & UX | Dianjurkan | ≥5 dari 6 item ✅ |
| QSC8 Keamanan | Wajib | Semua item ✅ |
| QSC9 Testing | Wajib | Semua item ✅ |
| QSC10 Dokumentasi | Dianjurkan | ≥3 dari 5 item ✅ |

> **LULUS** = semua kategori Wajib terpenuhi + semua kategori Dianjurkan memenuhi threshold minimum.
