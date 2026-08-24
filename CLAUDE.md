@AGENTS.md

# Next Swimming School — Project Context

## What this project is

A Next.js (App Router) web app for **Next Swimming School** — a multi-branch swimming school management system. It has a public landing page and five role-based panels: Owner, Admin, Coach, Member, and School.

## Key docs

- [supabase/schema.sql](supabase/schema.sql) — current full SQL schema reference
- [docs/feedback-priorities.md](docs/feedback-priorities.md) — prioritized feedback/backlog
- [docs/test-scenarios.md](docs/test-scenarios.md) — test scenario notes
- `supabase/*.sql` — standalone migration scripts, one per feature, run manually in the Supabase SQL Editor

## Tech stack

- **Next.js** (App Router, version in package.json — read AGENTS.md first)
- **Supabase** — auth, PostgreSQL, realtime, storage (file storage migrated off Cloudflare R2 — see Supabase Storage setup below)
- **React 19**, TypeScript
- **Tailwind CSS v4** — config lives in `src/app/globals.css` using `@theme inline` syntax. There is NO `tailwind.config.ts`.
- **Fonts**: Plus Jakarta Sans (`font-display`), Inter (`font-sans`), JetBrains Mono (`font-mono`) via `next/font/google` in `src/app/layout.tsx`

## Design system

All design tokens are in `src/app/globals.css`. Key color palettes:

| Token     | Usage                          |
|-----------|--------------------------------|
| `ocean`   | Primary brand (deep blue)      |
| `wave`    | Accent (teal/cyan)             |
| `ink`     | Text hierarchy (ink, ink-soft, ink-mute, ink-faint) |
| `paper`   | Backgrounds (paper-tint, paper-deep) |
| `line`    | Borders / dividers             |
| `ok`      | Success / approved             |
| `warn`    | Warning / pending              |
| `danger`  | Error / rejected               |
| `suspend` | Suspended status               |
| `archive` | Archived status                |
| `sub`     | Substitute status              |
| `manual`  | Manual entry status            |

CSS classes: `water-bg`, `caustics`, `grid-faint`, `skeleton`, `anim-in`, `no-scrollbar`  
Custom shadows: `shadow-card`, `shadow-lift`, `shadow-float`  
Custom animations: `waveShift`, `fadeUp`, `pulseFade`

**NEVER use dynamic Tailwind class interpolation** (e.g., `` `bg-${color}-50` ``). Always write full explicit class strings so Tailwind includes them in the build.

## Supabase Storage setup

File storage was migrated off Cloudflare R2 onto native Supabase Storage. Two buckets:
- `next-storage` (public) — avatars, logos, class photos, signatures, landing images
- `next-storage-private` (private) — payment proofs, certifications, attendance selfies

- Client: `src/utils/supabase-storage/client.ts` — `storage()` (wraps `getSupabaseAdmin().storage`), `BUCKET_PUBLIC`, `BUCKET_PRIVATE` (server-only)
- Helpers: `src/utils/supabase-storage/upload.ts` — `uploadToBucket`, `deleteFile`, `presignUpload`, `publicUrl`, `signedUrl`, `keys`
- Route Handlers: `src/app/api/upload/` — one handler per upload type (avatar, selfie, payment-proof, cert, logo, class-photo, signature, presign); `src/app/api/storage/` — general storage ops (delete, signed-url, stats, backup-list)
- React hook: `src/hooks/useUpload.ts` — `useUpload()` wraps all upload handlers, exposes `upload.avatar(file)` etc.
- React hook: `src/hooks/useSignedUrl.ts` — `useSignedUrl(key)` resolves a private-bucket key (e.g. `bills.proof_url`) into a short-lived signed URL for rendering (`<img src={url} />`)
- **Never import `src/utils/supabase-storage/` in `"use client"` components** — always go through Route Handlers
- Private-bucket fields store the raw storage key, not a URL — always resolve through `useSignedUrl` or `/api/storage/signed-url` before rendering
- See `supabase/storage_policies.sql` for bucket RLS policies

## Supabase setup

- Client files: `src/utils/supabase/client.ts`, `server.ts`, `middleware.ts`
- Auth middleware: `src/proxy.ts` (Next's renamed `middleware.ts` entry point) delegates to `src/utils/supabase/middleware.ts::updateSession()` — handles role-based redirects automatically
- DB types: `src/types/database.ts` — stub; regenerate with `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
- Env: `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `supabase.auth.admin.*` calls must go through Route Handlers (`src/app/api/`) — never expose service key to client

## File structure

```
src/
  app/
    globals.css          ← design system (Tailwind v4 @theme inline)
    layout.tsx           ← root layout (fonts, providers)
    (public)/            ← public landing pages
      layout.tsx
      page.tsx           ← landing page
      _components/       ← landing sections (Hero, Branches, Coaches, Programs, Testimonials, Partners, Faq, Footer, FloatingWhatsapp)
    login/page.tsx
    register/page.tsx
    owner/page.tsx       ← Owner panel (12 sub-pages via internal useState)
    admin/page.tsx       ← Admin panel (14 sub-pages via internal useState)
    coach/page.tsx       ← Coach panel mobile-first (7 tabs)
    member/page.tsx      ← Member panel mobile-first (7 tabs)
    school/page.tsx      ← School panel (rapor + attendance/export tabs)
  i18n/                  ← dictionaries.ts + locales/{en,id}/ — see Locale section
  hooks/
    useUpload.ts          ← Supabase Storage upload hook
    useSignedUrl.ts       ← resolves a private-bucket key into a signed URL for rendering
  lib/
    data.ts              ← Notification type + WA_NUMBER/SCHOOL_EMAIL fallback constants
    utils.ts             ← fmtIDR, fmtDate, fmtDateLong, fmtTime, waLink, mailtoLink, cn
  components/
    CardNav.tsx, BorderGlowCard.tsx, CircularGallery.tsx, DotField.tsx, LogoLoop.tsx, TextType.tsx
                          ← standalone visual/animation components used mainly on the landing page (CircularGallery uses ogl/WebGL)
    ui/                  ← Icon, Btn, Card, Modal, Status, Avatar, FormFields, Logo, QRBox, Placeholder,
                            DatePicker, MonthYearPicker, TimePicker, MapPicker, PhotoLightbox, StarDisplay, LanguageSwitcher
    layout/              ← Sidebar, Topbar, MobileNav, Bell, BetaFeedback
    providers/           ← ToastProvider, ConfirmProvider, LocaleProvider
supabase/
  schema.sql             ← current full SQL schema reference
  storage_policies.sql   ← Supabase Storage bucket RLS policies
  ...                    ← standalone migration scripts, one per feature
```

## Panel navigation pattern

Panel pages (owner, admin, coach, member) use **internal `useState` tab routing**, NOT Next.js router. This is intentional — zero loading between tabs, matches the original prototype UX.

- Owner + Admin: `Sidebar` (desktop) + `Topbar` + `Bell`
- Coach + Member: mobile-first `Shell` with `MobileNav` (bottom) + inline desktop header links

## Key utilities

```ts
// src/lib/utils.ts
fmtIDR(number)         // Rp 150.000
fmtDate(dateString)    // "Senin, 12 Mei 2026"
fmtDateLong(dateString)
fmtTime(timeString)    // "08:00"
waLink(message)        // WhatsApp deep link with encoded message
mailtoLink(subject, body, email?) // mailto: deep link, falls back to SCHOOL_EMAIL
cn(...classes)         // hand-rolled class-merge utility (classes.filter(Boolean).join(" "))
```

## UI components quick reference

| Component | Location | Notes |
|-----------|----------|-------|
| `<Icon name="..." />` | `components/ui/Icon.tsx` | 60+ SVG icons |
| `<Btn variant="..." />` | `components/ui/Btn.tsx` | primary, accent, ghost, outline, soft, danger, wa |
| `<Status kind="..." />` | `components/ui/Status.tsx` | approved, pending, rejected, suspend, active, inactive, etc. |
| `<Avatar name="..." size={N} />` | `components/ui/Avatar.tsx` | initials-based, 6-color palette |
| `<Card />` / `<SectionTitle />` / `<Stat />` | `components/ui/Card.tsx` | |
| `<Modal open={} onClose={} title="" size="" footer={}>` | `components/ui/Modal.tsx` | accessible, escape key |
| `<Field label="">` + `<Input />` / `<Select />` / `<Textarea />` / `<Switch />` | `components/ui/FormFields.tsx` | forwardRef |
| `<Logo size={N} withWord? />` | `components/ui/Logo.tsx` | wraps `next/image` |
| `<Placeholder />` | `components/ui/Placeholder.tsx` | diagonal stripe placeholder |
| `<QRBox />` | `components/ui/QRBox.tsx` | SVG QR placeholder |
| `<DatePicker />` / `<MonthYearPicker />` / `<TimePicker />` | `components/ui/*.tsx` | custom dropdown pickers, locale-aware month/day names via `useLocale()` |
| `<MapPicker />` | `components/ui/MapPicker.tsx` | Leaflet map for picking a lat/lng (dynamic-imported) |
| `<PhotoLightbox />` | `components/ui/PhotoLightbox.tsx` | fullscreen photo viewer with optional "change photo" |
| `<StarDisplay stars={} />` | `components/ui/StarDisplay.tsx` | shared star-rating display |
| `<LanguageSwitcher />` | `components/ui/LanguageSwitcher.tsx` | EN/ID toggle, mounted in every panel header |

## Providers

- `useToast()` from `ToastProvider` — replaces `alert()`
- `useConfirm()` from `ConfirmProvider` — async Promise-based `confirm()`
- `useLocale()` from `LocaleProvider` — `{ locale, setLocale, t, tArray }`, see Locale section

## Locale / i18n

Default language is **English**, with Bahasa Indonesia as a user-selectable option via the `<LanguageSwitcher />` in every panel header. Custom Context-based i18n (not a routing-based library, since panels use internal tab state, not sub-routes):
- `src/i18n/dictionaries.ts` — `translate()`/`translateArray()`, `Locale` type, `dictionaries` map
- `src/i18n/locales/{en,id}/*.ts` — one file per panel; `id` files are type-annotated against their `en` counterpart so a missing/mismatched key fails `tsc`
- `src/components/providers/LocaleProvider.tsx` — persists to `localStorage` + `profiles.locale` (synced in the background)
- Migration status: shared `ui`/`layout` components, Member panel's Shell+Home, and locale dictionaries for Owner (`owner.ts`) and Coach (`coach.ts`) now exist and are wired into those panels; Admin/School panel bodies and the rest of Member's tabs are still hardcoded Indonesian pending further migration passes.

## Data

`src/lib/data.ts` now only holds the `Notification` type and the `WA_NUMBER`/`SCHOOL_EMAIL` fallback constants (used when `landing_config` in Supabase has no override set) — all other panel data comes from live Supabase queries.

## WhatsApp integration

Used throughout for school → admin communication. Always use `waLink(message)` from `src/lib/utils.ts`. Links open `https://wa.me/...` with pre-filled message.
