export interface PartnerItem { id: string; sort_order: number; name: string; logo_url: string | null; website_url: string | null; }
export interface ProgramItem { id: string; sort_order: number; name: string; description: string | null; class_type: string; photo_url: string | null; }
export interface CoachItem { id: string; sort_order: number; name: string; photo_url: string | null; }
export interface WhyNextItem { id: string; sort_order: number; icon: string; title: string; description: string | null; }
export interface TestimonialItem { id: string; sort_order: number; name: string; role: string | null; body_text: string; avatar_url: string | null; rating: number; }
export interface LinkedBranchPreview { name: string | null; city: string | null; address: string | null; phone: string | null; logo_url: string | null; }
export interface BranchEntryItem {
  id: string; sort_order: number; branch_id: string | null;
  name: string | null; address: string | null; city: string | null; phone: string | null; photo_url: string | null;
  lat: number | null; lng: number | null;
  linked: LinkedBranchPreview | null;
}
export interface CoreBranchOption { id: string; name: string; city: string | null; }
export interface FaqItem { id: string; sort_order: number; question: string; answer: string; }

export type Tab = "programs" | "coaches" | "video" | "whynext" | "testimonials" | "partners" | "branches" | "faq" | "footer";

export const WHY_NEXT_ICONS = ["shield", "star", "check", "users", "target", "book", "swim", "clipboard", "sparkle"];
