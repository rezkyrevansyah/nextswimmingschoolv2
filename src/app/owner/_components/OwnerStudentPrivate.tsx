"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import AdminStudentPrivate from "@/app/admin/_components/AdminStudentPrivate";

/**
 * Owner's "Student Private" screen is a thin wrapper around the same
 * AdminStudentPrivate screen used in the Admin panel — reused directly
 * (not duplicated) so create/edit/session logic stays in exactly one
 * place. Unlike the Admin panel (always scoped to one branch), Owner
 * passes the full branch list so the table shows every private student
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
export default function OwnerStudentPrivate({ branches: initialBranches }: { branches: { id: string; name: string }[] }) {
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
    return <p className="text-sm text-ink-mute">{"No center exists yet — add one first from the Center menu."}</p>;
  }
  return <AdminStudentPrivate branches={branches} onBranchesChange={loadBranches} />;
}
