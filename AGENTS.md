<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# File size (see docs/06-struktur-kode.md)

Panel pages stay as internal useState tabs (no App Router per menu).
New UI for a screen that would push a file past ~400 lines must go in a
colocated file under that role's `_components/<Screen>/`, not appended
to page.tsx. Hard ceiling 500 lines except i18n dictionaries and generated
files. Extraction is behavior-preserving: no business-logic rewrites in
the same change.
