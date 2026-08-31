# Feedback Batch 1 — 6 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 product feedback items: member-centric competition awards, 3-video YouTube carousel, admin auto-creates staff account, owner database manager, payslip period audit/fix, and QR codes for all roles.

**Architecture:** Each task is independent and targets specific files. SQL migrations run manually in Supabase SQL Editor. Frontend changes use the existing component/hook patterns (Supabase client, useToast, useConfirm, Tailwind v4 design tokens). No new libraries added except where noted.

**Tech Stack:** Next.js App Router, Supabase JS client, React 19, TypeScript, Tailwind CSS v4, `qrcode` npm package (already installed), `xlsx` (already installed).

**Spec:** This plan implements feedback items from the user session on 2026-08-31.

## Global Constraints

- Never use dynamic Tailwind class interpolation (e.g., `` `bg-${color}-50` ``) — always write full explicit class strings
- All Supabase admin calls must go through Route Handlers in `src/app/api/`, never expose service key to client
- Private bucket fields store raw storage key, not URL — resolve through `useSignedUrl` before rendering
- `supabase.auth.admin.*` calls only in Route Handlers
- Design tokens: use `ocean`, `wave`, `ink`, `paper`, `line`, `ok`, `warn`, `danger` CSS variables
- SQL migrations: write as standalone `.sql` files in `supabase/`, run manually in Supabase SQL Editor
- Follow existing panel SPA pattern: no Next.js sub-routes within panels, use `useState` for navigation
- `cn()` is the class-merge utility in `src/lib/utils.ts`

---

## Task 1: Competition — Member-Centric Award Input

**Problem:** Currently the flow is competition-centric: pick a competition → add participants one by one. One child can join many categories in one competition. The desired flow: pick the child first → CRUD all their participations/awards.

**Files:**
- Modify: `src/app/admin/_components/AdminCompetition.tsx`

**What changes:**
- Add a second tab inside the Competition page: "Penghargaan Peserta"
- Tab 1 "Perlombaan": existing competition CRUD table (already a `<table>`, keep as-is)
- Tab 2 "Penghargaan Peserta": member-centric view
  - Searchable member dropdown at top
  - Once member selected: show their participations across ALL competitions in a table
  - Table columns: Perlombaan, Tanggal, Kategori, Waktu, Peringkat, Penghargaan, Cabang, Aksi
  - "+ Tambah Penghargaan" button below table — opens modal pre-filled with selected member (locked), allows picking competition + all participation details
  - Can add multiple in sequence without re-selecting member
  - Edit/Delete actions per row

- [ ] **Step 1: Add tab state to AdminCompetition**

At the top of the component, near existing state declarations, add:

```tsx
const [activeTab, setActiveTab] = useState<"competitions" | "awards">("competitions");
const [awardMemberId, setAwardMemberId] = useState("");
const [awardMemberSearch, setAwardMemberSearch] = useState("");
const [memberParticipations, setMemberParticipations] = useState<ParticipationRow[]>([]);
const [memberParticipationsLoading, setMemberParticipationsLoading] = useState(false);
```

- [ ] **Step 2: Add tab switcher UI at the top of the return JSX**

Place this above the existing summary stats bar, replacing the section header:

```tsx
{/* Tab switcher */}
<div className="flex gap-1 p-1 bg-[var(--paper-tint)] rounded-lg w-fit mb-4">
  <button
    onClick={() => setActiveTab("competitions")}
    className={cn(
      "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
      activeTab === "competitions"
        ? "bg-white shadow-sm text-[var(--ocean)] dark:bg-[var(--paper-deep)] dark:shadow-none"
        : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
    )}
  >
    Perlombaan
  </button>
  <button
    onClick={() => setActiveTab("awards")}
    className={cn(
      "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
      activeTab === "awards"
        ? "bg-white shadow-sm text-[var(--ocean)] dark:bg-[var(--paper-deep)] dark:shadow-none"
        : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
    )}
  >
    Penghargaan Peserta
  </button>
</div>
```

Wrap the existing competition content in `{activeTab === "competitions" && (...)}`.

- [ ] **Step 3: Write fetchMemberParticipations function**

Add this function inside the component (alongside existing `fetchCompetitions`, `fetchParticipations` etc.):

```tsx
async function fetchMemberParticipations(memberId: string) {
  if (!memberId) { setMemberParticipations([]); return; }
  setMemberParticipationsLoading(true);
  const { data, error } = await supabase
    .from("competition_participations")
    .select(`
      *,
      competition:competitions(id, name, start_date, end_date, level, location),
      member:profiles!competition_participations_member_id_fkey(id, full_name, avatar_url),
      branch:branches(name),
      coach:profiles!competition_participations_coach_id_fkey(full_name)
    `)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  setMemberParticipationsLoading(false);
  if (error) { toast.error("Gagal memuat data penghargaan"); return; }
  setMemberParticipations((data as ParticipationRow[]) ?? []);
}
```

Call it in a `useEffect` when `awardMemberId` changes:

```tsx
useEffect(() => {
  fetchMemberParticipations(awardMemberId);
}, [awardMemberId]);
```

- [ ] **Step 4: Build the "Penghargaan Peserta" tab content**

Add inside the JSX, wrapped in `{activeTab === "awards" && (...)}`:

```tsx
{activeTab === "awards" && (
  <div className="space-y-4">
    {/* Member selector */}
    <Card>
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-[var(--ink)]">Pilih Peserta</p>
        <div className="flex gap-2">
          <Input
            placeholder="Cari nama peserta..."
            value={awardMemberSearch}
            onChange={e => setAwardMemberSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {/* Member dropdown list */}
        {awardMemberSearch.length >= 2 && (
          <div className="border border-[var(--line)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {members
              .filter(m =>
                m.full_name.toLowerCase().includes(awardMemberSearch.toLowerCase())
              )
              .slice(0, 20)
              .map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAwardMemberId(m.id);
                    setAwardMemberSearch(m.full_name);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-[var(--paper-tint)] transition-colors flex items-center gap-2",
                    awardMemberId === m.id && "bg-[var(--ocean)]/5 font-medium"
                  )}
                >
                  <Avatar name={m.full_name} size={24} />
                  {m.full_name}
                </button>
              ))}
          </div>
        )}
        {awardMemberId && (
          <div className="flex items-center gap-2 text-sm text-[var(--ok)]">
            <Icon name="check" className="w-4 h-4" />
            Menampilkan penghargaan untuk: <strong>{awardMemberSearch}</strong>
          </div>
        )}
      </div>
    </Card>

    {/* Participations table */}
    {awardMemberId && (
      <Card>
        <div className="p-4 flex items-center justify-between mb-3">
          <p className="font-medium text-[var(--ink)]">
            Riwayat Penghargaan
            {memberParticipations.length > 0 && (
              <span className="ml-2 text-xs text-[var(--ink-soft)]">
                ({memberParticipations.length} entri)
              </span>
            )}
          </p>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => {
              // Open existing partForm modal but pre-lock member_id
              setPartForm({ ...PART_FORM_DEFAULT, member_id: awardMemberId });
              setEditingPartId(null);
              setShowPartModal(true);
              setSelectedComp(null); // will be picked inside modal
            }}
          >
            + Tambah Penghargaan
          </Btn>
        </div>
        {memberParticipationsLoading ? (
          <div className="p-8 text-center text-[var(--ink-soft)] text-sm">Memuat...</div>
        ) : memberParticipations.length === 0 ? (
          <div className="p-8 text-center text-[var(--ink-soft)] text-sm">
            Belum ada penghargaan untuk peserta ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left">
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Perlombaan</th>
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Tanggal</th>
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Kategori</th>
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Waktu</th>
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Peringkat</th>
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Penghargaan</th>
                  <th className="pb-2 px-3 font-medium text-[var(--ink-soft)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {memberParticipations.map(p => (
                  <tr key={p.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper-tint)]">
                    <td className="py-2 px-3 font-medium">{(p as any).competition?.name ?? "—"}</td>
                    <td className="py-2 px-3 text-[var(--ink-soft)]">
                      {(p as any).competition?.start_date
                        ? fmtDate((p as any).competition.start_date)
                        : "—"}
                    </td>
                    <td className="py-2 px-3">{p.category}</td>
                    <td className="py-2 px-3 font-mono text-xs">{p.time_formatted ?? "—"}</td>
                    <td className="py-2 px-3">{p.rank ? `#${p.rank}` : "—"}</td>
                    <td className="py-2 px-3">
                      {p.award ? (
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", AWARD_LABELS[p.award]?.style)}>
                          {AWARD_LABELS[p.award]?.icon} {AWARD_LABELS[p.award]?.label ?? p.custom_award_label}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="xs" onClick={() => openEditPart(p)}>Edit</Btn>
                        <Btn variant="ghost" size="xs" onClick={() => handleDeletePart(p.id)}>
                          <Icon name="trash" className="w-3.5 h-3.5 text-[var(--danger)]" />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )}
  </div>
)}
```

- [ ] **Step 5: Add competition selector to partForm modal when opened from awards tab**

In the existing participation modal (`showPartModal`), detect whether it was opened from the awards tab (when `selectedComp` is null). If so, add a competition selector dropdown at the top of the form:

Inside the modal form, before the member_id field, add:

```tsx
{activeTab === "awards" && !editingPartId && (
  <Field label="Perlombaan">
    <Select
      value={partForm.competition_id ?? ""}
      onChange={e => setPartForm(f => ({ ...f, competition_id: e.target.value }))}
      required
    >
      <option value="">Pilih perlombaan...</option>
      {competitions.map(c => (
        <option key={c.id} value={c.id}>
          {c.name} — {c.start_date ? fmtDate(c.start_date) : ""}
        </option>
      ))}
    </Select>
  </Field>
)}
```

Add `competition_id` to `partForm` state and to the insert payload.

- [ ] **Step 6: After save/delete in awards tab, refresh member participations**

After `handleSavePart()` and `handleDeletePart()` succeed, call:

```tsx
fetchMemberParticipations(awardMemberId);
```

in addition to the existing `fetchParticipations(selectedComp?.id)` call. Guard with `if (activeTab === "awards")`.

- [ ] **Step 7: Manual test in browser**

1. Go to Admin panel → Competitions
2. Verify "Perlombaan" tab shows existing table unchanged
3. Switch to "Penghargaan Peserta" tab
4. Search for a member — dropdown appears
5. Select member — their participations table loads
6. Click "+ Tambah Penghargaan" — modal opens with member locked, competition dropdown at top
7. Fill in competition, category, award, save
8. Verify new row appears in the table
9. Edit and delete a row, verify table updates

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/_components/AdminCompetition.tsx
git commit -m "feat(competition): add member-centric award input tab"
```

---

## Task 2: Landing Page — 3-Video YouTube Carousel

**Problem:** Currently only 1 YouTube video is supported. User wants up to 3 videos with a carousel where the center card is larger and left/right are smaller.

**Files:**
- Create: `supabase/add_landing_videos_multi.sql`
- Modify: `src/app/(public)/_components/VideoSection.tsx`
- Modify: `src/app/owner/_components/LandingCMS.tsx`
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1: Write and run SQL migration**

Create `supabase/add_landing_videos_multi.sql`:

```sql
-- Add two more video URL columns to landing_config
ALTER TABLE landing_config
  ADD COLUMN IF NOT EXISTS youtube_video_url_2 text,
  ADD COLUMN IF NOT EXISTS youtube_video_url_3 text;
```

Run this in Supabase SQL Editor.

- [ ] **Step 2: Update server-side data fetch in public page**

In `src/app/(public)/page.tsx`, find the `landing_config` select query and add the new columns:

```tsx
// Find the existing select that includes youtube_video_url
// Add the two new columns to it:
.select("..., youtube_video_url, youtube_video_url_2, youtube_video_url_3, youtube_section_title, youtube_section_subtitle")
```

Update the props passed to `<VideoSection />` to include the two new fields.

- [ ] **Step 3: Rewrite VideoSection.tsx with carousel UI**

Replace the entire `src/app/(public)/_components/VideoSection.tsx` with:

```tsx
"use client";

import { useRef, useState } from "react";

interface Props {
  youtube_video_url?: string | null;
  youtube_video_url_2?: string | null;
  youtube_video_url_3?: string | null;
  youtube_section_title?: string | null;
  youtube_section_subtitle?: string | null;
}

function getEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}?rel=0`;
}

export default function VideoSection({
  youtube_video_url,
  youtube_video_url_2,
  youtube_video_url_3,
  youtube_section_title,
  youtube_section_subtitle,
}: Props) {
  const videos = [
    getEmbedUrl(youtube_video_url),
    getEmbedUrl(youtube_video_url_2),
    getEmbedUrl(youtube_video_url_3),
  ].filter(Boolean) as string[];

  const [active, setActive] = useState(0);

  if (videos.length === 0) return null;

  // Single video: plain centered layout
  if (videos.length === 1) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {(youtube_section_title || youtube_section_subtitle) && (
            <div className="space-y-2">
              {youtube_section_title && (
                <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                  {youtube_section_title}
                </h2>
              )}
              {youtube_section_subtitle && (
                <p className="text-[var(--ink-soft)]">{youtube_section_subtitle}</p>
              )}
            </div>
          )}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-card">
            <iframe
              src={videos[0]}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    );
  }

  // 2–3 videos: carousel with center-focused layout
  const prev = () => setActive(i => (i - 1 + videos.length) % videos.length);
  const next = () => setActive(i => (i + 1) % videos.length);

  function cardIndex(offset: number) {
    return (active + offset + videos.length) % videos.length;
  }

  return (
    <section className="py-16 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {(youtube_section_title || youtube_section_subtitle) && (
          <div className="text-center space-y-2 mb-10">
            {youtube_section_title && (
              <h2 className="text-2xl font-bold text-[var(--ink)] font-display">
                {youtube_section_title}
              </h2>
            )}
            {youtube_section_subtitle && (
              <p className="text-[var(--ink-soft)]">{youtube_section_subtitle}</p>
            )}
          </div>
        )}

        <div className="relative flex items-center justify-center gap-4">
          {/* Prev button */}
          <button
            onClick={prev}
            aria-label="Video sebelumnya"
            className="shrink-0 w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ocean)] transition-colors z-10 dark:bg-[var(--paper-deep)]"
          >
            ‹
          </button>

          {/* Cards */}
          <div className="flex items-center justify-center gap-4 flex-1">
            {videos.length === 3 && (
              /* Left card */
              <button
                onClick={prev}
                className="hidden sm:block shrink-0 w-[28%] aspect-video rounded-xl overflow-hidden opacity-50 hover:opacity-70 transition-opacity shadow-card relative"
                tabIndex={-1}
              >
                <iframe
                  src={videos[cardIndex(-1)]}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  tabIndex={-1}
                />
              </button>
            )}

            {/* Center (active) card */}
            <div className="relative flex-1 max-w-[560px] aspect-video rounded-2xl overflow-hidden shadow-float ring-2 ring-[var(--ocean)] ring-offset-2">
              <iframe
                src={videos[active]}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {videos.length >= 2 && (
              /* Right card */
              <button
                onClick={next}
                className="hidden sm:block shrink-0 w-[28%] aspect-video rounded-xl overflow-hidden opacity-50 hover:opacity-70 transition-opacity shadow-card relative"
                tabIndex={-1}
              >
                <iframe
                  src={videos[cardIndex(1)]}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  tabIndex={-1}
                />
              </button>
            )}
          </div>

          {/* Next button */}
          <button
            onClick={next}
            aria-label="Video berikutnya"
            className="shrink-0 w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ocean)] transition-colors z-10 dark:bg-[var(--paper-deep)]"
          >
            ›
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Video ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all ${
                i === active
                  ? "bg-[var(--ocean)] w-5"
                  : "bg-[var(--line)] hover:bg-[var(--ink-soft)]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update LandingCMS.tsx to show 3 URL inputs**

Find the video URL section in `src/app/owner/_components/LandingCMS.tsx` and add inputs for the 2 new URLs. Alongside the existing `youtube_video_url` field, add:

```tsx
<Field label="YouTube Video URL 2 (opsional)">
  <Input
    value={config.youtube_video_url_2 ?? ""}
    onChange={e => setConfig(c => ({ ...c, youtube_video_url_2: e.target.value || null }))}
    placeholder="https://youtube.com/watch?v=..."
  />
</Field>
<Field label="YouTube Video URL 3 (opsional)">
  <Input
    value={config.youtube_video_url_3 ?? ""}
    onChange={e => setConfig(c => ({ ...c, youtube_video_url_3: e.target.value || null }))}
    placeholder="https://youtube.com/watch?v=..."
  />
</Field>
```

In the save upsert, include both new fields:

```tsx
youtube_video_url_2: config.youtube_video_url_2,
youtube_video_url_3: config.youtube_video_url_3,
```

Also update the initial fetch to select these columns.

- [ ] **Step 5: Manual test in browser**

1. Go to Owner panel → Landing → Video section
2. Enter 3 YouTube URLs, save
3. Visit the landing page — verify carousel shows with center card prominent, side cards smaller
4. Click ‹ / › arrows — verify active card rotates
5. Click dot indicators — verify correct card becomes active
6. Test with 1 and 2 URLs — verify graceful fallback

- [ ] **Step 6: Commit**

```bash
git add supabase/add_landing_videos_multi.sql src/app/(public)/_components/VideoSection.tsx src/app/owner/_components/LandingCMS.tsx src/app/(public)/page.tsx
git commit -m "feat(landing): 3-video YouTube carousel with center-focus UI"
```

---

## Task 3: Admin Account Auto-Creates Staff Account

**Problem:** Creating an admin account only creates one profile. Admin should simultaneously get a staff account (different email/auth user) so they can log in as staff for clock-in/payslip access.

**Architecture decision:** Since Supabase auth requires unique emails, the staff account uses a separate email. The creation form gains a toggle: "Buat akun Staff otomatis". If enabled, a second email+password field appears for the staff account. The API creates two auth users and two profiles atomically.

**Files:**
- Modify: `src/app/owner/_components/OwnerAccountsMaster.tsx`
- Modify: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Add staff auto-create fields to OwnerAccountsMaster form**

In `OwnerAccountsMaster.tsx`, find the admin creation form. Add state for the new fields:

```tsx
const [autoCreateStaff, setAutoCreateStaff] = useState(false);
const [staffEmail, setStaffEmail] = useState("");
const [staffPassword, setStaffPassword] = useState("");
```

Reset these when the modal closes or role changes:

```tsx
// In handleClose / resetForm:
setAutoCreateStaff(false);
setStaffEmail("");
setStaffPassword("");
```

Inside the form, after the existing email field, conditionally show when `form.role === "admin"`:

```tsx
{form.role === "admin" && (
  <div className="space-y-3 rounded-lg border border-[var(--line)] p-3 bg-[var(--paper-tint)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--ink)]">Buat akun Staff otomatis</p>
        <p className="text-xs text-[var(--ink-soft)]">
          Admin juga mendapat akun Staff untuk absen & payslip
        </p>
      </div>
      <Switch
        checked={autoCreateStaff}
        onChange={setAutoCreateStaff}
      />
    </div>
    {autoCreateStaff && (
      <>
        <Field label="Email akun Staff">
          <Input
            type="email"
            value={staffEmail}
            onChange={e => setStaffEmail(e.target.value)}
            placeholder="staff@example.com"
            required
          />
        </Field>
        <Field label="Password akun Staff">
          <Input
            type="password"
            value={staffPassword}
            onChange={e => setStaffPassword(e.target.value)}
            placeholder="Min 8 karakter"
            required
          />
        </Field>
      </>
    )}
  </div>
)}
```

- [ ] **Step 2: Pass staff account data in the API call**

In the existing `handleSubmit` function where it calls `POST /api/admin/users`, add the staff fields to the body when applicable:

```tsx
const payload: Record<string, unknown> = {
  role: form.role,
  full_name: form.full_name,
  email: form.email,
  password: form.password,
  phone: form.phone,
  branch_id: form.branch_id,
  custom_role_label: form.custom_role_label,
  // ...existing fields
};

if (form.role === "admin" && autoCreateStaff && staffEmail && staffPassword) {
  payload.auto_staff = {
    email: staffEmail,
    password: staffPassword,
  };
}

const res = await fetch("/api/admin/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

- [ ] **Step 3: Update /api/admin/users/route.ts to handle auto_staff**

In `src/app/api/admin/users/route.ts`, after the primary admin account is created successfully, check for `auto_staff` in the body:

```tsx
// After successfully creating the admin profile:
const { auto_staff } = body;

if (role === "admin" && auto_staff?.email && auto_staff?.password) {
  // Create staff auth user
  const { data: staffAuth, error: staffAuthError } = await supabase.auth.admin.createUser({
    email: auto_staff.email,
    password: auto_staff.password,
    email_confirm: true,
  });

  if (staffAuthError) {
    // Log warning but don't fail the whole request — admin was already created
    console.warn("Auto-staff creation failed:", staffAuthError.message);
    // Return success with a warning flag
    return NextResponse.json({
      ...adminResult,
      staff_warning: `Admin created but staff account failed: ${staffAuthError.message}`,
    });
  }

  // Generate staff user_no
  const { data: staffNo } = await supabase.rpc("generate_user_no", { p_role: "staff" });

  // Create staff profile
  await supabase.from("profiles").insert({
    id: staffAuth.user.id,
    role: "staff",
    full_name: full_name, // same name as admin
    email: auto_staff.email,
    phone: phone ?? null,
    branch_id: branch_id,
    user_no: staffNo,
    custom_role_label: custom_role_label ?? null,
    linked_admin_id: adminProfileId, // see step 4
  });
}
```

- [ ] **Step 4: Add linked_admin_id column to profiles (optional but useful)**

Create `supabase/add_profiles_linked_admin.sql`:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS linked_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
```

Run in Supabase SQL Editor. This allows easy lookup of an admin's paired staff account.

- [ ] **Step 5: Show staff account info in admin detail view**

In `OwnerAccountsMaster.tsx`, in the admin account detail view, query for linked staff:

```tsx
// When opening admin detail:
const { data: linkedStaff } = await supabase
  .from("profiles")
  .select("id, full_name, email, role")
  .eq("linked_admin_id", adminId)
  .eq("role", "staff")
  .maybeSingle();
```

Display a "Akun Staff Terhubung" card in the detail modal if `linkedStaff` exists, showing email and a link to the staff profile.

- [ ] **Step 6: Manual test**

1. Go to Owner panel → Akun → Buat Akun Baru → pilih Admin
2. Fill admin fields → toggle "Buat akun Staff otomatis" ON
3. Enter staff email + password
4. Save — verify both accounts appear in the list
5. Login with staff email — verify staff panel loads correctly
6. Login with admin email — verify admin panel loads correctly
7. Test with toggle OFF — verify only admin account created

- [ ] **Step 7: Show warning toast if staff creation failed**

In the client after the API call, check for `staff_warning` in the response:

```tsx
const result = await res.json();
if (result.staff_warning) {
  toast.warn(`Admin berhasil dibuat. ${result.staff_warning}`);
} else {
  toast.success("Akun berhasil dibuat!");
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/owner/_components/OwnerAccountsMaster.tsx src/app/api/admin/users/route.ts supabase/add_profiles_linked_admin.sql
git commit -m "feat(accounts): admin creation auto-generates paired staff account"
```

---

## Task 4: Owner Database Management Panel

**Problem:** Owner needs ability to view, export, and delete database records, plus a realtime activity monitor.

**Architecture:** New `OwnerDatabaseManager` component in owner panel. Uses API routes to safely proxy database operations (never expose service key to client). Export uses `xlsx`. Realtime uses Supabase realtime subscription on `activity_logs`.

**Files:**
- Create: `src/app/owner/_components/OwnerDatabaseManager.tsx`
- Create: `src/app/api/owner/db/route.ts`
- Modify: `src/app/owner/page.tsx` (add nav item + import)

- [ ] **Step 1: Create the API route for database operations**

Create `src/app/api/owner/db/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabase/server"; // adjust to actual admin client import

// Tables that are safe to expose for read/export/delete in the owner panel
const ALLOWED_TABLES = [
  "profiles", "branches", "classes", "members", "member_classes",
  "member_attendances", "coach_attendances", "staff_attendances",
  "bills", "coach_invoices", "payslips", "coach_loans",
  "rapor_entries", "rapor_periods", "announcements", "notifications",
  "activity_logs", "registrations", "trial_bookings",
  "competitions", "competition_participations",
  "manual_transactions", "manual_transaction_categories",
];

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const search = searchParams.get("search") ?? "";

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  const offset = (page - 1) * limit;
  let query = supabase.from(table).select("*", { count: "exact" }).range(offset, offset + limit - 1);

  // Generic text search — only if table has a 'name' or 'full_name' column
  // The client sends which column to search
  const searchCol = searchParams.get("search_col");
  if (search && searchCol) {
    query = query.ilike(searchCol, `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { table, ids } = await req.json();

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: "Max 100 deletions at once" }, { status: 400 });
  }

  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}
```

- [ ] **Step 2: Create OwnerDatabaseManager component**

Create `src/app/owner/_components/OwnerDatabaseManager.tsx`. This is a large component — key structure:

```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { Input, Select, Field } from "@/components/ui/FormFields";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const TABLE_LABELS: Record<string, string> = {
  profiles: "Profil Pengguna",
  branches: "Cabang",
  classes: "Kelas",
  members: "Member",
  member_attendances: "Absensi Member",
  coach_attendances: "Absensi Coach",
  bills: "Tagihan",
  payslips: "Payslip",
  activity_logs: "Log Aktivitas",
  competitions: "Perlombaan",
  registrations: "Pendaftaran",
  // add more as needed
};

const ALLOWED_TABLES = Object.keys(TABLE_LABELS);

export default function OwnerDatabaseManager() {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<"browser" | "monitor">("browser");
  const [selectedTable, setSelectedTable] = useState("activity_logs");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [realtimeLogs, setRealtimeLogs] = useState<Record<string, unknown>[]>([]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    const params = new URLSearchParams({
      table: selectedTable,
      page: String(page),
      limit: "50",
    });
    if (search) {
      params.set("search", search);
      // Heuristic: most tables have 'name', profiles has 'full_name'
      params.set("search_col", selectedTable === "profiles" ? "full_name" : "name");
    }
    const res = await fetch(`/api/owner/db?${params}`);
    const json = await res.json();
    setLoading(false);
    if (json.error) { toast.error(json.error); return; }
    setRows(json.data ?? []);
    setTotalCount(json.count ?? 0);
  }, [selectedTable, page, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Realtime subscription for activity_logs
  useEffect(() => {
    if (activeTab !== "monitor") return;
    const channel = supabase
      .channel("db-monitor")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, payload => {
        setRealtimeLogs(prev => [payload.new as Record<string, unknown>, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  async function handleDelete() {
    if (selectedIds.length === 0) return;
    const ok = await confirm(
      `Hapus ${selectedIds.length} baris dari tabel "${TABLE_LABELS[selectedTable]}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!ok) return;
    const res = await fetch("/api/owner/db", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: selectedTable, ids: selectedIds }),
    });
    const json = await res.json();
    if (json.error) { toast.error(json.error); return; }
    toast.success(`${json.deleted} baris berhasil dihapus`);
    fetchRows();
  }

  async function handleExport() {
    // Fetch all rows (up to 5000) for export
    const res = await fetch(`/api/owner/db?table=${selectedTable}&limit=5000&page=1`);
    const json = await res.json();
    if (json.error) { toast.error(json.error); return; }
    const ws = XLSX.utils.json_to_sheet(json.data ?? []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedTable);
    XLSX.writeFile(wb, `${selectedTable}_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const totalPages = Math.ceil(totalCount / 50);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Database Manager"
        subtitle="Kelola, ekspor, dan monitor database secara realtime"
      />

      {/* Tab */}
      <div className="flex gap-1 p-1 bg-[var(--paper-tint)] rounded-lg w-fit">
        {(["browser", "monitor"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-white shadow-sm text-[var(--ocean)] dark:bg-[var(--paper-deep)]"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            )}
          >
            {tab === "browser" ? "Browser Data" : "Monitor Realtime"}
          </button>
        ))}
      </div>

      {activeTab === "browser" && (
        <Card>
          <div className="p-4 space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-end">
              <Field label="Tabel" className="w-56">
                <Select value={selectedTable} onChange={e => { setSelectedTable(e.target.value); setPage(1); setSearch(""); }}>
                  {ALLOWED_TABLES.map(t => (
                    <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Cari" className="flex-1 min-w-[200px]">
                <Input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Cari..."
                />
              </Field>
              <Btn variant="outline" size="sm" onClick={handleExport}>
                <Icon name="download" className="w-4 h-4 mr-1" /> Export Excel
              </Btn>
              {selectedIds.length > 0 && (
                <Btn variant="danger" size="sm" onClick={handleDelete}>
                  <Icon name="trash" className="w-4 h-4 mr-1" /> Hapus ({selectedIds.length})
                </Btn>
              )}
            </div>

            {/* Count */}
            <p className="text-xs text-[var(--ink-soft)]">
              Total {totalCount.toLocaleString()} baris · halaman {page}/{totalPages || 1}
            </p>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
              {loading ? (
                <div className="p-8 text-center text-sm text-[var(--ink-soft)]">Memuat...</div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--ink-soft)]">Tidak ada data</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-[var(--paper-tint)] border-b border-[var(--line)]">
                    <tr>
                      <th className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === rows.length}
                          onChange={e => setSelectedIds(e.target.checked ? rows.map(r => String(r.id)) : [])}
                        />
                      </th>
                      {columns.slice(0, 8).map(col => (
                        <th key={col} className="p-2 text-left font-medium text-[var(--ink-soft)] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={cn("border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper-tint)]", selectedIds.includes(String(row.id)) && "bg-[var(--ocean)]/5")}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(String(row.id))}
                            onChange={e => {
                              const id = String(row.id);
                              setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
                            }}
                          />
                        </td>
                        {columns.slice(0, 8).map(col => (
                          <td key={col} className="p-2 max-w-[200px] truncate text-[var(--ink)]">
                            {row[col] == null ? <span className="text-[var(--ink-faint)]">null</span> : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex gap-2 justify-center">
                <Btn variant="outline" size="xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</Btn>
                <span className="text-sm self-center">{page} / {totalPages}</span>
                <Btn variant="outline" size="xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</Btn>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "monitor" && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[var(--ok)] animate-pulse" />
              <p className="text-sm font-medium text-[var(--ink)]">Live Activity Log</p>
              <span className="text-xs text-[var(--ink-soft)]">(realtime, max 100 entri terbaru)</span>
            </div>
            {realtimeLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--ink-soft)]">
                Menunggu aktivitas baru... Coba lakukan sebuah aksi di panel lain.
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {realtimeLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 text-xs p-2 rounded hover:bg-[var(--paper-tint)] font-mono">
                    <span className="text-[var(--ink-faint)] shrink-0">{String(log.created_at ?? "").slice(0, 19).replace("T", " ")}</span>
                    <span className="text-[var(--ocean)] shrink-0">[{String(log.action ?? "")}]</span>
                    <span className="text-[var(--ink-soft)] shrink-0">{String(log.entity ?? "")}</span>
                    <span className="text-[var(--ink)] truncate">{String(log.user_name ?? log.performed_by ?? "")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add "Database" nav item to owner page**

In `src/app/owner/page.tsx`, find the navigation items array (the one defining sidebar items). Add:

```tsx
{ key: "database", label: "Database Manager", icon: "server" },
```

In the section that maps `activeSection` to a component:

```tsx
database: <OwnerDatabaseManager />,
```

Add the import at the top:

```tsx
import OwnerDatabaseManager from "./_components/OwnerDatabaseManager";
```

- [ ] **Step 4: Manual test**

1. Owner panel → Database Manager
2. Select "Profil Pengguna" table → rows appear
3. Select some rows → "Hapus" button appears → confirm delete → rows removed
4. Export Excel → file downloads
5. Switch to "Monitor Realtime" tab → perform an action (e.g., create an announcement in admin panel) → new log entry appears instantly

- [ ] **Step 5: Commit**

```bash
git add src/app/owner/_components/OwnerDatabaseManager.tsx src/app/api/owner/db/route.ts src/app/owner/page.tsx
git commit -m "feat(owner): database manager with table browser, delete, export, and realtime monitor"
```

---

## Task 5: Payslip Period Flow — Audit & Fix

**Problem:** User reports "periode payslip error input". Based on code audit: the period label is free text with no validation, no duplicate-payslip check, and silent failure on deduction insert errors.

**Root causes identified:**
1. No check: does a `payslips` row already exist for this `invoice_id`?
2. `period_label` can be empty string if user clears the auto-filled value
3. The manual rollback in `generatePayslip()` (delete payslip if deduction fails) may throw if the payslip insert itself partially failed
4. No UI feedback when `net_amount` goes negative (over-deduction)
5. Tax settings query may return no rows if no active global setting exists

**Files:**
- Modify: `src/lib/payroll.ts`
- Modify: `src/app/owner/payroll/PayslipGenerator.tsx`

- [ ] **Step 1: Add duplicate payslip guard in generatePayslip()**

In `src/lib/payroll.ts`, at the top of `generatePayslip()`, add:

```ts
// Guard: already a payslip for this invoice?
const { data: existing } = await supabase
  .from("payslips")
  .select("id, status")
  .eq("invoice_id", invoiceId)
  .maybeSingle();

if (existing) {
  throw new Error(
    `Payslip sudah ada untuk invoice ini (status: ${existing.status}). Tidak bisa membuat duplikat.`
  );
}
```

- [ ] **Step 2: Validate period_label is non-empty**

At the top of `generatePayslip()`, after inputs:

```ts
if (!periodLabel || !periodLabel.trim()) {
  throw new Error("Label periode tidak boleh kosong.");
}
```

- [ ] **Step 3: Wrap manual rollback in try/catch**

The existing rollback code that deletes the payslip on deduction failure might itself throw. Wrap it:

```ts
// Replace existing catch block in generatePayslip():
} catch (deductionError) {
  // Try to roll back the payslip insert
  try {
    await supabase.from("payslips").delete().eq("id", payslipId);
  } catch (rollbackError) {
    console.error("Rollback failed:", rollbackError);
  }
  throw deductionError; // Re-throw so caller sees the original error
}
```

- [ ] **Step 4: Handle missing tax settings gracefully**

In the tax resolution logic (either in `payroll.ts` or `PayslipGenerator.tsx`), add a fallback:

```ts
const { data: taxSetting } = await supabase
  .from("tax_settings")
  .select("*")
  .eq("is_active", true)
  .is("coach_id", null)
  .maybeSingle();

// If no active tax setting, default to 0 (no tax) instead of throwing
const taxMode = taxSetting?.mode ?? "percent";
const taxValue = taxSetting?.value ?? 0;
```

- [ ] **Step 5: Show net_amount warning when negative**

In `PayslipGenerator.tsx`, in the live preview section where `net_amount` is computed, add:

```tsx
{netAmount < 0 && (
  <div className="flex items-center gap-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 rounded-lg px-3 py-2">
    <Icon name="warning" className="w-4 h-4 shrink-0" />
    Potongan melebihi gaji kotor! Periksa kembali nilai potongan.
  </div>
)}
```

Disable the "Simpan Draft" button when `netAmount < 0`:

```tsx
<Btn
  variant="primary"
  onClick={handleSave}
  disabled={netAmount < 0 || saving}
>
  {saving ? "Menyimpan..." : "Simpan Draft"}
</Btn>
```

- [ ] **Step 6: Show error toast with message on failure**

In `PayslipGenerator.tsx`, wrap the `generatePayslip()` call in try/catch and show the error:

```tsx
try {
  await generatePayslip({ ... });
  toast.success("Payslip berhasil disimpan sebagai draft");
} catch (err) {
  toast.error((err as Error).message ?? "Gagal membuat payslip");
}
```

- [ ] **Step 7: Add visual period label validation in UI**

In `PayslipGenerator.tsx`, validate the `period_label` input:

```tsx
<Field label="Periode *">
  <Input
    value={periodLabel}
    onChange={e => setPeriodLabel(e.target.value)}
    placeholder="contoh: Agustus 2024"
    className={!periodLabel.trim() ? "border-[var(--danger)]" : ""}
  />
  {!periodLabel.trim() && (
    <p className="text-xs text-[var(--danger)] mt-1">Label periode wajib diisi</p>
  )}
</Field>
```

- [ ] **Step 8: Manual test scenarios**

1. Try creating a payslip without a period label → should show validation error, not submit
2. Create a payslip successfully → try creating another for the same invoice → should show "Payslip sudah ada" error
3. Set deductions > gross amount → net goes negative → button disabled
4. Delete all tax_settings rows → create payslip → should still work (0% tax)

- [ ] **Step 9: Commit**

```bash
git add src/lib/payroll.ts src/app/owner/payroll/PayslipGenerator.tsx
git commit -m "fix(payroll): audit and fix payslip period flow - duplicate guard, validation, safe rollback, negative net warning"
```

---

## Task 6: QR Codes for All Roles

**Problem:** `qr_code` only exists in the `members` table. Coaches have a placeholder QR with no real value. Staff, school, and other roles have no QR code at all.

**Architecture:** Add `qr_code` column to `profiles` table with UUID default. Backfill existing profiles. Update account creation API. Show real QR codes in all relevant views.

**Files:**
- Create: `supabase/add_profiles_qr_code.sql`
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/admin/_components/AdminCoach.tsx` (show real QR)
- Modify: `src/app/coach/page.tsx` (show coach's own QR)
- Modify: `src/app/staff/page.tsx` (show staff QR on profile tab)
- Modify: `src/app/owner/_components/OwnerAccountsMaster.tsx` (show QR in account detail)

- [ ] **Step 1: Write and run SQL migration**

Create `supabase/add_profiles_qr_code.sql`:

```sql
-- Add qr_code to profiles for all roles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS qr_code text UNIQUE DEFAULT (uuid_generate_v4())::text;

-- Backfill existing profiles that have NULL qr_code
UPDATE profiles
  SET qr_code = (uuid_generate_v4())::text
  WHERE qr_code IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE profiles
  ALTER COLUMN qr_code SET NOT NULL;
```

Run in Supabase SQL Editor.

- [ ] **Step 2: Ensure qr_code is generated on account creation**

In `src/app/api/admin/users/route.ts`, in the `profiles` insert payload, add:

```ts
qr_code: crypto.randomUUID(), // or rely on DB default — DB default is preferred
```

Actually, since the DB now has `DEFAULT (uuid_generate_v4())`, no code change is needed — the DB will auto-generate it. Verify the existing insert doesn't explicitly set `qr_code` to null.

- [ ] **Step 3: Fix AdminCoach.tsx — show real QR**

In `src/app/admin/_components/AdminCoach.tsx`, find the coach detail view where `<QRBox size={80} />` is rendered with no `value` prop. Update the query to include `qr_code`:

In the coaches fetch query, ensure `qr_code` is selected:

```tsx
.select("..., qr_code, ...")
```

Then render:

```tsx
<QRBox
  value={detail.qr_code ?? detail.id}
  size={120}
  downloadable
/>
```

Add a label below:

```tsx
<p className="text-xs text-center text-[var(--ink-soft)] mt-1 font-mono">
  {detail.qr_code?.slice(0, 8)}...
</p>
```

- [ ] **Step 4: Add QR to coach's own profile tab**

In `src/app/coach/page.tsx`, find the profile tab section. Add QR display:

Find where `profile` data is fetched — ensure `qr_code` is selected:

```tsx
.select("..., qr_code")
```

In the profile tab JSX, add a QR card:

```tsx
<Card className="p-4 flex flex-col items-center gap-3">
  <p className="text-sm font-medium text-[var(--ink)]">QR Code Anda</p>
  <QRBox
    value={profile?.qr_code ?? profile?.id ?? ""}
    size={140}
    downloadable
  />
  <p className="text-xs text-[var(--ink-soft)]">Gunakan untuk identifikasi</p>
</Card>
```

- [ ] **Step 5: Add QR to staff profile tab**

In `src/app/staff/page.tsx`, find the profile tab. Ensure `qr_code` is selected in the profile query. Add:

```tsx
<Card className="p-4 flex flex-col items-center gap-3">
  <p className="text-sm font-medium text-[var(--ink)]">QR Code Anda</p>
  <QRBox
    value={profile?.qr_code ?? profile?.id ?? ""}
    size={140}
    downloadable
  />
</Card>
```

- [ ] **Step 6: Add QR to OwnerAccountsMaster account detail modal**

In `src/app/owner/_components/OwnerAccountsMaster.tsx`, find the account detail modal. Ensure `qr_code` is selected in the profiles query. Add a QR section in the detail view:

```tsx
{selectedAccount?.qr_code && (
  <div className="flex flex-col items-center gap-2 p-4 border border-[var(--line)] rounded-lg">
    <p className="text-sm font-medium text-[var(--ink)]">QR Code Akun</p>
    <QRBox
      value={selectedAccount.qr_code}
      size={120}
      downloadable
    />
    <p className="text-xs text-[var(--ink-soft)] font-mono">{selectedAccount.qr_code.slice(0, 12)}...</p>
  </div>
)}
```

- [ ] **Step 7: Add QR to school account detail**

In `OwnerAccountsMaster.tsx` or `AdminMember.tsx`, for accounts with `role="school"`, similarly show the `profiles.qr_code` in their detail view.

- [ ] **Step 8: Manual test**

1. Run SQL migration — verify `profiles.qr_code` column exists with values for all rows
2. Create a new coach account → open detail → verify real QR renders (not placeholder)
3. Log in as coach → go to Profile tab → verify QR shows → download works
4. Log in as staff → Profile tab → QR shows
5. Owner panel → open any account detail → QR shows with download button
6. Verify QRBox `downloadable` button saves a PNG file

- [ ] **Step 9: Commit**

```bash
git add supabase/add_profiles_qr_code.sql src/app/admin/_components/AdminCoach.tsx src/app/coach/page.tsx src/app/staff/page.tsx src/app/owner/_components/OwnerAccountsMaster.tsx
git commit -m "feat(qr): add QR codes to all roles via profiles.qr_code - coach, staff, school, admin"
```

---

## Execution Order

Tasks are independent. Recommended order for minimal merge conflicts:

1. **Task 6** (SQL + QR) — foundation, no UI deps
2. **Task 5** (payslip fix) — pure logic fix, low risk
3. **Task 1** (competition) — self-contained component edit
4. **Task 2** (video carousel) — SQL + frontend, isolated
5. **Task 3** (admin→staff) — touches API route, moderate risk
6. **Task 4** (database manager) — largest new surface area, do last

Each task ends with a commit so progress is granular and reversible.
