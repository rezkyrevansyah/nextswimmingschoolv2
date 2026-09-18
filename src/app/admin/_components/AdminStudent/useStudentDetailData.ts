"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { MemberRow } from "./_types";

export function useMemberDetailData() {
  const supabase = createClient();
  const [detail, setDetail] = useState<MemberRow | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "absensi" | "pembayaran" | "lomba">("info");
  const [attendances, setAttendances] = useState<{ id: string; session_date: string; status: string; method: string; class: { name: string } | null }[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attLoaded, setAttLoaded] = useState(false);
  const [attClassFilter, setAttClassFilter] = useState("");
  const [bills, setBills] = useState<{ id: string; period_label: string; amount: number; discount: number; discount_reason: string | null; total: number; status: string; paid_at: string | null; payment_method: string | null }[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billsLoaded, setBillsLoaded] = useState(false);
  const [regProofUrl, setRegProofUrl] = useState<string | null>(null);
  const [memberComps, setMemberComps] = useState<any[]>([]);
  const [loadingMemberComps, setLoadingMemberComps] = useState(false);
  const [memberCompsLoaded, setMemberCompsLoaded] = useState(false);
  const [photoView, setPhotoView] = useState<string | null>(null);

  const closeDetail = () => { setDetail(null); setDetailTab("info"); setAttLoaded(false); setBillsLoaded(false); setRegProofUrl(null); };

  const loadAttendances = async (memberId: string) => {
    setLoadingAtt(true);
    const { data } = await supabase
      .from("member_attendances")
      .select("id, session_date, status, method, class:classes(name)")
      .eq("member_id", memberId)
      .order("session_date", { ascending: false })
      .limit(100);
    setAttendances((data ?? []) as unknown as typeof attendances);
    setAttLoaded(true);
    setLoadingAtt(false);
  };

  const loadBills = async (memberId: string) => {
    setLoadingBills(true);
    const { data } = await supabase
      .from("bills")
      .select("id, period_label, amount, discount, discount_reason, total, status, paid_at, payment_method")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    setBills((data ?? []) as unknown as typeof bills);
    setBillsLoaded(true);
    setLoadingBills(false);
  };

  const loadRegProof = async (memberId: string) => {
    const { data } = await supabase
      .from("registrations")
      .select("proof_url")
      .eq("member_id", memberId)
      .eq("status", "approved")
      .maybeSingle();
    setRegProofUrl((data as { proof_url: string | null } | null)?.proof_url ?? null);
  };

  const loadMemberComps = async (memberId: string) => {
    setLoadingMemberComps(true);
    const { data } = await supabase
      .from("competition_participations")
      .select(`
        id, category, age_group, time_seconds, time_formatted, rank, award, custom_award_label, certificate_url, notes, created_at,
        competition:competitions(name, start_date, location, organizer)
      `)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    setMemberComps((data as any[]) ?? []);
    setLoadingMemberComps(false);
    setMemberCompsLoaded(true);
  };

  return {
    detail, setDetail, detailTab, setDetailTab, closeDetail,
    attendances, setAttendances, loadingAtt, attLoaded, setAttLoaded, attClassFilter, setAttClassFilter,
    bills, setBills, loadingBills, billsLoaded, setBillsLoaded,
    regProofUrl, setRegProofUrl,
    memberComps, loadingMemberComps, memberCompsLoaded,
    photoView, setPhotoView,
    loadAttendances, loadBills, loadRegProof, loadMemberComps,
  };
}
