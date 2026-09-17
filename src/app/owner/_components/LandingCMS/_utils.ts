import type { Tab } from "./_types";

export function buildTabs(t: (key: string) => string): { id: Tab; label: string; icon: string }[] {
  return [
    { id: "programs",     label: t("owner.landingCms.tabPrograms"),     icon: "book"   },
    { id: "coaches",      label: t("owner.landingCms.tabCoaches"),      icon: "swim"   },
    { id: "video",        label: t("owner.landingCms.tabVideo"),        icon: "video"  },
    { id: "whynext",      label: t("owner.landingCms.tabWhyNext"),      icon: "shield" },
    { id: "testimonials", label: t("owner.landingCms.tabTestimonials"), icon: "users"  },
    { id: "partners",     label: t("owner.landingCms.tabPartners"),     icon: "link"   },
    { id: "branches",     label: t("owner.landingCms.tabBranches"),     icon: "pin"    },
    { id: "faq",          label: t("owner.landingCms.tabFaq"),          icon: "info"   },
    { id: "footer",       label: t("owner.landingCms.tabFooter"),       icon: "grid"   },
  ];
}

// ── Revalidate helper ─────────────────────────────────────────────────────────
export async function revalidate() {
  const res = await fetch("/api/owner/revalidate", { method: "POST" });
  if (!res.ok) console.error("[revalidate] failed", res.status, await res.text().catch(() => ""));
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = str.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
  }
  if (str.startsWith("https://www.youtube.com/embed/")) {
    return str;
  }
  return null;
}
