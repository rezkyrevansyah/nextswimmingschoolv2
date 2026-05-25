# Cloudflare R2 — Setup Guide

Panduan lengkap membuat bucket, mengambil credentials, dan mengkonfigurasi project.

---

## Ringkasan Credential yang Dibutuhkan

| Variabel di `.env.local` | Dari mana diambil |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare Dashboard → sidebar kanan |
| `R2_BUCKET_NAME` | Nama bucket yang kamu buat (bebas, e.g. `nss-media`) |
| `R2_ACCESS_KEY_ID` | R2 API Token → Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Token → Secret Access Key (tampil sekali saat dibuat) |
| `R2_PUBLIC_URL` | R2 bucket → Settings → Public Access domain |

---

## Step 1 — Login Cloudflare

Buka [dash.cloudflare.com](https://dash.cloudflare.com) dan login.

---

## Step 2 — Ambil Account ID

1. Setelah login, lihat **sidebar kanan** halaman utama (atau halaman Workers & Pages)
2. Di bawah section **"Account ID"** → copy nilai tersebut
3. Isi ke `.env.local`:
   ```
   R2_ACCOUNT_ID=abc123def456...
   ```

---

## Step 3 — Buat Bucket R2

1. Di sidebar kiri → klik **R2 Object Storage**
2. Klik **"Create bucket"**
3. Isi nama bucket: `nss-media` (atau nama lain yang kamu mau — catat namanya)
4. **Location:** biarkan default (`Automatic`) atau pilih Asia Pacific untuk latency lebih rendah ke Indonesia
5. Klik **"Create bucket"**

Isi ke `.env.local`:
```
R2_BUCKET_NAME=nss-media
```

---

## Step 4 — Enable Public Access (untuk CDN URL)

Ini agar file bisa diakses via URL publik (foto profil, QR code, dll).

1. Buka bucket yang baru dibuat
2. Klik tab **"Settings"**
3. Scroll ke section **"Public access"**
4. Klik **"Allow Access"** → confirm

Setelah enabled, kamu akan mendapat URL seperti:
```
https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

Copy URL ini → isi ke `.env.local`:
```
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

> **Opsional:** Jika kamu punya domain sendiri (e.g. `cdn.nextswimmingschool.com`), bisa di-setup di bagian **"Custom Domains"** di tab Settings bucket yang sama. Lalu pakai domain itu sebagai `R2_PUBLIC_URL`.

---

## Step 5 — Buat API Token (Access Key)

1. Kembali ke halaman utama R2 (bukan di dalam bucket)
2. Klik **"Manage R2 API Tokens"** (pojok kanan atas halaman R2)
3. Klik **"Create API Token"**
4. Isi:
   - **Token name:** `nss-media-token` (bebas)
   - **Permissions:** pilih **"Object Read & Write"**
   - **Specify bucket:** pilih `nss-media` (bucket yang dibuat tadi)
   - **TTL:** biarkan default (tidak ada expiry) atau set sesuai kebijakan
5. Klik **"Create API Token"**

**PENTING:** Halaman berikutnya menampilkan credentials — **ini satu-satunya saat credentials ditampilkan**. Copy sekarang:

```
R2_ACCESS_KEY_ID=<Access Key ID yang ditampilkan>
R2_SECRET_ACCESS_KEY=<Secret Access Key yang ditampilkan>
```

Simpan keduanya di `.env.local`.

---

## Step 6 — CORS Configuration (untuk direct browser upload)

Jika kamu menggunakan presigned URL (upload langsung browser → R2 tanpa lewat server), perlu setup CORS di bucket.

1. Buka bucket `nss-media`
2. Tab **"Settings"** → scroll ke **"CORS Policy"**
3. Klik **"Add CORS policy"** → paste JSON berikut:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://nextswimmingschool.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Ganti `https://nextswimmingschool.com` dengan domain production kamu.

> **Catatan:** CORS hanya diperlukan untuk presigned upload (`/api/upload/presign`). Upload via Route Handler (`/api/upload/*`) tidak memerlukan CORS karena upload dilakukan server-side.

---

## Step 7 — Isi `.env.local` Lengkap

Setelah semua step di atas, `.env.local` harus terisi seperti ini:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudflare R2
R2_ACCOUNT_ID=1234567890abcdef1234567890abcdef
R2_BUCKET_NAME=nss-media
R2_ACCESS_KEY_ID=abc123...
R2_SECRET_ACCESS_KEY=xyz789...
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```

---

## Struktur Folder di Bucket

File-file di R2 disimpan dengan struktur folder berikut:

```
nss-media/
├── avatars/
│   └── {user-id}/avatar.jpg           ← foto profil semua user
├── logos/
│   └── {branch-id}/logo.jpg           ← logo cabang
├── attendances/
│   └── {coach-id}/{date}/{class-id}.jpg  ← selfie absensi coach
├── qrcodes/
│   └── {member-id}.png                ← QR code member (generated)
├── payments/
│   └── {bill-id}/proof.jpg            ← bukti transfer pembayaran
├── certs/
│   └── {coach-id}/{cert-id}.jpg       ← foto sertifikasi coach
├── invoices/
│   └── {invoice-id}.pdf               ← PDF invoice coach
├── rapors/
│   └── {period-id}/{member-id}.pdf    ← PDF rapor member
└── classes/
    └── {class-id}/cover.jpg           ← foto kelas
```

---

## Route Handlers yang Tersedia

Semua upload dari front-end dilakukan via Route Handler (file tidak pernah expose credentials R2 ke browser):

| Endpoint | Digunakan untuk | Siapa yang bisa upload |
|---|---|---|
| `POST /api/upload/avatar` | Foto profil | User sendiri (semua role) |
| `POST /api/upload/selfie` | Selfie clock-in coach | Coach |
| `POST /api/upload/payment-proof` | Bukti transfer | Admin, Owner |
| `POST /api/upload/cert` | Foto sertifikasi | Coach (untuk cert miliknya) |
| `POST /api/upload/logo` | Logo cabang | Admin, Owner |
| `POST /api/upload/class-photo` | Foto kelas | Admin, Owner |
| `POST /api/upload/presign` | Presigned URL (upload besar) | Semua (authenticated) |

---

## Cara Pakai di Komponen

```tsx
"use client";
import { useUpload } from "@/hooks/useUpload";

export function AvatarUpload() {
  const { upload, uploading } = useUpload();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload.avatar(file);
    console.log("Uploaded:", url); // https://pub-xxx.r2.dev/avatars/user-id/avatar.jpg
  };

  return (
    <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
  );
}
```

Untuk selfie clock-in:
```tsx
const url = await upload.selfie(file, classId, "2026-05-25");
// Kemudian simpan url ke coach_attendances.selfie_url
```

---

## Checklist Verifikasi

Setelah setup selesai, jalankan test berikut:

```bash
# 1. Restart dev server agar env vars terbaca
npm run dev

# 2. Login sebagai coach → masuk ke coach page → coba clock in
# Jika selfie berhasil diupload, URL akan muncul di console Network tab

# 3. Login sebagai member → profile → coba ganti foto profil
# Jika berhasil, avatar di UI akan berubah
```

Jika ada error `Missing Cloudflare R2 env vars`, berarti `.env.local` belum terisi semua atau server belum di-restart.
