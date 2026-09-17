# Konvensi file desain (Pen / Figma Dev)

Tujuan: frame yang diekspor bisa dipasangkan 1:1 ke tab Claude Code.

Alat boleh Penpot, Figma, atau setara. Nama dan token yang mengikat, bukan merek aplikasinya.

---

## 1. Struktur halaman desain

```
NSS/
  _tokens/          ocean wave ink paper line + semantik
  _shells/          owner admin coach staff student school public
  public/
  owner/
  admin/
  coach/
  staff/
  student/
    reguler/
    private/
    affiliate/
  school/
  _states/          kosong loading forbidden gates
```

Nama frame = kolom **Frame Pen** di `SCREENS.md` (`owner/payslips-loans`, `student/photo-gate`).

## 2. Naming

- Label UI Inggris.
- Layer komponen: `Btn/primary`, `Status/pending`, `Card`.
- Jangan “Member Panel”. Pakai `student/…`.
- Variant state: `default` | `empty` | `loading` | `error` | plus nama di STATES.md (`no-period`, `suspended`, `affiliate-hidden-bills`).

## 3. Auto-layout

Grid 4 px. Kartu `p-20px` (p-5). Tombol md tinggi ≥ 44 px. Jangan frame yang hanya terlihat pas di artboard 1440 tanpa breakpoint.

Breakpoint kerja: `390` (ponsel nav bawah), `768`, `1280` (sidebar).

## 4. Yang tidak digambar sebagai halaman penuh

- Kasbon sebagai item sidebar.
- Tab Financial Admin biasa.
- Tab Bills siswa afiliasi.
- Pemindai di Student.
- Unggah bukti di Student.
- Database Manager.
- Search hasil global.

Jika perlu dokumentasi visual untuk “jangan dibangun”, taruh di halaman `_out-of-scope` bertanda silang — jangan masuk alur prototype.

## 5. Handoff ke Claude Code

Prompt aman:

> Implement `ADM-12` Payments sesuai `docs/04-panel/02-admin.md` + frame `admin/payments` + alur `docs/03-alur/04-uang.md`. Pakai token `docs/05-desain`. Jangan tambah unggah bukti di Student.

Sertakan kode layar (`ADM-12`) agar agen tidak merangkak seluruh panel.
---
