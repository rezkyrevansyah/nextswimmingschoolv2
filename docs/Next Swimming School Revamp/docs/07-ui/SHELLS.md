# Cangkang per keluarga

Sumber: `docs/05-desain/DESIGN.md` bab 6 + cangkang di `docs/04-panel/`.

Latar semua panel: `bg-paper-tint min-h-screen`.

---

## Owner dan Admin

| Bagian | Isi |
|---|---|
| Kiri | Sidebar menu terkunci (16 item). Dashboard puncak. Settings/Storage/Log dasar |
| Atas | Judul halaman, Bell, pengalih EN/ID, avatar. **Tanpa** kotak pencarian |
| Ponsel | Sidebar jadi laci |
| Owner Bell | Invoice honor baru (pelatih/staf) |
| Admin Bell | Operasi pusat (izin, daftar, dll.) |
| Owner → Admin | Spanduk pratinjau + tombol kembali |

Jangan menambah slot Search “supaya lengkap”.

## Coach dan Student

| Bagian | Isi |
|---|---|
| Desktop | Tab atas / sisi sesuai panel |
| Ponsel | `MobileNav` bawah |
| Coach bawah | Home, Attendance, Class, Report Card, **Menu** |
| Student bawah | Home, Schedule, Attendance, Report Card, **Menu** |
| Isi Menu Coach | Honor, Profile |
| Isi Menu Student | Leave, Bills (kecuali afiliasi), Profile |
| Overlay | Clock-in, izin, pindai QR (hanya Coach) |

Coach multi-pusat: pemilih cabang di tajuk.

## Staff

Desktop: Sidebar Home / Daily Attendance / Honor / Profile.  
Ponsel: Home, Absen, Honor, Profile. Payslip tidak punya slot bawah sendiri.

Jika profil belum lengkap: **jangan render cangkang tab** — hanya gerbang.

## School

Tajuk + tab. Lebar `max-w-6xl`. Tidak ada pengumuman. Tidak ada Bills.

Jika baris `schools` tidak cocok: layar “data tidak ditemukan”, bukan dashboard kosong.

## Publik

Penuh lebar. Boleh `water-bg`, `caustics`, `grid-faint`, tipografi besar. Pengalih EN/ID tetap ada. Jangan memuat JetBrains Mono.

---

## Modal

Portal `z-[90]`, overlay `bg-ink/50`, `max-h-[92vh]`.  
≤ sm: menempel bawah `rounded-t-3xl`.  
≥ sm: tengah `rounded-2xl`.  
Escape menutup modal teratas. `pb-safe` / `pt-safe`.
---
