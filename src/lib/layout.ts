/** Returns true if value is a valid Tailwind responsive prefix */
export function isResponsiveClass(cls: string): boolean {
  return /^(sm:|md:|lg:|xl:|2xl:)/.test(cls);
}

/** Checks if a class string has a mobile-first base class (no prefix) */
export function hasMobileBase(classes: string[], property: string): boolean {
  return classes.some(cls => !isResponsiveClass(cls) && cls.includes(property));
}

/** Returns the minimum touch target warning if size is below 44px threshold */
export function touchTargetSize(px: number): "ok" | "too-small" {
  return px >= 44 ? "ok" : "too-small";
}

/** Truncates a display name for tight mobile layouts */
export function truncateName(name: string, maxLen: number = 20): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}

/** Formats a modal size to its max-width class */
export function modalMaxWidth(size: "sm" | "md" | "lg" | "xl"): string {
  const map = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl" };
  return map[size];
}
