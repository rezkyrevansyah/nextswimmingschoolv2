# Kamus Pen → kode

Sumber token dan API komponen: `docs/05-desain/DESIGN.md`. Jika bentrok dengan `src/app/globals.css`, **kode yang menang** — perbarui desain.

Impor: `@/components/ui/`.

---

## 1. Warna di frame Pen

Pakai nama token, bukan hex lepas (kecuali WA).

| Token Pen | Hex | Class | Pakai |
|---|---|---|---|
| ocean-50 | `#EAF4FB` | `bg-ocean-50` | Latar lembut |
| ocean-600 | `#0E4F8F` | `bg-ocean-600` | Tombol primer |
| ocean-700 | `#0B3F73` | `hover:bg-ocean-700` | Hover primer; teks laut |
| wave-500 | `#16B0E8` | `bg-wave-500` | Aksen, cincin fokus |
| ink | `#0A2540` | `text-ink` | Teks utama |
| ink-mute | `#577496` | `text-ink-mute` | Petunjuk |
| paper | `#FFFFFF` | `bg-white` / `bg-paper` | Kartu |
| paper-tint | `#F6FAFD` | `bg-paper-tint` | Latar halaman |
| line | `#E1ECF4` | `border-line` | Batas |

Semantik hanya 50 / 500 / 600: `ok`, `warn`, `danger`, `suspend`, `archive`, `sub`, `manual`.

WhatsApp: `#25D366` hanya pada `Btn variant="wa"`.

---

## 2. Komponen

| Frame / elemen Pen | Komponen | Varian / prop |
|---|---|---|
| Primary button | `<Btn>` | `variant="primary"` `size="md"` |
| Accent button | `<Btn>` | `accent` |
| Secondary | `<Btn>` | `outline` / `ghost` / `soft` |
| Destructive | `<Btn>` | `danger` + `useConfirm()` |
| WhatsApp | `<Btn>` | `wa` |
| Status pill | `<Status>` | `kind` dari daftar DESIGN.md §7 |
| Card | `<Card>` | `padded={false}` untuk tabel |
| Section heading | `<SectionTitle>` | |
| KPI number | `<Stat>` | `tone`: ocean / wave / ok / warn / danger |
| Form row | `<Field label>` | `required` jika wajib |
| Text / select / area | `Input` `Select` `Textarea` | |
| Password | `PasswordInput` | |
| Switch | `Switch` | |
| Date / month / time | `DatePicker` `MonthYearPicker` `TimePicker` | |
| Map pin | `MapPicker` | impor dinamis |
| Dialog | `Modal` | `footer` aksi; `sm`…`xl` |
| Icon | `Icon` | nama Material Symbols Rounded; jangan SVG lepas jika sudah ada |
| Avatar | `Avatar` | |
| Logo | `Logo` | `next/image` |
| QR | `QRBox` | |
| Foto penuh | `PhotoLightbox` | |
| Bukti bayar | `ProofViewer` | URL bertanda tangan |
| Foto kelas kosong | `Placeholder` | |
| Bintang rapor | `StarDisplay` | |
| Nama / rekening | `NoTranslate` | |

Satu `primary` per kelompok tindakan.

`kind` Status yang sah: `active`, `present`, `paid`, `approved`, `draft`, `published`, `paid_off`, `written_off`, `cancelled`, `pending`, `unpaid`, `partial`, `suspend`, `suspended`, `archived`, `inactive`, `rejected`, `absent`, `holiday`, `substitute`, `manual`, `excused`, `sick`, `late`, `telat`, `free`, `school_covered`.

---

## 3. Tipografi di Pen

| Gaya Pen | Class |
|---|---|
| Label kolom | `text-[10px] uppercase tracking-widest font-bold` |
| Petunjuk | `text-xs text-ink-mute` |
| Tubuh tabel | `text-sm` |
| Judul halaman | `text-xl` / `text-2xl` + `font-display font-bold` |
| Hero dasbor | `text-3xl` / `text-4xl` + `font-extrabold font-display` |
| Jam / rupiah / ID | `font-mono` (panel saja) |

---

## 4. Jarak dan bentuk

| Elemen | Class |
|---|---|
| Kartu | `rounded-2xl p-5 border-line shadow-card` |
| Tombol md/lg, input | `rounded-xl` |
| Tombol sm | `rounded-lg` |
| Lencana / avatar | `rounded-full` |
| Sheet ponsel | `rounded-t-3xl` |
| Celah kartu | `gap-5` |
| Celah kontrol | `gap-2` / `gap-3` |

Jangan `shadow-xl` mentah pada kartu operasional.

---

## 5. Cek sebelum ekspor Dev / sebelum JSX

- [ ] Tidak ada `blue-` / `gray-` merek
- [ ] Tidak ada interpolasi class
- [ ] Nama layer = `id` tab di SCREENS.md
- [ ] Status memakai kind, bukan pill warna sendiri
- [ ] Panel tidak memakai `water-bg`
- [ ] Sentuhan 44 px pada aksi utama
---
