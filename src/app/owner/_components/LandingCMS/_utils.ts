import type { Tab } from "./_types";

export function buildTabs(): { id: Tab; label: string; icon: string }[] {
  return [
    { id: "programs",     label: "Program",         icon: "book"   },
    { id: "coaches",      label: "Coach",           icon: "swim"   },
    { id: "video",        label: "Profile Video",   icon: "video"  },
    { id: "whynext",      label: "Why Next",        icon: "shield" },
    { id: "testimonials", label: "Testimonials",    icon: "users"  },
    { id: "partners",     label: "Partner",         icon: "link"   },
    { id: "branches",     label: "Centers",         icon: "pin"    },
    { id: "faq",          label: "FAQ",             icon: "info"   },
    { id: "footer",       label: "Footer",          icon: "grid"   },
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
