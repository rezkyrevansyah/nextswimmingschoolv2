# Flow Audit — Bug Fix Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Fix all confirmed bugs found in the 10-flow audit.

**Architecture:** Targeted surgical fixes — no refactors, no new abstractions. Every fix is the minimal change to close the confirmed defect.

**Tech Stack:** Next.js App Router, Supabase JS, TypeScript, Tailwind CSS v4

---

## Global Constraints
- Never use dynamic Tailwind class interpolation
- Supabase admin calls only in Route Handlers
- RLS policies intentionally left open (per user instruction)

---

## Bugs to Fix (in order of severity)

### Bug F10.1 — CRITICAL: Middleware never runs

**File:** Create `src/middleware.ts` (currently only `src/proxy.ts` exists — wrong filename)

Next.js only loads middleware from `src/middleware.ts` or root `middleware.ts`. The file `src/proxy.ts` is never invoked, so no auth protection, no session refresh, and no suspend redirects ever run.

- [ ] Create `src/middleware.ts` that re-exports from `src/proxy.ts`

```ts
export { proxy as middleware, config } from "./proxy";
```

---

### Bug F10.2 — Suspension check uses exact path match

**File:** `src/utils/supabase/middleware.ts:55`

`if (user && pathname === "/member")` — should be `pathname.startsWith("/member")`.

- [ ] Change `pathname === "/member"` → `pathname.startsWith("/member")`

---

### Bug F3.1 — Off-by-one in attendance pagination

**File:** `src/app/admin/_components/AdminAbsensi.tsx` lines 77 and 240

`.range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE)` — upper bound should be `+ PAGE_SIZE - 1` since Supabase range is inclusive on both ends. Causes the last row to appear twice when "Load More" is clicked.

- [ ] Fix both `.range()` calls

---

### Bug F4.2 — Member leave notification sent to wrong user_id

**File:** `src/app/admin/_components/AdminIzin.tsx` lines 170 and 205

`user_id: leave.member_id` uses the `members.id` (not the auth `profiles.id`). Member never receives the notification.

Need to fetch the `profile_id` from the member row. The `leave` object already joins `member:members(profile_id, ...)` — use `leave.member?.profile_id` instead.

- [ ] Check the select query to confirm profile_id is already fetched
- [ ] Replace `user_id: leave.member_id` with `user_id: leave.member?.profile_id ?? leave.member_id`
- [ ] Same fix at line 205 for rejection path

---

### Bug F7.1 — Multiple rapor periods can be open simultaneously

**File:** `src/app/admin/_components/AdminRapor.tsx` line 142

Insert of new period with `is_open: true` never closes existing open periods first.

- [ ] Before inserting a new period, close all existing open ones:
  ```ts
  await supabase.from("rapor_periods").update({ is_open: false }).eq("branch_id", branchId).eq("is_open", true);
  ```

---

### Bug F1.2 — Pending badge hidden when registrations=0 but certs pending

**File:** `src/app/admin/_components/AdminApprovement.tsx` line 276

The badge renders only if `registrations.length > 0`. Should render if either list is non-empty.

- [ ] Change condition to `{(registrations.length + certs.length) > 0 && ...}`

---

### Bug F4.1 — reviewed_by missing from leave approval

**File:** `src/app/admin/_components/AdminIzin.tsx` lines 162 and 186+

Leave approval and rejection updates never set `reviewed_by`. Need to pass current user id.

- [ ] Add `reviewed_by: user?.id` to both approve and reject update payloads (user is already fetched in component)

---

### Bug F2.1 — Coach assignment on class save silently fails

**File:** `src/app/admin/_components/AdminClass.tsx` around line 212

`await supabase.from("class_coaches").insert(coachRows)` — no error check, modal closes silently.

- [ ] Capture error and toast if coach insert fails; don't close modal

---

## Deferred (need deeper rework)

- **Bug F3.2** (QR scanner wrong class for multi-class coaches) — requires UI work to let coach pick active class before scanning
- **Bug F5.1** (bill only for first class) — requires billing flow redesign
- **Bug F6.1** (loan closure not rolled back) — requires server-side transaction
- **Bug F8.1** (competition not filtered by branchId) — the component accepts `branchId=""` from owner which is intentionally all-branch; admin view needs separate filter check
- **Bug F1.1** (temp password not shown to admin) — UX addition, not a data bug

---
