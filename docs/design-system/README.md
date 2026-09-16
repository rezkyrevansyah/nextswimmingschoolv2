# Sistem desain Next Swimming School

Dokumentasi ini menjelaskan **cara merancang antarmuka di proyek ini**, berdasarkan token dan komponen yang sudah ada. Bukan palet baru. Dibaca manusia (desain, produk) dan agen AI **sebelum** mengubah UI.

Sumber kode:

- Token: `src/app/globals.css` (`@theme inline`, Tailwind v4 — **tidak ada** `tailwind.config.ts`)
- Font: `src/app/layout.tsx`, `src/lib/fonts.ts`
- Komponen: `src/components/ui/`

Isi lengkap: [DESIGN.md](./DESIGN.md).

Fitur per peran (bukan visual): [../features/README.md](../features/README.md).

---

## Sepuluh aturan wajib

1. **Jangan interpolasi class Tailwind** (`` `bg-${warna}-50` ``). Tulis class lengkap agar masuk bundel.
2. **Jangan hex lepas** untuk merek. Pakai token `ocean`, `wave`, `ink`, `paper`, `line`. Pengecualian: `Btn variant="wa"` (`#25D366`).
3. **Tombol lewat `<Btn>`**, bukan `<button>` dengan class ocean ad-hoc.
4. **Status lewat `<Status kind="…">`**, bukan lencana warna sendiri.
5. **Kartu:** `bg-white rounded-2xl border border-line shadow-card` — atau komponen `<Card>`.
6. **Satu aksi primer per pandangan:** isi `ocean-600`, bukan `ocean-500`, bukan `warn`/`danger` kecuali merusak data.
7. **Jangan mengarang tangga yang tidak ada** (`ok-300`, `danger-200`). Semantik hanya 50 / 500 / 600.
8. **Landing boleh spektakuler** (`water-bg`, `caustics`); **panel tenang** (kertas, garis, aksen hemat).
9. **Fokus:** jangan menimpa `*:focus-visible` (gelombang `#16B0E8`, 2 px).
10. **Hormati `prefers-reduced-motion`.** Jangan menambah animasi tanpa kelas yang sudah dimatikan di `globals.css`.

---

## Glosarium singkat

| Istilah | Token / class |
|---|---|
| Laut (merek, aksi) | `ocean-50` … `ocean-900` |
| Gelombang (aksen, fokus) | `wave-50` … `wave-900` |
| Tinta (teks) | `ink`, `ink-soft`, `ink-mute`, `ink-faint` |
| Kertas (latar) | `paper`, `paper-tint`, `paper-deep` |
| Garis | `line`, `line-strong` |
| Judul | `font-display` (Plus Jakarta Sans) |
| Tubuh | `font-sans` (Inter) |
| Angka / kode | `font-mono` (JetBrains Mono, panel saja) |
