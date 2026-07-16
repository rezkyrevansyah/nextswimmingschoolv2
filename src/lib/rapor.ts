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
