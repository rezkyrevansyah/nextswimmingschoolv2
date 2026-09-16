"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLocale } from "@/components/providers/LocaleProvider";
import AdminMemberPrivate from "@/app/admin/_components/AdminMemberPrivate";

/**
 * Owner's "Member Private" screen is a thin wrapper around the same
 * AdminMemberPrivate screen used in the Admin panel — reused directly
 * (not duplicated) so create/edit/session logic stays in exactly one
 * place. Unlike the Admin panel (always scoped to one branch), Owner
 * passes the full branch list so the table shows every private member
 * across every center at once, with a Branch column and an advanced
 * filter to narrow it back down — no more picking one branch just to
 * see anything.
 *
 * Fetches its own branch list instead of trusting the `branches` prop
 * threaded down from owner/page.tsx: that top-level list only refreshes
 * through its own onRefresh plumbing, so a branch created in another tab
 * (or another session) wouldn't show up here until something forced a
 * refetch. A newly created center needs to be pickable immediately.
 */
export default function OwnerMemberPrivate({ branches: initialBranches }: { branches: { id: string; name: string }[] }) {
  const { t } = useLocale();
  const supabase = createClient();
  const [branches, setBranches] = useState(initialBranches);

  const loadBranches = useCallback(async () => {
    const { data } = await supabase.from("branches").select("id, name").eq("status", "active").order("name");
    if (data) setBranches(data);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadBranches(); }, [loadBranches]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (branches.length === 0) {
    return <p className="text-sm text-ink-mute">{t("owner.branches.noBranchYet")}</p>;
  }
  return <AdminMemberPrivate branches={branches} onBranchesChange={loadBranches} />;
}
