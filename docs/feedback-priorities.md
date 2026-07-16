# Feedback Priorities - Urutan Perbaikan

> Diurutkan dari yang harus dikerjakan duluan (dependency/paling kritis) sampai yang terakhir.

---

## 1. Head/Assistant Coach Role *(paling kritis, dependency semua fitur lain)*

- `class_coaches` perlu tambah field `role` (head/assistant)
- Memengaruhi: rapor signature, member schedule, coach review
- Database: tabel `class_coaches` perlu update schema
- **File utama**: `src/app/admin/_components/AdminCoach.tsx`, `src/app/member/page.tsx`

---

## 2. Report Criteria - Level-Based Templates *(complex, core business logic)*

- Owner atur template per level: skill, criteria, personal best time
- Coach pilih level → otomatis load criteria
- Database: perlu tabel baru `rapor_level_templates` atau extend `class_criteria`
- **File utama**: `src/app/admin/_components/AdminRapor.tsx`, `src/app/coach/page.tsx`, `src/lib/printRapor.ts`

---

## 3. Financial - Income/Expenses CRUD + Percabang

- Buat tabel baru `income_expenses` (standalone, bukan derived dari bills/invoices)
- Branch view: filter per cabang
- CRUD: create, read, update, delete income & expenses
- **File utama**: `src/app/owner/page.tsx` (OwnerFinancial), `src/app/admin/_components/AdminFinancial.tsx`

---

## 4. Admin Panel - Input Income/Expenses

- Extend admin panel dengan form input income/expenses
- Depends on #3 (tabel harus ada dulu)
- **File utama**: `src/app/admin/_components/AdminFinancial.tsx`

---

## 5. Coach Rates - Dropdown by Coach + Extra Tariff

- Dropdown pilih coach → tampil tabel kelas + rate
- Rate bisa beda per kelas per coach
- Input tarif extra (per 1 sesi)
- **File utama**: `src/app/owner/page.tsx` (OwnerCoachRates)

---

## 6. Coach Invoice - Extra Session Invoice

- Coach bisa pilih dropdown "extra" di menu invoice
- Input berapa kali extra → perkalian
- Depends on #5 (tarif extra harus ada)
- **File utama**: `src/app/coach/page.tsx`

---

## 7. Expense Detail - Link Drive Bukti Reimburse

- Tambah field `receipt_url` di tabel expenses
- Tampilkan link di detail view
- **File utama**: `src/app/owner/page.tsx`

---

## 8. Review Coach - Multi-Coach & Tempat Terpisah

- 1 kelas 2 coach → member review untuk 2 coach
- Review section dipindah ke tempat terpisah (bukan nested di dalam)
- **File utama**: `src/app/member/page.tsx`, `src/app/admin/_components/AdminRapor.tsx`

---

## 9. Reviewer Coach Anonymous di Rapor

- Nama reviewer ditampilkan anonim (bukan nama member)
- **File utama**: `src/lib/printRapor.ts`

---

## 10. Certification Optional

- Ubah validasi form certification dari required → optional
- **File utama**: `src/app/admin/_components/AdminCoach.tsx`

---

## 11. Button Email di Coach Panel

- Tambah button link ke email `nextswim`
- **File utama**: `src/app/coach/page.tsx`

---

## 12. Coach Position di Member Schedule

- Tampilkan jabatan (head/assistant) di list coach pada jadwal
- Depends on #1
- **File utama**: `src/app/member/page.tsx`

---

## 13. Language/i18n Support *(paling besar, bisa dikerjakan paling akhir)*

- Install i18n library (next-intl / i18next)
- Refactor semua hardcoded strings → translation keys
- Tambah language switcher di semua panel
- **Impact**: menyentuh hampir semua file

---

## Dependency Graph

```
#1 Head/Assistant Role ──→ #12 Coach Position di Schedule
                       ──→ #8 Multi-Coach Review

#3 Financial CRUD ──→ #4 Admin Input Income/Expenses

#5 Coach Rates + Extra ──→ #6 Coach Invoice Extra

#2 Report Level Templates (independent, bisa mulai kapan saja)

#13 i18n (independent, paling besar, bisa paralel)
```

---

## Estimasi Complexity

| # | Feedback | Complexity | Impact |
|---|----------|------------|--------|
| 1 | Head/Assistant Role | Medium | High |
| 2 | Level-Based Criteria | High | High |
| 3 | Financial CRUD | Medium | High |
| 4 | Admin Input | Low | Medium |
| 5 | Coach Rates Dropdown | Medium | Medium |
| 6 | Extra Invoice | Low | Medium |
| 7 | Expense Receipt Link | Low | Low |
| 8 | Multi-Coach Review | Medium | Medium |
| 9 | Anonymous Reviewer | Low | Low |
| 10 | Cert Optional | Low | Low |
| 11 | Email Button | Low | Low |
| 12 | Coach Position | Low | Low |
| 13 | i18n | High | High |
