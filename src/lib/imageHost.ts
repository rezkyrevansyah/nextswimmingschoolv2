// Hosts `next/image` can optimize — must mirror `images.remotePatterns` in
// next.config.ts. Kept as a separate runtime-checkable list because
// next.config.ts isn't importable from client components.
const OPTIMIZABLE_IMAGE_HOSTS = [/\.supabase\.co$/i, /^i\.ytimg\.com$/i];

/**
 * Whether `next/image` can serve this URL through its optimizer.
 * `next/image` throws for any https host outside `remotePatterns` — this
 * lets callers fall back to a plain `<img>` instead of crashing when the
 * source is an admin-pasted URL of unknown origin (e.g. Landing CMS fields
 * that accept any external image URL, not just Supabase Storage uploads).
 */
export function isOptimizableImageSrc(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol !== "https:") return false;
    return OPTIMIZABLE_IMAGE_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}
