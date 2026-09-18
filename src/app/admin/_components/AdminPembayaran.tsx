"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useUpload } from "@/hooks/useUpload";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { ClassPackage } from "../_types";
import type { Database } from "@/types/database";
import { logActivity } from "@/lib/activityLog";
import { fmtIDR, fmtDate } from "@/lib/utils";

interface BillRow {
  id: string; member_id: string; period_label: string; amount: number;
  discount: number; discount_reason: string | null; total: number; status: string;
  type: string; sessions_total: number | null; sessions_used: number;
  paid_at: string | null; paid_method: string | null; proof_url: string | null;
  admin_notes: string | null;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

// Suppress unused import warning
void (null as unknown as typeof fmtDate);

export default function AdminPembayaran({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const upload = useUpload();
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"unpaid" | "paid" | "all">("unpaid");
  const [generating, setGenerating] = useState(false);
  const [genMonth, setGenMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [openGenModal, setOpenGenModal] = useState(false);

  // Verifikasi modal
  const [verifyTarget, setVerifyTarget] = useState<BillRow | null>(null);
  const [verifyForm, setVerifyForm] = useState({ paid_at: new Date().toISOString().slice(0, 10), paid_method: "transfer", proof_file: null as File | null });
  const [verifyProofPreview, setVerifyProofPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  // Detail modal
  const [detailBill, setDetailBill] = useState<BillRow | null>(null);
  const verifyTargetProofUrl = useSignedUrl(verifyTarget?.proof_url);
  const detailBillProofUrl = useSignedUrl(detailBill?.proof_url);

  // Tambah tagihan manual modal
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({ member_id: "", class_id: "", type: "monthly", period_label: "", amount: "", discount: "", discount_reason: "", admin_notes: "", sessions_total: "" });
  const [addMembers, setAddMembers] = useState<{ id: string; full_name: string; type: string }[]>([]);
  const [addClasses, setAddClasses] = useState<{ id: string; name: string; class_type: string; price_monthly: number; price_per_session: number | null; packages?: ClassPackage[] }[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ClassPackage | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bills")
      .select("id, member_id, period_label, amount, discount, discount_reason, total, status, type, sessions_total, sessions_used, paid_at, paid_method, proof_url, admin_notes, member:members(profile:profiles(full_name)), class:classes(name)")
      .eq("branch_id", branchId).order("created_at", { ascending: false }).limit(200);
    if (data) setBills(data as unknown as BillRow[]);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    // Load members + classes for manual add form
    supabase.from("members").select("id, type, profile:profiles(full_name)").eq("branch_id", branchId).eq("status", "active").neq("type", "school_affiliate")
      .then(({ data }) => {
        if (data) setAddMembers((data as unknown as { id: string; type: string; profile: { full_name: string } | null }[])
          .map(m => ({ id: m.id, full_name: m.profile?.full_name ?? "—", type: m.type })));
      });
    supabase.from("classes").select("id, name, class_type, price_monthly, price_per_session, packages:class_packages(id, name, sessions, price, sort_order, active)").eq("branch_id", branchId).eq("status", "active").order("name")
      .then(({ data }) => { if (data) setAddClasses(data as unknown as { id: string; name: string; class_type: string; price_monthly: number; price_per_session: number | null; packages?: ClassPackage[] }[]); });
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const localeTag = "en-US";
  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(localeTag, { month: "long", year: "numeric" });
  };

  const openVerify = (b: BillRow) => {
    setVerifyTarget(b);
    setVerifyForm({ paid_at: new Date().toISOString().slice(0, 10), paid_method: "transfer", proof_file: null });
    setVerifyProofPreview(null);
  };

  const confirmVerify = async () => {
    if (!verifyTarget) return;
    setVerifying(true);
    let proof_url: string | null = verifyTarget.proof_url ?? null;
    if (verifyForm.proof_file) {
      proof_url = await upload.upload.paymentProof(verifyForm.proof_file, verifyTarget.id);
    }
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("bills").update({
      status: "paid",
      paid_at: new Date(verifyForm.paid_at).toISOString(),
      paid_method: verifyForm.paid_method,
      proof_url,
      verified_by: user?.id ?? null,
    }).eq("id", verifyTarget.id);
    setVerifying(false);
    if (error) return toast.error("Verification failed", error.message);
    // Notify member
    await supabase.from("notifications").insert({
      user_id: verifyTarget.member_id,
      title: "Bill verified",
      body: `Your ${verifyTarget.period_label} bill payment has been verified as paid via ${verifyForm.paid_method}.`,
      icon: "check",
      kind: "success",
    });
    toast.success("Payment verified");
    logActivity(supabase, { userId: user?.id ?? "unknown", userRole: "admin", userName: user?.user_metadata?.full_name ?? "Admin", branchId, entityType: "bills", entityId: verifyTarget.id, entityLabel: verifyTarget.member?.profile?.full_name ?? undefined, action: "update", label: `Bill ${verifyTarget.period_label} for ${verifyTarget.member?.profile?.full_name ?? "student"} verified as paid`, meta: { amount: verifyTarget.total, paid_method: verifyForm.paid_method } });
    setVerifyTarget(null);
    load();
  };

  const saveManualBill = async () => {
    if (!addForm.member_id || !addForm.period_label || !addForm.amount) return toast.error("Student, period, and amount are required");
    const selectedMember = addMembers.find(m => m.id === addForm.member_id);
    if (selectedMember?.type === "school_affiliate") return toast.error("School-affiliated students cannot be billed manually");
    const amount = Number(addForm.amount) || 0;
    const discount = Number(addForm.discount) || 0;
    if (discount > amount) return toast.error("Discount cannot be greater than the bill amount");
    setSaving(true);
    const total = amount - discount;
    const isSessionPack = addForm.type === "session_pack";
    const row: Database["public"]["Tables"]["bills"]["Insert"] = {
      member_id: addForm.member_id,
      branch_id: branchId,
      class_id: addForm.class_id || null,
      type: addForm.type as Database["public"]["Enums"]["bill_type"],
      period_label: addForm.period_label,
      amount,
      discount,
      discount_reason: addForm.discount_reason || null,
      status: "unpaid" as Database["public"]["Enums"]["payment_status"],
      admin_notes: addForm.admin_notes || null,
      sessions_total: (isSessionPack && addForm.sessions_total) ? Number(addForm.sessions_total) : null,
      sessions_used: (isSessionPack && addForm.sessions_total) ? 0 : undefined,
    };
    const { error } = await supabase.from("bills").insert(row);
    setSaving(false);
    if (error) return toast.error("Failed to create bill", error.message);
    // Notify member
    await supabase.from("notifications").insert({
      user_id: addForm.member_id,
      title: "New bill",
      body: `A ${addForm.period_label} bill of ${fmtIDR(total)} has been created. Contact admin to confirm payment.`,
      icon: "invoice",
      kind: "info",
    });
    toast.success("Bill created successfully");
    const actUser = (await supabase.auth.getUser()).data.user;
    logActivity(supabase, { userId: actUser?.id ?? "unknown", userRole: "admin", userName: actUser?.user_metadata?.full_name ?? "Admin", branchId, entityType: "bills", entityId: addForm.member_id, entityLabel: selectedMember?.full_name ?? undefined, action: "create", label: `Manual bill ${addForm.period_label} created for ${selectedMember?.full_name ?? addForm.member_id} — ${fmtIDR(total)}`, meta: { amount, discount, total } });
    setOpenAdd(false);
    setSelectedPackage(null);
    setAddForm({ member_id: "", class_id: "", type: "monthly", period_label: "", amount: "", discount: "", discount_reason: "", admin_notes: "", sessions_total: "" });
    load();
  };

  const generateTagihan = async () => {
    const label = fmtMonth(genMonth);
    setOpenGenModal(false);
    setGenerating(true);
    try {
      const { data: members, error: mErr } = await supabase
        .from("members").select("id, member_classes(class:classes(id, price_monthly))")
        .eq("branch_id", branchId).eq("status", "active").eq("type", "reguler");
      if (mErr || !members) { toast.error("Failed to load students", mErr?.message); setGenerating(false); return; }
      // Key existing bills by (member_id, class_id) — not member_id alone —
      // so a member enrolled in more than one class still gets billed for
      // every class, not just whichever one happened to be billed first.
      const { data: existing } = await supabase.from("bills").select("member_id, class_id").eq("branch_id", branchId).eq("period_label", label);
      const existingKeys = new Set((existing ?? []).map(b => `${b.member_id}:${b.class_id ?? ""}`));
      const rows: Database["public"]["Tables"]["bills"]["Insert"][] = [];
      for (const m of members as unknown as { id: string; member_classes: { class: { id: string; price_monthly: number } | null }[] }[]) {
        const classes = (m.member_classes ?? []).map(mc => mc.class).filter((c): c is { id: string; price_monthly: number } => !!c);
        if (classes.length === 0) continue;
        for (const cls of classes) {
          const key = `${m.id}:${cls.id}`;
          if (existingKeys.has(key)) continue;
          rows.push({ member_id: m.id, branch_id: branchId, class_id: cls.id, type: "monthly" as Database["public"]["Enums"]["bill_type"], period_label: label, amount: cls.price_monthly ?? 0, discount: 0, status: "unpaid" as Database["public"]["Enums"]["payment_status"] });
        }
      }
      if (rows.length === 0) { toast.success("All regular students already have a bill for this period"); setGenerating(false); return; }
      const { error } = await supabase.from("bills").insert(rows);
      if (error) { toast.error("Failed to generate bills", error.message); setGenerating(false); return; }
      // Notify all members
      for (const row of rows) {
        await supabase.from("notifications").insert({ user_id: row.member_id as string, title: "New bill", body: `A ${label} bill of ${fmtIDR(row.amount as number)} has been created.`, icon: "invoice", kind: "info" });
      }
      toast.success(`${rows.length} bills generated successfully`, `Period ${label}`);
      load();
    } finally { setGenerating(false); }
  };

  const paidBills = bills.filter(b => b.status === "paid");
  const unpaidBills = bills.filter(b => b.status === "unpaid" || b.status === "partial");
  const displayBills = tab === "unpaid" ? unpaidBills : tab === "paid" ? paidBills : bills;

  const statusLabel = (s: string) => ({ paid: "Paid", unpaid: "Unpaid", partial: "Partial", school_covered: "School", free: "Free" }[s] ?? s);
  const statusKind = (s: string): "paid" | "unpaid" | "school_covered" | "pending" => ({ paid: "paid", unpaid: "unpaid", partial: "pending", school_covered: "school_covered", free: "paid" }[s] as "paid" | "unpaid" | "school_covered" | "pending" ?? "unpaid");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-display font-bold text-2xl">{"Payments"}</h2><p className="text-ink-mute text-sm mt-0.5">{"Verify incoming payments & manage bills."}</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant="ghost" icon="plus" onClick={() => setOpenAdd(true)}>{"Add Bill"}</Btn>
          <Btn variant="primary" icon="invoice" onClick={() => setOpenGenModal(true)} disabled={generating}>{generating ? "Generating…" : "Generate Bill"}</Btn>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label={"Unpaid"} value={unpaidBills.length} icon="warning" tone="warn" sub={fmtIDR(unpaidBills.reduce((a, b) => a + (b.total ?? 0), 0))} />
        <Stat label={"Already Paid"}   value={paidBills.length}   icon="check"   tone="ok"   sub={fmtIDR(paidBills.reduce((a, b) => a + (b.total ?? 0), 0))} />
        <Stat label={"Total bills"} value={bills.length}       icon="invoice" tone="ocean" />
      </div>

      {/* Tab filter */}
      <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1 w-fit">
        {([["unpaid", "Unpaid"], ["paid", "Paid"], ["all", "All"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
        ))}
      </div>

      <Card padded={false}>
        {loading ? <div className="p-10 text-center text-ink-mute">{"Loading data…"}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-3 px-5 font-bold">{"Student"}</th>
                <th className="text-left py-3 font-bold">{"Period"}</th>
                <th className="text-left py-3 font-bold hidden sm:table-cell">{"Class"}</th>
                <th className="text-right py-3 font-bold">{"Total"}</th>
                <th className="text-left py-3 font-bold">{"Status"}</th>
                <th className="px-5" />
              </tr></thead>
              <tbody className="divide-y divide-line">
                {displayBills.map((b) => (
                  <tr key={b.id} className="hover:bg-paper-tint">
                    <td className="py-3.5 px-5 font-semibold"><NoTranslate>{b.member?.profile?.full_name ?? "—"}</NoTranslate></td>
                    <td className="text-ink-soft"><NoTranslate>{b.period_label}</NoTranslate></td>
                    <td className="text-ink-mute text-xs hidden sm:table-cell"><NoTranslate>{b.class?.name ?? "—"}</NoTranslate>{b.type === "session_pack" && b.sessions_total ? ` · ${`${b.sessions_used}/${b.sessions_total} sessions`}` : ""}</td>
                    <td className="text-right font-mono font-bold">
                      {fmtIDR(b.total ?? b.amount)}
                      {b.discount > 0 && <div className="text-xs text-ok-600 font-normal">-{fmtIDR(b.discount)}</div>}
                    </td>
                    <td><Status kind={statusKind(b.status)}>{statusLabel(b.status)}</Status></td>
                    <td className="px-5 flex items-center gap-1.5 py-3.5">
                      {(b.status === "unpaid" || b.status === "partial") && <Btn variant="soft" size="sm" icon="check" onClick={() => openVerify(b)}>{"Verify"}</Btn>}
                      <Btn variant="ghost" size="sm" icon="eye" onClick={() => setDetailBill(b)}>{"Detail"}</Btn>
                    </td>
                  </tr>
                ))}
                {displayBills.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-ink-mute">{"No bills"}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Verifikasi Pembayaran Modal */}
      <Modal open={!!verifyTarget} onClose={() => setVerifyTarget(null)} title={"Verify Payment"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setVerifyTarget(null)}>{"Cancel"}</Btn><Btn variant="primary" icon="check" onClick={confirmVerify} disabled={verifying}>{verifying ? "Saving…" : "Verify Paid"}</Btn></>}>
        {verifyTarget && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="font-semibold text-ink text-sm"><NoTranslate>{verifyTarget.member?.profile?.full_name ?? "—"}</NoTranslate></div>
              <div className="text-xs text-ink-mute mt-0.5"><NoTranslate>{verifyTarget.period_label}</NoTranslate> · {fmtIDR(verifyTarget.total ?? verifyTarget.amount)}</div>
            </Card>
            <Field label={"Payment date"} required>
              <Input type="date" value={verifyForm.paid_at} onChange={e => setVerifyForm(f => ({ ...f, paid_at: e.target.value }))} />
            </Field>
            <Field label={"Payment method"} required>
              <Select value={verifyForm.paid_method} onChange={e => setVerifyForm(f => ({ ...f, paid_method: e.target.value }))}>
                <option value="transfer">{"Transfer"}</option>
                <option value="tunai">{"Cash"}</option>
                <option value="lainnya">{"Other"}</option>
              </Select>
            </Field>
            <Field label={"Proof of transfer"} hint={"Optional for cash payments."}>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => {
                  const file = e.target.files?.[0] ?? null;
                  setVerifyForm(f => ({ ...f, proof_file: file }));
                  if (file && file.type.startsWith("image/")) {
                    const url = URL.createObjectURL(file);
                    setVerifyProofPreview(url);
                  } else {
                    setVerifyProofPreview(null);
                  }
                }} />
                {verifyProofPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-ok-300 bg-ok-50">
                    <img src={verifyProofPreview} alt="preview" className="w-full max-h-48 object-contain" />
                    <div className="absolute top-2 right-2 bg-ok-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{"Selected"}</div>
                  </div>
                ) : verifyTargetProofUrl ? (
                  <div className="rounded-xl border border-line overflow-hidden">
                    <img src={verifyTargetProofUrl} alt="bukti" className="w-full max-h-40 object-contain bg-paper-tint" />
                    <div className="px-3 py-2 bg-paper-tint border-t border-line flex items-center gap-2 text-xs text-ink-mute">
                      <Icon name="eye" className="w-3.5 h-3.5" />
                      <span className="flex-1">{"Previous proof. Click to change."}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-line hover:border-ocean-300 hover:bg-ocean-50 transition-colors px-4 py-6 flex flex-col items-center gap-2 text-center">
                    <span className="w-10 h-10 rounded-xl bg-paper-tint flex items-center justify-center"><Icon name="upload" className="w-5 h-5 text-ink-mute" /></span>
                    <div className="text-sm font-semibold text-ink">{"Click to upload proof"}</div>
                    <div className="text-xs text-ink-mute">{"JPG, PNG, or PDF · max 5 MB"}</div>
                  </div>
                )}
              </label>
              {verifyForm.proof_file && (
                <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                  <Icon name="check" className="w-3.5 h-3.5 text-ok-600 shrink-0" />
                  <span className="truncate">{verifyForm.proof_file.name}</span>
                  <button type="button" className="ml-auto text-ink-faint hover:text-danger-500 shrink-0" onClick={() => { setVerifyForm(f => ({ ...f, proof_file: null })); setVerifyProofPreview(null); }}>
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Field>
          </div>
        )}
      </Modal>

      {/* Detail Tagihan Modal */}
      <Modal open={!!detailBill} onClose={() => setDetailBill(null)} title={"Bill Detail"} size="sm"
        footer={<Btn variant="ghost" onClick={() => setDetailBill(null)}>{"Close"}</Btn>}>
        {detailBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Student"}</div><div className="font-semibold text-ink"><NoTranslate>{detailBill.member?.profile?.full_name ?? "—"}</NoTranslate></div></div>
              <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Period"}</div><div className="font-semibold text-ink"><NoTranslate>{detailBill.period_label}</NoTranslate></div></div>
              <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Amount"}</div><div className="font-mono font-semibold text-ink">{fmtIDR(detailBill.amount)}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Discount"}</div><div className="font-mono font-semibold text-ink">{detailBill.discount > 0 ? fmtIDR(detailBill.discount) : "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Total"}</div><div className="font-mono font-bold text-ocean-700 text-base">{fmtIDR(detailBill.total ?? detailBill.amount)}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Status"}</div><Status kind={statusKind(detailBill.status)}>{statusLabel(detailBill.status)}</Status></div>
              {detailBill.paid_at && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Paid Date"}</div><div className="font-semibold text-ink">{new Date(detailBill.paid_at).toLocaleDateString(localeTag, { day: "numeric", month: "long", year: "numeric" })}</div></div>}
              {detailBill.paid_method && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Method"}</div><div className="font-semibold text-ink capitalize">{detailBill.paid_method}</div></div>}
              {detailBill.discount_reason && <div className="col-span-2"><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Discount reason"}</div><div className="text-ink-soft"><NoTranslate>{detailBill.discount_reason}</NoTranslate></div></div>}
              {detailBill.admin_notes && <div className="col-span-2"><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Admin notes"}</div><div className="text-ink-soft"><NoTranslate>{detailBill.admin_notes}</NoTranslate></div></div>}
            </div>
            {detailBillProofUrl && (
              <div className="pt-3 border-t border-line space-y-2">
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Proof of Payment"}</div>
                <a href={detailBillProofUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-line hover:border-ocean-300 transition-colors">
                  <img src={detailBillProofUrl} alt="bukti" className="w-full max-h-64 object-contain bg-paper-tint" />
                  <div className="px-3 py-2 bg-paper-tint border-t border-line flex items-center gap-1.5 text-xs text-ocean-600 font-semibold">
                    <Icon name="eye" className="w-3.5 h-3.5" />{"Open full image"}
                  </div>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Tambah Tagihan Manual Modal */}
      <Modal open={openAdd} onClose={() => { setOpenAdd(false); setSelectedPackage(null); }} title={"Add Bill"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAdd(false); setSelectedPackage(null); }}>{"Cancel"}</Btn><Btn variant="primary" icon="plus" onClick={saveManualBill} disabled={saving}>{saving ? "Saving…" : "Create Bill"}</Btn></>}>
        <div className="space-y-4">
          {(() => {
            const selectedClass = addClasses.find(c => c.id === addForm.class_id);
            const activePackages = (selectedClass?.packages ?? []).filter(p => p.active).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <>
                <Field label={"Student"} required>
                  <Select value={addForm.member_id} onChange={e => {
                    const m = addMembers.find(x => x.id === e.target.value);
                    setSelectedPackage(null);
                    setAddForm(f => ({ ...f, member_id: e.target.value, class_id: "", amount: "", sessions_total: "", type: m?.type === "private" ? "session_pack" : "monthly" }));
                  }}>
                    <option value="">{"— select student —"}</option>
                    {addMembers.map(m => <option key={m.id} value={m.id} translate="no">{m.full_name} ({m.type})</option>)}
                  </Select>
                </Field>
                <Field label={"Class"}>
                  <Select value={addForm.class_id} onChange={e => {
                    const cls = addClasses.find(c => c.id === e.target.value);
                    setSelectedPackage(null);
                    if (cls?.class_type === "private") {
                      setAddForm(f => ({ ...f, class_id: e.target.value, amount: "", sessions_total: "" }));
                    } else {
                      setAddForm(f => ({ ...f, class_id: e.target.value, amount: String(cls?.price_monthly ?? 0), sessions_total: "" }));
                    }
                  }}>
                    <option value="">{"— select class —"}</option>
                    {addClasses.map(c => <option key={c.id} value={c.id} translate="no">{c.name}{c.class_type === "private" ? " (Private)" : ""}</option>)}
                  </Select>
                </Field>
                <Field label={"Bill type"} required>
                  <Select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="monthly">{"Monthly"}</option>
                    <option value="session_pack">{"Session Pack"}</option>
                    <option value="custom">{"Custom"}</option>
                  </Select>
                </Field>
                {addForm.type === "session_pack" && selectedClass?.class_type === "private" && activePackages.length > 0 && (
                  <Field label={"Select package"} required>
                    <div className="space-y-2">
                      {activePackages.map(pkg => (
                        <button key={pkg.id} type="button" onClick={() => {
                          setSelectedPackage(pkg);
                          setAddForm(f => ({
                            ...f,
                            sessions_total: String(pkg.sessions),
                            amount: String(pkg.price),
                            period_label: f.period_label || pkg.name,
                          }));
                        }} className={`w-full flex justify-between items-center px-3 py-2.5 rounded-xl border-2 text-sm transition ${selectedPackage?.id === pkg.id ? "border-ocean-500 bg-ocean-50" : "border-line bg-white hover:border-ocean-300"}`}>
                          <span className="font-semibold text-ink"><NoTranslate>{pkg.name}</NoTranslate></span>
                          <div className="text-right shrink-0 ml-3">
                            <div className="font-mono font-bold text-ocean-700">{fmtIDR(pkg.price)}</div>
                            <div className="text-xs text-ink-mute">{`${pkg.sessions} sessions`}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
                {addForm.type === "session_pack" && !(selectedClass?.class_type === "private" && activePackages.length > 0) && (
                  <Field label={"Number of sessions in package"} required>
                    <Input type="number" min={1} value={addForm.sessions_total} onChange={e => setAddForm(f => ({ ...f, sessions_total: e.target.value }))} placeholder={"E.g. 8"} />
                  </Field>
                )}
                <Field label={"Period / package name"} required>
                  <Input value={addForm.period_label} onChange={e => setAddForm(f => ({ ...f, period_label: e.target.value }))} placeholder={addForm.type === "monthly" ? "E.g. June 2026" : "E.g. 10-Session Pack"} />
                </Field>
                <Field label={"Bill amount"} required hint={selectedPackage ? `From package: ${selectedPackage.name}` : undefined}>
                  <Input type="number" min={0} value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} placeholder={"E.g. 500000"} />
                </Field>
                <Field label={"Discount"} hint={"Optional."}>
                  <Input type="number" min={0} value={addForm.discount} onChange={e => setAddForm(f => ({ ...f, discount: e.target.value }))} placeholder={"E.g. 50000"} />
                </Field>
                {Number(addForm.discount) > 0 && (
                  <Field label={"Discount reason"}>
                    <Input value={addForm.discount_reason} onChange={e => setAddForm(f => ({ ...f, discount_reason: e.target.value }))} placeholder={"E.g. Scholarship / concession"} />
                  </Field>
                )}
                {Number(addForm.amount) > 0 && (
                  <div className="flex justify-between text-sm font-semibold px-1">
                    <span className="text-ink-mute">{"Total to pay"}</span>
                    <span className="text-ink font-mono">{fmtIDR(Number(addForm.amount) - Number(addForm.discount || 0))}</span>
                  </div>
                )}
                <Field label={"Admin notes"} hint={"Optional."}>
                  <Textarea rows={2} value={addForm.admin_notes} onChange={e => setAddForm(f => ({ ...f, admin_notes: e.target.value }))} placeholder={"E.g. May 2026 bill, confirmed via WA."} />
                </Field>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Generate Tagihan Modal */}
      <Modal open={openGenModal} onClose={() => setOpenGenModal(false)} title={"Generate Monthly Bills"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenGenModal(false)}>{"Cancel"}</Btn><Btn variant="primary" icon="invoice" onClick={generateTagihan} disabled={generating}>{generating ? "Generating…" : "Generate"}</Btn></>}>
        <div className="space-y-4">
          <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3.5 text-sm text-ocean-800 flex gap-2.5">
            <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-ocean-500" />
            <span>{"Generate monthly bills for all active regular students. Students who already have a bill for this period will be skipped automatically."}</span>
          </div>
          <Field label={"Bill period"} required>
            <Input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} className="font-mono" />
          </Field>
          <div className="bg-paper-tint rounded-xl px-3.5 py-3 text-sm text-ink-soft">
            {"Bills will be generated for period:"} <span className="font-semibold text-ink">{fmtMonth(genMonth)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
