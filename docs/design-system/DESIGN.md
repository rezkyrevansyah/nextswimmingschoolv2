# Sistem desain — Next Swimming School

> Sumber kebenaran visual: `src/app/globals.css`. Jika dokumen ini bertentangan dengan berkas itu, **kode yang menang** — perbarui dokumen.
> Tailwind CSS v4: token di `@theme inline`. Class `bg-ocean-600` berasal dari `--color-ocean-600`.

---

## 1. Prinsip

Merek ini sekolah renang. Warna **laut** (`ocean`) untuk keputusan dan navigasi. **Gelombang** (`wave`) untuk aksen dan fokus, bukan untuk tombol primer. Latar **kertas** (`paper-tint`) agar panel terasa tenang. Teks **tinta** (`ink`) agar hierarki terbaca tanpa abu-abu generik.

- Satu tombol isi laut per blok tindakan. Rekan-rekannya `outline`, `ghost`, atau `soft`.
- Warna status (hijau, kuning, merah, oranye) **bukan** merek dan **bukan** tombol primer.
- Jangan menambah palet ketiga (ungu, pink, emas) kecuali token `manual` / `sub` yang sudah ada untuk kasus khusus.
- Salinan antarmuka: label bawaan Inggris; teks baru lewat `src/i18n/`.

---

## 2. Warna

### 2.1 Laut (`ocean`) — merek dan aksi

| Tangga | Hex | Peran |
|---|---|---|
| 50 | `#EAF4FB` | Latar lembut, `Btn` soft |
| 100 | `#D2E7F4` | Hover latar lembut |
| 200 | `#A7CFE8` | Cincin / aksen sangat muda |
| 300 | `#6FAEDA` | Aksen sedang |
| 400 | `#3D8AC8` | Jarang; jangan untuk teks tubuh |
| 500 | `#1A6BB0` | `themeColor` PWA; **bukan** isi tombol primer |
| 600 | `#0E4F8F` | **Isi tombol primer**, tautan kuat |
| 700 | `#0B3F73` | Hover primer; teks laut di atas kertas |
| 800 | `#0A2F58` | Hero gelap, spanduk Owner |
| 900 | `#082544` | Hampir tidak dipakai; cadangan gelap |

Teks di atas `ocean-600` / `700` / `800`: putih.

### 2.2 Gelombang (`wave`) — aksen

| Tangga | Hex | Peran |
|---|---|---|
| 50 | `#E5F7FE` | Latar aksen |
| 100 | `#C6EEFC` | Hover aksen muda |
| 200 | `#8DD9F8` | Label di atas hero laut |
| 300 | `#54C2F3` | Aksen |
| 400 | `#2DB8EF` | Aksen |
| 500 | `#16B0E8` | `Btn` accent; **cincin fokus** |
| 600 | `#0A8CC0` | Hover accent |
| 700–900 | `#076B95` … `#063F58` | Jarang |

### 2.3 Tinta, kertas, garis

| Token | Hex | Peran |
|---|---|---|
| `ink` | `#0A2540` | Teks utama |
| `ink-soft` | `#1F3A5E` | Teks sekunder, tombol ghost |
| `ink-mute` | `#577496` | Petunjuk, subjudul |
| `ink-faint` | `#8AA3BD` | Label kapital kecil, ikon lemah |
| `paper` | `#FFFFFF` | Permukaan kartu |
| `paper-tint` | `#F6FAFD` | Latar halaman |
| `paper-deep` | `#EEF4FA` | Latar kontrol, zebra |
| `line` | `#E1ECF4` | Batas kartu dan tabel |
| `line-strong` | `#C8DCEB` | Hover batas |

### 2.4 Semantik (hanya 50 / 500 / 600)

| Nama | 50 | 500 | 600 | Makna |
|---|---|---|---|---|
| `ok` | `#ECFDF5` | `#16A34A` | `#15803D` | Sukses, lunas, hadir, disetujui |
| `warn` | `#FFFBEB` | `#F59E0B` | `#B45309` | Menunggu, belum lunas, izin |
| `danger` | `#FEF2F2` | `#DC2626` | `#B91C1C` | Hapus, tolak, gagal |
| `suspend` | `#FFF5EB` | `#EA580C` | `#C2410C` | Akun ditangguhkan |
| `archive` | `#F1F5F9` | `#64748B` | `#475569` | Arsip, nonaktif, libur |
| `sub` | `#EFF6FF` | `#3B82F6` | `#1D4ED8` | Pengganti pelatih |
| `manual` | `#F5F3FF` | `#7C3AED` | `#6D28D9` | Entri manual |

Jangan menulis `bg-ok-300` atau `text-danger-200` — token itu **tidak ada**.

Pola lencana: latar `*-50`, teks `*-600`, cincin `*-500/30`. Gunakan `<Status>`.

### 2.5 Pengecualian hex

- WhatsApp: `Btn variant="wa"` → `#25D366` / hover `#1FB855`.
- Overlay modal: `bg-ink/50`.
- Gradien `water-bg` memakai hex laut dan gelombang yang sama dengan token (jangan palet lain).

---

## 3. Tipografi

| Peran | Keluarga | Variable CSS | Bobot | Dimuat di |
|---|---|---|---|---|
| Judul, angka besar | Plus Jakarta Sans | `--font-display` | 400–800 | Akar (`layout.tsx`) |
| Tubuh, UI | Inter | `--font-sans` | 400–700 | Akar |
| Kode, jam, nominal, ID | JetBrains Mono | `--font-mono` | 400–500 | Hanya layout panel (`src/lib/fonts.ts`) |

Aturan:

- `body`: Inter, warna `ink`, latar `paper-tint`, antialiased.
- `h1`–`h6` dan `.font-display`: Plus Jakarta Sans, `letter-spacing: -0.01em`.
- Landing/login **jangan** memuat JetBrains Mono.

Skala yang dipakai di panel (jangan menambah `text-7xl` di operasional):

| Class | Pakai |
|---|---|
| `text-[10px] uppercase tracking-widest font-bold` | Label kolom, lencana kecil |
| `text-xs` | Petunjuk, metadata |
| `text-sm` | Tubuh kartu, baris tabel |
| `text-base` | Judul halaman kecil |
| `text-xl` / `text-2xl` + `font-display font-bold` | Judul bagian |
| `text-3xl` / `text-4xl` + `font-extrabold` | Hero dasbor / landing |
| `font-mono` | Jam, nomor rekening, rupiah, ID |

---

## 4. Jarak, sudut, bayangan

Grid Tailwind 4 px. Kartu standar `p-5`. Celah umum `gap-2` (rapat), `gap-3`, `gap-4`, `gap-5` (antar kartu).

| Sudut | Class | Pakai |
|---|---|---|
| 8 px | `rounded-lg` | Tombol `sm` |
| 12 px | `rounded-xl` | Tombol md/lg, input, saringan |
| 16 px | `rounded-2xl` | Kartu, hero panel |
| Penuh | `rounded-full` | Lencana status, avatar |
| Atas 24 px | `rounded-t-3xl` | Lembar modal di ponsel |

| Bayangan | Token | Pakai |
|---|---|---|
| Kartu diam | `shadow-card` | `<Card>` |
| Angkat | `shadow-lift` | Modal, hover kartu penting |
| Mengambang | `shadow-float` | Spanduk, tombol WA landing |

Jangan `shadow-xl` / `shadow-2xl` Tailwind mentah pada kartu operasional.

---

## 5. Gerak

| Class / nama | Perilaku |
|---|---|
| `anim-in` | Masuk 350 ms, geser 8 px ke atas |
| `water-bg` | Gradien laut–gelombang, 18 detik, landing |
| `skeleton` | Kedip 1,4 detik, kerangka muat |
| `caustics` | Titik cahaya di atas hero laut |
| `grid-faint` | Kisi 32 px sangat lemah |
| `no-scrollbar` | Sembunyikan bilah gulir |
| `waRing` | Cincin pulsa tombol WhatsApp mengambang |

Jika pengguna meminta pengurangan gerak, animasi di atas dimatikan di `globals.css`. Jangan menambah `@keyframes` baru tanpa cabang `prefers-reduced-motion`.

---

## 6. Tata letak

Latar semua panel: `bg-paper-tint min-h-screen`.

| Keluarga panel | Cangkang | Catatan |
|---|---|---|
| Owner, Admin | `Sidebar` + `Topbar` | Desktop dulu; laci di ponsel |
| Coach, Member | `MobileNav` bawah + tajuk | Tab Invoice/Bills/Leave di lembar Menu |
| Staff | Sidebar + `MobileNav` | Payslip tidak di navigasi bawah |
| School | Tajuk + tab | Lebar `max-w-6xl` |
| Publik | Bagian penuh lebar | Boleh `water-bg`, galeri, `caustics` |

Modal: portal `z-[90]`, overlay `bg-ink/50`, isi putih, `max-h-[92vh]`. Di ponsel menempel bawah (`rounded-t-3xl`); dari `sm` ke atas di tengah (`rounded-2xl`). Escape menutup modal teratas jika bertumpuk. Ukuran: `sm` `max-w-sm` … `xl` `max-w-4xl`.

Sentuhan: tombol `md` dan `lg` `min-h-[44px]`. Di lebar ≤640 px, input/select/textarea 16 px agar Safari tidak menzum.

Aman ponsel: `pb-safe` / `pt-safe` untuk `env(safe-area-inset-*)`.

---

## 7. Komponen

Impor dari `@/components/ui/`. Jika komponen sudah ada, **jangan** meniru dengan `div` class lepas.

### Tombol — `<Btn>`

`variant`: `primary` | `accent` | `ghost` | `outline` | `soft` | `danger` | `wa`  
`size`: `sm` | `md` (bawaan) | `lg`  
Opsional: `icon` (nama `<Icon>`), `href` (menjadi tautan).

| Varian | Isi |
|---|---|
| `primary` | `ocean-600` → hover `700` |
| `accent` | `wave-500` → hover `600` |
| `soft` | `ocean-50` teks `ocean-700` |
| `outline` | batas `line`, hover `paper-tint` |
| `ghost` | teks `ink-soft` |
| `danger` | `danger-500` → hover `600` |
| `wa` | hijau WhatsApp |

Satu `primary` per kelompok tindakan. Hapus memakai `danger` plus `useConfirm()`.

### Status — `<Status kind>`

`kind` yang sah: `active`, `present`, `paid`, `approved`, `pending`, `unpaid`, `suspend`, `suspended`, `archived`, `inactive`, `rejected`, `absent`, `holiday`, `substitute`, `manual`, `excused`, `sick`, `late`, `telat`, `free`, `school_covered`.

Huruf kapital kecil, `text-[11px]`, `rounded-full`, titik opsional.

### Kartu — `<Card>`, `<SectionTitle>`, `<Stat>`

Kartu: putih, `rounded-2xl`, `border-line`, `shadow-card`, `p-5` (matikan dengan `padded={false}` untuk tabel).  
Judul bagian: `font-display font-bold text-xl text-ink`, sub `text-sm text-ink-mute`.  
`Stat` tone: `ocean` | `wave` | `ok` | `warn` | `danger`.

### Formulir — `Field`, `Input`, `Select`, `Textarea`, `Switch`, `PasswordInput`

Selalu bungkus kontrol dengan `<Field label>` (wajib `required` jika perlu). Jangan `<label>` lepas dengan gaya baru.

Pemilih tanggal/waktu: `DatePicker`, `MonthYearPicker`, `TimePicker` (sadar lokal). Peta: `MapPicker` (impor dinamis).

### Lainnya

| Komponen | Pakai |
|---|---|
| `Icon` | Nama string; jangan SVG lepas untuk ikon yang sudah ada |
| `Avatar` | Inisial; palet tetap di komponen |
| `Logo` | `next/image`; jangan `<img>` logo |
| `Modal` | Dialog; `footer` untuk aksi |
| `QRBox` | QR member/staf |
| `PhotoLightbox` | Foto penuh |
| `ProofViewer` | Bukti bayar privat (URL bertanda tangan) |
| `Placeholder` | Foto kelas kosong |
| `StarDisplay` | Ulasan pelatih |
| `NoTranslate` | Nama orang/pusat agar tidak diterjemahkan widget |

Umpan: `useToast()`, `useConfirm()` — jangan `alert()` / `confirm()` peramban.

---

## 8. Dua dunia visual

**Landing dan autentikasi publik:** boleh hero laut, `water-bg`, `caustics`, `grid-faint`, galeri, tipografi besar.

**Panel (Owner sampai School):** halaman kertas, kartu putih, hero paling banyak satu blok `ocean-700` di dasbor. Jangan meniru landing di dalam tabel keuangan.

---

## 9. Aksesibilitas

- Fokus terlihat: gelombang 2 px, geser 2 px (`globals.css`).
- Jangan mengandalkan warna saja: status punya teks plus titik.
- Rasio kontras **tidak diklaim di dokumen ini** tanpa pengukuran. Jika mengubah pasangan teks/latar, ukur terhadap latar yang benar-benar terpasang (kartu putih vs `paper-tint` vs `ocean-700`).
- Modal: Escape, overlay klik, kunci gulir tubuh sampai tumpukan kosong.

---

## 10. Bahasa dan i18n

Antarmuka bawaan Inggris. String baru: kunci di `src/i18n/locales/en/…` plus padanan `id/`. Nama orang, pusat, dan nomor: bungkus `<NoTranslate>` jika perlu.

---

## 11. Cek untuk agen (sebelum mengirim UI)

- [ ] Tidak ada interpolasi class Tailwind
- [ ] Tidak ada `blue-`, `slate-`, `gray-` untuk merek (kecuali `archive` yang memang slate)
- [ ] Tombol dari `<Btn>`; status dari `<Status>`
- [ ] Kartu memakai token kertas/garis/bayangan kartu
- [ ] Tangga semantik hanya 50/500/600
- [ ] Panel tidak memakai `water-bg` kecuali hero yang sudah ada
- [ ] String baru lewat i18n
- [ ] Sentuhan 44 px untuk aksi utama
