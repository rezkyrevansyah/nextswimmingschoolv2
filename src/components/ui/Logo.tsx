import Image from "next/image";
import React from "react";

interface LogoProps {
  size?: number;
  withWord?: boolean;
  /** Use on dark backgrounds — renders text in white instead of ocean-700 */
  dark?: boolean;
}

export default function Logo({ size = 32, withWord = false, dark = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Next Swimming School"
        width={size}
        height={size}
        className="rounded-full shrink-0"
        style={{ width: size, height: size }}
        priority
      />
      {withWord && (
        dark ? (
          <span className="font-display font-extrabold text-white tracking-tight leading-none">
            Next <span className="text-wave-300">Swimming</span> School
          </span>
        ) : (
          <span className="font-display font-extrabold text-ocean-700 tracking-tight leading-none">
            Next <span className="text-wave-500">Swimming</span> School
          </span>
        )
      )}
    </span>
  );
}
