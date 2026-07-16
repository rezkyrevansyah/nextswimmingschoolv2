# Rapor Level Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current per-class, manually-typed rapor criteria and personal-best-time entry with owner-managed templates keyed by swimming **level** (Level A, Level B, …), so a coach only has to pick the student's level and the correct criteria + best-time table appear automatically.

**Architecture:** Three new Postgres tables (`rapor_levels`, `rapor_level_criteria`, `rapor_level_best_times`) owned/edited exclusively by the Owner panel, plus a nullable `level_id` FK added to `rapor_entries`. The Coach rapor form switches from a freeform "level" text input + per-class `class_criteria` join to a level `<select>` that triggers a fetch of that level's criteria and best-time template, merged with the student's already-recorded times via a new pure helper (`mergeBestTimeTemplate`). The old per-class criteria CRUD UI (duplicated today in both the Owner `Classes` view and `AdminClass.tsx`) is deleted since it's superseded.

**Tech Stack:** Next.js App Router, Supabase (Postgres + supabase-js client), React 19 + TypeScript, Tailwind v4, Vitest (for the one new pure-logic module — this codebase has no component/UI test harness, see Global Constraints).

## Global Constraints

- All user-facing text is Bahasa Indonesia, matching every existing string in these files.
- Locale/format helpers: reuse `fmtSwimTime` from `src/lib/printRapor.ts` where a seconds value needs display; never reformat manually.
- No dynamic Tailwind class interpolation — only full literal class strings.
- **Scope of levels:** levels are **global** (not per-branch). The feedback describes a single owner-defined curriculum standard ("Level A, Level B, dst"), not per-branch variants — do not add a `branch_id` column to the new tables.
- **Historical data compatibility:** existing `rapor_entries` rows have `level` (free text) but no `level_id`, and their criteria came from the class's `class_criteria` at fill time. Do **not** attempt to backfill `level_id` for old entries or migrate old criteria into the new tables — `AdminRaporList.tsx` and `printRapor.ts` already fall back to rendering raw `scores` keys when a criterion id doesn't resolve (see `AdminRaporList.tsx:437-455` and `printRapor.ts:237-241`), so old entries keep displaying correctly with unlabeled rows. This is acceptable and expected.
- **Testing approach:** this repository has Vitest configured (`npm run test`) but zero existing test files under `src/` — no component/DOM testing library is installed, and no prior UI component in this codebase has a test. Task 2 (the one pure, framework-free logic module this plan introduces) gets full TDD steps. Every other task is UI/DB wiring with no existing test pattern to extend — those tasks end with a manual verification step (start the dev server, exercise the flow) instead of an automated test step. Do not invent a component-testing setup as part of this plan; that's a separate decision for the user to make.
- **SQL migrations in this repo are applied manually** (see `supabase/head_coach_role.sql`, `supabase/payroll_tax_loans.sql` — plain `.sql` files with a "Run this in Supabase SQL Editor" header, no `supabase migration` CLI usage). Task 1 follows the same convention.
- Follow the RLS pattern from `supabase/payroll_tax_loans.sql`: `enable row level security` + an owner-only `for all` policy checking `profiles.role = 'owner'`, plus an authenticated-read policy for tables coaches/admins need to read.

---

## File Structure

| File | Change |
|---|---|
| `supabase/rapor_level_templates.sql` | **Create.** New tables `rapor_levels`, `rapor_level_criteria`, `rapor_level_best_times`; adds `rapor_entries.level_id`. |
| `src/lib/raporLevels.ts` | **Create.** Pure helper: `mergeBestTimeTemplate()`. |
| `src/lib/raporLevels.test.ts` | **Create.** Vitest unit tests for the helper above. |
| `src/app/owner/page.tsx` | **Modify.** Remove per-class criteria UI from `Classes()`; add `NAV_ITEMS`/`TITLES`/`pages` entry for `levels`; add new `OwnerRaporLevels()` component (levels CRUD, per-level criteria modal, per-level best-time template modal). |
| `src/app/admin/_components/AdminClass.tsx` | **Modify.** Remove per-class criteria UI (state, handlers, trigger button, modal). |
| `src/app/coach/page.tsx` | **Modify.** `CoachRapor()`: query changes, `RaporEntry` type, level `<select>` replacing freeform input, criteria/best-time loading rewired to levels. |
| `src/app/admin/_components/AdminRaporList.tsx` | **Modify.** Query + `Student.criteria`/`level` resolution switched from `class_criteria` to the entry's level template. |
| `docs/existing_db.sql` | **Modify.** Append the three new table definitions for doc parity (this file is a checked-in schema reference kept in sync manually). |

---

### Task 1: Database migration — level tables

**Files:**
- Create: `supabase/rapor_level_templates.sql`
- Modify: `docs/existing_db.sql` (append, for documentation parity — this file is a plain reference dump, not executed)

**Interfaces:**
- Produces tables/columns every later task reads: `rapor_levels(id, name, sort_order, active)`, `rapor_level_criteria(id, level_id, label, kind, options, sort_order)`, `rapor_level_best_times(id, level_id, stroke, distance, target_time_seconds, sort_order)`, `rapor_entries.level_id`.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/rapor_level_templates.sql`:

```sql
-- Owner-managed rapor level templates: criteria + personal best time targets,
-- keyed by level (Level A, Level B, ...) instead of by class.
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "pgcrypto";

-- ── rapor_levels ─────────────────────────────────────────────────────────────
create table if not exists public.rapor_levels (
  id uuid not null default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint rapor_levels_pkey primary key (id),
  constraint rapor_levels_name_key unique (name)
);

-- ── rapor_level_criteria ─────────────────────────────────────────────────────
create table if not exists public.rapor_level_criteria (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  label text not null,
  kind text not null check (kind = any (array['score_10'::text, 'score_100'::text, 'choice'::text, 'text'::text])),
  options text[],
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_criteria_pkey primary key (id),
  constraint rapor_level_criteria_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade
);

-- ── rapor_level_best_times ───────────────────────────────────────────────────
-- Defines which (stroke, distance) columns appear on a level's Personal Best
-- Time table, and the optional standard/target time coaches compare against.
create table if not exists public.rapor_level_best_times (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  stroke text not null,
  distance integer not null check (distance > 0),
  target_time_seconds numeric check (target_time_seconds is null or target_time_seconds > 0),
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_best_times_pkey primary key (id),
  constraint rapor_level_best_times_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade
);

-- ── rapor_entries.level_id ───────────────────────────────────────────────────
-- Nullable FK alongside the existing free-text `level` column. `level` stays
-- as the denormalized display name (kept in sync by application code on
-- save) so printRapor.ts and every existing reader of `rapor_entries.level`
-- needs no change. `level_id` is the source of truth for which template to
-- load when re-opening an entry.
alter table public.rapor_entries add column if not exists level_id uuid references public.rapor_levels(id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.rapor_levels enable row level security;
alter table public.rapor_level_criteria enable row level security;
alter table public.rapor_level_best_times enable row level security;

drop policy if exists owner_all_rapor_levels on public.rapor_levels;
create policy owner_all_rapor_levels
on public.rapor_levels
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_read_rapor_levels on public.rapor_levels;
create policy authenticated_read_rapor_levels
on public.rapor_levels
for select
to authenticated
using (true);

drop policy if exists owner_all_rapor_level_criteria on public.rapor_level_criteria;
create policy owner_all_rapor_level_criteria
on public.rapor_level_criteria
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_read_rapor_level_criteria on public.rapor_level_criteria;
create policy authenticated_read_rapor_level_criteria
on public.rapor_level_criteria
for select
to authenticated
using (true);

drop policy if exists owner_all_rapor_level_best_times on public.rapor_level_best_times;
create policy owner_all_rapor_level_best_times
on public.rapor_level_best_times
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_read_rapor_level_best_times on public.rapor_level_best_times;
create policy authenticated_read_rapor_level_best_times
on public.rapor_level_best_times
for select
to authenticated
using (true);
```

- [ ] **Step 2: Run the migration**

Paste the full contents of `supabase/rapor_level_templates.sql` into the Supabase SQL Editor for this project and run it. Expected: `Success. No rows returned` with no errors. Confirm the three new tables appear under Database → Tables, and that `rapor_entries` now has a `level_id` column.

- [ ] **Step 3: Regenerate DB types**

Run (with the project's real Supabase project id — see `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` for the ref):

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

Expected: `src/types/database.ts` now contains `rapor_levels`, `rapor_level_criteria`, `rapor_level_best_times` table types, and `rapor_entries.Row` includes `level_id: string | null`.

- [ ] **Step 4: Append the new tables to the docs schema reference**

Open `docs/existing_db.sql`, find the `CREATE TABLE public.rapor_entries` block, and immediately after its closing `);` insert:

```sql
CREATE TABLE public.rapor_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_levels_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_levels_name_key UNIQUE (name)
);
CREATE TABLE public.rapor_level_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['score_10'::text, 'score_100'::text, 'choice'::text, 'text'::text])),
  options ARRAY,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_level_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_level_criteria_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.rapor_levels(id)
);
CREATE TABLE public.rapor_level_best_times (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL,
  stroke text NOT NULL,
  distance integer NOT NULL,
  target_time_seconds numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rapor_level_best_times_pkey PRIMARY KEY (id),
  CONSTRAINT rapor_level_best_times_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.rapor_levels(id)
);
```

Then find the `level text,` line inside `CREATE TABLE public.rapor_entries` (currently the last column before its constraints) and add a new column line right after it:

```sql
  level_id uuid,
```

And add a new constraint line among the existing `rapor_entries` constraints:

```sql
  CONSTRAINT rapor_entries_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.rapor_levels(id),
```

- [ ] **Step 5: Commit**

```bash
git add supabase/rapor_level_templates.sql docs/existing_db.sql src/types/database.ts
git commit -m "feat: add owner-managed rapor level templates (criteria + best time targets)"
```

---

### Task 2: Pure helper — merge best-time template with recorded times

**Files:**
- Create: `src/lib/raporLevels.ts`
- Test: `src/lib/raporLevels.test.ts`

**Interfaces:**
- Produces: `mergeBestTimeTemplate(template: LevelBestTimeTemplateRow[], recorded: RecordedBestTime[]): BestTimeFormRow[]` — consumed by Task 8 (`CoachRapor`'s `openEntry`) to build the initial `bestTimes` form state whenever a level is selected.
- `LevelBestTimeTemplateRow { id: string; stroke: string; distance: number; target_time_seconds: number | null; sort_order: number }` — shape of a row read from `rapor_level_best_times`.
- `RecordedBestTime { id: string; stroke: string; distance: number; time_seconds: number }` — shape of a row read from `member_best_times` (matches the existing `BestTimeRow` interface at `src/app/coach/page.tsx:102`).
- `BestTimeFormRow { id?: string; stroke: string; distance: string; time: string }` — matches the existing `BtRow` interface at `src/app/coach/page.tsx:106`, so `CoachRapor` can assign the result straight into `setBestTimes(...)`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/raporLevels.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mergeBestTimeTemplate } from "./raporLevels";

describe("mergeBestTimeTemplate", () => {
  it("returns an empty list when there is no template and no recorded times", () => {
    const result = mergeBestTimeTemplate([], []);
    expect(result).toEqual([]);
  });

  it("produces one empty-time row per template row when nothing is recorded yet", () => {
    const template = [
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: 45, sort_order: 0 },
      { id: "t2", stroke: "Backstroke", distance: 50, target_time_seconds: 50, sort_order: 1 },
    ];
    const result = mergeBestTimeTemplate(template, []);
    expect(result).toEqual([
      { id: undefined, stroke: "Freestyle", distance: "50", time: "" },
      { id: undefined, stroke: "Backstroke", distance: "50", time: "" },
    ]);
  });

  it("pre-fills a template row's time from a matching recorded best time (case-insensitive stroke match)", () => {
    const template = [
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: 45, sort_order: 0 },
    ];
    const recorded = [
      { id: "r1", stroke: "freestyle", distance: 50, time_seconds: 42.31 },
    ];
    const result = mergeBestTimeTemplate(template, recorded);
    expect(result).toEqual([
      { id: "r1", stroke: "Freestyle", distance: "50", time: "42.31" },
    ]);
  });

  it("appends a recorded row that has no matching template row instead of dropping it", () => {
    const template = [
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: 45, sort_order: 0 },
    ];
    const recorded = [
      { id: "r1", stroke: "Freestyle", distance: 50, time_seconds: 42.31 },
      { id: "r2", stroke: "Butterfly", distance: 100, time_seconds: 90 },
    ];
    const result = mergeBestTimeTemplate(template, recorded);
    expect(result).toEqual([
      { id: "r1", stroke: "Freestyle", distance: "50", time: "42.31" },
      { id: "r2", stroke: "Butterfly", distance: "100", time: "90" },
    ]);
  });

  it("orders template rows by sort_order regardless of input array order", () => {
    const template = [
      { id: "t2", stroke: "Backstroke", distance: 50, target_time_seconds: null, sort_order: 1 },
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: null, sort_order: 0 },
    ];
    const result = mergeBestTimeTemplate(template, []);
    expect(result.map(r => r.stroke)).toEqual(["Freestyle", "Backstroke"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- raporLevels`
Expected: FAIL — `Cannot find module './raporLevels'` (the module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/raporLevels.ts`:

```typescript
export interface LevelBestTimeTemplateRow {
  id: string;
  stroke: string;
  distance: number;
  target_time_seconds: number | null;
  sort_order: number;
}

export interface RecordedBestTime {
  id: string;
  stroke: string;
  distance: number;
  time_seconds: number;
}

export interface BestTimeFormRow {
  id?: string;
  stroke: string;
  distance: string;
  time: string;
}

/**
 * Builds the initial Personal Best Time form rows for a rapor entry: one row
 * per level template entry (pre-filled with the member's recorded time when
 * one exists), followed by any recorded times that don't match a template
 * row (e.g. leftover data from before a level had a template, or an extra
 * stroke a coach added manually) so no existing data is silently dropped.
 */
export function mergeBestTimeTemplate(
  template: LevelBestTimeTemplateRow[],
  recorded: RecordedBestTime[]
): BestTimeFormRow[] {
  const sortedTemplate = [...template].sort((a, b) => a.sort_order - b.sort_order);
  const matchedRecordedIds = new Set<string>();

  const templateRows: BestTimeFormRow[] = sortedTemplate.map(t => {
    const hit = recorded.find(
      r => r.stroke.toLowerCase() === t.stroke.toLowerCase() && r.distance === t.distance
    );
    if (hit) matchedRecordedIds.add(hit.id);
    return {
      id: hit?.id,
      stroke: t.stroke,
      distance: String(t.distance),
      time: hit ? String(hit.time_seconds) : "",
    };
  });

  const extraRows: BestTimeFormRow[] = recorded
    .filter(r => !matchedRecordedIds.has(r.id))
    .map(r => ({ id: r.id, stroke: r.stroke, distance: String(r.distance), time: String(r.time_seconds) }));

  return [...templateRows, ...extraRows];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- raporLevels`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/raporLevels.ts src/lib/raporLevels.test.ts
git commit -m "feat: add mergeBestTimeTemplate helper for level-based best time rows"
```

---

### Task 3: Owner panel — Rapor Levels list (CRUD levels)

**Files:**
- Modify: `src/app/owner/page.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (reads `rapor_levels` directly via Supabase client).
- Produces: `OwnerRaporLevels` component, referenced by Task 4 and Task 5 (both are modals rendered inside it) and wired into `pages`/`NAV_ITEMS`/`TITLES` used by `OwnerPage()`.

- [ ] **Step 1: Add the nav entry**

In `src/app/owner/page.tsx`, find the `NAV_ITEMS` array (around line 3088–3105):

```typescript
  { id: "classes",   label: "Kelas",         icon: "swim"    },
```

Add immediately after it:

```typescript
  { id: "levels",    label: "Level Rapor",   icon: "book"    },
```

- [ ] **Step 2: Add the title entry**

Find `TITLES` (around line 3107) and add, right after the `classes:` line:

```typescript
  levels:    ["Level Rapor",    "Template kriteria & standar waktu per level renang"],
```

- [ ] **Step 3: Wire the page into the `pages` map**

Find the `pages` record inside `OwnerPage()` (around line 3196–3208) and add, right after the `classes:` line:

```typescript
    levels:    <OwnerRaporLevels />,
```

- [ ] **Step 4: Add the `OwnerRaporLevels` component**

Add this new top-level function anywhere after the `Classes()` function closes (e.g. right before `function SettingsTarif`):

```typescript
interface RaporLevel {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

function OwnerRaporLevels() {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [levels, setLevels] = useState<RaporLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  const [criteriaLevel, setCriteriaLevel] = useState<RaporLevel | null>(null);
  const [bestTimeLevel, setBestTimeLevel] = useState<RaporLevel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("rapor_levels").select("id, name, sort_order, active").order("sort_order");
    setLevels((data ?? []) as RaporLevel[]);
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addLevel = async () => {
    if (!newName.trim()) return toast.error("Nama level wajib diisi");
    setCreating(true);
    const { error } = await supabase.from("rapor_levels").insert({
      name: newName.trim(), sort_order: levels.length, active: true,
    });
    setCreating(false);
    if (error) return toast.error("Gagal menambah level", error.message);
    toast.success("Level ditambahkan");
    setNewName("");
    load();
  };

  const saveRename = async () => {
    if (!renaming || !renaming.name.trim()) return toast.error("Nama level wajib diisi");
    const { error } = await supabase.from("rapor_levels").update({ name: renaming.name.trim() }).eq("id", renaming.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Level diperbarui");
    setRenaming(null);
    load();
  };

  const toggleActive = async (lvl: RaporLevel) => {
    const { error } = await supabase.from("rapor_levels").update({ active: !lvl.active }).eq("id", lvl.id);
    if (error) return toast.error("Gagal mengubah status", error.message);
    setLevels(prev => prev.map(l => l.id === lvl.id ? { ...l, active: !l.active } : l));
  };

  const deleteLevel = async (lvl: RaporLevel) => {
    const yes = await confirm({ body: `Hapus level "${lvl.name}"? Kriteria dan tabel waktu untuk level ini akan ikut terhapus. Rapor yang sudah diisi dengan level ini tidak akan terpengaruh.` });
    if (!yes) return;
    const { error } = await supabase.from("rapor_levels").delete().eq("id", lvl.id);
    if (error) return toast.error("Gagal menghapus level", error.message);
    toast.success("Level dihapus");
    load();
  };

  const move = async (lvl: RaporLevel, direction: "up" | "down") => {
    const idx = levels.findIndex(l => l.id === lvl.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= levels.length) return;
    const other = levels[swapIdx];
    setReordering(lvl.id);
    await Promise.all([
      supabase.from("rapor_levels").update({ sort_order: other.sort_order }).eq("id", lvl.id),
      supabase.from("rapor_levels").update({ sort_order: lvl.sort_order }).eq("id", other.id),
    ]);
    setReordering(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">Level Rapor</h2>
        <p className="text-ink-mute text-sm mt-0.5">Atur level renang (mis. Level A, Level B). Setiap level punya kriteria penilaian dan standar tabel waktu sendiri — coach tinggal memilih level saat mengisi rapor.</p>
      </div>

      <Card padded={false}>
        <div className="p-4 sm:p-5 border-b border-line flex items-center gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Mis. Level A" className="flex-1" />
          <Btn variant="primary" icon="plus" onClick={addLevel} disabled={creating}>{creating ? "Menambah…" : "Tambah Level"}</Btn>
        </div>

        {loading ? (
          <div className="py-10 text-center text-ink-mute text-sm">Memuat…</div>
        ) : levels.length === 0 ? (
          <div className="py-10 text-center text-ink-mute text-sm">Belum ada level. Tambahkan level pertama di atas.</div>
        ) : (
          <div className="divide-y divide-line">
            {levels.map((lvl, i) => (
              <div key={lvl.id} className="flex items-center gap-3 p-4">
                <div className="flex flex-col shrink-0">
                  <button type="button" disabled={i === 0 || reordering === lvl.id} onClick={() => move(lvl, "up")}
                    className="w-6 h-5 text-xs text-ink-faint hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-ink-faint">↑</button>
                  <button type="button" disabled={i === levels.length - 1 || reordering === lvl.id} onClick={() => move(lvl, "down")}
                    className="w-6 h-5 text-xs text-ink-faint hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-ink-faint">↓</button>
                </div>

                {renaming?.id === lvl.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input value={renaming.name} onChange={e => setRenaming(v => v ? { ...v, name: e.target.value } : v)} className="flex-1" />
                    <Btn variant="primary" size="sm" onClick={saveRename}>Simpan</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setRenaming(null)}>Batal</Btn>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm">{lvl.name}</div>
                      {!lvl.active && <div className="text-xs text-ink-faint">Nonaktif</div>}
                    </div>
                    <Btn variant="ghost" size="sm" icon="book" onClick={() => setCriteriaLevel(lvl)}>Kriteria</Btn>
                    <Btn variant="ghost" size="sm" icon="target" onClick={() => setBestTimeLevel(lvl)}>Waktu</Btn>
                    <button onClick={() => setRenaming({ id: lvl.id, name: lvl.name })} title="Ubah nama"
                      className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive(lvl)} title={lvl.active ? "Nonaktifkan" : "Aktifkan"}
                      className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name={lvl.active ? "archive" : "check"} className="w-4 h-4" /></button>
                    <button onClick={() => deleteLevel(lvl)} title="Hapus"
                      className="w-8 h-8 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center"><Icon name="x" className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log in as owner, open the new "Level Rapor" nav item. Add a level named "Level A", confirm it appears, rename it, move it up/down (with a second level added), toggle active/inactive, then delete it. Expected: every action succeeds with a toast and the list updates without a page reload.

- [ ] **Step 6: Commit**

```bash
git add src/app/owner/page.tsx
git commit -m "feat: add owner Rapor Levels page (create, rename, reorder, archive)"
```

---

### Task 4: Owner panel — per-level Criteria modal

**Files:**
- Modify: `src/app/owner/page.tsx`

**Interfaces:**
- Consumes: `RaporLevel` and `criteriaLevel`/`setCriteriaLevel` state from `OwnerRaporLevels` (Task 3).
- Produces: nothing new consumed elsewhere — this is the terminal UI for level criteria management.

- [ ] **Step 1: Add criteria state and handlers to `OwnerRaporLevels`**

In the `OwnerRaporLevels` function body (from Task 3), immediately after the `criteriaLevel`/`bestTimeLevel` state lines, add:

```typescript
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const kindLabel: Record<string, string> = { score_10: "Nilai 1–10", score_100: "Nilai 1–100", choice: "Pilihan ganda", text: "Teks bebas" };

  const loadCriteria = useCallback(async (levelId: string) => {
    setLoadingCriteria(true);
    const { data } = await supabase.from("rapor_level_criteria").select("id, label, kind, options, sort_order").eq("level_id", levelId).order("sort_order");
    setCriteria((data ?? []) as Criterion[]);
    setLoadingCriteria(false);
  }, [supabase]);

  const openCriteria = (lvl: RaporLevel) => {
    setCriteriaLevel(lvl);
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    setEditingCriterion(null);
    loadCriteria(lvl.id);
  };

  const addCriterion = async () => {
    if (!criteriaLevel || !criterionForm.label) return toast.error("Label wajib diisi");
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Kriteria ditambahkan");
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    loadCriteria(criteriaLevel.id);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm({ body: "Hapus kriteria ini? Rapor yang sudah diisi tidak akan terpengaruh." });
    if (!yes) return;
    await supabase.from("rapor_level_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success("Kriteria dihapus");
  };

  const updateCriterion = async () => {
    if (!editingCriterion || !editingCriterion.label) return toast.error("Label wajib diisi");
    const opts = editingCriterion.kind === "choice" ? editingCriterion.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").update({ label: editingCriterion.label, kind: editingCriterion.kind, options: opts }).eq("id", editingCriterion.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    setCriteria(prev => prev.map(c => c.id === editingCriterion.id ? { ...c, label: editingCriterion.label, kind: editingCriterion.kind, options: opts } : c));
    setEditingCriterion(null);
    toast.success("Kriteria diperbarui");
  };

  const duplicateCriterion = async (cr: Criterion) => {
    if (!criteriaLevel) return;
    setSavingCriterion(true);
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: cr.label, kind: cr.kind,
      options: cr.options ?? [], sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error("Gagal menduplikat", error.message);
    toast.success("Kriteria diduplikat");
    loadCriteria(criteriaLevel.id);
  };

  const applyBulkKind = async () => {
    if (!criteriaLevel || criteria.length === 0) return;
    const yes = await confirm({ body: `Ubah semua ${criteria.length} kriteria ke tipe "${kindLabel[bulkKind]}"? Options pilihan ganda akan dihapus kecuali tipe yang dipilih adalah pilihan ganda.` });
    if (!yes) return;
    setApplyingBulk(true);
    const opts = bulkKind === "choice" ? ["Sangat Baik", "Baik", "Cukup", "Perlu Latihan"] : null;
    await Promise.all(criteria.map(cr => supabase.from("rapor_level_criteria").update({ kind: bulkKind, options: opts }).eq("id", cr.id)));
    setApplyingBulk(false);
    loadCriteria(criteriaLevel.id);
    toast.success("Semua kriteria diperbarui");
  };
```

Add this `Criterion` interface near the top of the file, next to the other shared interfaces used by `Classes()` (it's identical to the one already used there — reuse the existing declaration instead of redeclaring if one is already in scope at that point in the file; only add a new one if TypeScript reports it's out of scope for `OwnerRaporLevels`):

```typescript
interface Criterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}
```

- [ ] **Step 2: Wire the "Kriteria" button**

In the levels list from Task 3, change:

```typescript
                    <Btn variant="ghost" size="sm" icon="book" onClick={() => setCriteriaLevel(lvl)}>Kriteria</Btn>
```

to:

```typescript
                    <Btn variant="ghost" size="sm" icon="book" onClick={() => openCriteria(lvl)}>Kriteria</Btn>
```

- [ ] **Step 3: Add the criteria modal**

Add this JSX at the end of `OwnerRaporLevels`'s returned `<div>`, right before its closing `</div>` (after the levels `<Card>`):

```tsx
      <Modal open={!!criteriaLevel} onClose={() => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); }}
        title={`Kriteria Penilaian — ${criteriaLevel?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); }}>Tutup</Btn>}>
        <div className="space-y-5">
          {loadingCriteria ? <div className="text-ink-mute text-sm text-center py-6">Memuat…</div> : (
            <>
              {criteria.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 bg-paper-tint rounded-xl border border-line">
                    <span className="text-xs text-ink-mute shrink-0">Ubah semua ke:</span>
                    <select value={bulkKind} onChange={e => setBulkKind(e.target.value)}
                      className="flex-1 text-xs border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500">
                      <option value="score_10">Nilai 1–10</option>
                      <option value="score_100">Nilai 1–100</option>
                      <option value="choice">Pilihan ganda</option>
                      <option value="text">Teks bebas</option>
                    </select>
                    <Btn variant="outline" size="sm" onClick={applyBulkKind} disabled={applyingBulk}>{applyingBulk ? "Mengubah…" : "Terapkan"}</Btn>
                  </div>

                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="rounded-xl border border-line overflow-hidden">
                      {editingCriterion?.id === cr.id ? (
                        <div className="p-3 space-y-2 bg-ocean-50/40">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <Field label="Label"><Input value={editingCriterion.label} onChange={e => setEditingCriterion(v => v ? { ...v, label: e.target.value } : v)} /></Field>
                            <Field label="Tipe">
                              <Select value={editingCriterion.kind} onChange={e => setEditingCriterion(v => v ? { ...v, kind: e.target.value } : v)}>
                                <option value="score_10">Nilai 1–10</option>
                                <option value="score_100">Nilai 1–100</option>
                                <option value="choice">Pilihan ganda</option>
                                <option value="text">Teks bebas</option>
                              </Select>
                            </Field>
                          </div>
                          {editingCriterion.kind === "choice" && (
                            <Field label="Pilihan jawaban">
                              <div className="space-y-1.5">
                                {editingCriterion.options.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                                    <Input value={opt} onChange={e => setEditingCriterion(v => { if (!v) return v; const opts = [...v.options]; opts[idx] = e.target.value; return { ...v, options: opts }; })} placeholder={`Pilihan ${idx + 1}`} className="flex-1" />
                                    <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: v.options.filter((_, i) => i !== idx) } : v)} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: [...v.options, ""] } : v)} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                                  <Icon name="plus" className="w-3.5 h-3.5" />Tambah pilihan
                                </button>
                              </div>
                            </Field>
                          )}
                          <div className="flex gap-2">
                            <Btn variant="primary" size="sm" onClick={updateCriterion}>Simpan</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setEditingCriterion(null)}>Batal</Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                          <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm">{cr.label}</div>
                            <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? cr.kind}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                          </div>
                          <button onClick={() => duplicateCriterion(cr)} disabled={savingCriterion}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0 disabled:opacity-50" title="Duplikat">
                            <Icon name="copy" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCriterion({ id: cr.id, label: cr.label, kind: cr.kind, options: cr.options ?? [] })}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title="Edit">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCriterion(cr.id)}
                            className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title="Hapus">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">Belum ada kriteria. Tambahkan di bawah.</p>
              )}

              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tambah Kriteria Baru</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Label kriteria" required><Input value={criterionForm.label} onChange={e => setCriterionForm(f => ({ ...f, label: e.target.value }))} placeholder="Mis. Teknik gaya bebas" /></Field>
                  <Field label="Tipe penilaian">
                    <Select value={criterionForm.kind} onChange={e => setCriterionForm(f => ({ ...f, kind: e.target.value }))}>
                      <option value="score_10">Nilai 1–10</option>
                      <option value="score_100">Nilai 1–100</option>
                      <option value="choice">Pilihan ganda</option>
                      <option value="text">Teks bebas</option>
                    </Select>
                  </Field>
                </div>
                {criterionForm.kind === "choice" && (
                  <Field label="Pilihan jawaban">
                    <div className="space-y-1.5">
                      {criterionForm.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                          <Input value={opt} onChange={e => setCriterionForm(f => { const opts = [...f.options]; opts[idx] = e.target.value; return { ...f, options: opts }; })} placeholder={`Pilihan ${idx + 1}`} className="flex-1" />
                          <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: [...f.options, ""] }))} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                        <Icon name="plus" className="w-3.5 h-3.5" />Tambah pilihan
                      </button>
                    </div>
                  </Field>
                )}
                <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? "Menyimpan…" : "Tambah Kriteria"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>
```

- [ ] **Step 4: Manual verification**

`npm run dev`, open Owner → Level Rapor → click "Kriteria" on a level. Add a `score_10` criterion, a `choice` criterion with 2 options, edit one, duplicate one, bulk-change all to `text`, delete one. Expected: every action succeeds with a toast and the list reflects the change immediately.

- [ ] **Step 5: Commit**

```bash
git add src/app/owner/page.tsx
git commit -m "feat: add per-level criteria CRUD to owner Rapor Levels page"
```

---

### Task 5: Owner panel — per-level Personal Best Time template modal

**Files:**
- Modify: `src/app/owner/page.tsx`

**Interfaces:**
- Consumes: `RaporLevel` and `bestTimeLevel`/`setBestTimeLevel` state from `OwnerRaporLevels` (Task 3).
- Produces: `rapor_level_best_times` rows consumed by Task 8 (`CoachRapor`, via `mergeBestTimeTemplate` from Task 2).

- [ ] **Step 1: Add best-time template state and handlers to `OwnerRaporLevels`**

Add, right after the criteria handlers from Task 4:

```typescript
  interface BestTimeTemplateRow { id: string; stroke: string; distance: number; target_time_seconds: number | null; sort_order: number }
  const [bestTimeRows, setBestTimeRows] = useState<BestTimeTemplateRow[]>([]);
  const [loadingBestTimes, setLoadingBestTimes] = useState(false);
  const [btForm, setBtForm] = useState({ stroke: "", distance: "", target: "" });
  const [savingBt, setSavingBt] = useState(false);
  const [editingBt, setEditingBt] = useState<{ id: string; stroke: string; distance: string; target: string } | null>(null);

  const loadBestTimes = useCallback(async (levelId: string) => {
    setLoadingBestTimes(true);
    const { data } = await supabase.from("rapor_level_best_times").select("id, stroke, distance, target_time_seconds, sort_order").eq("level_id", levelId).order("sort_order");
    setBestTimeRows((data ?? []) as BestTimeTemplateRow[]);
    setLoadingBestTimes(false);
  }, [supabase]);

  const openBestTimes = (lvl: RaporLevel) => {
    setBestTimeLevel(lvl);
    setBtForm({ stroke: "", distance: "", target: "" });
    setEditingBt(null);
    loadBestTimes(lvl.id);
  };

  const addBestTimeRow = async () => {
    if (!bestTimeLevel) return;
    const stroke = btForm.stroke.trim();
    const distance = parseInt(btForm.distance);
    if (!stroke || !btForm.distance || isNaN(distance) || distance <= 0) return toast.error("Gaya dan jarak wajib diisi dengan benar");
    const target = btForm.target.trim() ? parseFloat(btForm.target) : null;
    setSavingBt(true);
    const { error } = await supabase.from("rapor_level_best_times").insert({
      level_id: bestTimeLevel.id, stroke, distance, target_time_seconds: target, sort_order: bestTimeRows.length,
    });
    setSavingBt(false);
    if (error) return toast.error("Gagal menambah baris", error.message);
    toast.success("Baris waktu ditambahkan");
    setBtForm({ stroke: "", distance: "", target: "" });
    loadBestTimes(bestTimeLevel.id);
  };

  const deleteBestTimeRow = async (id: string) => {
    const yes = await confirm({ body: "Hapus baris tabel waktu ini?" });
    if (!yes) return;
    await supabase.from("rapor_level_best_times").delete().eq("id", id);
    setBestTimeRows(prev => prev.filter(r => r.id !== id));
    toast.success("Baris dihapus");
  };

  const saveBestTimeEdit = async () => {
    if (!editingBt) return;
    const stroke = editingBt.stroke.trim();
    const distance = parseInt(editingBt.distance);
    if (!stroke || !editingBt.distance || isNaN(distance) || distance <= 0) return toast.error("Gaya dan jarak wajib diisi dengan benar");
    const target = editingBt.target.trim() ? parseFloat(editingBt.target) : null;
    const { error } = await supabase.from("rapor_level_best_times").update({ stroke, distance, target_time_seconds: target }).eq("id", editingBt.id);
    if (error) return toast.error("Gagal menyimpan", error.message);
    setBestTimeRows(prev => prev.map(r => r.id === editingBt.id ? { ...r, stroke, distance, target_time_seconds: target } : r));
    setEditingBt(null);
    toast.success("Baris diperbarui");
  };
```

- [ ] **Step 2: Wire the "Waktu" button**

Change:

```typescript
                    <Btn variant="ghost" size="sm" icon="target" onClick={() => setBestTimeLevel(lvl)}>Waktu</Btn>
```

to:

```typescript
                    <Btn variant="ghost" size="sm" icon="target" onClick={() => openBestTimes(lvl)}>Waktu</Btn>
```

- [ ] **Step 3: Add the best-time template modal**

Add this JSX right after the criteria `</Modal>` added in Task 4:

```tsx
      <Modal open={!!bestTimeLevel} onClose={() => { setBestTimeLevel(null); setBtForm({ stroke: "", distance: "", target: "" }); setEditingBt(null); }}
        title={`Tabel Personal Best Time — ${bestTimeLevel?.name ?? ""}`} size="lg"
        footer={<Btn variant="ghost" onClick={() => { setBestTimeLevel(null); setBtForm({ stroke: "", distance: "", target: "" }); setEditingBt(null); }}>Tutup</Btn>}>
        <div className="space-y-5">
          <p className="text-xs text-ink-mute">Baris di sini menentukan gaya &amp; jarak yang muncul di tabel Personal Best Time saat coach mengisi rapor untuk level ini. Standar waktu (opsional) tampil sebagai acuan — coach tetap menginput waktu aktual member.</p>
          {loadingBestTimes ? <div className="text-ink-mute text-sm text-center py-6">Memuat…</div> : (
            <>
              {bestTimeRows.length > 0 ? (
                <div className="space-y-2">
                  {bestTimeRows.map((row, i) => (
                    <div key={row.id} className="rounded-xl border border-line overflow-hidden">
                      {editingBt?.id === row.id ? (
                        <div className="p-3 grid grid-cols-3 gap-2 items-end bg-ocean-50/40">
                          <Field label="Gaya"><Input value={editingBt.stroke} onChange={e => setEditingBt(v => v ? { ...v, stroke: e.target.value } : v)} /></Field>
                          <Field label="Jarak (m)"><Input inputMode="numeric" value={editingBt.distance} onChange={e => setEditingBt(v => v ? { ...v, distance: e.target.value } : v)} /></Field>
                          <Field label="Standar (dtk)"><Input inputMode="decimal" value={editingBt.target} onChange={e => setEditingBt(v => v ? { ...v, target: e.target.value } : v)} placeholder="Opsional" /></Field>
                          <div className="col-span-3 flex gap-2">
                            <Btn variant="primary" size="sm" onClick={saveBestTimeEdit}>Simpan</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setEditingBt(null)}>Batal</Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                          <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm">{row.stroke} · {row.distance}m</div>
                            <div className="text-xs text-ink-mute">{row.target_time_seconds != null ? `Standar: ${fmtSwimTime(row.target_time_seconds)}` : "Tanpa standar waktu"}</div>
                          </div>
                          <button onClick={() => setEditingBt({ id: row.id, stroke: row.stroke, distance: String(row.distance), target: row.target_time_seconds != null ? String(row.target_time_seconds) : "" })}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title="Edit">
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteBestTimeRow(row.id)}
                            className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title="Hapus">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">Belum ada baris tabel waktu. Tambahkan di bawah.</p>
              )}

              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Tambah Baris Baru</div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Gaya" required><Input value={btForm.stroke} onChange={e => setBtForm(f => ({ ...f, stroke: e.target.value }))} placeholder="Mis. Freestyle" /></Field>
                  <Field label="Jarak (m)" required><Input inputMode="numeric" value={btForm.distance} onChange={e => setBtForm(f => ({ ...f, distance: e.target.value }))} placeholder="50" /></Field>
                  <Field label="Standar (dtk)"><Input inputMode="decimal" value={btForm.target} onChange={e => setBtForm(f => ({ ...f, target: e.target.value }))} placeholder="Opsional" /></Field>
                </div>
                <Btn variant="primary" size="sm" icon="plus" onClick={addBestTimeRow} disabled={savingBt}>{savingBt ? "Menyimpan…" : "Tambah Baris"}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>
```

- [ ] **Step 4: Add the `fmtSwimTime` import**

At the top of `src/app/owner/page.tsx`, find the existing imports block and add (or extend an existing `@/lib/printRapor` import if one is already present):

```typescript
import { fmtSwimTime } from "@/lib/printRapor";
```

- [ ] **Step 5: Manual verification**

`npm run dev`, Owner → Level Rapor → "Waktu" on a level. Add a row (Freestyle, 50, target 45.5), add another without a target, edit one, delete one. Expected: rows persist, target time displays via `fmtSwimTime` (e.g. `45.50`), no target shows "Tanpa standar waktu".

- [ ] **Step 6: Commit**

```bash
git add src/app/owner/page.tsx
git commit -m "feat: add per-level personal best time template CRUD to owner Rapor Levels page"
```

---

### Task 6: Remove obsolete per-class criteria UI from Owner `Classes`

**Files:**
- Modify: `src/app/owner/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (pure deletion — criteria management now lives only in `OwnerRaporLevels`).

- [ ] **Step 1: Remove criteria state from `Classes()`**

Delete this block (currently around line 568–576):

```typescript
  // Criteria (aspek penilaian)
  const [criteriaClass, setCriteriaClass] = useState<ClassRow | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);
```

- [ ] **Step 2: Remove criteria handlers from `Classes()`**

Delete the `openCriteria`, `addCriterion`, `deleteCriterion`, `duplicateCriterion`, `updateCriterion`, `applyBulkKind`, and `kindLabel` definitions (the six `class_criteria`-querying functions plus the label map, currently sitting between the `saveEdit` function and the `openDetail` function).

- [ ] **Step 3: Remove the "Aspek" trigger button**

In the class card JSX, delete this line:

```tsx
                        <Btn variant="ghost" size="sm" icon="book" onClick={() => openCriteria(c)}>Aspek</Btn>
```

- [ ] **Step 4: Remove the criteria modal**

Delete the entire block starting at the `{/* Criteria modal */}` comment through its matching closing `</Modal>` (immediately preceding the component's final closing `</div>` / `);`).

- [ ] **Step 5: Manual verification**

Run `npx tsc --noEmit` (or `npm run build`). Expected: no errors referencing `criteriaClass`, `criteria`, `Criterion` (unless `Criterion` is still used elsewhere in the file — if TypeScript reports it unused, remove its interface declaration too). Then `npm run dev`, open Owner → Kelas, confirm each class card now only shows "Detail" and "Edit" buttons (no "Aspek").

- [ ] **Step 6: Commit**

```bash
git add src/app/owner/page.tsx
git commit -m "refactor: remove obsolete per-class criteria UI from owner Classes (superseded by Rapor Levels)"
```

---

### Task 7: Remove obsolete per-class criteria UI from `AdminClass.tsx`

**Files:**
- Modify: `src/app/admin/_components/AdminClass.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (pure deletion).

- [ ] **Step 1: Remove the `Criterion` interface and criteria state**

Delete the `Criterion` interface (lines 20–22) and the criteria state block (lines 41–49):

```typescript
  // Criteria (aspek penilaian) modal
  const [criteriaClass, setCriteriaClass] = useState<ClassRow | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);
```

- [ ] **Step 2: Remove criteria handlers**

Delete the `// ── Criteria ──` section (lines 202–273 in the current file: `openCriteria`, `addCriterion`, `deleteCriterion`, `updateCriterion`, `duplicateCriterion`, `applyBulkKind`, `kindLabel`).

- [ ] **Step 3: Remove the trigger button**

Delete this line (currently line 386):

```tsx
                        <button onClick={() => openCriteria(c)} title="Aspek penilaian" className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="book" className="w-4 h-4" /></button>
```

- [ ] **Step 4: Remove the criteria modal**

Delete the block from `{/* Criteria modal */}` (currently line 587) through its matching `</Modal>` (currently line 707), immediately before the `{/* Per-class attendance modal */}` comment.

- [ ] **Step 5: Manual verification**

Run `npx tsc --noEmit`. Expected: no errors. Then `npm run dev`, open Admin (as an admin user) → Kelas, confirm the per-class action row no longer has the book/"Aspek penilaian" icon button.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/_components/AdminClass.tsx
git commit -m "refactor: remove obsolete per-class criteria UI from AdminClass (superseded by Rapor Levels)"
```

---

### Task 8: Coach Rapor flow — level select replaces freeform text + criteria load

**Files:**
- Modify: `src/app/coach/page.tsx`

**Interfaces:**
- Consumes: `mergeBestTimeTemplate`, `LevelBestTimeTemplateRow`, `RecordedBestTime` from `src/lib/raporLevels.ts` (Task 2). Reads `rapor_levels`, `rapor_level_criteria`, `rapor_level_best_times` (Tasks 1, 4, 5).
- Produces: `rapor_entries.level_id` writes, consumed by Task 9 (`AdminRaporList.tsx`) for display.

- [ ] **Step 1: Import the new helper**

Near the top of `src/app/coach/page.tsx`, alongside the existing `printRapor` import, add:

```typescript
import { mergeBestTimeTemplate, type LevelBestTimeTemplateRow, type RecordedBestTime } from "@/lib/raporLevels";
```

- [ ] **Step 2: Extend `RaporEntry` with `level_id`**

Change (line 92–100):

```typescript
interface RaporEntry {
  id: string; member_id: string; class_id: string; locked: boolean;
  personality?: string | null;
  motivation?: string | null;
  learning_achievements?: string | null;
  level?: string | null;
  member?: { member_no?: string | null; profile: { full_name: string; avatar_url?: string | null; birth_date?: string | null } | null } | null;
  class?: { name: string } | null;
}
```

to:

```typescript
interface RaporEntry {
  id: string; member_id: string; class_id: string; locked: boolean;
  personality?: string | null;
  motivation?: string | null;
  learning_achievements?: string | null;
  level?: string | null;
  level_id?: string | null;
  member?: { member_no?: string | null; profile: { full_name: string; avatar_url?: string | null; birth_date?: string | null } | null } | null;
  class?: { name: string } | null;
}
```

- [ ] **Step 3: Add level list state to `CoachRapor`**

In `CoachRapor`, right after the existing `const [level, setLevel] = useState("");` line, add:

```typescript
  const [levelId, setLevelId] = useState("");
  const [levelOptions, setLevelOptions] = useState<{ id: string; name: string }[]>([]);
  const [loadingLevelTemplate, setLoadingLevelTemplate] = useState(false);
```

- [ ] **Step 4: Load active levels once on mount**

In the initial `useEffect` (the one that loads the signature, period, and entries — currently starting `useEffect(() => { if (!branchId || !coachId) return; ...`), add this fetch right after the signature load and before the "1. Find active period" step:

```typescript
      // Load active rapor levels (owner-managed)
      const { data: levelRows } = await supabase
        .from("rapor_levels").select("id, name").eq("active", true).order("sort_order");
      setLevelOptions((levelRows ?? []) as { id: string; name: string }[]);
```

- [ ] **Step 5: Update the entries query to select `level_id` instead of joining `class_criteria`**

Change (line 2276–2278):

```typescript
      const { data: e } = await supabase.from("rapor_entries")
        .select("id, member_id, class_id, locked, scores, notes, personality, motivation, learning_achievements, level, period_id, member:members(member_no, profile:profiles(full_name, avatar_url, birth_date)), class:classes(name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url)), class_criteria(id, label, kind, options, sort_order))")
        .eq("period_id", periodData.id).eq("coach_id", coachId);
```

to:

```typescript
      const { data: e } = await supabase.from("rapor_entries")
        .select("id, member_id, class_id, locked, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id, member:members(member_no, profile:profiles(full_name, avatar_url, birth_date)), class:classes(name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url)))")
        .eq("period_id", periodData.id).eq("coach_id", coachId);
```

(The `class_criteria` nested select is dropped entirely — criteria now come from the selected level, not the class.)

- [ ] **Step 6: Add a `loadLevelTemplate` helper**

Right before the `openEntry` function, add:

```typescript
  const loadLevelTemplate = async (levelIdToLoad: string, existingBestTimes: RecordedBestTime[]) => {
    if (!levelIdToLoad) {
      setCriteria([]);
      setBestTimes(existingBestTimes.map(r => ({ id: r.id, stroke: r.stroke, distance: String(r.distance), time: String(r.time_seconds) })));
      return;
    }
    setLoadingLevelTemplate(true);
    const [{ data: critRows }, { data: btTemplateRows }] = await Promise.all([
      supabase.from("rapor_level_criteria").select("id, label, kind, options, sort_order").eq("level_id", levelIdToLoad).order("sort_order"),
      supabase.from("rapor_level_best_times").select("id, stroke, distance, target_time_seconds, sort_order").eq("level_id", levelIdToLoad).order("sort_order"),
    ]);
    setCriteria((critRows ?? []) as Criterion[]);
    setBestTimes(mergeBestTimeTemplate((btTemplateRows ?? []) as LevelBestTimeTemplateRow[], existingBestTimes));
    setLoadingLevelTemplate(false);
  };
```

- [ ] **Step 7: Rewire `openEntry` to use the level template instead of `class_criteria`**

Change (lines 2285–2315):

```typescript
  const openEntry = async (e: RaporEntry) => {
    // Load criteria for this class
    const classCriteria = ((e as unknown as { class?: { class_criteria?: Criterion[] } }).class?.class_criteria ?? [])
      .sort((a, b) => ((a as unknown as { sort_order: number }).sort_order ?? 0) - ((b as unknown as { sort_order: number }).sort_order ?? 0));
    setCriteria(classCriteria as Criterion[]);
    // Pre-fill existing scores
    const existing = (e as unknown as { scores?: Record<string, number | string> }).scores ?? {};
    setScores(existing);
    setNotes((e as unknown as { notes?: string }).notes ?? "");
    setPersonality(e.personality ?? "");
    setMotivation(e.motivation ?? "");
    setLearningAchievements(e.learning_achievements ?? "");
    setLevel(e.level ?? "");
    // Load best times for this member
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("id, stroke, distance, time_seconds")
      .eq("member_id", e.member_id)
      .eq("branch_id", branchId)
      .order("stroke").order("distance");
    setBestTimes(
      (btRows ?? []).map((row: BestTimeRow) => ({
        id: row.id,
        stroke: row.stroke,
        distance: String(row.distance),
        time: String(row.time_seconds),
      }))
    );
    setRemovedBtIds([]);
    setOpen(e);
  };
```

to:

```typescript
  const openEntry = async (e: RaporEntry) => {
    // Pre-fill existing scores
    const existing = (e as unknown as { scores?: Record<string, number | string> }).scores ?? {};
    setScores(existing);
    setNotes((e as unknown as { notes?: string }).notes ?? "");
    setPersonality(e.personality ?? "");
    setMotivation(e.motivation ?? "");
    setLearningAchievements(e.learning_achievements ?? "");
    setLevel(e.level ?? "");
    setLevelId(e.level_id ?? "");
    // Load best times for this member, then merge with the level's template (if any)
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("id, stroke, distance, time_seconds")
      .eq("member_id", e.member_id)
      .eq("branch_id", branchId)
      .order("stroke").order("distance");
    await loadLevelTemplate(e.level_id ?? "", (btRows ?? []) as RecordedBestTime[]);
    setRemovedBtIds([]);
    setOpen(e);
  };
```

- [ ] **Step 8: Handle level changes inside the open modal**

Right after `openEntry`, add:

```typescript
  const handleLevelChange = async (newLevelId: string) => {
    setLevelId(newLevelId);
    const found = levelOptions.find(l => l.id === newLevelId);
    setLevel(found?.name ?? "");
    const existingBestTimes: RecordedBestTime[] = bestTimes
      .filter(r => r.stroke && r.distance)
      .map(r => ({ id: r.id ?? "", stroke: r.stroke, distance: parseInt(r.distance) || 0, time_seconds: parseFloat(r.time) || 0 }));
    await loadLevelTemplate(newLevelId, existingBestTimes);
  };
```

- [ ] **Step 9: Persist `level_id` on save**

Change (lines 2344–2354):

```typescript
    const { error } = await supabase.from("rapor_entries")
      .update({
        scores, notes,
        personality: personality || null,
        motivation: motivation || null,
        learning_achievements: learningAchievements || null,
        level: level || null,
        filled_at: new Date().toISOString(),
        locked: true,
      } as any)
      .eq("id", open.id);
```

to:

```typescript
    const { error } = await supabase.from("rapor_entries")
      .update({
        scores, notes,
        personality: personality || null,
        motivation: motivation || null,
        learning_achievements: learningAchievements || null,
        level: level || null,
        level_id: levelId || null,
        filled_at: new Date().toISOString(),
        locked: true,
      } as any)
      .eq("id", open.id);
```

Also update the optimistic local state update right after (lines 2400–2406) to include `level_id: levelId || null,` next to the existing `level: level || null,` line.

- [ ] **Step 10: Replace the freeform level input with a level `<select>`**

Change (lines 2626–2637):

```tsx
          <Field label="Level Member">
            <datalist id="rapor-level-list">
              {["Beginner", "Elementary", "Intermediate", "Advanced", "Elite"].map(l => <option key={l} value={l} />)}
            </datalist>
            <input
              type="text" list="rapor-level-list"
              value={level}
              onChange={e => setLevel(e.target.value)}
              placeholder="Mis. Beginner, Intermediate, Advanced…"
              className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
            />
          </Field>
```

to:

```tsx
          <Field label="Level Member" hint="Pilih level untuk memuat kriteria & tabel waktu standar secara otomatis">
            <select
              value={levelId}
              onChange={e => void handleLevelChange(e.target.value)}
              disabled={loadingLevelTemplate}
              className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white disabled:opacity-60"
            >
              <option value="">— Pilih level —</option>
              {levelOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
```

- [ ] **Step 11: Reset `levelId` on modal close**

Both `onClose` handlers of the fill modal (Modal `open`/`footer` "Batal" button, currently `() => { setOpen(null); setBestTimes([]); setRemovedBtIds([]); setLevel(""); }`) get `setLevelId("");` added, e.g.:

```typescript
() => { setOpen(null); setBestTimes([]); setRemovedBtIds([]); setLevel(""); setLevelId(""); }
```

Apply this to both occurrences (the `Modal`'s `onClose` prop and the "Batal" `Btn`'s `onClick`).

- [ ] **Step 12: Manual verification**

`npm run dev`, log in as a coach with an active rapor period and at least one Level created (from Task 3–5) with criteria and a best-time template. Open a rapor entry, select the level, confirm criteria and best-time rows populate automatically, fill in a score and an actual time, save. Reopen the same entry — confirm the level, scores, and best times persisted. Then confirm a rapor entry that already had an old freeform `level` string (created before this change) still opens without crashing (level `<select>` just shows "— Pilih level —" since no matching `level_id`).

- [ ] **Step 13: Commit**

```bash
git add src/app/coach/page.tsx
git commit -m "feat: coach rapor form loads criteria & best-time template from selected level"
```

---

### Task 9: Admin rapor list — read criteria/level from the level template

**Files:**
- Modify: `src/app/admin/_components/AdminRaporList.tsx`

**Interfaces:**
- Consumes: `rapor_levels`, `rapor_level_criteria` (Tasks 1, 4). Reads `rapor_entries.level_id` written by Task 8.

- [ ] **Step 1: Update the Supabase query**

Change (lines 68–84):

```typescript
    const { data } = await supabase
      .from("members")
      .select(`
        id, member_no,
        profile:profiles(full_name, avatar_url, birth_date),
        member_classes(
          classes(
            id, name, rapor_signer_coach_id,
            class_coaches(coach_id, role, profile:profiles(full_name, signature_url)),
            class_criteria(id, label, kind, options, sort_order)
          )
        ),
        rapor_entries(
          id, scores, notes, personality, motivation, learning_achievements, level, period_id, locked
        )
      `)
      .eq("branch_id", branchId);
```

to:

```typescript
    const { data } = await supabase
      .from("members")
      .select(`
        id, member_no,
        profile:profiles(full_name, avatar_url, birth_date),
        member_classes(
          classes(
            id, name, rapor_signer_coach_id,
            class_coaches(coach_id, role, profile:profiles(full_name, signature_url))
          )
        ),
        rapor_entries(
          id, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id, locked,
          rapor_levels(id, name, rapor_level_criteria(id, label, kind, options, sort_order))
        )
      `)
      .eq("branch_id", branchId);
```

- [ ] **Step 2: Read criteria from the entry's level instead of the class**

Change (lines 99–128) — the `data.map((m) => {...})` block. Replace:

```typescript
    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string; avatar_url: string | null; birth_date: string | null } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[]; class_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const entry = (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; personality: string | null; motivation: string | null; learning_achievements: string | null; level: string | null; period_id: string; locked: boolean }[])
        ?.find((e) => e.period_id === periodId);
      const criteria: PrintCriterion[] = [...(cls?.class_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] }));
```

with:

```typescript
    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string; avatar_url: string | null; birth_date: string | null } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const entry = (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; personality: string | null; motivation: string | null; learning_achievements: string | null; level: string | null; period_id: string; locked: boolean; rapor_levels: { id: string; name: string; rapor_level_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[] } | null }[])
        ?.find((e) => e.period_id === periodId);
      const criteria: PrintCriterion[] = [...(entry?.rapor_levels?.rapor_level_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] }));
```

(The rest of the `rows` mapping — `id`, `full_name`, `class_name`, `coach_name`, `is_filled`, `scores`, `level`, `best_times`, etc. — is unchanged; `level` still reads from `entry?.level` since that denormalized text is written by Task 8's save.)

- [ ] **Step 3: Manual verification**

`npm run dev`, log in as admin, open the Rapor list for a period where a coach filled an entry using a level (from Task 8's verification). Open that student's rapor detail — confirm the criteria labels and scores display correctly (not falling back to raw keys), and the level name shows. Then open a student whose entry predates this change (no `level_id`) — confirm it still renders via the existing raw-key fallback without crashing.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/_components/AdminRaporList.tsx
git commit -m "feat: admin rapor list reads criteria from the entry's level template"
```

---

## Self-Review Notes (already applied above)

- Spec coverage: owner-managed level templates (criteria + personal best time standard + table format) ✓ Tasks 1/4/5; coach picks level and criteria/table auto-populate, no manual input ✓ Task 8; clean/sustainable (no dead per-class criteria code left behind) ✓ Tasks 6/7; UI stays consistent with existing design system (`Field`/`Input`/`Select`/`Btn`/`Card`/`Modal`, Indonesian copy, no dynamic Tailwind interpolation) ✓ all UI tasks.
- No placeholders: every step has real, complete code.
- Type consistency checked: `RaporLevel`, `Criterion`, `LevelBestTimeTemplateRow`, `RecordedBestTime`, `BestTimeFormRow`/`BtRow` field names match across Tasks 2, 3, 4, 5, 8.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-rapor-level-templates.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
