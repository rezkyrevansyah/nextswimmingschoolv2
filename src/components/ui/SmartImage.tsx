"use client";

import Image from "next/image";
import { isOptimizableImageSrc } from "@/lib/imageHost";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Drop-in for `next/image` when `src` may be an admin-pasted external URL
 * of unknown origin (Landing CMS image fields accept any URL, not just
 * Supabase Storage uploads) — falls back to a plain `<img>` for hosts
 * outside `next.config.ts`'s `remotePatterns`, since `next/image` throws
 * (and would 500 the whole page) for anything not explicitly whitelisted.
 */
export default function SmartImage({ src, alt, fill, sizes, className }: SmartImageProps) {
  if (!isOptimizableImageSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- unrecognized external host; next/image would throw here
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(fill && "absolute inset-0 w-full h-full", className)}
      />
    );
  }
  return <Image src={src} alt={alt} fill={fill} sizes={sizes} className={className} />;
}
