<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# File size (see docs/06-struktur-kode.md)

This codebase was rescued from a set of "god files" — `owner/page.tsx` alone
was 5,625 lines, `AdminMember.tsx` was 1,932. Every panel (Owner, Admin,
Coach, Member, Staff, School) has since been split into a screen-folder
structure: `page.tsx` is a thin shell (auth, nav, `switch(active)`), and each
menu/tab lives in its own file or folder under that role's
`_components/<Screen>/`. Do not undo this by growing `page.tsx` again or by
appending new screens' UI to an existing file instead of giving them their
own.

Panel pages stay as internal useState tabs (no App Router per menu).
New UI for a screen that would push a file past ~400 lines must go in a
colocated file under that role's `_components/<Screen>/`, not appended
to page.tsx. Hard ceiling 500 lines, generated files (e.g.
`src/types/database.ts`) excepted. Extraction is behavior-preserving: no
business-logic rewrites in the same change.

**Absolute ceiling: no hand-written `.ts`/`.tsx` file in this repo may exceed
1000 lines — no exceptions.** If a file you're editing is approaching that
size, split it into a screen-folder (or further split an existing one)
*before* adding more code, using the extraction recipe in bab 6 of
`docs/06-struktur-kode.md`. Never let a file cross 1000 lines "temporarily
until later" — split first, then add the feature.
