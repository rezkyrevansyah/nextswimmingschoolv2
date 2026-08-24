export interface ClassCoachForSigner {
  coach_id: string;
  role: string;
  profile: { full_name: string; signature_url: string | null } | null;
}

export function resolveRaporSigner(
  classCoaches: ClassCoachForSigner[],
  raporSignerCoachId: string | null | undefined
): { full_name: string; signature_url: string | null } | null {
  if (raporSignerCoachId) {
    const override = classCoaches.find(cc => cc.coach_id === raporSignerCoachId);
    if (override?.profile) return override.profile;
  }
  const head = classCoaches.find(cc => cc.role === "head");
  if (head?.profile) return head.profile;
  return classCoaches[0]?.profile ?? null;
}

export interface SchoolForSignerConfig {
  show_coach_sig?: boolean | null;
  show_head_sig?: boolean | null;
  show_school_sig?: boolean | null;
  coach_sig_title?: string | null;
  head_sig_title?: string | null;
  school_signatures?: { name: string; title: string; image_url: string; is_active: boolean }[] | null;
}

export interface OwnerHeadConfig {
  head_name?: string | null;
  head_title?: string | null;
  head_signature_url?: string | null;
}

export function buildSchoolRaporSignatures(
  school: SchoolForSignerConfig | null | undefined,
  coachName: string,
  coachSignatureUrl?: string | null,
  headConfig?: OwnerHeadConfig | null
): { name: string; title: string; image_url?: string | null }[] | undefined {
  if (!school) return undefined;
  const list: { name: string; title: string; image_url?: string | null }[] = [];

  // 1. Coach signature
  if (school.show_coach_sig !== false) {
    list.push({
      name: coachName,
      title: school.coach_sig_title || "HEAD COACH",
      image_url: coachSignatureUrl,
    });
  }

  // 2. School principal / official signature
  if (school.show_school_sig !== false) {
    const activeSig = (school.school_signatures ?? []).find(s => s.is_active);
    if (activeSig) {
      list.push({
        name: activeSig.name,
        title: activeSig.title,
        image_url: activeSig.image_url,
      });
    }
  }

  // 3. Head of NEXT signature
  if (school.show_head_sig) {
    list.push({
      name: headConfig?.head_name || "Syahril Sidik",
      title: school.head_sig_title || headConfig?.head_title || "HEAD OF NEXT SWIMMING",
      image_url: headConfig?.head_signature_url || null,
    });
  }

  return list.length > 0 ? list : undefined;
}
