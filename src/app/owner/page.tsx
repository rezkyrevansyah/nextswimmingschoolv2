"use client";
import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea, Switch } from "@/components/ui/FormFields";
import { Card, SectionTitle, Stat } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { GoogleLanguageSwitcher } from "@/components/GoogleTranslate";
import Modal from "@/components/ui/Modal";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { fmtIDR, clampPercent, fmtDate, fmtDateLong, cn } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import dynamic from "next/dynamic";
import LandingCMS from "./_components/LandingCMS";
import OwnerSchools from "./_components/OwnerSchools";
import OwnerMasterData from "./_components/OwnerMasterData";
import OwnerAccountsMaster from "./_components/OwnerAccountsMaster";
import OwnerMemberPrivate from "./_components/OwnerMemberPrivate";
import PayslipGenerator, { parsePeriodToMonth } from "./payroll/PayslipGenerator";
import CoachLoans from "./payroll/CoachLoans";
import AdminCompetition from "../admin/_components/AdminCompetition";
import OwnerClassesMaster from "./_components/OwnerClassesMaster";
import ProofViewer from "@/components/ui/ProofViewer";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-xl border border-line bg-paper-tint flex items-center justify-center text-xs text-ink-mute">Loading map...</div>,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  status: string;
  wa_numbers?: string[];
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  show_payments_to_admin?: boolean;
  color?: string;
  member_count?: number;
  coach_count?: number;
  staff_count?: number;
  class_count?: number;
}

interface CoachSpreadsheetEntry {
  coach_id: string;
  spreadsheet_url: string;
  updated_at: string;
  coach?: { full_name: string } | null;
}

interface ClassRow {
  id: string;
  name: string;
  branch_id: string;
  status: string;
  capacity: number;
  enrolled: number;
  price_monthly: number;
  schedule_days: string[];
  time_start: string; time_end: string;
  goals: string | null;
  description: string | null;
  spreadsheet_url?: string | null;
  spreadsheet_filled?: boolean;
  rapor_signer_coach_id?: string | null;
  branch?: { name: string } | null;
  class_coaches?: { coach_id: string; role: string; profile: { full_name: string } | null }[];
  coach_spreadsheets?: CoachSpreadsheetEntry[];
}

interface CoachRate {
  id: string;
  class_id: string;
  coach_id: string | null;
  rate_per_session: number;
}

interface InvoiceItem {
  id: string; item_type: string; class_id: string | null; session_count: number; rate: number;
  description: string | null; proof_url: string | null;
  class?: { name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  period_label: string;
  total_amount: number;
  status: string;
  bank_info: string | null;
  submitted_at: string;
  paid_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  branch_id?: string | null;
  branch?: { name: string } | null;
  coach?: { id: string; full_name: string; phone?: string | null; bank_name?: string | null; bank_account?: string | null; bank_holder?: string | null } | null;
  coach_invoice_items?: InvoiceItem[];
}

interface StaffSalaryRow {
  id: string;
  staff_id: string;
  branch_id: string;
  period_month: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  reimburse_amount: number;
  total_salary: number;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

interface StaffAttendanceSummary {
  staff_id: string;
  present_count: number;
  late_count: number;
  leave_count: number;
  sick_count: number;
}

interface InvoicePeriod {
  id: string;
  branch_id: string | null;
  label: string;
  date_from: string;
  date_to: string;
  is_open: boolean;
  branch?: { name: string } | null;
}

// ── Sub-pages ──────────────────────────────────────────────────────────────────

function Dashboard({ branches }: { branches: Branch[] }) {
  const { t } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const supabase = createClient();

   
  useEffect(() => {
    supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, submitted_at, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(full_name)")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(4)
      .then(({ data }) => { if (data) setInvoices(data as unknown as Invoice[]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
   

  const totalMembers = branches.reduce((a, b) => a + (b.member_count ?? 0), 0);
  const totalCoaches = branches.reduce((a, b) => a + (b.coach_count ?? 0), 0);
  const totalClasses = branches.reduce((a, b) => a + (b.class_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-ocean-700 text-white rounded-2xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-wave-500/30 blur-3xl" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">{t("owner.dashboard.greeting")}</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-4xl mt-1.5 leading-tight">
            {t("owner.dashboard.heroHeadline", { branches: branches.length, members: totalMembers })}<br className="hidden lg:block" /> {t("owner.dashboard.heroHeadlineLine2", { coaches: totalCoaches })}
          </h2>
          <p className="text-white/70 mt-3 max-w-2xl">
            {invoices.length > 0 ? t("owner.dashboard.invoicesPending", { count: invoices.length }) : t("owner.dashboard.allNormal")}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={t("owner.dashboard.statMembers")}  value={totalMembers}    icon="users"   tone="ocean" sub={t("owner.dashboard.statMembersSub")} />
        <Stat label={t("owner.dashboard.statCoaches")}  value={totalCoaches}    icon="swim"    tone="wave"  sub={t("owner.dashboard.statCoachesSub")} />
        <Stat label={t("owner.dashboard.statClasses")}  value={totalClasses}    icon="grid"    tone="ocean" sub={t("owner.dashboard.statClassesSub")} />
        <Stat label={t("owner.dashboard.statInvoicesPending")} value={invoices.length} icon="invoice" tone="warn" sub={t("owner.dashboard.statInvoicesPendingSub")} />
      </div>

      <Card>
        <SectionTitle sub={t("owner.dashboard.branchBreakdownSub")}>{t("owner.dashboard.branchBreakdownTitle")}</SectionTitle>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                <th className="text-left py-2.5 font-bold">{t("owner.dashboard.colBranch")}</th>
                <th className="text-left py-2.5 font-bold">{t("owner.dashboard.colLocation")}</th>
                <th className="text-right py-2.5 font-bold">{t("owner.dashboard.colMembers")}</th>
                <th className="text-right py-2.5 font-bold">{t("owner.dashboard.colCoaches")}</th>
                <th className="text-right py-2.5 font-bold">{t("owner.dashboard.colClasses")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-paper-tint">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-ocean-600 text-white">
                        <Icon name="pin" className="w-4 h-4" />
                      </span>
                      <div className="font-semibold text-ink"><NoTranslate>{b.name}</NoTranslate></div>
                    </div>
                  </td>
                  <td className="text-ink-mute"><NoTranslate>{b.address}</NoTranslate></td>
                  <td className="text-right font-mono font-semibold">{b.member_count ?? 0}</td>
                  <td className="text-right font-mono font-semibold">{b.coach_count ?? 0}</td>
                  <td className="text-right font-mono font-semibold">{b.class_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {invoices.length > 0 && (
        <Card>
          <SectionTitle sub={t("owner.dashboard.incomingInvoicesSub")}>{t("owner.dashboard.incomingInvoicesTitle")}</SectionTitle>
          <div className="space-y-2">
            {invoices.map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 p-3 rounded-xl bg-paper-tint">
                <Avatar name={iv.coach?.full_name ?? "?"} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate"><NoTranslate>{iv.coach?.full_name}</NoTranslate></div>
                  <div className="text-[11px] text-ink-mute"><NoTranslate>{iv.period_label}</NoTranslate> · <NoTranslate>{iv.branch?.name}</NoTranslate></div>
                </div>
                <div className="text-sm font-bold text-ink font-mono">{fmtIDR(iv.total_amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Branches({ branches, onRefresh, userId, userName }: { branches: Branch[]; onRefresh: () => void; userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const supabase = createClient();

  const [filterTab, setFilterTab] = useState<"all" | "active" | "archived">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [showPaymentsToAdmin, setShowPaymentsToAdmin] = useState(true);
  const [saving, setSaving] = useState(false);

  const openAdminPanel = (b: Branch) => {
    sessionStorage.setItem("ownerPreviewBranch", JSON.stringify({ id: b.id, name: b.name }));
    router.push("/admin");
  };

  const openAdd = () => {
    setName(""); setCity(""); setAddress(""); setWaPhone("");
    setLat(""); setLng("");
    setBankName(""); setBankAccount(""); setBankHolder("");
    setShowPaymentsToAdmin(true);
    setEditItem(null); setShowAdd(true);
  };
  const openEdit = (b: Branch) => {
    setName(b.name); setCity(b.city); setAddress(b.address);
    setWaPhone(b.wa_numbers?.[0] ?? "");
    setLat(b.lat?.toString() ?? ""); setLng(b.lng?.toString() ?? "");
    setBankName(b.bank_name ?? ""); setBankAccount(b.bank_account ?? ""); setBankHolder(b.bank_holder ?? "");
    setShowPaymentsToAdmin(b.show_payments_to_admin ?? true);
    setEditItem(b); setShowAdd(true);
  };

  const save = async () => {
    if (!name || !city) return toast.error(t("owner.branches.nameCityRequired"));
    setSaving(true);
    const cleanWa = waPhone.trim() ? [waPhone.trim()] : [];
    const bankFields = {
      bank_name: bankName.trim() || null,
      bank_account: bankAccount.trim() || null,
      bank_holder: bankHolder.trim() || null,
    };
    const geoFields = {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
    };
    if (editItem) {
      const { error } = await supabase.from("branches").update({ name, city, address, wa_numbers: cleanWa, show_payments_to_admin: showPaymentsToAdmin, ...bankFields, ...geoFields }).eq("id", editItem.id);
      if (error) { toast.error(t("owner.branches.saveFailed"), error.message); setSaving(false); return; }
      toast.success(t("owner.branches.updated"));
      logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: editItem.id, entityLabel: name, action: "update", label: t("owner.branches.activityUpdated", { name }) });
    } else {
      const { data: inserted, error } = await supabase.from("branches").insert({ name, city, address, wa_numbers: cleanWa, status: "active", show_payments_to_admin: showPaymentsToAdmin, ...bankFields, ...geoFields }).select("id").single();
      if (error) { toast.error(t("owner.branches.createFailed"), error.message); setSaving(false); return; }
      toast.success(t("owner.branches.created"));
      logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: inserted?.id ?? "new", entityLabel: name, action: "create", label: t("owner.branches.activityCreated", { name, city }) });
    }
    setSaving(false);
    setShowAdd(false);
    onRefresh();
  };

  const archive = async (b: Branch) => {
    const yes = await confirm({ title: tNode("owner.branches.archiveConfirmTitle", { name: b.name }), body: t("owner.branches.archiveConfirmBody") });
    if (!yes) return;
    const { error } = await supabase.from("branches").update({ status: "archived" }).eq("id", b.id);
    if (error) return toast.error(t("owner.branches.archiveFailed"), error.message);
    toast.success(t("owner.branches.archived"));
    logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: b.id, entityLabel: b.name, action: "archive", label: t("owner.branches.activityArchived", { name: b.name }) });
    onRefresh();
  };

  const unarchive = async (b: Branch) => {
    const yes = await confirm({
      title: tNode("owner.branches.unarchiveConfirmTitle", { name: b.name }),
      body: t("owner.branches.unarchiveConfirmBody"),
      confirmLabel: t("owner.branches.unarchiveBtn"),
    });
    if (!yes) return;
    const { error } = await supabase.from("branches").update({ status: "active" }).eq("id", b.id);
    if (error) return toast.error(t("owner.branches.unarchiveFailed"), error.message);
    toast.success(t("owner.branches.unarchived"));
    logActivity(supabase, { userId, userRole: "owner", userName, entityType: "branches", entityId: b.id, entityLabel: b.name, action: "restore", label: t("owner.branches.activityUnarchived", { name: b.name }) });
    onRefresh();
  };

  const deleteBranch = async (b: Branch) => {
    const yes = await confirm({
      title: tNode("owner.branches.deleteConfirmTitle", { name: b.name }),
      body: t("owner.branches.deleteConfirmBody"),
      danger: true,
    });
    if (!yes) return;

    const res = await fetch(`/api/owner/branches/${b.id}`, { method: "DELETE" });
    const json = await res.json() as { error?: string; deleted_auth_users?: number };

    if (!res.ok) return toast.error(t("owner.branches.deleteFailed"), json.error ?? "Unknown error");
    toast.success(tNode("owner.branches.deleted", { name: b.name, count: json.deleted_auth_users ?? 0 }));
    onRefresh();
  };

  const activeCount = branches.filter(b => b.status !== "archived").length;
  const archivedCount = branches.filter(b => b.status === "archived").length;

  const filteredBranches = useMemo(() => {
    if (filterTab === "active") return branches.filter(b => b.status !== "archived");
    if (filterTab === "archived") return branches.filter(b => b.status === "archived");
    return branches;
  }, [branches, filterTab]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl">{t("owner.branches.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("owner.branches.pageSub")}</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={openAdd}>{t("owner.branches.addBranch")}</Btn>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-paper-tint rounded-xl w-fit border border-line">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
            filterTab === "all" ? "bg-white shadow-card text-ocean-700 font-semibold" : "text-ink-mute hover:text-ink"
          )}
        >
          {t("owner.branches.tabAll")} ({branches.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
            filterTab === "active" ? "bg-white shadow-card text-ocean-700 font-semibold" : "text-ink-mute hover:text-ink"
          )}
        >
          {t("owner.branches.tabActive")} ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("archived")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
            filterTab === "archived" ? "bg-white shadow-card text-amber-700 font-semibold" : "text-ink-mute hover:text-ink"
          )}
        >
          {t("owner.branches.tabArchived")} ({archivedCount})
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {filteredBranches.map((b) => {
          const isArchived = b.status === "archived";
          return (
            <Card key={b.id} padded={false} className={cn("overflow-hidden transition-all", isArchived && "border-amber-200 bg-paper-tint/30")}>
              <div className={cn("h-32 relative", isArchived ? "bg-gradient-to-br from-slate-700 to-slate-800" : "bg-gradient-to-br from-ocean-700 to-ocean-500")}>
                <div className="caustics absolute inset-0 opacity-20" />
                <div className="absolute inset-0 grid-faint opacity-15" />
                <div className="relative p-5 h-full flex items-end justify-between text-white">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">{t("owner.branches.branchLabel")}</div>
                    <div className="font-display font-bold text-xl"><NoTranslate>{b.name}</NoTranslate></div>
                  </div>
                  <div>
                    {isArchived ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
                        {t("owner.branches.statusArchived")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ok-500/25 text-ok-200 border border-ok-400/40 uppercase tracking-wider">
                        {t("owner.branches.statusActive")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-sm text-ink-mute">
                  <Icon name="pin" className={cn("w-4 h-4", isArchived ? "text-slate-400" : "text-ocean-500")} />
                  <span className="truncate"><NoTranslate>{b.address || b.city}</NoTranslate></span>
                </div>
                {b.lat && b.lng && (
                  <div className="mt-1">
                    <a
                      href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-ocean-600 hover:text-ocean-800 font-semibold"
                    >
                      <Icon name="link" className="w-3 h-3" />
                      Buka di Google Maps
                    </a>
                  </div>
                )}
                {b.bank_name && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-mute">
                    <Icon name="card" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono"><NoTranslate>{b.bank_name}</NoTranslate> · <NoTranslate>{b.bank_account}</NoTranslate></span>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-paper-tint"><div className="font-display font-bold text-base text-ink">{b.member_count ?? 0}</div><div className="text-[9px] uppercase tracking-wider font-bold text-ink-faint">{t("owner.branches.memberStat")}</div></div>
                  <div className="p-2 rounded-xl bg-paper-tint"><div className="font-display font-bold text-base text-ink">{b.coach_count ?? 0}</div><div className="text-[9px] uppercase tracking-wider font-bold text-ink-faint">{t("owner.branches.coachStat")}</div></div>
                  <div className="p-2 rounded-xl bg-paper-tint"><div className="font-display font-bold text-base text-ink">{b.staff_count ?? 0}</div><div className="text-[9px] uppercase tracking-wider font-bold text-ink-faint">Staff</div></div>
                  <div className="p-2 rounded-xl bg-paper-tint"><div className="font-display font-bold text-base text-ink">{b.class_count ?? 0}</div><div className="text-[9px] uppercase tracking-wider font-bold text-ink-faint">{t("owner.branches.classStat")}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn variant="primary" size="sm" icon="grid" onClick={() => openAdminPanel(b)}>{t("owner.branches.openAdminPanel")}</Btn>
                  <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEdit(b)}>{t("common.actions.edit")}</Btn>
                  {isArchived ? (
                    <Btn variant="outline" size="sm" icon="refresh" className="text-ok-700 hover:bg-ok-50 border-ok-300 font-bold" onClick={() => unarchive(b)}>
                      {t("owner.branches.unarchiveBtn")}
                    </Btn>
                  ) : (
                    <Btn variant="ghost" size="sm" icon="archive" onClick={() => archive(b)}>
                      {t("owner.branches.archiveBtn")}
                    </Btn>
                  )}
                  <Btn variant="danger" size="sm" icon="trash" onClick={() => deleteBranch(b)}>{t("common.actions.delete")}</Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredBranches.length === 0 && (
          <div className="lg:col-span-3 py-12 text-center text-ink-mute text-sm border-2 border-dashed border-line rounded-2xl">
            {filterTab === "archived" ? "No archived centers." : "No centers yet."}
          </div>
        )}
        <button onClick={openAdd} className="rounded-2xl border-2 border-dashed border-line hover:border-ocean-300 hover:bg-ocean-50/40 transition flex flex-col items-center justify-center min-h-[280px] text-ink-mute hover:text-ocean-600 group">
          <span className="w-14 h-14 rounded-2xl bg-paper-tint group-hover:bg-white flex items-center justify-center mb-3">
            <Icon name="plus" className="w-6 h-6" />
          </span>
          <div className="font-semibold">{t("owner.branches.addNewBranch")}</div>
        </button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editItem ? t("owner.branches.editModalTitle") : t("owner.branches.addModalTitle")} size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={save} disabled={saving}>{saving ? t("common.actions.saving") : t("common.actions.save")}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("owner.branches.fieldName")} required><Input value={name} onChange={e => setName(e.target.value)} placeholder={t("owner.branches.fieldNamePlaceholder")} /></Field>
            <Field label={t("owner.branches.fieldCity")} required><Input value={city} onChange={e => setCity(e.target.value)} placeholder={t("owner.branches.fieldCityPlaceholder")} /></Field>
          </div>
          <Field label={t("owner.branches.fieldAddress")}><Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("owner.branches.fieldAddressPlaceholder")} /></Field>

          {/* Google Maps Location Picker */}
          <Field label="Center Location & Map Coordinates" hint="Search for a location name or drag the pin on the map to set coordinates">
            <MapPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
              onSelectAddress={(addr) => {
                if (!address) setAddress(addr);
              }}
              height={220}
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" className="font-mono text-xs" />
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" className="font-mono text-xs" />
            </div>
          </Field>

          <Field label={t("owner.branches.fieldWaPhone")} hint={t("owner.branches.fieldWaPhoneHint")}>
            <Input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder={t("owner.branches.fieldWaPhonePlaceholder")} className="font-mono" />
          </Field>
          <Field label={t("owner.branches.fieldBankInfo")} hint={t("owner.branches.fieldBankInfoHint")}>
            <div className="space-y-2">
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder={t("owner.branches.fieldBankName")} />
              <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder={t("owner.branches.fieldBankAccount")} className="font-mono" />
              <Input value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder={t("owner.branches.fieldBankHolder")} />
            </div>
          </Field>
          <Field label={t("owner.branches.fieldShowPaymentsToAdmin")} hint={t("owner.branches.fieldShowPaymentsToAdminHint")}>
            <Switch checked={showPaymentsToAdmin} onChange={setShowPaymentsToAdmin} label={showPaymentsToAdmin ? t("owner.branches.showPaymentsOn") : t("owner.branches.showPaymentsOff")} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Classes({ branches }: { branches: Branch[] }) {
  return <OwnerClassesMaster branches={branches} />;
}


interface TarifClassRow {
  id: string; name: string; branch_id: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null;
  branch?: { name: string } | null;
}

interface TarifCoachRow {
  id: string;
  full_name: string;
  branchIds: string[];
  classCount: number;
  extraRate: number | null;
  hasIncompleteRate: boolean;
}

interface RaporLevel {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  all_classes: boolean;
}

interface ClassOption { id: string; name: string; branch_id: string | null; branch_name: string | null; }

interface LevelCriterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}

interface LevelDistanceRow { id: string; distance: number; sort_order: number }
interface LevelStrokeRow { id: string; name: string; sort_order: number }
interface BestTimeTargetRow { id: string; stroke_id: string; distance_id: string; target_time_seconds: number | null }

function OwnerRaporLevels() {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [levels, setLevels] = useState<RaporLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  const [criteriaLevel, setCriteriaLevel] = useState<RaporLevel | null>(null);
  const [bestTimeLevel, setBestTimeLevel] = useState<RaporLevel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("rapor_levels").select("id, name, sort_order, active, all_classes").order("sort_order");
    setLevels((data ?? []) as RaporLevel[]);
    setLoading(false);
  }, [supabase]);

  // ── Class scope ──────────────────────────────────────────────────────────────
  const [classScopeLevel, setClassScopeLevel] = useState<RaporLevel | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  const loadClassOptions = useCallback(async () => {
    const { data } = await supabase.from("classes").select("id, name, branch_id, branch:branches(name)").eq("status", "active").order("branch_id").order("name");
    setClassOptions((data ?? []).map(c => ({ id: c.id, name: c.name, branch_id: c.branch_id, branch_name: (c.branch as unknown as { name: string } | null)?.name ?? null })));
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); loadClassOptions(); }, [load, loadClassOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openClassScope = async (lvl: RaporLevel) => {
    setClassScopeLevel(lvl);
    const { data } = await supabase.from("rapor_level_classes").select("class_id").eq("level_id", lvl.id);
    setSelectedClassIds(new Set((data ?? []).map(r => r.class_id)));
  };

  const setAllClasses = async (value: boolean) => {
    if (!classScopeLevel) return;
    const { error } = await supabase.from("rapor_levels").update({ all_classes: value }).eq("id", classScopeLevel.id);
    if (error) return toast.error(t("owner.raporLevels.saveFailed"), error.message);
    setClassScopeLevel(prev => prev ? { ...prev, all_classes: value } : prev);
    setLevels(prev => prev.map(l => l.id === classScopeLevel.id ? { ...l, all_classes: value } : l));
  };

  const toggleClassSelection = async (classId: string) => {
    if (!classScopeLevel) return;
    const checked = selectedClassIds.has(classId);
    if (checked) {
      await supabase.from("rapor_level_classes").delete().eq("level_id", classScopeLevel.id).eq("class_id", classId);
      setSelectedClassIds(prev => { const next = new Set(prev); next.delete(classId); return next; });
    } else {
      await supabase.from("rapor_level_classes").insert({ level_id: classScopeLevel.id, class_id: classId });
      setSelectedClassIds(prev => new Set(prev).add(classId));
    }
  };

  const addLevel = async () => {
    if (!newName.trim()) return toast.error(t("owner.raporLevels.nameRequired"));
    setCreating(true);
    const { error } = await supabase.from("rapor_levels").insert({
      name: newName.trim(), sort_order: levels.length, active: true,
    });
    setCreating(false);
    if (error) return toast.error(t("owner.raporLevels.addFailed"), error.message);
    toast.success(t("owner.raporLevels.added"));
    setNewName("");
    load();
  };

  const saveRename = async () => {
    if (!renaming || !renaming.name.trim()) return toast.error(t("owner.raporLevels.nameRequired"));
    const { error } = await supabase.from("rapor_levels").update({ name: renaming.name.trim() }).eq("id", renaming.id);
    if (error) return toast.error(t("owner.raporLevels.saveFailed"), error.message);
    toast.success(t("owner.raporLevels.renamed"));
    setRenaming(null);
    load();
  };

  const toggleActive = async (lvl: RaporLevel) => {
    const { error } = await supabase.from("rapor_levels").update({ active: !lvl.active }).eq("id", lvl.id);
    if (error) return toast.error(t("owner.raporLevels.statusFailed"), error.message);
    setLevels(prev => prev.map(l => l.id === lvl.id ? { ...l, active: !l.active } : l));
  };

  const deleteLevel = async (lvl: RaporLevel) => {
    const yes = await confirm({ body: tNode("owner.raporLevels.deleteConfirmBody", { name: lvl.name }) });
    if (!yes) return;
    const { error } = await supabase.from("rapor_levels").delete().eq("id", lvl.id);
    if (error) return toast.error(t("owner.raporLevels.deleteFailed"), error.message);
    toast.success(t("owner.raporLevels.deleted"));
    load();
  };

  const move = async (lvl: RaporLevel, direction: "up" | "down") => {
    const idx = levels.findIndex(l => l.id === lvl.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= levels.length) return;
    const other = levels[swapIdx];
    setReordering(lvl.id);
    await Promise.all([
      supabase.from("rapor_levels").update({ sort_order: other.sort_order }).eq("id", lvl.id),
      supabase.from("rapor_levels").update({ sort_order: lvl.sort_order }).eq("id", other.id),
    ]);
    setReordering(null);
    load();
  };

  // ── Criteria ───────────────────────────────────────────────────────────────
  const [criteria, setCriteria] = useState<LevelCriterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ label: "", kind: "score_10", options: [] as string[] });
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<{ id: string; label: string; kind: string; options: string[] } | null>(null);
  const [bulkKind, setBulkKind] = useState("score_10");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const kindLabel: Record<string, string> = {
    score_10: t("owner.raporLevels.kindLabel.score_10"),
    score_100: t("owner.raporLevels.kindLabel.score_100"),
    choice: t("owner.raporLevels.kindLabel.choice"),
    text: t("owner.raporLevels.kindLabel.text"),
  };

  const loadCriteria = useCallback(async (levelId: string) => {
    setLoadingCriteria(true);
    const { data } = await supabase.from("rapor_level_criteria").select("id, label, kind, options, sort_order").eq("level_id", levelId).order("sort_order");
    setCriteria((data ?? []) as LevelCriterion[]);
    setLoadingCriteria(false);
  }, [supabase]);

  const openCriteria = (lvl: RaporLevel) => {
    setCriteriaLevel(lvl);
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    setEditingCriterion(null);
    loadCriteria(lvl.id);
  };

  const addCriterion = async () => {
    if (!criteriaLevel || !criterionForm.label) return toast.error(t("owner.raporLevels.labelRequired"));
    setSavingCriterion(true);
    const opts = criterionForm.kind === "choice" ? criterionForm.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: criterionForm.label, kind: criterionForm.kind,
      options: opts, sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error(t("owner.raporLevels.criterionSaveFailed"), error.message);
    toast.success(t("owner.raporLevels.criterionAdded"));
    setCriterionForm({ label: "", kind: "score_10", options: [] });
    loadCriteria(criteriaLevel.id);
  };

  const deleteCriterion = async (id: string) => {
    const yes = await confirm({ body: t("owner.raporLevels.criterionDeleteConfirmBody") });
    if (!yes) return;
    await supabase.from("rapor_level_criteria").delete().eq("id", id);
    setCriteria(prev => prev.filter(c => c.id !== id));
    toast.success(t("owner.raporLevels.criterionDeleted"));
  };

  const updateCriterion = async () => {
    if (!editingCriterion || !editingCriterion.label) return toast.error(t("owner.raporLevels.labelRequired"));
    const opts = editingCriterion.kind === "choice" ? editingCriterion.options.filter(Boolean) : null;
    const { error } = await supabase.from("rapor_level_criteria").update({ label: editingCriterion.label, kind: editingCriterion.kind, options: opts }).eq("id", editingCriterion.id);
    if (error) return toast.error(t("owner.raporLevels.criterionSaveFailed"), error.message);
    setCriteria(prev => prev.map(c => c.id === editingCriterion.id ? { ...c, label: editingCriterion.label, kind: editingCriterion.kind, options: opts } : c));
    setEditingCriterion(null);
    toast.success(t("owner.raporLevels.criterionUpdated"));
  };

  const duplicateCriterion = async (cr: LevelCriterion) => {
    if (!criteriaLevel) return;
    setSavingCriterion(true);
    const { error } = await supabase.from("rapor_level_criteria").insert({
      level_id: criteriaLevel.id, label: cr.label, kind: cr.kind,
      options: cr.options ?? [], sort_order: criteria.length,
    });
    setSavingCriterion(false);
    if (error) return toast.error(t("owner.raporLevels.duplicateFailed"), error.message);
    toast.success(t("owner.raporLevels.criterionDuplicated"));
    loadCriteria(criteriaLevel.id);
  };

  const applyBulkKind = async () => {
    if (!criteriaLevel || criteria.length === 0) return;
    const yes = await confirm({ body: t("owner.raporLevels.bulkConfirmBody", { count: criteria.length, kind: kindLabel[bulkKind] }) });
    if (!yes) return;
    setApplyingBulk(true);
    const opts = bulkKind === "choice" ? ["Sangat Baik", "Baik", "Cukup", "Perlu Latihan"] : null;
    await Promise.all(criteria.map(cr => supabase.from("rapor_level_criteria").update({ kind: bulkKind, options: opts }).eq("id", cr.id)));
    setApplyingBulk(false);
    loadCriteria(criteriaLevel.id);
    toast.success(t("owner.raporLevels.bulkUpdated"));
  };

  // ── Personal Best Time matrix (distances x strokes x per-cell target) ───────
  const [distances, setDistances] = useState<LevelDistanceRow[]>([]);
  const [strokes, setStrokes] = useState<LevelStrokeRow[]>([]);
  const [targets, setTargets] = useState<BestTimeTargetRow[]>([]);
  const [loadingBestTimes, setLoadingBestTimes] = useState(false);
  const [newDistance, setNewDistance] = useState("");
  const [addingDistance, setAddingDistance] = useState(false);
  const [newStroke, setNewStroke] = useState("");
  const [addingStroke, setAddingStroke] = useState(false);
  const [cellDrafts, setCellDrafts] = useState<Map<string, string>>(new Map());
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const targetKey = (strokeId: string, distanceId: string) => `${strokeId}:${distanceId}`;

  const loadBestTimeMatrix = useCallback(async (levelId: string) => {
    setLoadingBestTimes(true);
    const [{ data: d }, { data: s }, { data: tg }] = await Promise.all([
      supabase.from("rapor_level_distances").select("id, distance, sort_order").eq("level_id", levelId).order("sort_order"),
      supabase.from("rapor_level_strokes").select("id, name, sort_order").eq("level_id", levelId).order("sort_order"),
      supabase.from("rapor_level_best_time_targets").select("id, stroke_id, distance_id, target_time_seconds").eq("level_id", levelId),
    ]);
    setDistances((d ?? []) as LevelDistanceRow[]);
    setStrokes((s ?? []) as LevelStrokeRow[]);
    setTargets((tg ?? []) as BestTimeTargetRow[]);
    setCellDrafts(new Map());
    setLoadingBestTimes(false);
  }, [supabase]);

  const openBestTimes = (lvl: RaporLevel) => {
    setBestTimeLevel(lvl);
    setNewDistance("");
    setNewStroke("");
    loadBestTimeMatrix(lvl.id);
  };

  const addDistance = async () => {
    if (!bestTimeLevel) return;
    const distance = parseInt(newDistance);
    if (!newDistance.trim() || isNaN(distance) || distance <= 0) return toast.error(t("owner.raporLevels.distanceRequired"));
    setAddingDistance(true);
    const { error } = await supabase.from("rapor_level_distances").insert({
      level_id: bestTimeLevel.id, distance, sort_order: distances.length,
    });
    setAddingDistance(false);
    if (error) {
      if (error.code === "23505") return toast.error(t("owner.raporLevels.distanceDuplicate"));
      return toast.error(t("owner.raporLevels.addRowFailed"), error.message);
    }
    toast.success(t("owner.raporLevels.rowAdded"));
    setNewDistance("");
    loadBestTimeMatrix(bestTimeLevel.id);
  };

  const deleteDistance = async (id: string) => {
    const yes = await confirm({ body: t("owner.raporLevels.deleteDistanceConfirmBody") });
    if (!yes) return;
    await supabase.from("rapor_level_distances").delete().eq("id", id);
    if (bestTimeLevel) loadBestTimeMatrix(bestTimeLevel.id);
    toast.success(t("owner.raporLevels.rowDeleted"));
  };

  const addStroke = async () => {
    if (!bestTimeLevel) return;
    const name = newStroke.trim();
    if (!name) return toast.error(t("owner.raporLevels.strokeRequired"));
    setAddingStroke(true);
    const { error } = await supabase.from("rapor_level_strokes").insert({
      level_id: bestTimeLevel.id, name, sort_order: strokes.length,
    });
    setAddingStroke(false);
    if (error) {
      if (error.code === "23505") return toast.error(t("owner.raporLevels.strokeDuplicate"));
      return toast.error(t("owner.raporLevels.addRowFailed"), error.message);
    }
    toast.success(t("owner.raporLevels.rowAdded"));
    setNewStroke("");
    loadBestTimeMatrix(bestTimeLevel.id);
  };

  const deleteStroke = async (id: string) => {
    const yes = await confirm({ body: t("owner.raporLevels.deleteStrokeConfirmBody") });
    if (!yes) return;
    await supabase.from("rapor_level_strokes").delete().eq("id", id);
    if (bestTimeLevel) loadBestTimeMatrix(bestTimeLevel.id);
    toast.success(t("owner.raporLevels.rowDeleted"));
  };

  const saveTargetCell = async (strokeId: string, distanceId: string, rawValue: string) => {
    if (!bestTimeLevel) return;
    const key = targetKey(strokeId, distanceId);
    const existing = targets.find(tg => tg.stroke_id === strokeId && tg.distance_id === distanceId);
    const value = rawValue.trim() ? parseFloat(rawValue) : null;
    setSavingCell(key);
    if (value == null) {
      if (existing) await supabase.from("rapor_level_best_time_targets").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("rapor_level_best_time_targets").update({ target_time_seconds: value }).eq("id", existing.id);
    } else {
      await supabase.from("rapor_level_best_time_targets").insert({
        level_id: bestTimeLevel.id, stroke_id: strokeId, distance_id: distanceId, target_time_seconds: value,
      });
    }
    setSavingCell(null);
    loadBestTimeMatrix(bestTimeLevel.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">{t("owner.raporLevels.pageTitle")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{t("owner.raporLevels.pageSub")}</p>
      </div>

      <Card padded={false}>
        <div className="p-4 sm:p-5 border-b border-line flex items-center gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("owner.raporLevels.namePlaceholder")} className="flex-1" />
          <Btn variant="primary" icon="plus" onClick={addLevel} disabled={creating}>{creating ? t("owner.raporLevels.adding") : t("owner.raporLevels.addLevel")}</Btn>
        </div>

        {loading ? (
          <div className="py-10 text-center text-ink-mute text-sm">{t("owner.raporLevels.loading")}</div>
        ) : levels.length === 0 ? (
          <div className="py-10 text-center text-ink-mute text-sm">{t("owner.raporLevels.empty")}</div>
        ) : (
          <div className="divide-y divide-line">
            {levels.map((lvl, i) => (
              <div key={lvl.id} className="flex items-center gap-3 p-4">
                <div className="flex flex-col shrink-0">
                  <button type="button" disabled={i === 0 || reordering === lvl.id} onClick={() => move(lvl, "up")}
                    className="w-6 h-5 text-xs text-ink-faint hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-ink-faint">↑</button>
                  <button type="button" disabled={i === levels.length - 1 || reordering === lvl.id} onClick={() => move(lvl, "down")}
                    className="w-6 h-5 text-xs text-ink-faint hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-ink-faint">↓</button>
                </div>

                {renaming?.id === lvl.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input value={renaming.name} onChange={e => setRenaming(v => v ? { ...v, name: e.target.value } : v)} className="flex-1" />
                    <Btn variant="primary" size="sm" onClick={saveRename}>{t("owner.raporLevels.saveBtn")}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setRenaming(null)}>{t("owner.raporLevels.cancelBtn")}</Btn>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm"><NoTranslate>{lvl.name}</NoTranslate></div>
                      {!lvl.active && <div className="text-xs text-ink-faint">{t("owner.raporLevels.inactive")}</div>}
                    </div>
                    <Btn variant="ghost" size="sm" icon="book" onClick={() => openCriteria(lvl)}>{t("owner.raporLevels.criteriaBtn")}</Btn>
                    <Btn variant="ghost" size="sm" icon="target" onClick={() => openBestTimes(lvl)}>{t("owner.raporLevels.timeBtn")}</Btn>
                    <Btn variant="ghost" size="sm" icon="users" onClick={() => openClassScope(lvl)}>{t("owner.raporLevels.classScopeBtn")}</Btn>
                    <button onClick={() => setRenaming({ id: lvl.id, name: lvl.name })} title={t("owner.raporLevels.renameTitle")}
                      className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name="edit" className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive(lvl)} title={lvl.active ? t("owner.raporLevels.deactivateTitle") : t("owner.raporLevels.activateTitle")}
                      className="w-8 h-8 rounded-lg hover:bg-paper-tint text-ink-mute hover:text-ocean-600 flex items-center justify-center"><Icon name={lvl.active ? "archive" : "check"} className="w-4 h-4" /></button>
                    <button onClick={() => deleteLevel(lvl)} title={t("owner.raporLevels.deleteTitle")}
                      className="w-8 h-8 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center"><Icon name="x" className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!criteriaLevel} onClose={() => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); }}
        title={tNode("owner.raporLevels.criteriaModalTitle", { level: criteriaLevel?.name ?? "" })} size="lg"
        footer={<Btn variant="ghost" onClick={() => { setCriteriaLevel(null); setCriterionForm({ label: "", kind: "score_10", options: [] }); setEditingCriterion(null); }}>{t("common.actions.close")}</Btn>}>
        <div className="space-y-5">
          {loadingCriteria ? <div className="text-ink-mute text-sm text-center py-6">{t("owner.raporLevels.criteriaLoading")}</div> : (
            <>
              {criteria.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 bg-paper-tint rounded-xl border border-line">
                    <span className="text-xs text-ink-mute shrink-0">{t("owner.raporLevels.changeAllTo")}</span>
                    <select value={bulkKind} onChange={e => setBulkKind(e.target.value)}
                      className="flex-1 text-xs border border-line rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500">
                      <option value="score_10">{t("owner.raporLevels.kindLabel.score_10")}</option>
                      <option value="score_100">{t("owner.raporLevels.kindLabel.score_100")}</option>
                      <option value="choice">{t("owner.raporLevels.kindLabel.choice")}</option>
                      <option value="text">{t("owner.raporLevels.kindLabel.text")}</option>
                    </select>
                    <Btn variant="outline" size="sm" onClick={applyBulkKind} disabled={applyingBulk}>{applyingBulk ? t("owner.raporLevels.changingAll") : t("owner.raporLevels.applyBtn")}</Btn>
                  </div>

                  {criteria.map((cr, i) => (
                    <div key={cr.id} className="rounded-xl border border-line overflow-hidden">
                      {editingCriterion?.id === cr.id ? (
                        <div className="p-3 space-y-2 bg-ocean-50/40">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <Field label={t("owner.raporLevels.fieldLabel")}><Input value={editingCriterion.label} onChange={e => setEditingCriterion(v => v ? { ...v, label: e.target.value } : v)} /></Field>
                            <Field label={t("owner.raporLevels.fieldKind")}>
                              <Select value={editingCriterion.kind} onChange={e => setEditingCriterion(v => v ? { ...v, kind: e.target.value } : v)}>
                                <option value="score_10">{t("owner.raporLevels.kindLabel.score_10")}</option>
                                <option value="score_100">{t("owner.raporLevels.kindLabel.score_100")}</option>
                                <option value="choice">{t("owner.raporLevels.kindLabel.choice")}</option>
                                <option value="text">{t("owner.raporLevels.kindLabel.text")}</option>
                              </Select>
                            </Field>
                          </div>
                          {editingCriterion.kind === "choice" && (
                            <Field label={t("owner.raporLevels.fieldOptions")}>
                              <div className="space-y-1.5">
                                {editingCriterion.options.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                                    <Input value={opt} onChange={e => setEditingCriterion(v => { if (!v) return v; const opts = [...v.options]; opts[idx] = e.target.value; return { ...v, options: opts }; })} placeholder={t("owner.raporLevels.optionPlaceholder", { number: idx + 1 })} className="flex-1" />
                                    <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: v.options.filter((_, i) => i !== idx) } : v)} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => setEditingCriterion(v => v ? { ...v, options: [...v.options, ""] } : v)} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                                  <Icon name="plus" className="w-3.5 h-3.5" />{t("owner.raporLevels.addOption")}
                                </button>
                              </div>
                            </Field>
                          )}
                          <div className="flex gap-2">
                            <Btn variant="primary" size="sm" onClick={updateCriterion}>{t("owner.raporLevels.saveBtn")}</Btn>
                            <Btn variant="ghost" size="sm" onClick={() => setEditingCriterion(null)}>{t("owner.raporLevels.cancelBtn")}</Btn>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 hover:bg-paper-tint">
                          <span className="w-6 h-6 rounded-full bg-ocean-50 text-ocean-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-ink text-sm"><NoTranslate>{cr.label}</NoTranslate></div>
                            <div className="text-xs text-ink-mute">{kindLabel[cr.kind] ?? <NoTranslate>{cr.kind}</NoTranslate>}{cr.options && ` · ${cr.options.join(", ")}`}</div>
                          </div>
                          <button onClick={() => duplicateCriterion(cr)} disabled={savingCriterion}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0 disabled:opacity-50" title={t("owner.raporLevels.duplicateTitle")}>
                            <Icon name="copy" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCriterion({ id: cr.id, label: cr.label, kind: cr.kind, options: cr.options ?? [] })}
                            className="w-7 h-7 rounded-lg hover:bg-ocean-50 text-ink-faint hover:text-ocean-600 flex items-center justify-center shrink-0" title={t("owner.raporLevels.editTitle")}>
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCriterion(cr.id)}
                            className="w-7 h-7 rounded-lg hover:bg-danger-50 text-ink-faint hover:text-danger-500 flex items-center justify-center shrink-0" title={t("owner.raporLevels.deleteTitle")}>
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-mute">{t("owner.raporLevels.criteriaEmpty")}</p>
              )}

              <div className="border-t border-line pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.addNewCriterionTitle")}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label={t("owner.raporLevels.fieldLabel")} required><Input value={criterionForm.label} onChange={e => setCriterionForm(f => ({ ...f, label: e.target.value }))} placeholder={t("owner.raporLevels.fieldLabelPlaceholder")} /></Field>
                  <Field label={t("owner.raporLevels.fieldKind")}>
                    <Select value={criterionForm.kind} onChange={e => setCriterionForm(f => ({ ...f, kind: e.target.value }))}>
                      <option value="score_10">{t("owner.raporLevels.kindLabel.score_10")}</option>
                      <option value="score_100">{t("owner.raporLevels.kindLabel.score_100")}</option>
                      <option value="choice">{t("owner.raporLevels.kindLabel.choice")}</option>
                      <option value="text">{t("owner.raporLevels.kindLabel.text")}</option>
                    </Select>
                  </Field>
                </div>
                {criterionForm.kind === "choice" && (
                  <Field label={t("owner.raporLevels.fieldOptions")}>
                    <div className="space-y-1.5">
                      {criterionForm.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-ink-mute text-sm w-5 text-right shrink-0">{idx + 1}.</span>
                          <Input value={opt} onChange={e => setCriterionForm(f => { const opts = [...f.options]; opts[idx] = e.target.value; return { ...f, options: opts }; })} placeholder={t("owner.raporLevels.optionPlaceholder", { number: idx + 1 })} className="flex-1" />
                          <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))} className="p-1 rounded text-ink-mute hover:text-danger-600 hover:bg-danger-50 transition-colors"><Icon name="x" className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setCriterionForm(f => ({ ...f, options: [...f.options, ""] }))} className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium mt-1">
                        <Icon name="plus" className="w-3.5 h-3.5" />{t("owner.raporLevels.addOption")}
                      </button>
                    </div>
                  </Field>
                )}
                <Btn variant="primary" size="sm" icon="plus" onClick={addCriterion} disabled={savingCriterion}>{savingCriterion ? t("owner.raporLevels.savingCriterion") : t("owner.raporLevels.addCriterion")}</Btn>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!bestTimeLevel} onClose={() => setBestTimeLevel(null)}
        title={tNode("owner.raporLevels.bestTimeModalTitle", { level: bestTimeLevel?.name ?? "" })} size="lg"
        footer={<Btn variant="ghost" onClick={() => setBestTimeLevel(null)}>{t("common.actions.close")}</Btn>}>
        <div className="space-y-6">
          <p className="text-xs text-ink-mute">{t("owner.raporLevels.bestTimeHint")}</p>
          {loadingBestTimes ? <div className="text-ink-mute text-sm text-center py-6">{t("owner.raporLevels.criteriaLoading")}</div> : (
            <>
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.distancesTitle")}</div>
                {distances.length === 0 && <p className="text-sm text-ink-mute">{t("owner.raporLevels.distancesEmpty")}</p>}
                <div className="flex flex-wrap gap-2">
                  {distances.map(d => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-ocean-50 text-ocean-700 text-sm font-semibold">
                      {d.distance}m
                      <button type="button" onClick={() => deleteDistance(d.id)} className="w-5 h-5 rounded-full hover:bg-danger-100 text-ocean-700 hover:text-danger-600 flex items-center justify-center">
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input inputMode="numeric" value={newDistance} onChange={e => setNewDistance(e.target.value)} placeholder={t("owner.raporLevels.addDistancePlaceholder")} className="max-w-[140px]" />
                  <Btn variant="outline" size="sm" icon="plus" onClick={addDistance} disabled={addingDistance}>{t("owner.raporLevels.addDistanceBtn")}</Btn>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.strokesTitle")}</div>
                {strokes.length === 0 && <p className="text-sm text-ink-mute">{t("owner.raporLevels.strokesEmpty")}</p>}
                <div className="flex flex-wrap gap-2">
                  {strokes.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-wave-50 text-wave-700 text-sm font-semibold">
                      <NoTranslate>{s.name}</NoTranslate>
                      <button type="button" onClick={() => deleteStroke(s.id)} className="w-5 h-5 rounded-full hover:bg-danger-100 text-wave-700 hover:text-danger-600 flex items-center justify-center">
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input value={newStroke} onChange={e => setNewStroke(e.target.value)} placeholder={t("owner.raporLevels.addStrokePlaceholder")} className="max-w-[220px]" />
                  <Btn variant="outline" size="sm" icon="plus" onClick={addStroke} disabled={addingStroke}>{t("owner.raporLevels.addStrokeBtn")}</Btn>
                </div>
              </div>

              <div className="space-y-2 border-t border-line pt-4">
                <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("owner.raporLevels.targetsTitle")}</div>
                <p className="text-xs text-ink-mute">{t("owner.raporLevels.targetsHint")}</p>
                {distances.length === 0 || strokes.length === 0 ? (
                  <p className="text-sm text-ink-mute">{t("owner.raporLevels.targetsEmptyNeedBoth")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 text-xs uppercase tracking-widest text-ink-faint font-bold border-b border-line">{t("owner.raporLevels.strokesTitle")}</th>
                          {distances.map(d => (
                            <th key={d.id} className="text-center p-2 text-xs uppercase tracking-widest text-ink-faint font-bold border-b border-line">{d.distance}m</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {strokes.map(s => (
                          <tr key={s.id}>
                            <td className="p-2 font-semibold text-ink border-b border-line"><NoTranslate>{s.name}</NoTranslate></td>
                            {distances.map(d => {
                              const key = targetKey(s.id, d.id);
                              const existing = targets.find(tg => tg.stroke_id === s.id && tg.distance_id === d.id);
                              const draft = cellDrafts.get(key);
                              const value = draft !== undefined ? draft : (existing?.target_time_seconds != null ? String(existing.target_time_seconds) : "");
                              return (
                                <td key={d.id} className="p-2 border-b border-line">
                                  <Input
                                    inputMode="decimal"
                                    value={value}
                                    placeholder={t("owner.raporLevels.targetPlaceholder")}
                                    disabled={savingCell === key}
                                    onChange={e => setCellDrafts(prev => new Map(prev).set(key, e.target.value))}
                                    onBlur={e => saveTargetCell(s.id, d.id, e.target.value)}
                                    className="text-center"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!classScopeLevel} onClose={() => setClassScopeLevel(null)}
        title={tNode("owner.raporLevels.classScopeModalTitle", { level: classScopeLevel?.name ?? "" })} size="md"
        footer={<Btn variant="ghost" onClick={() => setClassScopeLevel(null)}>{t("common.actions.close")}</Btn>}>
        {classScopeLevel && (
          <div className="space-y-4">
            <p className="text-xs text-ink-mute">{t("owner.raporLevels.classScopeHint")}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAllClasses(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${classScopeLevel.all_classes ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}>
                {t("owner.raporLevels.allClasses")}
              </button>
              <button type="button" onClick={() => setAllClasses(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${!classScopeLevel.all_classes ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}>
                {t("owner.raporLevels.specificClasses")}
              </button>
            </div>

            {!classScopeLevel.all_classes && (
              classOptions.length === 0 ? (
                <p className="text-sm text-ink-mute">{t("owner.raporLevels.classesEmpty")}</p>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-line border border-line rounded-xl">
                  {classOptions.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-paper-tint cursor-pointer">
                      <input type="checkbox" className="rounded border-line accent-ocean-600"
                        checked={selectedClassIds.has(c.id)} onChange={() => toggleClassSelection(c.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm"><NoTranslate>{c.name}</NoTranslate></div>
                        {c.branch_name && <div className="text-xs text-ink-mute"><NoTranslate>{c.branch_name}</NoTranslate></div>}
                      </div>
                    </label>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function SettingsTarif({ branches }: { branches: Branch[] }) {
  const { t } = useLocale();
  const toast = useToast();
  const supabase = createClient();

  const [coaches, setCoaches] = useState<TarifCoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);

  // Per-expanded-coach data
  const [expandedClasses, setExpandedClasses] = useState<TarifClassRow[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [generalRates, setGeneralRates] = useState<Record<string, string>>({});
  const [coachRates, setCoachRates] = useState<Record<string, string>>({});
  const [extraRateInput, setExtraRateInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    const [{ data: profileData }, { data: ccData }, { data: rateData }, { data: extraData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
      supabase.from("class_coaches").select("coach_id, class_id, classes(branch_id)"),
      supabase.from("coach_rates").select("class_id, coach_id"),
      supabase.from("coach_extra_rates").select("coach_id, rate_per_session"),
    ]);

    const ccRows = (ccData ?? []) as unknown as { coach_id: string; class_id: string; classes: { branch_id: string } | null }[];
    const rateRows = (rateData ?? []) as { class_id: string; coach_id: string | null }[];
    const extraMap = new Map((extraData ?? []).map((e: { coach_id: string; rate_per_session: number }) => [e.coach_id, e.rate_per_session]));

    const classesByCoach = new Map<string, Set<string>>();
    const branchesByCoach = new Map<string, Set<string>>();
    ccRows.forEach(r => {
      if (!classesByCoach.has(r.coach_id)) classesByCoach.set(r.coach_id, new Set());
      classesByCoach.get(r.coach_id)!.add(r.class_id);
      if (r.classes?.branch_id) {
        if (!branchesByCoach.has(r.coach_id)) branchesByCoach.set(r.coach_id, new Set());
        branchesByCoach.get(r.coach_id)!.add(r.classes.branch_id);
      }
    });

    // classes that have at least a general rate
    const classesWithGeneralRate = new Set(rateRows.filter(r => !r.coach_id).map(r => r.class_id));
    // (classId, coachId) pairs with a specific override
    const specificRateKeys = new Set(rateRows.filter(r => r.coach_id).map(r => `${r.class_id}:${r.coach_id}`));

    const rows: TarifCoachRow[] = (profileData ?? []).map(p => {
      const myClassIds = Array.from(classesByCoach.get(p.id) ?? []);
      return {
        id: p.id,
        full_name: p.full_name,
        branchIds: Array.from(branchesByCoach.get(p.id) ?? []),
        classCount: myClassIds.length,
        extraRate: extraMap.get(p.id) ?? null,
        hasIncompleteRate: myClassIds.some(cid => !classesWithGeneralRate.has(cid) && !specificRateKeys.has(`${cid}:${p.id}`)),
      };
    });

    setCoaches(rows);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadCoaches(); }, [loadCoaches]);

  const filteredCoaches = useMemo(() => {
    let r = coaches;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c => c.full_name.toLowerCase().includes(q));
    }
    if (filterBranch !== "all") r = r.filter(c => c.branchIds.includes(filterBranch));
    if (filterStatus === "complete") r = r.filter(c => !c.hasIncompleteRate && c.classCount > 0);
    if (filterStatus === "incomplete") r = r.filter(c => c.hasIncompleteRate);
    if (filterStatus === "no_extra") r = r.filter(c => c.extraRate == null);
    return r;
  }, [coaches, search, filterBranch, filterStatus]);

  const toggleExpand = async (coachId: string) => {
    if (expandedCoachId === coachId) { setExpandedCoachId(null); return; }
    setExpandedCoachId(coachId);
    setLoadingExpanded(true);

    const { data: ccData } = await supabase
      .from("class_coaches")
      .select("class:classes(id, name, branch_id, schedule_days, time_start, time_end, branch:branches(name))")
      .eq("coach_id", coachId);
    const myClasses = ((ccData ?? []) as unknown as { class: TarifClassRow | null }[])
      .map(r => r.class).filter((c): c is TarifClassRow => !!c);
    setExpandedClasses(myClasses);

    const classIds = myClasses.map(c => c.id);
    if (classIds.length > 0) {
      const { data: rateData } = await supabase
        .from("coach_rates")
        .select("class_id, coach_id, rate_per_session")
        .in("class_id", classIds);
      const gen: Record<string, string> = {};
      const cch: Record<string, string> = {};
      (rateData as CoachRate[] ?? []).forEach(r => {
        if (!r.coach_id) gen[r.class_id] = String(r.rate_per_session ?? "");
        else if (r.coach_id === coachId) cch[`${r.class_id}:${coachId}`] = String(r.rate_per_session ?? "");
      });
      setGeneralRates(gen);
      setCoachRates(cch);
    } else {
      setGeneralRates({});
      setCoachRates({});
    }

    const { data: extraRow } = await supabase.from("coach_extra_rates").select("rate_per_session").eq("coach_id", coachId).maybeSingle();
    setExtraRateInput(extraRow ? String(extraRow.rate_per_session) : "");
    setLoadingExpanded(false);
  };

  const saveGeneral = async (classId: string) => {
    const val = Number(generalRates[classId]);
    if (!val || val <= 0) return toast.error(t("owner.ratesTarif.invalidRate"));
    const key = `gen:${classId}`;
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).is("coach_id", null).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate: val, rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: null, rate: val, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error(t("owner.ratesTarif.saveFailed"), error.message);
    toast.success(t("owner.ratesTarif.generalRateSaved"));
    loadCoaches();
  };

  const saveCoachRate = async (classId: string, coachId: string) => {
    const key = `spec:${classId}:${coachId}`;
    const rawVal = coachRates[`${classId}:${coachId}`];
    if (!rawVal || rawVal === "") {
      setSaving(key);
      await supabase.from("coach_rates").delete().eq("class_id", classId).eq("coach_id", coachId);
      setSaving(null);
      setCoachRates(prev => { const n = { ...prev }; delete n[`${classId}:${coachId}`]; return n; });
      toast.success(t("owner.ratesTarif.specificRateDeleted"));
      loadCoaches();
      return;
    }
    const val = Number(rawVal);
    if (!val || val <= 0) return toast.error(t("owner.ratesTarif.invalidRate"));
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate: val, rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: coachId, rate: val, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error(t("owner.ratesTarif.saveFailed"), error.message);
    toast.success(t("owner.ratesTarif.specificRateSaved"));
    loadCoaches();
  };

  const saveExtraRate = async (coachId: string) => {
    const val = Number(extraRateInput);
    if (!val || val <= 0) return toast.error(t("owner.ratesTarif.invalidExtraRate"));
    setSaving("extra");
    const { data: existing } = await supabase.from("coach_extra_rates").select("id").eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_extra_rates").update({ rate_per_session: val, updated_at: new Date().toISOString() }).eq("id", existing.id)
      : supabase.from("coach_extra_rates").insert({ coach_id: coachId, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error(t("owner.ratesTarif.saveFailed"), error.message);
    toast.success(t("owner.ratesTarif.extraRateSaved"));
    loadCoaches();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">{t("owner.ratesTarif.pageTitle")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{t("owner.ratesTarif.pageSub")}</p>
      </div>

      {/* Toolbar filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("owner.ratesTarif.searchPlaceholder")} className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-white focus:outline-none focus:ring-1 focus:ring-ocean-400" />
        </div>
        {branches.length > 1 && (
          <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="w-auto min-h-0 text-sm py-2">
            <option value="all">{t("owner.ratesTarif.allBranches")}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-auto min-h-0 text-sm py-2">
          <option value="all">{t("owner.ratesTarif.allStatus")}</option>
          <option value="complete">{t("owner.ratesTarif.statusComplete")}</option>
          <option value="incomplete">{t("owner.ratesTarif.statusIncomplete")}</option>
          <option value="no_extra">{t("owner.ratesTarif.statusNoExtra")}</option>
        </Select>
        <span className="text-xs text-ink-mute self-center ml-auto">{t("owner.ratesTarif.coachCount", { count: filteredCoaches.length })}</span>
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute text-sm">{t("owner.ratesTarif.loading")}</div>
        ) : filteredCoaches.length === 0 ? (
          <div className="p-10 text-center text-ink-mute text-sm">{t("owner.ratesTarif.empty")}</div>
        ) : (
          <div className="divide-y divide-line">
            {filteredCoaches.map(c => {
              const incomplete = c.hasIncompleteRate;
              const isExpanded = expandedCoachId === c.id;
              return (
                <div key={c.id}>
                  <button onClick={() => toggleExpand(c.id)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-paper-tint text-left">
                    <Avatar name={c.full_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink"><NoTranslate>{c.full_name}</NoTranslate></div>
                      <div className="text-xs text-ink-mute mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {c.branchIds.length === 0 ? (
                          <span className="text-ink-faint">{t("owner.ratesTarif.noClassYet")}</span>
                        ) : (
                          c.branchIds.map(bid => (
                            <span key={bid} className="px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold"><NoTranslate>{branches.find(b => b.id === bid)?.name ?? "—"}</NoTranslate></span>
                          ))
                        )}
                        <span>{t("owner.ratesTarif.classCount", { count: c.classCount })}</span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      <div className="text-xs text-ink-faint">{t("owner.ratesTarif.extraRateLabel")}</div>
                      <div className="font-mono text-sm font-semibold">{c.extraRate != null ? fmtIDR(c.extraRate) : <span className="text-ink-faint">{t("owner.ratesTarif.extraRateEmpty")}</span>}</div>
                    </div>
                    {c.classCount > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${incomplete ? "bg-warn-50 text-warn-700" : "bg-ok-50 text-ok-700"}`}>
                        {incomplete ? t("owner.ratesTarif.statusIncompleteBadge") : t("owner.ratesTarif.statusCompleteBadge")}
                      </span>
                    )}
                    <Icon name={isExpanded ? "chevronD" : "chevron"} className="w-4 h-4 text-ink-faint shrink-0" />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-paper-tint/60 space-y-4">
                      {loadingExpanded ? (
                        <div className="py-6 text-center text-ink-mute text-sm">{t("owner.ratesTarif.expandLoading")}</div>
                      ) : (
                        <>
                          {expandedClasses.length === 0 ? (
                            <p className="text-xs text-ink-faint italic py-2">{t("owner.ratesTarif.noClassAssigned")}</p>
                          ) : (
                            <div className="space-y-3">
                              {expandedClasses.map(cls => {
                                const genKey = `gen:${cls.id}`;
                                const specKey = `spec:${cls.id}:${c.id}`;
                                return (
                                  <div key={cls.id} className="bg-white border border-line rounded-xl p-3.5 space-y-3">
                                    <div>
                                      <div className="font-semibold text-sm text-ink"><NoTranslate>{cls.name}</NoTranslate></div>
                                      <div className="text-xs text-ink-mute mt-0.5">
                                        <NoTranslate>{cls.branch?.name ?? "—"}</NoTranslate>
                                        {cls.time_start && <span className="font-mono"> · {cls.time_start.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</span>}
                                      </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Field label={t("owner.ratesTarif.fieldGeneralRate")} hint={t("owner.ratesTarif.fieldGeneralRateHint")}>
                                            <Input type="text" inputMode="numeric"
                                              value={generalRates[cls.id] ? Number(generalRates[cls.id]).toLocaleString("id-ID") : ""}
                                              onChange={e => setGeneralRates(r => ({ ...r, [cls.id]: e.target.value.replace(/\D/g, "") }))}
                                              className="font-mono text-sm" placeholder={t("owner.ratesTarif.fieldGeneralRatePlaceholder")} />
                                          </Field>
                                        </div>
                                        <Btn variant="soft" size="sm" onClick={() => saveGeneral(cls.id)} disabled={saving === genKey}>{saving === genKey ? "…" : t("common.actions.save")}</Btn>
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Field label={t("owner.ratesTarif.fieldSpecificRate")} hint={t("owner.ratesTarif.fieldSpecificRateHint")}>
                                            <Input type="text" inputMode="numeric"
                                              value={coachRates[`${cls.id}:${c.id}`] ? Number(coachRates[`${cls.id}:${c.id}`]).toLocaleString("id-ID") : ""}
                                              onChange={e => setCoachRates(r => ({ ...r, [`${cls.id}:${c.id}`]: e.target.value.replace(/\D/g, "") }))}
                                              className="font-mono text-sm"
                                              placeholder={generalRates[cls.id] ? t("owner.ratesTarif.fieldSpecificRateUseGeneral", { amount: Number(generalRates[cls.id]).toLocaleString("id-ID") }) : t("owner.ratesTarif.fieldSpecificRateNoGeneral")} />
                                          </Field>
                                        </div>
                                        <Btn variant="soft" size="sm" onClick={() => saveCoachRate(cls.id, c.id)} disabled={saving === specKey}>
                                          {saving === specKey ? "…" : coachRates[`${cls.id}:${c.id}`] ? t("common.actions.save") : t("owner.ratesTarif.deleteBtn")}
                                        </Btn>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <Card className="!bg-white space-y-2">
                            <div>
                              <div className="text-sm font-bold text-ink">{t("owner.ratesTarif.extraRateSectionTitle")}</div>
                              <p className="text-xs text-ink-mute mt-0.5">{t("owner.ratesTarif.extraRateSectionHint")}</p>
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1 max-w-56">
                                <Input type="text" inputMode="numeric"
                                  value={extraRateInput ? Number(extraRateInput).toLocaleString("id-ID") : ""}
                                  onChange={e => setExtraRateInput(e.target.value.replace(/\D/g, ""))}
                                  className="font-mono text-sm" placeholder={t("owner.ratesTarif.extraRatePlaceholder")} />
                              </div>
                              <Btn variant="soft" size="sm" onClick={() => saveExtraRate(c.id)} disabled={saving === "extra"}>{saving === "extra" ? "…" : t("common.actions.save")}</Btn>
                            </div>
                          </Card>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Invoices({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [subTab, setSubTab] = useState<"invoices" | "periods">("invoices");
  const [branchFilter, setBranchFilter] = useState("all");

  // Periods state
  const [periods, setPeriods] = useState<InvoicePeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [openAddPeriod, setOpenAddPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({ label: "", branch_id: "", date_from: "", date_to: "" });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [editPeriodTarget, setEditPeriodTarget] = useState<InvoicePeriod | null>(null);
  const [editPeriodForm, setEditPeriodForm] = useState({ label: "", branch_id: "", date_from: "", date_to: "" });
  const [savingEditPeriod, setSavingEditPeriod] = useState(false);

  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    const q = supabase
      .from("invoice_periods")
      .select("id, branch_id, label, date_from, date_to, is_open, branch:branches(name)")
      .order("date_from", { ascending: false });
    if (branchFilter !== "all") {
      q.or(`branch_id.eq.${branchFilter},branch_id.is.null`);
    }
    const { data } = await q;
    if (data) setPeriods(data as unknown as InvoicePeriod[]);
    setPeriodsLoading(false);
  }, [branchFilter, supabase]);

  useEffect(() => {
    if (subTab === "periods") {
      loadPeriods();
    }
  }, [subTab, loadPeriods]);

  const createPeriod = async () => {
    if (!periodForm.label.trim() || !periodForm.date_from || !periodForm.date_to) {
      return toast.error("All period fields are required");
    }
    setSavingPeriod(true);
    const { error } = await supabase.from("invoice_periods").insert({
      label: periodForm.label.trim(),
      branch_id: periodForm.branch_id || null,
      date_from: periodForm.date_from,
      date_to: periodForm.date_to,
      is_open: true,
      created_by: userId || null,
    });
    setSavingPeriod(false);
    if (error) return toast.error(t("owner.invoices.saveFailed"), error.message);
    toast.success(t("owner.invoices.periodCreatedToast"));
    setOpenAddPeriod(false);
    loadPeriods();
  };

  const closePeriod = async (id: string) => {
    const ok = await confirm({
      title: t("owner.invoices.closePeriodConfirmTitle"),
      body: t("owner.invoices.closePeriodConfirmBody"),
      confirmLabel: t("owner.invoices.closePeriodConfirmLabel"),
      danger: true,
    });
    if (!ok) return;
    await supabase.from("invoice_periods").update({ is_open: false }).eq("id", id);
    toast.success(t("owner.invoices.periodClosedToast"));
    loadPeriods();
  };

  const reopenPeriod = async (id: string) => {
    await supabase.from("invoice_periods").update({ is_open: true }).eq("id", id);
    toast.success(t("owner.invoices.periodReopenedToast"));
    loadPeriods();
  };

  const openEditPeriodModal = (p: InvoicePeriod) => {
    setEditPeriodTarget(p);
    setEditPeriodForm({
      label: p.label,
      branch_id: p.branch_id ?? "",
      date_from: p.date_from,
      date_to: p.date_to,
    });
  };

  const saveEditPeriod = async () => {
    if (!editPeriodTarget) return;
    if (!editPeriodForm.label.trim() || !editPeriodForm.date_from || !editPeriodForm.date_to) {
      return toast.error("All period fields are required");
    }
    setSavingEditPeriod(true);
    const { error } = await supabase.from("invoice_periods").update({
      label: editPeriodForm.label.trim(),
      branch_id: editPeriodForm.branch_id || null,
      date_from: editPeriodForm.date_from,
      date_to: editPeriodForm.date_to,
      updated_at: new Date().toISOString(),
    }).eq("id", editPeriodTarget.id);
    setSavingEditPeriod(false);
    if (error) return toast.error(t("owner.invoices.saveFailed"), error.message);
    toast.success(t("owner.invoices.periodUpdatedToast"));
    setEditPeriodTarget(null);
    loadPeriods();
  };

  const activePeriod = periods.find(p => p.is_open);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl">{t("owner.invoices.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("owner.invoices.pageSub")}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex gap-1 bg-paper-deep p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSubTab("invoices")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "invoices" ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink"
              }`}
            >
              {t("owner.invoices.tabInvoicesList")}
            </button>
            <button
              type="button"
              onClick={() => { setSubTab("periods"); loadPeriods(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "periods" ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink"
              }`}
            >
              {t("owner.invoices.tabPeriods")}
            </button>
          </div>
          {subTab === "periods" && (
            <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-44">
              <option value="all">{t("owner.invoices.allBranches")}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
        </div>
      </div>

      {subTab === "invoices" ? (
        <PayslipGenerator branches={branches} userId={userId} userName={userName} />
      ) : (
        /* Periods Tab */
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle sub="Manage schedules and invoice submission deadlines for coaches.">
              Periode Pengiriman Invoice
            </SectionTitle>
            <Btn
              variant="primary"
              icon="plus"
              onClick={() => {
                setPeriodForm({ label: "", branch_id: branchFilter === "all" ? "" : branchFilter, date_from: "", date_to: "" });
                setOpenAddPeriod(true);
              }}
            >
              {t("owner.invoices.newPeriodBtn")}
            </Btn>
          </div>

          {/* Active Period Highlight */}
          {activePeriod && (
            <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-6 relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-wave-500/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-wave-200 text-xs font-bold uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-ok-400 animate-pulse" /> {t("owner.invoices.periodStatusOpen")}
                </div>
                <div className="mt-2 font-display font-extrabold text-2xl lg:text-3xl"><NoTranslate>{activePeriod.label}</NoTranslate></div>
                <div className="text-white/80 text-sm mt-1">
                  Mulai: {fmtDate(activePeriod.date_from)} · Batas Akhir: {fmtDate(activePeriod.date_to)}
                  {activePeriod.branch?.name ? <> (Center: <NoTranslate>{activePeriod.branch.name}</NoTranslate>)</> : " (All Centers Scope)"}
                </div>
                <div className="mt-5 flex items-center gap-2.5">
                  <button
                    onClick={() => openEditPeriodModal(activePeriod)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors"
                  >
                    Edit Periode
                  </button>
                  <button
                    onClick={() => closePeriod(activePeriod.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-colors"
                  >
                    {t("owner.invoices.closePeriodBtn")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Periods Table / List */}
          <Card padded={false}>
            {periodsLoading ? (
              <div className="p-10 text-center text-ink-mute">{t("owner.invoices.loading")}</div>
            ) : periods.length === 0 ? (
              <div className="p-10 text-center text-ink-mute">{t("owner.invoices.noPeriodsYet")}</div>
            ) : (
              <div className="divide-y divide-line">
                {periods.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 p-4 hover:bg-paper-tint transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink"><NoTranslate>{p.label}</NoTranslate></span>
                        <Status kind={p.is_open ? "active" : "archived"}>
                          {p.is_open ? t("owner.invoices.periodStatusOpen") : t("owner.invoices.periodStatusClosed")}
                        </Status>
                      </div>
                      <div className="text-xs text-ink-mute mt-1">
                        {tNode("owner.invoices.periodRangeScope", { from: fmtDate(p.date_from), to: fmtDate(p.date_to), scope: p.branch?.name ?? t("owner.invoices.allCentersOption") })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditPeriodModal(p)}
                        className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ink transition-colors"
                        title="Edit"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      {p.is_open ? (
                        <button
                          onClick={() => closePeriod(p.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-warn-200 bg-warn-50 text-warn-700 hover:bg-warn-100 text-xs font-semibold transition-colors"
                        >
                          {t("owner.invoices.closePeriodBtn")}
                        </button>
                      ) : (
                        <button
                          onClick={() => reopenPeriod(p.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-ok-200 bg-ok-50 text-ok-700 hover:bg-ok-100 text-xs font-semibold transition-colors"
                        >
                          {t("owner.invoices.reopenPeriodBtn")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Modal Add Period */}
          <Modal
            open={openAddPeriod}
            onClose={() => setOpenAddPeriod(false)}
            title={t("owner.invoices.openPeriodModalTitle")}
            size="sm"
            footer={
              <>
                <Btn variant="ghost" onClick={() => setOpenAddPeriod(false)}>{t("common.actions.cancel")}</Btn>
                <Btn variant="primary" onClick={createPeriod} disabled={savingPeriod}>
                  {savingPeriod ? "Menyimpan..." : t("owner.invoices.newPeriodBtn")}
                </Btn>
              </>
            }
          >
            <div className="space-y-4">
              <Field label={t("owner.invoices.fieldPeriodLabel")} required>
                <Input
                  value={periodForm.label}
                  onChange={e => setPeriodForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={t("owner.invoices.fieldPeriodLabelPlaceholder")}
                />
              </Field>
              <Field label={t("owner.invoices.fieldCenter")}>
                <Select value={periodForm.branch_id} onChange={e => setPeriodForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{t("owner.invoices.allCentersOption")}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label={t("owner.invoices.fieldDateFrom")} required>
                <Input type="date" value={periodForm.date_from} onChange={e => setPeriodForm(f => ({ ...f, date_from: e.target.value }))} />
              </Field>
              <Field label={t("owner.invoices.fieldDateTo")} required>
                <Input type="date" value={periodForm.date_to} onChange={e => setPeriodForm(f => ({ ...f, date_to: e.target.value }))} />
              </Field>
            </div>
          </Modal>

          {/* Modal Edit Period */}
          <Modal
            open={!!editPeriodTarget}
            onClose={() => setEditPeriodTarget(null)}
            title={t("owner.invoices.editPeriodModalTitle")}
            size="sm"
            footer={
              <>
                <Btn variant="ghost" onClick={() => setEditPeriodTarget(null)}>{t("common.actions.cancel")}</Btn>
                <Btn variant="primary" onClick={saveEditPeriod} disabled={savingEditPeriod}>
                  {savingEditPeriod ? t("common.actions.saving") : t("common.actions.save")}
                </Btn>
              </>
            }
          >
            <div className="space-y-4">
              <Field label={t("owner.invoices.fieldPeriodLabel")} required>
                <Input
                  value={editPeriodForm.label}
                  onChange={e => setEditPeriodForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={t("owner.invoices.fieldPeriodLabelPlaceholder")}
                />
              </Field>
              <Field label={t("owner.invoices.fieldCenter")}>
                <Select value={editPeriodForm.branch_id} onChange={e => setEditPeriodForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{t("owner.invoices.allCentersOption")}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label={t("owner.invoices.fieldDateFrom")} required>
                <Input type="date" value={editPeriodForm.date_from} onChange={e => setEditPeriodForm(f => ({ ...f, date_from: e.target.value }))} />
              </Field>
              <Field label={t("owner.invoices.fieldDateTo")} required>
                <Input type="date" value={editPeriodForm.date_to} onChange={e => setEditPeriodForm(f => ({ ...f, date_to: e.target.value }))} />
              </Field>
            </div>
          </Modal>
        </div>
      )}

    </div>
  );
}

// ── OwnerFinancial ─────────────────────────────────────────────────────────────

interface OwnerFinancialBill {
  id: string; branch_id: string; member_id: string; period_label: string;
  amount: number; discount: number; total: number; status: string; type: string;
  paid_at: string | null; paid_method: string | null; created_at: string;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
  branch?: { name: string } | null;
}

interface OwnerFinancialExpense {
  id: string; coach_id: string; branch_id: string; period_label: string;
  total_amount: number; status: string; paid_at: string | null; created_at: string;
  invoice_number: string | null;
  coach?: { full_name: string } | null;
  branch?: { name: string } | null;
}

interface ManualTxnRow {
  id: string; branch_id: string; kind: "income" | "expense"; category: string | null;
  description: string; amount: number; occurred_at: string; notes: string | null;
  is_reimburse: boolean; proof_url: string | null;
  branch?: { name: string } | null;
}

type IncomeRow = (OwnerFinancialBill & { source: "bill" }) | (ManualTxnRow & { source: "manual" });
type ExpenseRow = (OwnerFinancialExpense & { source: "invoice" }) | (ManualTxnRow & { source: "manual" });

interface FinancialPayslipItem {
  id: string;
  coach_id: string;
  branch_id: string;
  invoice_id: string | null;
  period_label: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  notes: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  coach?: { id: string; full_name: string; role?: string; bank_name?: string | null; bank_account?: string | null; bank_holder?: string | null; phone?: string | null } | null;
  branch?: { id: string; name: string } | null;
  invoice?: { id: string; invoice_number: string; total_amount: number; bank_info: string | null; coach_invoice_items?: InvoiceItem[] } | null;
  payslip_deductions?: { id: string; type: string; label: string; amount: number }[];
}

interface UnifiedExpenseItem {
  id: string;
  sourceType: "coach_payslip" | "staff_payslip" | "coach_invoice" | "staff_salary" | "staff_reimburse" | "manual";
  categoryKey: "coach_salary" | "staff_salary" | "manual" | "reimburse";
  categoryLabel: string;
  branchId: string;
  branchName: string;
  receiverId: string | null;
  receiverName: string;
  receiverRole: "coach" | "staff" | "other";
  referenceNumber: string;
  periodLabel: string;
  description: string;
  grossAmount: number;
  taxAmount: number;
  loanDeduction: number;
  otherDeductions: number;
  netTransferredAmount: number;
  status: "paid" | "approved" | "pending" | "draft" | "rejected";
  date: string;
  proofUrl?: string | null;
  bankInfo?: { bankName?: string | null; bankAccount?: string | null; bankHolder?: string | null };
  rawPayslip?: FinancialPayslipItem | null;
  rawInvoice?: Invoice | null;
  rawSalary?: any | null;
  rawManual?: ManualTxnRow | null;
}

interface ManualTxnCategory { id: string; kind: "income" | "expense"; name: string; sort_order: number }

type FinancialTab = "overview" | "income" | "expenses" | "payroll" | "moneyflow";

function OwnerFinancial({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<FinancialTab>("overview");

  // ── Data ────────────────────────────────────────────────────────────────────
  const [bills, setBills] = useState<OwnerFinancialBill[]>([]);
  const [expenses, setExpenses] = useState<OwnerFinancialExpense[]>([]);
  const [manualTxns, setManualTxns] = useState<ManualTxnRow[]>([]);
  const [paidStaffSalaries, setPaidStaffSalaries] = useState<{ id: string; total_salary: number; paid_at: string | null; created_at: string }[]>([]);
  const [paidStaffReimbursements, setPaidStaffReimbursements] = useState<{ id: string; amount: number; paid_at: string | null; created_at: string }[]>([]);
  const [payslips, setPayslips] = useState<FinancialPayslipItem[]>([]);
  const [allStaffSalaries, setAllStaffSalaries] = useState<StaffSalaryRow[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<UnifiedExpenseItem | null>(null);

  // ── Unified Payroll (Coach & Staff) state ──────────────────────────────────
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payrollBranchFilter, setPayrollBranchFilter] = useState("all");
  const [payrollRecipientFilter, setPayrollRecipientFilter] = useState<"all" | "coach" | "staff">("all");
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [payrollSearch, setPayrollSearch] = useState("");
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [detailedInvoices, setDetailedInvoices] = useState<Invoice[]>([]);
  const [loadingDetailedInvoices, setLoadingDetailedInvoices] = useState(false);

  const loadDetailedInvoices = useCallback(async () => {
    setLoadingDetailedInvoices(true);
    const { data } = await supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, branch_id, submitted_at, paid_at, approved_at, rejection_reason, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(id, full_name, role, phone, bank_name, bank_account, bank_holder), coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))")
      .not("status", "eq", "cancelled")
      .order("submitted_at", { ascending: false });
    // This tab is labeled/reported as coach-specific — staff self-invoices are reviewed
    // separately in the Owner's "Staff Invoices" section, so exclude them here.
    const coachOnly = ((data as unknown as (Invoice & { coach?: { role?: string } | null })[]) ?? [])
      .filter((i) => i.coach?.role !== "staff");
    if (data) setDetailedInvoices(coachOnly as unknown as Invoice[]);
    setLoadingDetailedInvoices(false);
  }, [supabase]);

  const loadPayslips = useCallback(async () => {
    const { data } = await supabase
      .from("payslips")
      .select(`
        id, coach_id, branch_id, invoice_id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, created_at,
        coach:profiles!payslips_coach_id_fkey(id, full_name, role, phone, bank_name, bank_account, bank_holder),
        branch:branches(id, name),
        invoice:coach_invoices!payslips_invoice_id_fkey(id, invoice_number, total_amount, bank_info, coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))),
        payslip_deductions(id, type, label, amount)
      `)
      .order("created_at", { ascending: false });
    if (data) setPayslips(data as unknown as FinancialPayslipItem[]);
  }, [supabase]);

  const loadAllStaffSalaries = useCallback(async () => {
    const { data } = await supabase
      .from("staff_salaries")
      .select("id, staff_id, branch_id, period_month, base_salary, allowances, deductions, reimburse_amount, total_salary, status, notes, paid_at, created_at, staff:profiles!staff_salaries_staff_id_fkey(id, full_name, role, phone, bank_name, bank_account, bank_holder), branch:branches(name)")
      .order("created_at", { ascending: false });
    if (data) setAllStaffSalaries(data as unknown as StaffSalaryRow[]);
  }, [supabase]);

  // ── Staff Payroll state ───────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<{ id: string; full_name: string; email: string; phone: string | null; bank_name: string | null; bank_account: string | null; bank_holder: string | null; branch_id: string | null; branch?: { name: string } | null }[]>([]);
  const [staffSalaries, setStaffSalaries] = useState<StaffSalaryRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [editSalaryModal, setEditSalaryModal] = useState<{ staff: any; salary: StaffSalaryRow | null } | null>(null);
  const [salaryForm, setSalaryForm] = useState({ base_salary: "", allowances: "", reimburse: "", deductions: "", notes: "" });
  const [savingSalary, setSavingSalary] = useState(false);
  const [markingStaffSalaryId, setMarkingStaffSalaryId] = useState<string | null>(null);

  const loadStaffPayroll = useCallback(async () => {
    setLoadingStaff(true);
    const { data: staffs } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, bank_name, bank_account, bank_holder, branch_id, branch:branches(name)")
      .eq("role", "staff")
      .order("full_name");
    if (staffs) setStaffList(staffs as any);

    const { data: sals } = await supabase
      .from("staff_salaries")
      .select("*")
      .eq("period_month", payrollMonth);
    if (sals) setStaffSalaries(sals as unknown as StaffSalaryRow[]);

    setLoadingStaff(false);
  }, [supabase, payrollMonth]);

  // ── Staff reimbursements (staff_reimbursements table) ────────────────────────
  const [staffReimbursements, setStaffReimbursements] = useState<{
    id: string; profile_id: string; branch_id: string; invoice_number: string;
    description: string; amount: number; proof_url: string | null; status: string;
    submitted_at: string; rejection_reason: string | null;
  }[]>([]);
  const [loadingReimbursements, setLoadingReimbursements] = useState(false);
  const [processingReimburseId, setProcessingReimburseId] = useState<string | null>(null);

  const loadStaffReimbursements = useCallback(async () => {
    setLoadingReimbursements(true);
    const { data } = await supabase
      .from("staff_reimbursements")
      .select("*")
      .neq("status", "cancelled")
      .order("submitted_at", { ascending: false });
    setStaffReimbursements(data ?? []);
    setLoadingReimbursements(false);
  }, [supabase]);

  useEffect(() => {
    loadPayslips();
    loadAllStaffSalaries();
    if (tab === "payroll") {
      loadDetailedInvoices();
      loadStaffPayroll();
      loadStaffReimbursements();
    }
  }, [tab, payrollMonth, loadPayslips, loadAllStaffSalaries, loadDetailedInvoices, loadStaffPayroll, loadStaffReimbursements]);

  const copyToClipboard = (text: string, label: ReactNode) => {
    navigator.clipboard.writeText(text);
    toast.success(tNode("owner.financial.copiedToast", { label }), text);
  };

  const markInvoicePaid = async (inv: Invoice) => {
    const ok = await confirm({
      title: t("owner.financial.confirmMarkInvoicePaidTitle"),
      body: tNode("owner.financial.confirmMarkInvoicePaidBody", { number: inv.invoice_number, amount: fmtIDR(inv.total_amount), coach: inv.coach?.full_name ?? "" }),
      confirmLabel: t("owner.financial.confirmMarkPaidLabel"),
    });
    if (!ok) return;
    setMarkingPaidId(inv.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("coach_invoices")
      .update({ status: "paid", paid_at: now })
      .eq("id", inv.id);
    setMarkingPaidId(null);
    if (error) return toast.error(t("owner.financial.markInvoicePaidFailed"), error.message);
    toast.success(t("owner.financial.markInvoicePaidSuccess"));
    loadDetailedInvoices();
  };

  const saveStaffSalary = async () => {
    if (!editSalaryModal) return;
    setSavingSalary(true);
    const base = Number(salaryForm.base_salary || 0);
    const allowances = Number(salaryForm.allowances || 0);
    const reimburse = Number(salaryForm.reimburse || 0);
    const deductions = Number(salaryForm.deductions || 0);
    const total = base + allowances + reimburse - deductions;

    const payload = {
      staff_id: editSalaryModal.staff.id,
      branch_id: editSalaryModal.staff.branch_id,
      period_month: payrollMonth,
      base_salary: base,
      allowances: allowances,
      deductions: deductions,
      reimburse_amount: reimburse,
      total_salary: total,
      notes: salaryForm.notes.trim() || null,
      status: editSalaryModal.salary?.status ?? "approved",
    };

    const { error } = editSalaryModal.salary
      ? await supabase.from("staff_salaries").update(payload).eq("id", editSalaryModal.salary.id)
      : await supabase.from("staff_salaries").insert(payload);

    setSavingSalary(false);
    if (error) return toast.error(t("owner.financial.saveStaffSalaryFailed"), error.message);
    toast.success(t("owner.financial.saveStaffSalarySuccess"));
    setEditSalaryModal(null);
    loadStaffPayroll();
  };

  const markStaffSalaryPaid = async (sal: StaffSalaryRow, staffName: string) => {
    const ok = await confirm({
      title: t("owner.financial.confirmMarkSalaryPaidTitle"),
      body: tNode("owner.financial.confirmMarkSalaryPaidBody", { period: sal.period_month, amount: fmtIDR(sal.total_salary), name: staffName }),
      confirmLabel: t("owner.financial.confirmMarkPaidLabel"),
    });
    if (!ok) return;
    setMarkingStaffSalaryId(sal.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("staff_salaries")
      .update({ status: "paid", paid_at: now })
      .eq("id", sal.id);
    setMarkingStaffSalaryId(null);
    if (error) return toast.error(t("owner.financial.markSalaryPaidFailed"), error.message);
    toast.success(t("owner.financial.markSalaryPaidSuccess"));
    loadStaffPayroll();
  };

  const approveReimburse = async (id: string) => {
    setProcessingReimburseId(id);
    const { error } = await supabase.from("staff_reimbursements").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    setProcessingReimburseId(null);
    if (error) return toast.error(t("owner.financial.approveReimburseFailed"), error.message);
    toast.success(t("owner.financial.approveReimburseSuccess"));
    loadStaffReimbursements();
  };

  const rejectReimburse = async (id: string) => {
    const reason = window.prompt(t("owner.financial.rejectReasonPrompt"));
    if (reason == null) return;
    setProcessingReimburseId(id);
    const { error } = await supabase.from("staff_reimbursements").update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason || null }).eq("id", id);
    setProcessingReimburseId(null);
    if (error) return toast.error(t("owner.financial.rejectReimburseFailed"), error.message);
    toast.success(t("owner.financial.rejectReimburseSuccess"));
    loadStaffReimbursements();
  };

  const markReimbursePaid = async (id: string, amount: number) => {
    const ok = await confirm({
      title: t("owner.financial.confirmMarkReimbursePaidTitle"),
      body: t("owner.financial.confirmMarkReimbursePaidBody", { amount: fmtIDR(amount) }),
      confirmLabel: t("owner.financial.confirmMarkPaidLabel"),
    });
    if (!ok) return;
    setProcessingReimburseId(id);
    const { error } = await supabase.from("staff_reimbursements").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    setProcessingReimburseId(null);
    if (error) return toast.error(t("owner.financial.markReimbursePaidFailed"), error.message);
    toast.success(t("owner.financial.markReimbursePaidSuccess"));
    loadStaffReimbursements();
  };

  // ── Income filters ──────────────────────────────────────────────────────────
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeStatus, setIncomeStatus] = useState("");
  const [incomeBranch, setIncomeBranch] = useState("all");
  const [incomeType, setIncomeType] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("");
  const [incomeDateFrom, setIncomeDateFrom] = useState("");
  const [incomeDateTo, setIncomeDateTo] = useState("");
  const [incomePage, setIncomePage] = useState(0);
  const [incomeSortBy, setIncomeSortBy] = useState<"paid_at" | "total">("paid_at");
  const [incomeSortDir, setIncomeSortDir] = useState<"asc" | "desc">("desc");

  // ── Expenses filters ────────────────────────────────────────────────────────
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatus, setExpenseStatus] = useState("");
  const [expenseBranch, setExpenseBranch] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseReimburseFilter, setExpenseReimburseFilter] = useState("all");
  const [expensePage, setExpensePage] = useState(0);

  const PAGE_SIZE = 25;

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  useEffect(() => {
    setLoadingBills(true);
    supabase.from("bills")
      .select("id, branch_id, member_id, period_label, amount, discount, total, status, type, paid_at, paid_method, created_at, member:members(profile:profiles(full_name)), class:classes(name), branch:branches(name)")
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => { if (data) setBills(data as unknown as OwnerFinancialBill[]); setLoadingBills(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingExpenses(true);
    supabase.from("coach_invoices")
      .select("id, coach_id, branch_id, period_label, total_amount, status, paid_at, created_at, invoice_number, coach:profiles!coach_invoices_coach_id_fkey(full_name), branch:branches(name)")
      .order("submitted_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => { if (data) setExpenses(data as unknown as OwnerFinancialExpense[]); setLoadingExpenses(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Staff payroll cost (salaries + reimbursements) — loaded unconditionally (not
  // gated behind the staff_payroll sub-tab) because Overview/Expenses/Moneyflow
  // need it across all periods for the headline totals to actually be accurate.
  useEffect(() => {
    supabase.from("staff_salaries").select("id, total_salary, paid_at, created_at").eq("status", "paid")
      .then(({ data }) => { if (data) setPaidStaffSalaries(data); });
    supabase.from("staff_reimbursements").select("id, amount, paid_at, created_at").eq("status", "paid")
      .then(({ data }) => { if (data) setPaidStaffReimbursements(data); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-enable react-hooks/set-state-in-effect */

  const loadManualTxns = useCallback(async () => {
    const { data } = await supabase.from("manual_transactions")
      .select("id, branch_id, kind, category, description, amount, occurred_at, notes, is_reimburse, proof_url, branch:branches(name)")
      .order("occurred_at", { ascending: false });
    if (data) setManualTxns(data as unknown as ManualTxnRow[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadManualTxns(); }, [loadManualTxns]);

  // ── Manual transaction categories (owner CRUD) ──────────────────────────────
  const [categories, setCategories] = useState<ManualTxnCategory[]>([]);
  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from("manual_transaction_categories")
      .select("id, kind, name, sort_order").order("sort_order");
    if (data) setCategories(data as unknown as ManualTxnCategory[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadCategories(); }, [loadCategories]);
  const categoriesByKind = (kind: "income" | "expense") => categories.filter(c => c.kind === kind);
  const [showCategoryManager, setShowCategoryManager] = useState<"income" | "expense" | null>(null);

  // ── Manual transaction CRUD ──────────────────────────────────────────────────
  const [showTxnModal, setShowTxnModal] = useState<{ kind: "income" | "expense"; edit: ManualTxnRow | null } | null>(null);
  const [txnForm, setTxnForm] = useState({ branch_id: "", category: "", categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
  const [savingTxn, setSavingTxn] = useState(false);

  const openAddTxn = (kind: "income" | "expense") => {
    const names = categoriesByKind(kind).map(c => c.name);
    setTxnForm({ branch_id: branches[0]?.id ?? "", category: names[0] ?? "Lainnya", categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
    setShowTxnModal({ kind, edit: null });
  };

  const openEditTxn = (row: ManualTxnRow) => {
    const names = categoriesByKind(row.kind).map(c => c.name);
    const knownCategory = names.includes(row.category ?? "") ? (row.category ?? names[0] ?? "Lainnya") : "Lainnya";
    setTxnForm({
      branch_id: row.branch_id, category: knownCategory, categoryOther: knownCategory === "Lainnya" ? (row.category ?? "") : "",
      description: row.description, amount: String(row.amount), occurred_at: row.occurred_at, notes: row.notes ?? "",
      isReimburse: row.is_reimburse, proofUrl: row.proof_url ?? "",
    });
    setShowTxnModal({ kind: row.kind, edit: row });
  };

  const saveTxn = async () => {
    if (!showTxnModal) return;
    if (!txnForm.branch_id) return toast.error(t("owner.financial.branchRequired"));
    if (!txnForm.description.trim()) return toast.error(t("owner.financial.descriptionRequired"));
    const amount = Number(txnForm.amount || 0);
    if (!amount || amount <= 0) return toast.error(t("owner.financial.invalidAmount"));
    if (txnForm.isReimburse && !txnForm.proofUrl.trim()) return toast.error(t("owner.financial.proofRequired"));
    const category = txnForm.category === "Lainnya" ? (txnForm.categoryOther.trim() || "Lainnya") : txnForm.category;

    setSavingTxn(true);
    const payload = {
      branch_id: txnForm.branch_id, kind: showTxnModal.kind, category, description: txnForm.description.trim(),
      amount, occurred_at: txnForm.occurred_at, notes: txnForm.notes.trim() || null,
      is_reimburse: txnForm.isReimburse, proof_url: txnForm.isReimburse ? txnForm.proofUrl.trim() : null,
    };
    const isEdit = !!showTxnModal.edit;
    const { error } = isEdit
      ? await supabase.from("manual_transactions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", showTxnModal.edit!.id)
      : await supabase.from("manual_transactions").insert({ ...payload, created_by: userId, created_by_role: "owner" });
    setSavingTxn(false);
    if (error) return toast.error(isEdit ? t("owner.financial.saveFailed") : t("owner.financial.addFailed"), error.message);
    toast.success(isEdit ? t("owner.financial.txnUpdated") : t("owner.financial.txnAdded"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, branchId: txnForm.branch_id, entityType: "manual_transactions",
      entityId: showTxnModal.edit?.id ?? "new", action: isEdit ? "update" : "create",
      label: t(isEdit ? "owner.financial.activityTxnUpdated" : "owner.financial.activityTxnAdded", {
        kind: t(showTxnModal.kind === "income" ? "owner.financial.txnKindIncome" : "owner.financial.txnKindExpense"),
        description: txnForm.description.trim(), amount: fmtIDR(amount),
      }),
      meta: { amount, category },
    });
    setShowTxnModal(null);
    loadManualTxns();
  };

  const deleteTxn = async (row: ManualTxnRow) => {
    const ok = await confirm({ title: t("owner.financial.deleteConfirmTitle"), body: tNode("owner.financial.deleteConfirmBody", { description: row.description, amount: fmtIDR(row.amount) }), confirmLabel: t("common.actions.delete"), danger: true });
    if (!ok) return;
    const { error } = await supabase.from("manual_transactions").delete().eq("id", row.id);
    if (error) return toast.error(t("owner.financial.txnDeleteFailed"), error.message);
    toast.success(t("owner.financial.txnDeleted"));
    logActivity(supabase, {
      userId, userRole: "owner", userName, branchId: row.branch_id, entityType: "manual_transactions",
      entityId: row.id, action: "delete", label: t("owner.financial.activityTxnDeleted", {
        kind: t(row.kind === "income" ? "owner.financial.txnKindIncome" : "owner.financial.txnKindExpense"),
        description: row.description, amount: fmtIDR(row.amount),
      }),
    });
    setManualTxns(prev => prev.filter(t => t.id !== row.id));
  };

  // ── Computed: income summary ────────────────────────────────────────────────
  const manualIncome = useMemo(() => manualTxns.filter(t => t.kind === "income"), [manualTxns]);
  const manualExpense = useMemo(() => manualTxns.filter(t => t.kind === "expense"), [manualTxns]);
  const paidBills = useMemo(() => bills.filter(b => b.status === "paid"), [bills]);
  const totalIncome = useMemo(() => paidBills.reduce((s, b) => s + b.total, 0) + manualIncome.reduce((s, t) => s + t.amount, 0), [paidBills, manualIncome]);

  // ── Unified Expenses (Payslips + Invoices + Salaries + Reimbursements + Manual)
  const unifiedExpenses = useMemo<UnifiedExpenseItem[]>(() => {
    const list: UnifiedExpenseItem[] = [];
    const usedInvoiceIds = new Set<string>();
    const usedStaffPeriods = new Set<string>(); // key: `${staff_id}_${period_month}`

    // 1. Unified Payslips (Coach & Staff)
    payslips.forEach((p) => {
      if (p.invoice_id) usedInvoiceIds.add(p.invoice_id);
      const isStaff = p.coach?.role === "staff";
      const monthKey = `${p.coach_id}_${parsePeriodToMonth(p.period_label)}`;
      usedStaffPeriods.add(monthKey);

      const deductionsList = p.payslip_deductions ?? [];
      const taxAmount = deductionsList.filter((d) => d.type === "tax").reduce((sum, d) => sum + d.amount, 0);
      const loanDeduction = deductionsList.filter((d) => d.type === "loan").reduce((sum, d) => sum + d.amount, 0);
      const otherDeds = deductionsList.filter((d) => d.type !== "tax" && d.type !== "loan").reduce((sum, d) => sum + d.amount, 0);
      const otherDeductions = otherDeds > 0 ? otherDeds : Math.max(0, p.deductions - taxAmount - loanDeduction);

      let bName = p.coach?.bank_name;
      let bAcc = p.coach?.bank_account;
      let bHolder = p.coach?.bank_holder;
      if ((!bAcc || !bName) && p.invoice?.bank_info) {
        try {
          const parsed = JSON.parse(p.invoice.bank_info);
          if (parsed.bank_name) bName = parsed.bank_name;
          if (parsed.bank_account) bAcc = parsed.bank_account;
          if (parsed.bank_holder) bHolder = parsed.bank_holder;
        } catch {}
      }

      list.push({
        id: p.id,
        sourceType: isStaff ? "staff_payslip" : "coach_payslip",
        categoryKey: isStaff ? "staff_salary" : "coach_salary",
        categoryLabel: isStaff ? t("owner.financial.catStaffSalary") : t("owner.financial.catCoachSalary"),
        branchId: p.branch_id,
        branchName: p.branch?.name ?? "—",
        receiverId: p.coach_id,
        receiverName: p.coach?.full_name ?? (isStaff ? "Staff" : "Coach"),
        receiverRole: isStaff ? "staff" : "coach",
        referenceNumber: p.invoice?.invoice_number ?? `SLIP-${p.id.slice(0, 8).toUpperCase()}`,
        periodLabel: p.period_label,
        description: isStaff
          ? `Slip Gaji Staff - ${p.coach?.full_name ?? "Staff"} (${p.period_label})`
          : `Slip Gaji Coach - ${p.coach?.full_name ?? "Coach"} (${p.period_label})`,
        grossAmount: p.gross_amount,
        taxAmount,
        loanDeduction,
        otherDeductions,
        netTransferredAmount: p.net_amount,
        status: p.status === "published" ? "paid" : "draft",
        date: p.published_at ?? p.created_at,
        bankInfo: { bankName: bName, bankAccount: bAcc, bankHolder: bHolder },
        rawPayslip: p,
      });
    });

    // 2. Coach Invoices not yet in payslips
    detailedInvoices.forEach((inv) => {
      if (usedInvoiceIds.has(inv.id)) return;
      let bName = inv.coach?.bank_name;
      let bAcc = inv.coach?.bank_account;
      let bHolder = inv.coach?.bank_holder;
      if ((!bAcc || !bName) && inv.bank_info) {
        try {
          const parsed = JSON.parse(inv.bank_info);
          if (parsed.bank_name) bName = parsed.bank_name;
          if (parsed.bank_account) bAcc = parsed.bank_account;
          if (parsed.bank_holder) bHolder = parsed.bank_holder;
        } catch {}
      }

      const isStaff = (inv.coach as any)?.role === "staff";
      list.push({
        id: inv.id,
        sourceType: "coach_invoice",
        categoryKey: isStaff ? "staff_salary" : "coach_salary",
        categoryLabel: isStaff ? t("owner.financial.catStaffSalary") : t("owner.financial.catCoachSalary"),
        branchId: inv.branch_id ?? "",
        branchName: inv.branch?.name ?? "—",
        receiverId: (inv as any).coach_id ?? inv.coach?.id ?? null,
        receiverName: inv.coach?.full_name ?? "Coach",
        receiverRole: isStaff ? "staff" : "coach",
        referenceNumber: inv.invoice_number,
        periodLabel: inv.period_label,
        description: `Invoice Coach - ${inv.coach?.full_name ?? "Coach"} (${inv.invoice_number})`,
        grossAmount: inv.total_amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        netTransferredAmount: inv.total_amount,
        status: inv.status as any,
        date: inv.paid_at ?? inv.submitted_at,
        bankInfo: { bankName: bName, bankAccount: bAcc, bankHolder: bHolder },
        rawInvoice: inv,
      });
    });

    // 3. Staff Salaries not yet in payslips
    allStaffSalaries.forEach((sal) => {
      const monthKey = `${sal.staff_id}_${sal.period_month}`;
      if (usedStaffPeriods.has(monthKey)) return;

      const base = Number(sal.base_salary || 0);
      const allowances = Number(sal.allowances || 0);
      const reimburse = Number(sal.reimburse_amount || 0);
      const deductions = Number(sal.deductions || 0);
      const total = Number(sal.total_salary || base + allowances + reimburse - deductions);
      const gross = base + allowances + reimburse;

      list.push({
        id: sal.id,
        sourceType: "staff_salary",
        categoryKey: "staff_salary",
        categoryLabel: t("owner.financial.catStaffSalary"),
        branchId: sal.branch_id,
        branchName: (sal as any).branch?.name ?? (branches.find(b => b.id === sal.branch_id)?.name ?? "—"),
        receiverId: sal.staff_id,
        receiverName: (sal as any).staff?.full_name ?? "Staff",
        receiverRole: "staff",
        referenceNumber: `SAL-${sal.period_month}`,
        periodLabel: sal.period_month,
        description: `Staff Salary - ${(sal as any).staff?.full_name ?? "Staff"} (${sal.period_month})`,
        grossAmount: gross,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: deductions,
        netTransferredAmount: total,
        status: sal.status as any,
        date: sal.paid_at ?? sal.created_at,
        bankInfo: { bankName: (sal as any).staff?.bank_name, bankAccount: (sal as any).staff?.bank_account, bankHolder: (sal as any).staff?.bank_holder },
        rawSalary: sal,
      });
    });

    // 4. Staff Reimbursements
    staffReimbursements.forEach((r) => {
      list.push({
        id: r.id,
        sourceType: "staff_reimburse",
        categoryKey: "reimburse",
        categoryLabel: t("owner.financial.catReimburse"),
        branchId: r.branch_id,
        branchName: "—",
        receiverId: r.profile_id,
        receiverName: "Staff",
        receiverRole: "staff",
        referenceNumber: r.invoice_number ?? "REIMBURSE",
        periodLabel: "—",
        description: r.description || "Klaim Reimburse Staff",
        grossAmount: r.amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        netTransferredAmount: r.amount,
        status: r.status as any,
        date: r.submitted_at,
        proofUrl: r.proof_url,
      });
    });

    // 5. Manual Expenses
    manualExpense.forEach((m) => {
      list.push({
        id: m.id,
        sourceType: "manual",
        categoryKey: m.is_reimburse ? "reimburse" : "manual",
        categoryLabel: m.category ?? (m.is_reimburse ? t("owner.financial.catReimburse") : t("owner.financial.catManualExpense")),
        branchId: m.branch_id,
        branchName: m.branch?.name ?? "—",
        receiverId: null,
        receiverName: m.description,
        receiverRole: "other",
        referenceNumber: "—",
        periodLabel: "—",
        description: m.description,
        grossAmount: m.amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        netTransferredAmount: m.amount,
        status: "paid",
        date: m.occurred_at,
        proofUrl: m.proof_url,
        rawManual: m,
      });
    });

    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [payslips, detailedInvoices, allStaffSalaries, staffReimbursements, manualExpense, t]);

  const paidExpensesList = useMemo(() => unifiedExpenses.filter((e) => e.status === "paid"), [unifiedExpenses]);
  const totalGrossExpenses = useMemo(() => paidExpensesList.reduce((s, e) => s + e.grossAmount, 0), [paidExpensesList]);
  const totalTaxWithheld = useMemo(() => paidExpensesList.reduce((s, e) => s + e.taxAmount, 0), [paidExpensesList]);
  const totalOtherDeductions = useMemo(() => paidExpensesList.reduce((s, e) => s + e.otherDeductions, 0), [paidExpensesList]);
  const totalRealCashOut = useMemo(() => paidExpensesList.reduce((s, e) => s + e.netTransferredAmount, 0), [paidExpensesList]);
  const totalExpenses = totalRealCashOut;
  const netAmount = totalIncome - totalRealCashOut;

  // ── Chart period selector ────────────────────────────────────────────────────
  const [chartMonths, setChartMonths] = useState<3 | 6 | 12>(6);

  // ── Bar chart data (dynamic period) ─────────────────────────────────────────
  const barChartData = useMemo(() => {
    const months: { label: string; key: string; income: number; expense: number; net: number }[] = [];
    const now = new Date();
    for (let i = chartMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      const income = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(key)).reduce((s, b) => s + b.total, 0)
        + manualIncome.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      const expense = paidExpensesList.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.netTransferredAmount, 0);
      months.push({ label, key, income, expense, net: income - expense });
    }
    return months;
  }, [paidBills, manualIncome, paidExpensesList, chartMonths]);

  const barMax = useMemo(() => Math.max(1, ...barChartData.map(m => Math.max(m.income, m.expense))), [barChartData]);

  // ── Branch income breakdown ─────────────────────────────────────────────────
  const branchIncomeMap = useMemo(() => {
    const map: Record<string, number> = {};
    paidBills.forEach(b => { map[b.branch_id] = (map[b.branch_id] ?? 0) + b.total; });
    manualIncome.forEach(t => { map[t.branch_id] = (map[t.branch_id] ?? 0) + t.amount; });
    return map;
  }, [paidBills, manualIncome]);
  const maxBranchIncome = useMemo(() => Math.max(1, ...Object.values(branchIncomeMap)), [branchIncomeMap]);

  // ── Income table filtered (merges bills + manual income) ───────────────────
  const incomeSortDate = (r: IncomeRow) => r.source === "manual" ? r.occurred_at : (r.paid_at ?? r.created_at);
  const incomeSortAmount = (r: IncomeRow) => r.source === "manual" ? r.amount : r.total;

  const filteredIncome = useMemo(() => {
    let r: IncomeRow[] = [
      ...bills.map(b => ({ ...b, source: "bill" as const })),
      ...manualIncome.map(t => ({ ...t, source: "manual" as const })),
    ];
    if (incomeStatus) r = r.filter(row => row.source === "manual" || row.status === incomeStatus);
    if (incomeBranch !== "all") r = r.filter(row => row.branch_id === incomeBranch);
    if (incomeType) r = r.filter(row => row.source === "manual" || row.type === incomeType);
    if (incomeMethod) r = r.filter(row => row.source === "manual" || row.paid_method === incomeMethod);
    if (incomeDateFrom) r = r.filter(row => incomeSortDate(row) >= incomeDateFrom);
    if (incomeDateTo) r = r.filter(row => incomeSortDate(row) <= incomeDateTo + "T23:59:59");
    if (incomeSearch) {
      const q = incomeSearch.toLowerCase();
      r = r.filter(row => row.source === "manual"
        ? row.description.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
        : row.member?.profile?.full_name?.toLowerCase().includes(q) || row.period_label.toLowerCase().includes(q) || row.class?.name?.toLowerCase().includes(q) || row.branch?.name?.toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b) => {
      const va = incomeSortBy === "total" ? incomeSortAmount(a) : incomeSortDate(a);
      const vb = incomeSortBy === "total" ? incomeSortAmount(b) : incomeSortDate(b);
      return incomeSortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [bills, manualIncome, incomeStatus, incomeBranch, incomeType, incomeMethod, incomeDateFrom, incomeDateTo, incomeSearch, incomeSortBy, incomeSortDir]);

  useEffect(() => { setIncomePage(0); }, [incomeStatus, incomeBranch, incomeType, incomeMethod, incomeDateFrom, incomeDateTo, incomeSearch]);

  const incomeTotalPages = Math.max(1, Math.ceil(filteredIncome.length / PAGE_SIZE));
  const incomeSafePage = Math.min(incomePage, Math.max(0, incomeTotalPages - 1));
  const incomePagedRows = filteredIncome.slice(incomeSafePage * PAGE_SIZE, (incomeSafePage + 1) * PAGE_SIZE);

  // ── Expenses table filtered (Unified: Payslips + Invoices + Salaries + Reimburse + Manual)
  const filteredExpenses = useMemo(() => {
    let r = unifiedExpenses;
    if (expenseStatus) r = r.filter(e => e.status === expenseStatus);
    if (expenseBranch !== "all") r = r.filter(e => e.branchId === expenseBranch);
    if (expenseCategoryFilter !== "all") r = r.filter(e => e.categoryKey === expenseCategoryFilter);
    if (expenseSearch) {
      const q = expenseSearch.toLowerCase();
      r = r.filter(e =>
        e.receiverName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.referenceNumber.toLowerCase().includes(q) ||
        e.periodLabel.toLowerCase().includes(q) ||
        e.branchName.toLowerCase().includes(q)
      );
    }
    return r;
  }, [unifiedExpenses, expenseStatus, expenseBranch, expenseCategoryFilter, expenseSearch]);

  useEffect(() => { setExpensePage(0); }, [expenseStatus, expenseBranch, expenseCategoryFilter, expenseSearch]);

  const expenseTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const expenseSafePage = Math.min(expensePage, Math.max(0, expenseTotalPages - 1));
  const expensePagedRows = filteredExpenses.slice(expenseSafePage * PAGE_SIZE, (expenseSafePage + 1) * PAGE_SIZE);

  // ── Money Flow monthly data ─────────────────────────────────────────────────
  const moneyFlowData = useMemo(() => {
    const months: { label: string; key: string; income: number; expense: number; grossExpense: number; taxWithheld: number; net: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const income = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(key)).reduce((s, b) => s + b.total, 0)
        + manualIncome.filter(t => t.occurred_at.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      const mExpenses = paidExpensesList.filter(e => e.date.startsWith(key));
      const expense = mExpenses.reduce((s, e) => s + e.netTransferredAmount, 0);
      const grossExpense = mExpenses.reduce((s, e) => s + e.grossAmount, 0);
      const taxWithheld = mExpenses.reduce((s, e) => s + e.taxAmount, 0);
      months.push({ label, key, income, expense, grossExpense, taxWithheld, net: income - expense });
    }
    return months.filter(m => m.income > 0 || m.expense > 0);
  }, [paidBills, manualIncome, paidExpensesList]);

  // ── Unified Payroll items & filtering (Coach & Staff) ───────────────────────
  const unifiedPayrollItems = useMemo(() => {
    const list: {
      id: string;
      itemType: "coach_invoice" | "staff_salary" | "staff_reimburse";
      recipientType: "coach" | "staff";
      recipientId: string;
      recipientName: string;
      recipientRole: string;
      branchId: string | null;
      branchName: string;
      periodMonth: string;
      periodLabel: string;
      title: string;
      referenceNo?: string;
      bankName: string | null;
      bankAccount: string | null;
      bankHolder: string | null;
      baseAmount: number;
      allowances: number;
      reimburseAmount: number;
      taxAmount: number;
      loanDeduction: number;
      otherDeductions: number;
      grossAmount: number;
      netTransferredAmount: number;
      status: "draft" | "pending" | "approved" | "paid";
      isPaid: boolean;
      paidAt?: string | null;
      proofUrl?: string | null;
      rawInvoice?: Invoice | null;
      rawSalary?: StaffSalaryRow | null;
      rawPayslip?: FinancialPayslipItem | null;
      rawExpense?: UnifiedExpenseItem | null;
    }[] = [];

    // 1. Coach Invoices (Sessions & Reimbursements)
    for (const inv of detailedInvoices) {
      const invMonth = inv.period_label ? parsePeriodToMonth(inv.period_label) : (inv.submitted_at ? inv.submitted_at.slice(0, 7) : "");
      const items = inv.coach_invoice_items ?? [];
      const sessionHonor = items.filter(it => it.item_type === "session" || it.item_type === "extra").reduce((s, it) => s + (it.session_count * it.rate), 0);
      const reimburseTotal = items.filter(it => it.item_type === "reimburse").reduce((s, it) => s + it.rate, 0);

      const matchingSlip = payslips.find(p => p.invoice_id === inv.id);
      const taxAmount = matchingSlip?.payslip_deductions?.filter(d => d.type === "tax").reduce((s, d) => s + d.amount, 0) ?? 0;
      const loanDeduction = matchingSlip?.payslip_deductions?.filter(d => d.type === "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
      const otherDeds = matchingSlip?.payslip_deductions?.filter(d => d.type !== "tax" && d.type !== "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
      const otherDeductions = otherDeds > 0 ? otherDeds : Math.max(0, (matchingSlip?.deductions ?? 0) - taxAmount - loanDeduction);
      const grossAmount = matchingSlip ? matchingSlip.gross_amount : inv.total_amount;
      const netPayout = matchingSlip ? matchingSlip.net_amount : inv.total_amount;
      const isPaid = inv.status === "paid" || matchingSlip?.status === "published";

      let bName = inv.coach?.bank_name;
      let bAcc = inv.coach?.bank_account;
      let bHolder = inv.coach?.bank_holder;
      if ((!bAcc || !bName) && inv.bank_info) {
        try {
          const parsed = JSON.parse(inv.bank_info);
          if (parsed.bank_name) bName = parsed.bank_name;
          if (parsed.bank_account) bAcc = parsed.bank_account;
          if (parsed.bank_holder) bHolder = parsed.bank_holder;
        } catch {}
      }

      const totalSessions = items.filter(it => it.item_type === "session" || it.item_type === "extra").reduce((s, it) => s + it.session_count, 0);

      list.push({
        id: `coach_${inv.id}`,
        itemType: "coach_invoice",
        recipientType: "coach",
        recipientId: inv.coach?.id ?? inv.id,
        recipientName: inv.coach?.full_name ?? "Coach",
        recipientRole: "Coach",
        branchId: inv.branch_id ?? null,
        branchName: inv.branch?.name ?? "Center",
        periodMonth: invMonth,
        periodLabel: inv.period_label || invMonth,
        title: totalSessions > 0 ? `Teaching Fee (${totalSessions} Sessions)` : (reimburseTotal > 0 ? "Coach Reimbursement Claim" : "Coach Honor / Fee"),
        referenceNo: inv.invoice_number,
        bankName: bName ?? null,
        bankAccount: bAcc ?? null,
        bankHolder: bHolder ?? null,
        baseAmount: sessionHonor > 0 ? sessionHonor : (inv.total_amount - reimburseTotal),
        allowances: 0,
        reimburseAmount: reimburseTotal,
        taxAmount: taxAmount,
        loanDeduction: loanDeduction,
        otherDeductions: otherDeductions,
        grossAmount: grossAmount,
        netTransferredAmount: netPayout,
        status: isPaid ? "paid" : (inv.status === "approved" ? "approved" : "pending"),
        isPaid: isPaid,
        paidAt: inv.paid_at ?? matchingSlip?.published_at ?? null,
        rawInvoice: inv,
        rawPayslip: matchingSlip ?? null,
        rawExpense: matchingSlip ? (unifiedExpenses.find(e => e.id === matchingSlip.id) ?? null) : null,
      });
    }

    // 2. Staff Salaries
    for (const st of staffList) {
      const sal = staffSalaries.find(s => s.staff_id === st.id)
        ?? allStaffSalaries.find(s => s.staff_id === st.id && s.period_month === payrollMonth);
      const matchingSlip = payslips.find(p => p.coach_id === st.id && parsePeriodToMonth(p.period_label) === payrollMonth);

      const base = matchingSlip ? (matchingSlip.gross_amount - (sal?.allowances ?? 0) - (sal?.reimburse_amount ?? 0)) : (sal?.base_salary ?? 0);
      const allowances = sal?.allowances ?? 0;
      const reimburse = sal?.reimburse_amount ?? 0;
      const taxAmount = matchingSlip?.payslip_deductions?.filter(d => d.type === "tax").reduce((s, d) => s + d.amount, 0) ?? 0;
      const loanDeduction = matchingSlip?.payslip_deductions?.filter(d => d.type === "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
      const otherDeds = matchingSlip?.payslip_deductions?.filter(d => d.type !== "tax" && d.type !== "loan").reduce((s, d) => s + d.amount, 0) ?? 0;
      const otherDeductions = otherDeds > 0 ? otherDeds : (matchingSlip ? Math.max(0, matchingSlip.deductions - taxAmount - loanDeduction) : (sal?.deductions ?? 0));
      const grossAmount = matchingSlip ? matchingSlip.gross_amount : (base + allowances + reimburse);
      const netPayout = matchingSlip ? matchingSlip.net_amount : (sal?.total_salary ?? (base + allowances + reimburse - otherDeductions - taxAmount));
      const isPaid = matchingSlip?.status === "published" || sal?.status === "paid";
      const status: "draft" | "pending" | "approved" | "paid" = isPaid ? "paid" : (sal?.status === "approved" ? "approved" : (sal ? "pending" : "draft"));

      list.push({
        id: `staff_${sal?.id ?? st.id}`,
        itemType: "staff_salary",
        recipientType: "staff",
        recipientId: st.id,
        recipientName: st.full_name,
        recipientRole: "Staff",
        branchId: st.branch_id,
        branchName: st.branch?.name ?? "Center",
        periodMonth: payrollMonth,
        periodLabel: payrollMonth,
        title: "Staff Salary & Allowances",
        referenceNo: sal?.id ? `SAL-${sal.id.slice(0, 8)}` : undefined,
        bankName: st.bank_name ?? null,
        bankAccount: st.bank_account ?? null,
        bankHolder: st.bank_holder ?? null,
        baseAmount: base,
        allowances: allowances,
        reimburseAmount: reimburse,
        taxAmount: taxAmount,
        loanDeduction: loanDeduction,
        otherDeductions: otherDeductions,
        grossAmount: grossAmount,
        netTransferredAmount: netPayout,
        status: status,
        isPaid: isPaid,
        paidAt: sal?.paid_at ?? matchingSlip?.published_at ?? null,
        rawSalary: sal ?? null,
        rawPayslip: matchingSlip ?? null,
        rawExpense: matchingSlip ? (unifiedExpenses.find(e => e.id === matchingSlip.id) ?? null) : null,
      });
    }

    // 3. Standalone Staff Reimbursements
    for (const rb of staffReimbursements) {
      const rbMonth = rb.submitted_at ? rb.submitted_at.slice(0, 7) : payrollMonth;
      const st = staffList.find(s => s.id === rb.profile_id);
      const sal = staffSalaries.find(s => s.staff_id === rb.profile_id);
      if (sal && sal.reimburse_amount >= rb.amount && rb.status === "approved") {
        continue;
      }
      const isPaid = rb.status === "paid";
      list.push({
        id: `reimburse_${rb.id}`,
        itemType: "staff_reimburse",
        recipientType: "staff",
        recipientId: rb.profile_id,
        recipientName: st?.full_name ?? "Staff",
        recipientRole: "Staff",
        branchId: rb.branch_id ?? st?.branch_id ?? null,
        branchName: branches.find(b => b.id === (rb.branch_id ?? st?.branch_id))?.name ?? st?.branch?.name ?? "Center",
        periodMonth: rbMonth,
        periodLabel: rbMonth,
        title: `Reimburse: ${rb.description}`,
        referenceNo: rb.invoice_number,
        bankName: st?.bank_name ?? null,
        bankAccount: st?.bank_account ?? null,
        bankHolder: st?.bank_holder ?? null,
        baseAmount: 0,
        allowances: 0,
        reimburseAmount: rb.amount,
        taxAmount: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        grossAmount: rb.amount,
        netTransferredAmount: rb.amount,
        status: isPaid ? "paid" : (rb.status === "approved" ? "approved" : "pending"),
        isPaid: isPaid,
        paidAt: null,
        proofUrl: rb.proof_url,
      });
    }

    return list;
  }, [detailedInvoices, payslips, staffList, staffSalaries, allStaffSalaries, staffReimbursements, payrollMonth, branches, unifiedExpenses]);

  const filteredPayrollItems = useMemo(() => {
    return unifiedPayrollItems.filter(item => {
      if (payrollMonth && payrollMonth !== "all" && item.periodMonth && item.periodMonth !== payrollMonth) {
        return false;
      }
      if (payrollBranchFilter !== "all" && item.branchId !== payrollBranchFilter) {
        return false;
      }
      if (payrollRecipientFilter !== "all" && item.recipientType !== payrollRecipientFilter) {
        return false;
      }
      if (payrollStatusFilter === "unpaid" && item.isPaid) {
        return false;
      }
      if (payrollStatusFilter === "paid" && !item.isPaid) {
        return false;
      }
      if (payrollSearch.trim()) {
        const q = payrollSearch.toLowerCase();
        const matchName = item.recipientName.toLowerCase().includes(q);
        const matchBank = item.bankAccount?.includes(q) || item.bankName?.toLowerCase().includes(q);
        const matchRef = item.referenceNo?.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchBranch = item.branchName.toLowerCase().includes(q);
        if (!matchName && !matchBank && !matchRef && !matchTitle && !matchBranch) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedPayrollItems, payrollMonth, payrollBranchFilter, payrollRecipientFilter, payrollStatusFilter, payrollSearch]);

  const payrollTotalHarusTransfer = filteredPayrollItems.filter(i => !i.isPaid).reduce((s, i) => s + i.netTransferredAmount, 0);
  const payrollUnpaidCount = filteredPayrollItems.filter(i => !i.isPaid).length;
  const payrollTotalSudahTransfer = filteredPayrollItems.filter(i => i.isPaid).reduce((s, i) => s + i.netTransferredAmount, 0);
  const payrollPaidCount = filteredPayrollItems.filter(i => i.isPaid).length;
  const payrollTotalGajiPokokDanHonor = filteredPayrollItems.reduce((s, i) => s + i.baseAmount + i.allowances, 0);
  const payrollTotalReimburse = filteredPayrollItems.reduce((s, i) => s + i.reimburseAmount, 0);
  const payrollTotalTax = filteredPayrollItems.reduce((s, i) => s + i.taxAmount, 0);
  const payrollTotalLoanDeduction = filteredPayrollItems.reduce((s, i) => s + i.loanDeduction, 0);

  // ── Sub-tab nav ──────────────────────────────────────────────────────────────
  const FTABS: { id: FinancialTab; label: string; icon: string }[] = [
    { id: "overview",       label: t("owner.financial.tabOverview"),         icon: "grid"    },
    { id: "income",         label: t("owner.financial.tabIncome"),           icon: "wallet"  },
    { id: "expenses",       label: t("owner.financial.tabExpenses"),         icon: "invoice" },
    { id: "payroll",        label: t("owner.financial.tabPayroll"),          icon: "users"   },
    { id: "moneyflow",      label: t("owner.financial.tabMoneyFlow"),       icon: "chart"   },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl">{t("owner.financial.pageTitle")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{t("owner.financial.pageSub")}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 flex-wrap bg-paper-tint border border-line rounded-2xl p-1.5 shadow-xs">
        {FTABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.id ? "bg-white text-ocean-700 shadow-xs border border-line/60" : "text-ink-soft hover:text-ink hover:bg-white/60"}`}>
            <Icon name={t.icon} className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Stat cards: 2-Tier Hierarchical Layout for executive clarity and zero clipping */}
          <div className="space-y-3">
            {/* Primary Cash Flow (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Income */}
              <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-ok-300 hover:shadow-card transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ok-500 inline-block" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      {t("owner.financial.statTotalIncome")}
                    </span>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-ok-50 text-ok-600 border border-ok-200/60 flex items-center justify-center shrink-0">
                    <Icon name="wallet" className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className="font-mono font-extrabold text-2xl lg:text-3xl text-ink tracking-tight">
                    {fmtIDR(totalIncome)}
                  </div>
                  <div className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-ok-50 text-ok-700 text-[11px] font-semibold">
                      {paidBills.length} transaksi lunas
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Cash Outflow */}
              <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-danger-300 hover:shadow-card transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      {t("owner.financial.statNetCashOut")}
                    </span>
                  </div>
                  <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-600 border border-danger-200/60 flex items-center justify-center shrink-0">
                    <Icon name="invoice" className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className="font-mono font-extrabold text-2xl lg:text-3xl text-danger-700 tracking-tight">
                    {fmtIDR(totalRealCashOut)}
                  </div>
                  <div className="text-xs text-ink-mute mt-1.5">
                    Transfer riil ke rekening bank coach & staff
                  </div>
                </div>
              </div>

              {/* Net Cashflow (Surplus/Deficit) */}
              <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-ocean-300 hover:shadow-card transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${netAmount >= 0 ? "bg-ok-500" : "bg-warn-500"} inline-block`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      {t("owner.financial.statNet")}
                    </span>
                  </div>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${netAmount >= 0 ? "bg-ocean-50 text-ocean-700 border border-ocean-200/60" : "bg-warn-50 text-warn-700 border border-warn-200/60"}`}>
                    <Icon name="chart" className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className={`font-mono font-extrabold text-2xl lg:text-3xl tracking-tight ${netAmount >= 0 ? "text-ocean-800" : "text-warn-700"}`}>
                    {fmtIDR(netAmount)}
                  </div>
                  <div className="text-xs font-semibold mt-1.5 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${netAmount >= 0 ? "bg-ok-50 text-ok-700 border border-ok-200" : "bg-danger-50 text-danger-700 border border-danger-200"}`}>
                      {netAmount >= 0 ? "Net Cash Surplus" : "Operating Cash Deficit"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Tax & Gross Breakdown (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax Withheld PPh 21 */}
              <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-warn-300 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-warn-50 text-warn-800 border border-warn-200 uppercase tracking-wider">
                      PPh 21
                    </span>
                    <span className="text-xs font-bold text-ink">
                      {t("owner.financial.statTaxWithheld")}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-mute">
                    Pajak dipotong dari honor coach & staff (titipan untuk kas negara)
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="font-mono font-bold text-lg lg:text-xl text-warn-700">
                    {fmtIDR(totalTaxWithheld)}
                  </div>
                  <div className="text-[10px] font-medium text-warn-600">Disetor ke Kas Negara</div>
                </div>
              </div>

              {/* Total Gross Expenses */}
              <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-ocean-300 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-ocean-50 text-ocean-800 border border-ocean-200 uppercase tracking-wider">
                      Beban Bruto
                    </span>
                    <span className="text-xs font-bold text-ink">
                      {t("owner.financial.statGrossExpenses")}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-mute">
                    Total beban operasional & payroll kotor sebelum pemotongan
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="font-mono font-bold text-lg lg:text-xl text-ink">
                    {fmtIDR(totalGrossExpenses)}
                  </div>
                  <div className="text-[10px] font-medium text-ink-mute">Total Payroll & Operasional</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bar chart: Income vs Expenses per month */}
          <div className="bg-white border border-line rounded-2xl p-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="font-display font-bold text-base text-ink">{t("owner.financial.chartTitle")}</div>
                <div className="text-xs text-ink-mute mt-0.5">{t("owner.financial.chartSub", { count: chartMonths })}</div>
              </div>
              <div className="flex gap-1 shrink-0 bg-paper-tint rounded-xl p-1">
                {([3, 6, 12] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setChartMonths(n)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${chartMonths === n ? "bg-white shadow-card text-ocean-700" : "text-ink-mute hover:text-ink"}`}
                  >
                    {t("owner.financial.chartMonthShort", { count: n })}
                  </button>
                ))}
              </div>
            </div>

            {loadingBills || loadingExpenses ? (
              <div className="h-48 flex items-center justify-center text-ink-mute text-sm">{t("owner.financial.chartLoading")}</div>
            ) : (
              <>
                {/* Vertical grouped bar chart */}
                {/* Chart area: fixed height 180px for bars + 36px label row below */}
                <div className="flex gap-1.5 px-1" style={{ height: "216px", alignItems: "flex-end" }}>
                  {barChartData.map((m) => {
                    const CHART_H = 160;
                    const incH = m.income > 0 ? Math.max(4, Math.round((m.income / barMax) * CHART_H)) : 0;
                    const expH = m.expense > 0 ? Math.max(4, Math.round((m.expense / barMax) * CHART_H)) : 0;
                    const netPositive = m.net >= 0;
                    return (
                      <div key={m.key} className="flex-1 group relative flex flex-col justify-end items-center" style={{ height: "216px" }}>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] leading-tight rounded-lg px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-36 shadow-float">
                          <div className="font-semibold mb-1">{m.label}</div>
                          <div className="flex justify-between gap-2"><span className="text-ok-300">{t("owner.financial.chartLegendIncome")}</span><span>{fmtIDR(m.income)}</span></div>
                          <div className="flex justify-between gap-2"><span className="text-danger-300">{t("owner.financial.chartLegendExpenses")}</span><span>{fmtIDR(m.expense)}</span></div>
                          <div className={`flex justify-between gap-2 mt-1 pt-1 border-t border-white/20 font-semibold ${netPositive ? "text-ok-300" : "text-danger-300"}`}>
                            <span>{t("owner.financial.statNet")}</span><span>{netPositive ? "+" : ""}{fmtIDR(m.net)}</span>
                          </div>
                        </div>
                        {/* Bars + labels */}
                        <div className="w-full flex items-end justify-center gap-0.5" style={{ height: `${CHART_H}px` }}>
                          {/* Income bar */}
                          {incH > 0 ? (
                            <div
                              className="flex-1 rounded-t-md bg-ok-500 transition-all duration-500"
                              style={{ height: `${incH}px` }}
                            />
                          ) : (
                            <div className="flex-1 rounded-t-sm bg-ok-50" style={{ height: "3px" }} />
                          )}
                          {/* Expense bar */}
                          {expH > 0 ? (
                            <div
                              className="flex-1 rounded-t-md bg-danger-500 transition-all duration-500"
                              style={{ height: `${expH}px` }}
                            />
                          ) : (
                            <div className="flex-1 rounded-t-sm bg-danger-50" style={{ height: "3px" }} />
                          )}
                        </div>
                        {/* Net dot */}
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${netPositive ? "bg-ok-500" : "bg-danger-500"}`} />
                        {/* Month label */}
                        <div className={`text-[10px] font-semibold text-center leading-tight mt-1 text-ink-mute ${chartMonths === 12 ? "text-[9px]" : ""}`}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Y-axis guide lines (decorative) */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-ink-mute">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-ok-500 inline-block" />
                      {t("owner.financial.chartLegendIncome")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-danger-500 inline-block" />
                      {t("owner.financial.chartLegendExpenses")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-ok-500 inline-block" />
                      {t("owner.financial.chartLegendNetPositive")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />
                      {t("owner.financial.chartLegendNetNegative")}
                    </span>
                  </div>
                  <div className="text-xs text-ink-faint">
                    {t("owner.financial.chartMax", { amount: fmtIDR(barMax) })}
                  </div>
                </div>

                {/* Monthly net summary strip */}
                <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(chartMonths, 6)}, 1fr)` }}>
                  {barChartData.slice(-Math.min(chartMonths, 6)).map(m => (
                    <div key={m.key} className={`rounded-xl px-2.5 py-2 text-center ${m.net >= 0 ? "bg-ok-50" : "bg-danger-50"}`}>
                      <div className="text-[10px] text-ink-mute font-medium">{m.label}</div>
                      <div className={`text-xs font-bold mt-0.5 ${m.net >= 0 ? "text-ok-700" : "text-danger-700"}`}>
                        {m.net >= 0 ? "+" : ""}{fmtIDR(m.net)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top cabang by income */}
          {branches.length > 0 && (
            <div className="bg-white border border-line rounded-2xl p-5">
              <div className="font-display font-bold text-base mb-4">{t("owner.financial.branchIncomeTitle")}</div>
              <div className="grid gap-3">
                {branches.map(b => {
                  const inc = branchIncomeMap[b.id] ?? 0;
                  const width = clampPercent(inc, maxBranchIncome);
                  return (
                    <div key={b.id} className="rounded-2xl border border-line bg-paper-tint/70 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-ink break-words"><NoTranslate>{b.name}</NoTranslate></div>
                          <div className="text-[11px] uppercase tracking-widest text-ink-faint mt-0.5">{t("owner.financial.branchIncomeContribution")}</div>
                        </div>
                        <div className="text-sm font-mono font-bold text-ocean-700 whitespace-nowrap">{fmtIDR(inc)}</div>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-line bg-white">
                        <div className="h-full rounded-full bg-gradient-to-r from-ocean-500 to-wave-500 transition-all duration-500" style={{ width: `${width}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-ink-mute">
                        {inc > 0 ? t("owner.financial.branchIncomePercent", { percent: Math.round(width) }) : t("owner.financial.branchIncomeEmpty")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INCOME ──────────────────────────────────────────────────────────── */}
      {tab === "income" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Btn variant="soft" icon="settings" size="sm" onClick={() => setShowCategoryManager("income")}>{t("owner.financial.manageCategoriesBtn")}</Btn>
            <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("income")}>{t("owner.financial.addIncomeBtn")}</Btn>
          </div>
          {/* Filters */}
          <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                <input value={incomeSearch} onChange={e => setIncomeSearch(e.target.value)} placeholder={t("owner.financial.searchIncomePlaceholder")} className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper-tint focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              </div>
              <select value={incomeBranch} onChange={e => setIncomeBranch(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.financial.allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={incomeStatus} onChange={e => setIncomeStatus(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">{t("owner.financial.allStatus")}</option>
                <option value="unpaid">{t("owner.financial.statusUnpaid")}</option>
                <option value="paid">{t("owner.financial.statusPaid")}</option>
                <option value="partial">{t("owner.financial.statusPartial")}</option>
                <option value="school_covered">{t("owner.financial.statusSchoolCovered")}</option>
                <option value="free">{t("owner.financial.statusFree")}</option>
              </select>
              <select value={incomeType} onChange={e => setIncomeType(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">{t("owner.financial.allTypes")}</option>
                <option value="monthly">{t("owner.financial.typeMonthly")}</option>
                <option value="session_pack">{t("owner.financial.typeSessionPack")}</option>
                <option value="custom">{t("owner.financial.typeCustom")}</option>
              </select>
              <select value={incomeMethod} onChange={e => setIncomeMethod(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">{t("owner.financial.allMethods")}</option>
                <option value="transfer">{t("owner.financial.methodTransfer")}</option>
                <option value="cash">{t("owner.financial.methodCash")}</option>
                <option value="qris">{t("owner.financial.methodQris")}</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input type="date" value={incomeDateFrom} onChange={e => setIncomeDateFrom(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              <span className="text-ink-faint text-sm">—</span>
              <input type="date" value={incomeDateTo} onChange={e => setIncomeDateTo(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              {(incomeSearch || incomeStatus || incomeBranch !== "all" || incomeType || incomeMethod || incomeDateFrom || incomeDateTo) && (
                <button onClick={() => { setIncomeSearch(""); setIncomeStatus(""); setIncomeBranch("all"); setIncomeType(""); setIncomeMethod(""); setIncomeDateFrom(""); setIncomeDateTo(""); }} className="text-xs text-ocean-600 hover:underline">{t("owner.financial.resetFilter")}</button>
              )}
              <span className="text-xs text-ink-mute ml-auto">{t("owner.financial.rowCount", { count: filteredIncome.length })}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            {loadingBills ? (
              <div className="p-10 text-center text-ink-mute">{t("owner.financial.loading")}</div>
            ) : incomePagedRows.length === 0 ? (
              <div className="p-10 text-center text-ink-mute">{t("owner.financial.empty")}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colBranch")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colMember")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colClass")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colPeriod")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colType")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colMethod")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs cursor-pointer select-none hover:text-ocean-600" onClick={() => { setIncomeSortBy("paid_at"); setIncomeSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                          {t("owner.financial.colDate")} {incomeSortBy === "paid_at" ? (incomeSortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs cursor-pointer select-none hover:text-ocean-600" onClick={() => { setIncomeSortBy("total"); setIncomeSortDir(d => d === "asc" ? "desc" : "asc"); }}>
                          {t("owner.financial.colTotal")} {incomeSortBy === "total" ? (incomeSortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colStatus")}</th>
                        <th className="px-4 py-2.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {incomePagedRows.map(row => row.source === "manual" ? (
                        <tr key={row.id} className="hover:bg-paper-tint">
                          <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.branch?.name ?? "—"}</NoTranslate></td>
                          <td className="px-4 py-2.5 font-medium">
                            <NoTranslate>{row.description}</NoTranslate>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-paper-deep text-ink-mute text-[10px] font-semibold align-middle">{t("owner.financial.manualBadge")}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.category ?? "—"}</NoTranslate></td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">—</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{new Date(row.occurred_at).toLocaleDateString("id-ID", { dateStyle: "short" })}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmtIDR(row.amount)}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ok-50 text-ok-700">{t("owner.financial.recordedBadge")}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditTxn(row)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title={t("owner.financial.editBtn")}><Icon name="edit" className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteTxn(row)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={t("owner.financial.deleteBtn")}><Icon name="trash" className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className="hover:bg-paper-tint">
                          <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.branch?.name ?? "—"}</NoTranslate></td>
                          <td className="px-4 py-2.5 font-medium"><NoTranslate>{row.member?.profile?.full_name ?? "—"}</NoTranslate></td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.class?.name ?? "—"}</NoTranslate></td>
                          <td className="px-4 py-2.5 text-xs"><NoTranslate>{row.period_label}</NoTranslate></td>
                          <td className="px-4 py-2.5 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-ocean-50 text-ocean-700 font-semibold">{row.type === "monthly" ? t("owner.financial.typeMonthly") : row.type === "session_pack" ? t("owner.financial.typeSessionPack") : row.type === "custom" ? t("owner.financial.typeCustom") : row.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute capitalize">{row.paid_method ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">{row.paid_at ? new Date(row.paid_at).toLocaleDateString("id-ID", { dateStyle: "short" }) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-sm">{fmtIDR(row.total)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === "paid" ? "bg-ok-50 text-ok-700" : row.status === "unpaid" ? "bg-warn-50 text-warn-700" : row.status === "partial" ? "bg-ocean-50 text-ocean-700" : "bg-paper-deep text-ink-mute"}`}>
                              {row.status === "paid" ? t("owner.financial.statusPaid") : row.status === "unpaid" ? t("common.status.unpaid") : row.status === "partial" ? t("owner.financial.statusPartial") : row.status === "school_covered" ? t("owner.financial.statusSchoolCovered") : t("owner.financial.statusFree")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
                  <div className="text-ink-mute text-xs">{t("owner.financial.rowsPage", { count: filteredIncome.length, page: incomeSafePage + 1, total: incomeTotalPages })}</div>
                  <div className="flex gap-1">
                    {[{ label: "«", act: () => setIncomePage(0) }, { label: "‹", act: () => setIncomePage(p => Math.max(0, p - 1)) }, { label: "›", act: () => setIncomePage(p => Math.min(incomeTotalPages - 1, p + 1)) }, { label: "»", act: () => setIncomePage(incomeTotalPages - 1) }].map((btn, i) => (
                      <button key={i} onClick={btn.act} disabled={(i < 2 && incomeSafePage === 0) || (i >= 2 && incomeSafePage >= incomeTotalPages - 1)} className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">{btn.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EXPENSES ────────────────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Btn variant="soft" icon="settings" size="sm" onClick={() => setShowCategoryManager("expense")}>{t("owner.financial.manageCategoriesBtn")}</Btn>
            <Btn variant="primary" icon="plus" size="sm" onClick={() => openAddTxn("expense")}>{t("owner.financial.addExpenseBtn")}</Btn>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Stat label={t("owner.financial.statReimburseAdmin")} value={manualExpense.filter(t => t.is_reimburse).length} icon="invoice" tone="warn"
              sub={fmtIDR(manualExpense.filter(t => t.is_reimburse).reduce((s, t) => s + t.amount, 0))} />
          </div>
          <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                <input value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} placeholder={t("owner.financial.searchExpensePlaceholder")} className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper-tint focus:outline-none focus:ring-1 focus:ring-ocean-400" />
              </div>
              <select value={expenseBranch} onChange={e => setExpenseBranch(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.financial.allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={expenseCategoryFilter} onChange={e => setExpenseCategoryFilter(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.financial.filterAllCategories")}</option>
                <option value="coach_salary">{t("owner.financial.filterCoachSalary")}</option>
                <option value="staff_salary">{t("owner.financial.filterStaffSalary")}</option>
                <option value="reimburse">{t("owner.financial.filterReimburse")}</option>
                <option value="manual">{t("owner.financial.filterManual")}</option>
              </select>
              <select value={expenseStatus} onChange={e => setExpenseStatus(e.target.value)} className="text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="">{t("owner.financial.allStatus")}</option>
                <option value="paid">{t("owner.financial.statusPaid")}</option>
                <option value="approved">{t("owner.financial.statusApproved")}</option>
                <option value="pending">{t("owner.financial.statusPending")}</option>
              </select>
              {(expenseSearch || expenseStatus || expenseBranch !== "all" || expenseCategoryFilter !== "all") && (
                <button onClick={() => { setExpenseSearch(""); setExpenseStatus(""); setExpenseBranch("all"); setExpenseCategoryFilter("all"); }} className="text-xs text-ocean-600 hover:underline">{t("owner.financial.resetBtn")}</button>
              )}
              <span className="text-xs text-ink-mute ml-auto">{t("owner.financial.invoiceCount", { count: filteredExpenses.length })}</span>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            {loadingExpenses ? (
              <div className="p-10 text-center text-ink-mute">{t("owner.financial.loading")}</div>
            ) : expensePagedRows.length === 0 ? (
              <div className="p-10 text-center text-ink-mute">{t("owner.financial.empty")}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colBranch")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colCategory")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colReceiver")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colPeriodRef")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colGross")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colTax")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colOtherDeductions")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ocean-800 text-xs">{t("owner.financial.colNetTransferred")}</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colStatus")}</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colDate")}</th>
                        <th className="px-4 py-2.5 w-24 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {expensePagedRows.map((row) => (
                        <tr key={row.id} className="hover:bg-paper-tint transition-colors">
                          <td className="px-4 py-2.5 text-xs text-ink-mute"><NoTranslate>{row.branchName}</NoTranslate></td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              row.categoryKey === "coach_salary" ? "bg-ocean-50 text-ocean-700 border-ocean-200" :
                              row.categoryKey === "staff_salary" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              row.categoryKey === "reimburse" ? "bg-warn-50 text-warn-700 border-warn-200" :
                              "bg-paper-deep text-ink-mute border-line"
                            }`}>
                              <NoTranslate>{row.categoryLabel}</NoTranslate>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-ink">
                            <div><NoTranslate>{row.receiverName}</NoTranslate></div>
                            {row.sourceType === "manual" && row.description !== row.receiverName && (
                              <div className="text-xs text-ink-mute"><NoTranslate>{row.description}</NoTranslate></div>
                            )}
                            {row.proofUrl && (
                              <a href={row.proofUrl} target="_blank" rel="noreferrer" className="block text-xs text-ocean-600 hover:underline mt-0.5 w-fit">
                                <Icon name="link" className="w-3 h-3 inline mr-1" />{t("owner.financial.viewProof")}
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-soft">
                            <div><NoTranslate>{row.periodLabel !== "—" ? row.periodLabel : row.referenceNumber}</NoTranslate></div>
                            {row.periodLabel !== "—" && row.referenceNumber !== "—" && (
                              <div className="font-mono text-[11px] text-ink-mute"><NoTranslate>{row.referenceNumber}</NoTranslate></div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-soft">{fmtIDR(row.grossAmount)}</td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {row.taxAmount > 0 ? (
                              <span className="text-warn-700 font-semibold">-{fmtIDR(row.taxAmount)}</span>
                            ) : (
                              <span className="text-ink-mute">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {row.otherDeductions > 0 ? (
                              <span className="text-danger-700 font-semibold">-{fmtIDR(row.otherDeductions)}</span>
                            ) : (
                              <span className="text-ink-mute">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-ocean-700 text-sm">
                            {fmtIDR(row.netTransferredAmount)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              row.status === "paid" ? "bg-ok-50 text-ok-700" :
                              row.status === "approved" ? "bg-ocean-50 text-ocean-700" :
                              "bg-warn-50 text-warn-700"
                            }`}>
                              {row.status === "paid" ? t("owner.financial.statusPaid") :
                               row.status === "approved" ? t("owner.financial.statusApproved") :
                               t("owner.financial.statusPending")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-mute">
                            {row.date ? new Date(row.date).toLocaleDateString("id-ID", { dateStyle: "short" }) : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              {row.sourceType === "manual" && row.rawManual ? (
                                <>
                                  <button onClick={() => openEditTxn(row.rawManual!)} className="w-7 h-7 rounded-lg hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ocean-600" title={t("owner.financial.editBtn")}><Icon name="edit" className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => deleteTxn(row.rawManual!)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600" title={t("owner.financial.deleteBtn")}><Icon name="trash" className="w-3.5 h-3.5" /></button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSelectedExpenseDetail(row)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-line bg-white hover:bg-paper-deep text-ink-soft transition-colors"
                                >
                                  {t("owner.financial.detailBtn")}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
                  <div className="text-ink-mute text-xs">{t("owner.financial.invoicesPage", { count: filteredExpenses.length, page: expenseSafePage + 1, total: expenseTotalPages })}</div>
                  <div className="flex gap-1">
                    {[{ label: "«", act: () => setExpensePage(0) }, { label: "‹", act: () => setExpensePage(p => Math.max(0, p - 1)) }, { label: "›", act: () => setExpensePage(p => Math.min(expenseTotalPages - 1, p + 1)) }, { label: "»", act: () => setExpensePage(expenseTotalPages - 1) }].map((btn, i) => (
                      <button key={i} onClick={btn.act} disabled={(i < 2 && expenseSafePage === 0) || (i >= 2 && expenseSafePage >= expenseTotalPages - 1)} className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">{btn.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── UNIFIED PAYROLL (COACH & STAFF) ────────────────────────────────── */}
      {tab === "payroll" && (
        <div className="space-y-4">
          {/* Header & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">{t("owner.financial.payrollHeading")}</h3>
              <p className="text-xs text-ink-mute mt-0.5">
                {t("owner.financial.payrollSub")}
              </p>
            </div>
            {payrollTotalTax > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warn-50 border border-warn-200 text-xs text-warn-800 shrink-0">
                <span className="font-bold">{t("owner.financial.payrollTaxWithheldBadge")}</span>
                <span className="font-mono font-extrabold">{fmtIDR(payrollTotalTax)}</span>
                <span className="text-[10px] text-warn-600">{t("owner.financial.payrollTaxWithheldNote")}</span>
              </div>
            )}
          </div>

          {/* Smart Financial Cards for Monthly Transfer Planning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Siap Ditransfer (Harus Ditransfer Bulan Ini) */}
            <div className="bg-white border border-warn-300/80 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-card transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warn-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warn-800">
                    {t("owner.financial.payrollCardUnpaidLabel")}
                  </span>
                </div>
                <span className="w-8 h-8 rounded-lg bg-warn-50 text-warn-700 border border-warn-200 flex items-center justify-center shrink-0">
                  <Icon name="wallet" className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="font-mono font-extrabold text-2xl text-warn-700 tracking-tight">
                  {fmtIDR(payrollTotalHarusTransfer)}
                </div>
                <div className="text-xs text-ink-mute mt-1 flex items-center gap-1">
                  {t("owner.financial.payrollCardUnpaidSub", { count: payrollUnpaidCount })}
                </div>
              </div>
            </div>

            {/* Card 2: Sudah Ditransfer (Lunas) */}
            <div className="bg-white border border-line rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-ok-300 hover:shadow-card transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-ok-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    {t("owner.financial.payrollCardPaidLabel")}
                  </span>
                </div>
                <span className="w-8 h-8 rounded-lg bg-ok-50 text-ok-600 border border-ok-200 flex items-center justify-center shrink-0">
                  <Icon name="check" className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="font-mono font-extrabold text-2xl text-ink tracking-tight">
                  {fmtIDR(payrollTotalSudahTransfer)}
                </div>
                <div className="text-xs text-ink-mute mt-1 flex items-center gap-1">
                  {t("owner.financial.payrollCardPaidSub", { count: payrollPaidCount })}
                </div>
              </div>
            </div>

            {/* Card 3: Total Gaji Pokok & Honor Sesi */}
            <div className="bg-white border border-line rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-ocean-300 hover:shadow-card transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  {t("owner.financial.payrollCardGrossLabel")}
                </span>
                <span className="w-8 h-8 rounded-lg bg-ocean-50 text-ocean-700 border border-ocean-200 flex items-center justify-center shrink-0">
                  <Icon name="invoice" className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="font-mono font-extrabold text-2xl text-ink tracking-tight">
                  {fmtIDR(payrollTotalGajiPokokDanHonor)}
                </div>
                <div className="text-xs text-ink-mute mt-1">
                  {t("owner.financial.payrollCardGrossSub")}
                </div>
              </div>
            </div>

            {/* Card 4: Total Klaim Reimburse */}
            <div className="bg-white border border-line rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-purple-300 hover:shadow-card transition-all">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  {t("owner.financial.payrollCardReimburseLabel")}
                </span>
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <Icon name="card" className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="font-mono font-extrabold text-2xl text-purple-700 tracking-tight">
                  {fmtIDR(payrollTotalReimburse)}
                </div>
                <div className="text-xs text-ink-mute mt-1">
                  {t("owner.financial.payrollCardReimburseSub")}
                </div>
              </div>
            </div>
          </div>

          {/* Unified Payroll Table with Advanced Filters */}
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-card">
            {/* Advanced Filter Bar */}
            <div className="p-4 border-b border-line space-y-3 bg-paper-tint/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-sm text-ink">{t("owner.financial.payrollListTitle")}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ocean-50 text-ocean-700 border border-ocean-200">
                    {t("owner.financial.payrollRecipientCount", { count: filteredPayrollItems.length })}
                  </span>
                  {payrollTotalLoanDeduction > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {t("owner.financial.payrollLoanDeductionBadge", { amount: fmtIDR(payrollTotalLoanDeduction) })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Btn
                    variant="soft"
                    size="sm"
                    icon="refresh"
                    onClick={() => {
                      loadDetailedInvoices();
                      loadStaffPayroll();
                      loadStaffReimbursements();
                      loadPayslips();
                    }}
                    disabled={loadingDetailedInvoices || loadingStaff}
                  >
                    {t("owner.financial.payrollRefreshBtn")}
                  </Btn>
                </div>
              </div>

              {/* Filter Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {/* Month Picker */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                    {t("owner.financial.payrollFilterMonth")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="month"
                      value={payrollMonth}
                      onChange={e => setPayrollMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-line bg-white font-mono font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
                    />
                    {payrollMonth && (
                      <button
                        onClick={() => {
                          const now = new Date();
                          setPayrollMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                        }}
                        title={t("owner.financial.payrollThisMonthBtn")}
                        className="px-2 py-1.5 text-[11px] font-semibold text-ocean-700 hover:text-ocean-900 bg-ocean-50 border border-ocean-200 rounded-xl hover:bg-ocean-100 transition-colors whitespace-nowrap"
                      >
                        {t("owner.financial.payrollThisMonthBtn")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Branch Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                    {t("owner.financial.payrollFilterBranch")}
                  </label>
                  <select
                    value={payrollBranchFilter}
                    onChange={e => setPayrollBranchFilter(e.target.value)}
                    className="w-full text-xs rounded-xl border border-line px-2.5 py-1.5 bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
                  >
                    <option value="all">{t("owner.financial.allBranches")}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Recipient Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                    {t("owner.financial.payrollFilterRecipient")}
                  </label>
                  <select
                    value={payrollRecipientFilter}
                    onChange={e => setPayrollRecipientFilter(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-line px-2.5 py-1.5 bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
                  >
                    <option value="all">{t("owner.financial.payrollRecipientAllOption")}</option>
                    <option value="coach">{t("owner.financial.payrollRecipientCoachOnlyOption")}</option>
                    <option value="staff">{t("owner.financial.payrollRecipientStaffOnlyOption")}</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                    {t("owner.financial.payrollFilterStatus")}
                  </label>
                  <select
                    value={payrollStatusFilter}
                    onChange={e => setPayrollStatusFilter(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-line px-2.5 py-1.5 bg-white font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wave-400"
                  >
                    <option value="all">{t("owner.financial.allStatus")}</option>
                    <option value="unpaid">{t("owner.financial.payrollStatusUnpaidOption")}</option>
                    <option value="paid">{t("owner.financial.payrollStatusPaidOption")}</option>
                  </select>
                </div>

                {/* Search Text */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
                    {t("owner.financial.payrollFilterSearch")}
                  </label>
                  <input
                    value={payrollSearch}
                    onChange={e => setPayrollSearch(e.target.value)}
                    placeholder={t("owner.financial.payrollSearchPlaceholder")}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-line bg-white text-ink placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-wave-400"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {loadingDetailedInvoices || loadingStaff ? (
              <div className="p-12 text-center text-ink-mute text-sm">
                {t("owner.financial.payrollLoadingTable")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper-tint text-[11px] uppercase tracking-wider text-ink-faint font-bold">
                      <th className="text-left py-3.5 px-4">{t("owner.financial.payrollColRecipient")}</th>
                      <th className="text-left py-3.5 px-4">{t("owner.financial.payrollColDescPeriod")}</th>
                      <th className="text-left py-3.5 px-4">{t("owner.financial.payrollColBankDest")}</th>
                      <th className="text-right py-3.5 px-4">{t("owner.financial.colGross")}</th>
                      <th className="text-right py-3.5 px-4">{t("owner.financial.colTax")}</th>
                      <th className="text-right py-3.5 px-4 text-purple-700">{t("owner.financial.payrollColLoanDeduction")}</th>
                      <th className="text-right py-3.5 px-4">{t("owner.financial.colOtherDeductions")}</th>
                      <th className="text-right py-3.5 px-4 text-ocean-900 font-extrabold bg-ocean-50/50">
                        {t("owner.financial.colNetTransferred")}
                      </th>
                      <th className="text-center py-3.5 px-4">{t("owner.financial.colStatus")}</th>
                      <th className="text-right py-3.5 px-4">{t("owner.financial.colAction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredPayrollItems.map(item => (
                      <tr key={item.id} className="hover:bg-paper-tint transition-colors">
                        {/* Penerima & Center */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {item.recipientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-ink text-sm truncate"><NoTranslate>{item.recipientName}</NoTranslate></div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  item.recipientType === "coach"
                                    ? "bg-ocean-50 text-ocean-700 border border-ocean-200"
                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}>
                                  {item.recipientRole}
                                </span>
                                <span className="text-xs text-ink-mute truncate">· <NoTranslate>{item.branchName}</NoTranslate></span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Keterangan & Periode */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-ink text-xs"><NoTranslate>{item.title}</NoTranslate></div>
                          <div className="text-[11px] text-ink-mute font-mono mt-0.5">
                            <NoTranslate>{item.periodLabel}</NoTranslate> {item.referenceNo ? <>· <NoTranslate>{item.referenceNo}</NoTranslate></> : ""}
                          </div>
                        </td>

                        {/* Rekening Bank Transfer */}
                        <td className="py-3 px-4">
                          {item.bankAccount ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-ink"><NoTranslate>{item.bankName ?? "Bank"}</NoTranslate></span>
                                <span className="font-mono text-ocean-800 bg-ocean-50 px-1.5 py-0.5 rounded text-xs font-semibold border border-ocean-200/50">
                                  {item.bankAccount}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(item.bankAccount!, tNode("owner.financial.payrollCopyAccountLabel", { name: item.recipientName }))}
                                  className="p-1 rounded hover:bg-paper-tint text-ocean-700 hover:text-ocean-900 transition-colors"
                                  title={t("owner.financial.payrollCopyAccountTitle")}
                                >
                                  <Icon name="copy" className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-[11px] text-ink-mute truncate max-w-xs">
                                a.n. <NoTranslate>{item.bankHolder || item.recipientName}</NoTranslate>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-mute italic">{t("owner.financial.payrollNoBankAccount")}</span>
                          )}
                        </td>

                        {/* Bruto */}
                        <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-ink">
                          {fmtIDR(item.grossAmount)}
                        </td>

                        {/* Pajak PPh 21 */}
                        <td className="py-3 px-4 text-right font-mono text-xs">
                          {item.taxAmount > 0 ? (
                            <span className="text-warn-700 font-semibold">-{fmtIDR(item.taxAmount)}</span>
                          ) : (
                            <span className="text-ink-mute">—</span>
                          )}
                        </td>

                        {/* Potongan Kasbon / Pinjaman */}
                        <td className="py-3 px-4 text-right font-mono text-xs">
                          {item.loanDeduction > 0 ? (
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                              -{fmtIDR(item.loanDeduction)}
                            </span>
                          ) : (
                            <span className="text-ink-mute">—</span>
                          )}
                        </td>

                        {/* Potongan Lain */}
                        <td className="py-3 px-4 text-right font-mono text-xs">
                          {item.otherDeductions > 0 ? (
                            <span className="text-danger-700 font-semibold">-{fmtIDR(item.otherDeductions)}</span>
                          ) : (
                            <span className="text-ink-mute">—</span>
                          )}
                        </td>

                        {/* Transfer Riil (Net) */}
                        <td className="py-3 px-4 text-right bg-ocean-50/40">
                          <span className="font-mono font-extrabold text-sm text-ocean-900">
                            {fmtIDR(item.netTransferredAmount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            item.isPaid
                              ? "bg-ok-50 text-ok-700 border border-ok-200"
                              : item.status === "approved"
                              ? "bg-ocean-50 text-ocean-700 border border-ocean-200"
                              : "bg-warn-50 text-warn-700 border border-warn-200"
                          }`}>
                            {item.isPaid ? t("owner.financial.payrollStatusPaidBadge") : item.status === "approved" ? t("owner.financial.payrollStatusReadyBadge") : t("owner.financial.payrollStatusPendingBadge")}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (item.rawExpense) return setSelectedExpenseDetail(item.rawExpense);
                                if (item.rawInvoice) return setSelectedInvoiceDetail(item.rawInvoice);
                                if (item.rawSalary) {
                                  const st = staffList.find(s => s.id === item.recipientId);
                                  if (st) {
                                    setSalaryForm({
                                      base_salary: String(item.rawSalary.base_salary || ""),
                                      allowances: String(item.rawSalary.allowances || ""),
                                      reimburse: String(item.rawSalary.reimburse_amount || ""),
                                      deductions: String(item.rawSalary.deductions || ""),
                                      notes: item.rawSalary.notes || "",
                                    });
                                    setEditSalaryModal({ staff: st, salary: item.rawSalary });
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-ocean-700 hover:text-ocean-900 bg-ocean-50 hover:bg-ocean-100 rounded-lg border border-ocean-200/60 transition-colors"
                            >
                              {t("owner.financial.payrollDetailBtn")}
                            </button>
                            {!item.isPaid && (
                              <Btn
                                size="sm"
                                onClick={async () => {
                                  if (item.rawInvoice) {
                                    markInvoicePaid(item.rawInvoice);
                                  } else if (item.rawSalary) {
                                    markStaffSalaryPaid(item.rawSalary, item.recipientName);
                                  } else if (item.itemType === "staff_reimburse" && item.id.startsWith("reimburse_")) {
                                    const rId = item.id.replace("reimburse_", "");
                                    const { error } = await supabase
                                      .from("coach_reimbursements")
                                      .update({ status: "paid" })
                                      .eq("id", rId);
                                    if (!error) {
                                      toast.success(t("owner.financial.payrollReimburseMarkedPaid"));
                                      loadStaffReimbursements();
                                    }
                                  } else {
                                    const st = staffList.find(s => s.id === item.recipientId);
                                    if (st) {
                                      setSalaryForm({
                                        base_salary: String(item.baseAmount || ""),
                                        allowances: String(item.allowances || ""),
                                        reimburse: String(item.reimburseAmount || ""),
                                        deductions: String(item.otherDeductions || ""),
                                        notes: "",
                                      });
                                      setEditSalaryModal({ staff: st, salary: null });
                                    }
                                  }
                                }}
                                disabled={markingPaidId === item.rawInvoice?.id || markingStaffSalaryId === item.rawSalary?.id}
                                className="bg-ok-600 hover:bg-ok-700 text-white font-semibold"
                              >
                                {t("owner.financial.payrollMarkPaidBtn")}
                              </Btn>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPayrollItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-ink-mute">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <Icon name="users" className="w-8 h-8 text-ink-faint" />
                            <span className="font-semibold text-sm text-ink">{t("owner.financial.payrollEmptyTitle")}</span>
                            <span className="text-xs text-ink-mute">{t("owner.financial.payrollEmptyBody")}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MONEY FLOW ──────────────────────────────────────────────────────── */}
      {tab === "moneyflow" && (
        <div className="space-y-3">
          {loadingBills || loadingExpenses ? (
            <div className="p-10 text-center text-ink-mute">{t("owner.financial.loading")}</div>
          ) : moneyFlowData.length === 0 ? (
            <div className="p-10 text-center text-ink-mute">{t("owner.financial.moneyFlowEmpty")}</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <Stat label={t("owner.financial.moneyFlowTotalIncome")} value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.income, 0))} icon="wallet" tone="ok" />
                <Stat label={t("owner.financial.moneyFlowTotalExpenses")} value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.expense, 0))} icon="invoice" tone="danger" />
                <Stat label={t("owner.financial.moneyFlowTotalNet")} value={fmtIDR(moneyFlowData.reduce((s, m) => s + m.net, 0))} icon="chart" tone="ocean" />
              </div>

              <div className="bg-white border border-line rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-paper-tint">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colMonth")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ok-700 text-xs">{t("owner.financial.colIncome")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-danger-700 text-xs">{t("owner.financial.colExpenses")}</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-ink-mute text-xs">{t("owner.financial.colNet")}</th>
                        <th className="px-4 py-2.5 w-48"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...moneyFlowData].reverse().map(m => {
                        const mfMax = Math.max(1, ...moneyFlowData.map(x => Math.max(x.income, x.expense)));
                        return (
                          <tr key={m.key} className="hover:bg-paper-tint">
                            <td className="px-4 py-3 font-semibold text-ink">{m.label}</td>
                            <td className="px-4 py-3 text-right font-mono text-ok-700">{fmtIDR(m.income)}</td>
                            <td className="px-4 py-3 text-right font-mono text-danger-700">{fmtIDR(m.expense)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${m.net >= 0 ? "text-ok-700" : "text-danger-700"}`}>{fmtIDR(m.net)}</td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="h-2 bg-paper-tint rounded-full overflow-hidden">
                                  <div className="h-full bg-ok-500 rounded-full" style={{ width: `${(m.income / mfMax) * 100}%` }} />
                                </div>
                                <div className="h-2 bg-paper-tint rounded-full overflow-hidden">
                                  <div className="h-full bg-danger-500 rounded-full" style={{ width: `${(m.expense / mfMax) * 100}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Tambah/Edit Transaksi Manual ─────────────────────────────── */}
      <Modal open={!!showTxnModal} onClose={() => setShowTxnModal(null)}
        title={showTxnModal?.edit
          ? t("owner.financial.txnModalEditTitle", { kind: showTxnModal.kind === "income" ? t("owner.financial.txnKindIncome") : t("owner.financial.txnKindExpense") })
          : t("owner.financial.txnModalAddTitle", { kind: showTxnModal?.kind === "income" ? t("owner.financial.txnKindIncome") : t("owner.financial.txnKindExpense") })}
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowTxnModal(null)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={saveTxn} disabled={savingTxn}>{savingTxn ? t("common.actions.saving") : t("common.actions.save")}</Btn>
          </div>
        }>
        <div className="space-y-4">
          <Field label={t("owner.financial.fieldBranch")}>
            <Select value={txnForm.branch_id} onChange={e => setTxnForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">{t("owner.financial.fieldBranchPlaceholder")}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label={t("owner.financial.fieldCategory")}>
            <Select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
              {categoriesByKind(showTxnModal?.kind ?? "income").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
          {txnForm.category === "Lainnya" && (
            <Field label={t("owner.financial.fieldCategoryOther")}><Input value={txnForm.categoryOther} onChange={e => setTxnForm(f => ({ ...f, categoryOther: e.target.value }))} placeholder={t("owner.financial.fieldCategoryOtherPlaceholder")} /></Field>
          )}
          <Field label={t("owner.financial.fieldDescription")}><Input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} placeholder={t("owner.financial.fieldDescriptionPlaceholder")} /></Field>
          {showTxnModal?.kind === "expense" && (
            <>
              <Switch checked={txnForm.isReimburse} onChange={v => setTxnForm(f => ({ ...f, isReimburse: v }))} label={t("owner.financial.fieldIsReimburse")} />
              {txnForm.isReimburse && (
                <Field label={t("owner.financial.fieldProofUrl")}>
                  <Input value={txnForm.proofUrl} onChange={e => setTxnForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder={t("owner.financial.fieldProofUrlPlaceholder")} type="url" />
                </Field>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("owner.financial.fieldAmount")}><Input type="number" inputMode="numeric" min={0} value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} /></Field>
            <Field label={t("owner.financial.fieldDate")}><Input type="date" value={txnForm.occurred_at} onChange={e => setTxnForm(f => ({ ...f, occurred_at: e.target.value }))} className="font-mono" /></Field>
          </div>
          <Field label={t("owner.financial.fieldNotes")}><Textarea value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
        </div>
      </Modal>

      {/* ── Modal: Rincian Pengeluaran Payroll / Expense ── */}
      <Modal
        open={!!selectedExpenseDetail}
        onClose={() => setSelectedExpenseDetail(null)}
        title={t("owner.financial.detailModalTitle")}
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <Btn variant="ghost" onClick={() => setSelectedExpenseDetail(null)}>{t("common.actions.close")}</Btn>
          </div>
        }
      >
        {selectedExpenseDetail && (
          <div className="space-y-4">
            {/* Header Info Card */}
            <div className="p-3.5 rounded-xl bg-paper-tint border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-base text-ink"><NoTranslate>{selectedExpenseDetail.receiverName}</NoTranslate></span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedExpenseDetail.receiverRole === "coach" ? "bg-ocean-50 text-ocean-700 border border-ocean-200" :
                    selectedExpenseDetail.receiverRole === "staff" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                    "bg-paper-deep text-ink-mute border border-line"
                  }`}>
                    <NoTranslate>{selectedExpenseDetail.categoryLabel}</NoTranslate>
                  </span>
                </div>
                <div className="text-xs text-ink-mute mt-1 font-mono">
                  <NoTranslate>{selectedExpenseDetail.branchName}</NoTranslate> · Ref: <NoTranslate>{selectedExpenseDetail.referenceNumber}</NoTranslate>
                </div>
                {selectedExpenseDetail.periodLabel && selectedExpenseDetail.periodLabel !== "—" && (
                  <div className="text-xs text-ink-soft mt-0.5">
                    Periode: <span className="font-semibold"><NoTranslate>{selectedExpenseDetail.periodLabel}</NoTranslate></span>
                  </div>
                )}
              </div>
              <div className="sm:text-right">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  selectedExpenseDetail.status === "paid" ? "bg-ok-50 text-ok-700" :
                  selectedExpenseDetail.status === "approved" ? "bg-ocean-50 text-ocean-700" :
                  "bg-warn-50 text-warn-700"
                }`}>
                  {selectedExpenseDetail.status === "paid" ? t("owner.financial.detailStatusPaid") :
                   selectedExpenseDetail.status === "approved" ? t("owner.financial.detailStatusReady") : t("owner.financial.detailStatusPending")}
                </span>
                <div className="text-[11px] text-ink-mute mt-1">
                  {selectedExpenseDetail.date ? new Date(selectedExpenseDetail.date).toLocaleDateString("id-ID", { dateStyle: "long" }) : "—"}
                </div>
              </div>
            </div>

            {/* If coach invoice items available */}
            {selectedExpenseDetail.rawInvoice?.coach_invoice_items && selectedExpenseDetail.rawInvoice.coach_invoice_items.length > 0 && (
              <div className="border border-line rounded-xl overflow-hidden">
                <div className="bg-paper-tint px-3 py-2 text-xs font-bold text-ink-mute uppercase tracking-wider border-b border-line">
                  {t("owner.financial.detailItemsTitle")}
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-paper-tint/60 text-ink-faint uppercase font-bold border-b border-line">
                    <tr>
                      <th className="text-left py-2 px-3">{t("owner.financial.colItemType")}</th>
                      <th className="text-left py-2 px-3">{t("owner.financial.colClass")}</th>
                      <th className="text-right py-2 px-3">{t("owner.financial.colSession")}</th>
                      <th className="text-right py-2 px-3">{t("owner.financial.colRate")}</th>
                      <th className="text-right py-2 px-3">{t("owner.financial.colSubtotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedExpenseDetail.rawInvoice.coach_invoice_items.map((it: any) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-semibold text-ink">
                          <NoTranslate>{it.description || it.item_type}</NoTranslate>
                          {it.proof_url && (
                            <div className="mt-1">
                              <ProofViewer proofUrl={it.proof_url} label={it.description || it.item_type} size="sm" />
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-ink-soft"><NoTranslate>{it.class?.name ?? "—"}</NoTranslate></td>
                        <td className="py-2 px-3 text-right font-mono">{it.session_count || "—"}</td>
                        <td className="py-2 px-3 text-right font-mono">{fmtIDR(it.rate)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-ink">
                          {fmtIDR(it.item_type === "reimburse" ? it.rate : it.session_count * it.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial breakdown summary card */}
            <div className="border border-line rounded-xl p-4 space-y-2.5 text-sm bg-white">
              <div className="flex justify-between items-center text-ink">
                <span>{t("owner.financial.detailGross")}</span>
                <span className="font-mono font-bold text-base">{fmtIDR(selectedExpenseDetail.grossAmount)}</span>
              </div>
              {selectedExpenseDetail.taxAmount > 0 && (
                <div className="flex justify-between items-center text-warn-700 bg-warn-50/50 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-warn-500 inline-block" />
                    {t("owner.financial.detailTax")}
                  </span>
                  <span className="font-mono font-semibold">- {fmtIDR(selectedExpenseDetail.taxAmount)}</span>
                </div>
              )}
              {selectedExpenseDetail.loanDeduction > 0 && (
                <div className="flex justify-between items-center text-purple-700 bg-purple-50/70 px-3 py-1.5 rounded-lg border border-purple-200/50">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    {t("owner.financial.detailLoanDeduction")}
                  </span>
                  <span className="font-mono font-semibold">- {fmtIDR(selectedExpenseDetail.loanDeduction)}</span>
                </div>
              )}
              {selectedExpenseDetail.otherDeductions > 0 && (
                <div className="flex justify-between items-center text-danger-700 bg-danger-50/50 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-danger-500 inline-block" />
                    {t("owner.financial.detailOtherDeductions")}
                  </span>
                  <span className="font-mono font-semibold">- {fmtIDR(selectedExpenseDetail.otherDeductions)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-line">
                <div>
                  <div className="font-bold text-base text-ink">{t("owner.financial.detailNet")}</div>
                  <div className="text-[11px] text-ink-mute">{t("owner.financial.detailNetHint")}</div>
                </div>
                <div className="font-mono font-extrabold text-xl text-ocean-700">
                  {fmtIDR(selectedExpenseDetail.netTransferredAmount)}
                </div>
              </div>
            </div>

            {/* Bank account info card with copy button */}
            {selectedExpenseDetail.bankInfo?.bankAccount && (
              <div className="bg-ocean-50/70 border border-ocean-100 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase font-bold tracking-wider text-ocean-800">
                    {t("owner.financial.detailBank")}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-sm text-ink"><NoTranslate>{selectedExpenseDetail.bankInfo.bankName ?? "Bank"}</NoTranslate></span>
                    <span className="font-mono font-bold text-ocean-800 bg-white px-2 py-0.5 rounded border border-ocean-200 text-sm">
                      {selectedExpenseDetail.bankInfo.bankAccount}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedExpenseDetail.bankInfo!.bankAccount!, t("owner.financial.accountNumberLabel"))}
                      className="p-1 rounded hover:bg-ocean-200/60 text-ocean-700 transition"
                      title={t("owner.financial.copyAccountNumberTitle")}
                    >
                      <Icon name="copy" className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5">
                    a/n <NoTranslate>{selectedExpenseDetail.bankInfo.bankHolder ?? selectedExpenseDetail.receiverName}</NoTranslate>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Detail Invoice & Bukti Reimburse Coach ─────────────────── */}
      <Modal
        open={!!selectedInvoiceDetail}
        onClose={() => setSelectedInvoiceDetail(null)}
        title={t("owner.financial.invoiceDetailModalTitle", { number: selectedInvoiceDetail?.invoice_number ?? "" })}
        size="lg"
        footer={<Btn variant="ghost" onClick={() => setSelectedInvoiceDetail(null)}>{t("owner.financial.closeBtn")}</Btn>}
      >
        {selectedInvoiceDetail && (
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-xl bg-paper-tint border border-line grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-ink-mute block">{t("owner.financial.invoiceDetailCoach")}</span>
                <span className="font-bold text-ink"><NoTranslate>{selectedInvoiceDetail.coach?.full_name}</NoTranslate></span>
              </div>
              <div>
                <span className="text-xs text-ink-mute block">{t("owner.financial.invoiceDetailCenter")}</span>
                <span className="font-bold text-ink"><NoTranslate>{selectedInvoiceDetail.branch?.name}</NoTranslate></span>
              </div>
              <div>
                <span className="text-xs text-ink-mute block">{t("owner.financial.invoiceDetailPeriod")}</span>
                <span className="font-bold text-ink"><NoTranslate>{selectedInvoiceDetail.period_label}</NoTranslate></span>
              </div>
            </div>

            {/* Items */}
            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-paper-tint border-b border-line text-ink-faint uppercase font-bold">
                  <tr>
                    <th className="text-left py-2 px-3">{t("owner.financial.invoiceDetailColType")}</th>
                    <th className="text-left py-2 px-3">{t("owner.financial.invoiceDetailColClassDetail")}</th>
                    <th className="text-right py-2 px-3">{t("owner.financial.invoiceDetailColSession")}</th>
                    <th className="text-right py-2 px-3">{t("owner.financial.invoiceDetailColRateValue")}</th>
                    <th className="text-right py-2 px-3">{t("owner.financial.invoiceDetailColSubtotal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(selectedInvoiceDetail.coach_invoice_items ?? []).map(it => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                          it.item_type === "reimburse" ? "bg-warn-100 text-warn-800" :
                          it.item_type === "extra" ? "bg-ocean-100 text-ocean-800" : "bg-paper-deep text-ink"
                        }`}>
                          <NoTranslate>{it.item_type}</NoTranslate>
                        </span>
                        {it.description && <div className="text-ink-mute text-[11px] mt-0.5"><NoTranslate>{it.description}</NoTranslate></div>}
                        {it.proof_url && (
                          <div className="mt-1">
                            <ProofViewer proofUrl={it.proof_url} label={it.description || it.item_type} size="sm" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-ink-soft"><NoTranslate>{it.class?.name ?? "—"}</NoTranslate></td>
                      <td className="py-2.5 px-3 text-right font-mono">{it.session_count || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{fmtIDR(it.rate)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {fmtIDR(it.item_type === "reimburse" ? it.rate : it.session_count * it.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-ocean-50 border border-ocean-200">
              <span className="font-bold text-ocean-900">{t("owner.financial.invoiceDetailTotalLabel")}</span>
              <span className="font-display font-extrabold text-xl text-ocean-900">{fmtIDR(selectedInvoiceDetail.total_amount)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Atur Gaji Bulanan Staff ─────────────────────────────────── */}
      <Modal
        open={!!editSalaryModal}
        onClose={() => setEditSalaryModal(null)}
        title={tNode("owner.financial.staffSalaryModalTitle", { name: editSalaryModal?.staff?.full_name ?? "", period: payrollMonth })}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setEditSalaryModal(null)}>{t("owner.financial.staffSalaryCancelBtn")}</Btn>
            <Btn variant="primary" onClick={saveStaffSalary} disabled={savingSalary}>
              {savingSalary ? t("owner.financial.staffSalarySavingBtn") : t("owner.financial.staffSalarySaveBtn")}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={t("owner.financial.fieldBaseSalary")} required hint={t("owner.financial.fieldBaseSalaryHint")}>
            <Input
              type="number"
              value={salaryForm.base_salary}
              onChange={e => setSalaryForm(f => ({ ...f, base_salary: e.target.value }))}
              placeholder={t("owner.financial.fieldBaseSalaryPlaceholder")}
              className="font-mono"
            />
          </Field>

          <Field label={t("owner.financial.fieldAllowancesExtra")}>
            <Input
              type="number"
              value={salaryForm.allowances}
              onChange={e => setSalaryForm(f => ({ ...f, allowances: e.target.value }))}
              placeholder="0"
              className="font-mono"
            />
          </Field>

          <Field label={t("owner.financial.fieldApprovedReimburse")} hint={t("owner.financial.fieldApprovedReimburseHint")}>
            <Input
              type="number"
              value={salaryForm.reimburse}
              onChange={e => setSalaryForm(f => ({ ...f, reimburse: e.target.value }))}
              placeholder="0"
              className="font-mono"
            />
          </Field>

          <Field label={t("owner.financial.fieldDeductions")}>
            <Input
              type="number"
              value={salaryForm.deductions}
              onChange={e => setSalaryForm(f => ({ ...f, deductions: e.target.value }))}
              placeholder="0"
              className="font-mono"
            />
          </Field>

          <Field label={t("owner.financial.fieldSalaryNotes")}>
            <Textarea
              rows={2}
              value={salaryForm.notes}
              onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t("owner.financial.fieldSalaryNotesPlaceholder")}
            />
          </Field>

          <div className="p-3 rounded-xl bg-paper-tint border border-line flex justify-between items-center text-xs">
            <span className="font-semibold text-ink-mute">{t("owner.financial.estimatedNetTotal")}</span>
            <span className="font-mono font-bold text-ocean-700 text-sm">
              {fmtIDR(
                Math.max(0, (Number(salaryForm.base_salary) || 0) + (Number(salaryForm.allowances) || 0) + (Number(salaryForm.reimburse) || 0) - (Number(salaryForm.deductions) || 0))
              )}
            </span>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Kelola Kategori ───────────────────────────────────────────── */}
      <CategoryManagerModal
        kind={showCategoryManager}
        categories={showCategoryManager ? categoriesByKind(showCategoryManager) : []}
        manualTxns={manualTxns}
        onClose={() => setShowCategoryManager(null)}
        onChanged={loadCategories}
      />
    </div>
  );
}

function CategoryManagerModal({ kind, categories, manualTxns, onClose, onChanged }: {
  kind: "income" | "expense" | null;
  categories: ManualTxnCategory[];
  manualTxns: ManualTxnRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async () => {
    const name = newName.trim();
    if (!name || !kind) return;
    setSaving(true);
    const { error } = await supabase.from("manual_transaction_categories")
      .insert({ kind, name, sort_order: categories.length + 1 });
    setSaving(false);
    if (error) return toast.error(t("owner.financial.categorySaveFailed"), error.message);
    setNewName("");
    onChanged();
  };

  const startEdit = (c: ManualTxnCategory) => { setEditId(c.id); setEditName(c.name); };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name || !editId) return;
    setSaving(true);
    const { error } = await supabase.from("manual_transaction_categories").update({ name }).eq("id", editId);
    setSaving(false);
    if (error) return toast.error(t("owner.financial.categorySaveFailed"), error.message);
    setEditId(null);
    onChanged();
  };

  const del = async (c: ManualTxnCategory) => {
    const usageCount = manualTxns.filter(t => t.kind === c.kind && t.category === c.name).length;
    if (usageCount > 0) {
      toast.error(t("owner.financial.categoryInUseTitle"), t("owner.financial.categoryInUseBody", { count: usageCount }));
      return;
    }
    const ok = await confirm({ title: t("owner.financial.categoryDeleteConfirmTitle"), body: c.name, danger: true });
    if (!ok) return;
    const { error } = await supabase.from("manual_transaction_categories").delete().eq("id", c.id);
    if (error) return toast.error(t("owner.financial.categoryDeleteFailed"), error.message);
    onChanged();
  };

  return (
    <Modal open={!!kind} onClose={onClose}
      title={kind === "income" ? t("owner.financial.manageCategoriesIncomeTitle") : t("owner.financial.manageCategoriesExpenseTitle")}
      size="sm" footer={<Btn variant="ghost" onClick={onClose}>{t("common.actions.close")}</Btn>}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("owner.financial.categoryNamePlaceholder")}
            onKeyDown={e => { if (e.key === "Enter") add(); }} />
          <Btn variant="primary" size="sm" disabled={!newName.trim() || saving} onClick={add}>{t("common.actions.add")}</Btn>
        </div>
        <div className="space-y-1.5">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-paper-tint">
              {editId === c.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1"
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); }} autoFocus />
                  <button onClick={saveEdit} disabled={saving} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="check" className="w-3.5 h-3.5 text-ok-600" /></button>
                  <button onClick={() => setEditId(null)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="x" className="w-3.5 h-3.5 text-ink-mute" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold text-ink truncate"><NoTranslate>{c.name}</NoTranslate></span>
                  <button onClick={() => startEdit(c)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
                  <button onClick={() => del(c)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <div className="py-6 text-center text-ink-mute text-sm">{t("owner.financial.categoryEmpty")}</div>}
        </div>
      </div>
    </Modal>
  );
}

// ── OwnerActivityLog ───────────────────────────────────────────────────────────

interface ActivityLogRow {
  id: string; user_id: string; user_role: string; user_name: string;
  branch_id: string | null; branch_name: string | null;
  entity_type: string; entity_id: string; entity_label: string | null;
  action: string; label: string; meta: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_BADGE: Record<string, string> = {
  create: "active", update: "manual", delete: "rejected",
  approve: "approved", reject: "rejected", publish: "active",
  archive: "archived", restore: "ok", suspend: "suspend", unsuspend: "ok",
};

const ENTITY_COLORS: Record<string, string> = {
  branches: "bg-ocean-50 text-ocean-700", members: "bg-wave-50 text-wave-700",
  bills: "bg-ok-50 text-ok-700", coach_invoices: "bg-warn-50 text-warn-700",
  payslips: "bg-ok-50 text-ok-700", registrations: "bg-ocean-50 text-ocean-700",
  certifications: "bg-wave-50 text-wave-700", coach_attendances: "bg-paper-deep text-ink-soft",
  classes: "bg-ocean-50 text-ocean-700", announcements: "bg-wave-50 text-wave-700",
};

function OwnerActivityLog({ branches }: { branches: Branch[] }) {
  const { t } = useLocale();
  const supabase = createClient();
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsToday, setStatsToday] = useState(0);
  const [statsWeek, setStatsWeek] = useState(0);
  const [detailLog, setDetailLog] = useState<ActivityLogRow | null>(null);

  // Filters
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const activeFilterCount = [filterBranch !== "all", filterEntity !== "all", filterAction !== "all", filterRole !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;

  /* eslint-disable react-hooks/set-state-in-effect -- async data loaders */
  const load = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterBranch !== "all")   q = q.eq("branch_id", filterBranch);
    if (filterEntity !== "all")   q = q.eq("entity_type", filterEntity);
    if (filterAction !== "all")   q = q.eq("action", filterAction);
    if (filterRole !== "all")     q = q.eq("user_role", filterRole);
    if (filterDateFrom)           q = q.gte("created_at", new Date(filterDateFrom + "T00:00:00").toISOString());
    if (filterDateTo)             q = q.lte("created_at", new Date(filterDateTo + "T23:59:59.999").toISOString());
    if (search.trim())            q = q.ilike("label", `%${search.trim()}%`);

    const { data, count } = await q;
    if (data) setLogs(data as ActivityLogRow[]);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [supabase, page, filterBranch, filterEntity, filterAction, filterRole, filterDateFrom, filterDateTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = useCallback(async () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayStr = todayDate.toISOString();

    const weekAgoDate = new Date(todayDate);
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgoStr = weekAgoDate.toISOString();

    const [td, wk] = await Promise.all([
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStr),
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgoStr),
    ]);
    setStatsToday(td.count ?? 0);
    setStatsWeek(wk.count ?? 0);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(0); }, [filterBranch, filterEntity, filterAction, filterRole, filterDateFrom, filterDateTo, search]);

  const resetFilters = () => {
    setFilterBranch("all"); setFilterEntity("all"); setFilterAction("all");
    setFilterRole("all"); setFilterDateFrom(""); setFilterDateTo(""); setSearch("");
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const branchName = (log: ActivityLogRow) =>
    log.branch_name ?? branches.find(b => b.id === log.branch_id)?.name ?? t("owner.activityLog.crossBranch");

  const entityLabel: Record<string, string> = {
    branches: t("owner.activityLog.entityLabel.branches"), members: t("owner.activityLog.entityLabel.members"), member_classes: t("owner.activityLog.entityLabel.member_classes"),
    classes: t("owner.activityLog.entityLabel.classes"), class_packages: t("owner.activityLog.entityLabel.class_packages"), bills: t("owner.activityLog.entityLabel.bills"),
    coach_attendances: t("owner.activityLog.entityLabel.coach_attendances"), coach_invoices: t("owner.activityLog.entityLabel.coach_invoices"),
    coach_leaves: t("owner.activityLog.entityLabel.coach_leaves"), certifications: t("owner.activityLog.entityLabel.certifications"),
    announcements: t("owner.activityLog.entityLabel.announcements"), payslips: t("owner.activityLog.entityLabel.payslips"),
    registrations: t("owner.activityLog.entityLabel.registrations"), rapor_periods: t("owner.activityLog.entityLabel.rapor_periods"),
    schools: t("owner.activityLog.entityLabel.schools"), coach_rates: t("owner.activityLog.entityLabel.coach_rates"), profiles: t("owner.activityLog.entityLabel.profiles"),
  };

  const actionLabel: Record<string, string> = {
    create: t("owner.activityLog.actionLabel.create"), update: t("owner.activityLog.actionLabel.update"), delete: t("owner.activityLog.actionLabel.delete"),
    approve: t("owner.activityLog.actionLabel.approve"), reject: t("owner.activityLog.actionLabel.reject"), publish: t("owner.activityLog.actionLabel.publish"),
    archive: t("owner.activityLog.actionLabel.archive"), restore: t("owner.activityLog.actionLabel.restore"), suspend: t("owner.activityLog.actionLabel.suspend"), unsuspend: t("owner.activityLog.actionLabel.unsuspend"),
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl">{t("owner.activityLog.pageTitle")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{t("owner.activityLog.pageSub")}</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label={t("owner.activityLog.statToday")} value={statsToday} icon="calendar"  tone="ocean" />
        <Stat label={t("owner.activityLog.statWeek")}  value={statsWeek}  icon="chart"     tone="wave"  />
        <Stat label={t("owner.activityLog.statTotal")} value={total}      icon="clipboard" tone="ok"    />
      </div>

      {/* Search + filter bar */}
      <div className="bg-white border border-line rounded-2xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-52 relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("owner.activityLog.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper-tint focus:outline-none focus:ring-1 focus:ring-ocean-400" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? "bg-ocean-50 border-ocean-200 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
            <Icon name="filter" className="w-4 h-4" /> {t("owner.activityLog.filterBtn")}
            {activeFilterCount > 0 && <span className="bg-ocean-600 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          {(activeFilterCount > 0 || search) && (
            <button onClick={resetFilters} className="text-xs text-ocean-600 hover:underline px-2">{t("owner.activityLog.resetBtn")}</button>
          )}
          <span className="text-xs text-ink-mute self-center ml-auto">{t("owner.activityLog.activityCount", { count: total })}</span>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 border-t border-line">
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">{t("owner.activityLog.filterBranch")}</label>
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.activityLog.allBranches")}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">{t("owner.activityLog.filterEntity")}</label>
              <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.activityLog.allEntities")}</option>
                {Object.entries(entityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">{t("owner.activityLog.filterAction")}</label>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.activityLog.allActions")}</option>
                {Object.entries(actionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">{t("owner.activityLog.filterRole")}</label>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint pl-3.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400">
                <option value="all">{t("owner.activityLog.allRoles")}</option>
                <option value="owner">{t("owner.activityLog.roleOwner")}</option>
                <option value="admin">{t("owner.activityLog.roleAdmin")}</option>
                <option value="coach">{t("owner.activityLog.roleCoach")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">{t("owner.activityLog.filterDateFrom")}</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-faint mb-1">{t("owner.activityLog.filterDateTo")}</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full text-sm rounded-xl border border-line bg-paper-tint px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ocean-400" />
            </div>
          </div>
        )}
      </div>

      {/* Activity feed */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("owner.activityLog.loading")}</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="clipboard" className="w-10 h-10 text-ink-faint mx-auto mb-3" />
            <div className="font-display font-bold text-ink">{t("owner.activityLog.empty")}</div>
            <p className="text-sm text-ink-mute mt-1">{t("owner.activityLog.emptySub")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-tint">
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("owner.activityLog.colTime")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("owner.activityLog.colBranch")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("owner.activityLog.colBy")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("owner.activityLog.colEntity")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("owner.activityLog.colAction")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink-mute text-xs uppercase tracking-wide">{t("owner.activityLog.colDescription")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-paper-tint cursor-pointer" onClick={() => setDetailLog(log)}>
                      <td className="px-4 py-3 shrink-0">
                        <div className="text-xs font-semibold text-ink">{fmtShortDate(log.created_at)}</div>
                        <div className="text-xs text-ink-faint">{fmtTime(log.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-mute whitespace-nowrap"><NoTranslate>{branchName(log)}</NoTranslate></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={log.user_name} size={26} />
                          <div>
                            <div className="text-xs font-semibold leading-tight"><NoTranslate>{log.user_name}</NoTranslate></div>
                            <div className={`text-[10px] font-bold uppercase tracking-wide ${log.user_role === "owner" ? "text-ocean-600" : log.user_role === "admin" ? "text-wave-600" : "text-ink-mute"}`}>{log.user_role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[log.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                          {entityLabel[log.entity_type] ?? <NoTranslate>{log.entity_type}</NoTranslate>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Status kind={ACTION_BADGE[log.action] ?? "manual"}>{actionLabel[log.action] ?? <NoTranslate>{log.action}</NoTranslate>}</Status>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-sm text-ink truncate block"><NoTranslate>{log.label}</NoTranslate></span>
                        {log.entity_label && <span className="text-xs text-ink-mute"><NoTranslate>{log.entity_label}</NoTranslate></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-line">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 hover:bg-paper-tint cursor-pointer" onClick={() => setDetailLog(log)}>
                  <div className="flex items-start gap-3">
                    <Avatar name={log.user_name} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink"><NoTranslate>{log.user_name}</NoTranslate></span>
                        <Status kind={ACTION_BADGE[log.action] ?? "manual"}>{actionLabel[log.action] ?? <NoTranslate>{log.action}</NoTranslate>}</Status>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${ENTITY_COLORS[log.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                          {entityLabel[log.entity_type] ?? <NoTranslate>{log.entity_type}</NoTranslate>}
                        </span>
                      </div>
                      <div className="text-sm text-ink mt-0.5 leading-snug"><NoTranslate>{log.label}</NoTranslate></div>
                      <div className="text-xs text-ink-faint mt-1"><NoTranslate>{branchName(log)}</NoTranslate> · {fmtShortDate(log.created_at)} {fmtTime(log.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm">
              <div className="text-xs text-ink-mute">
                {t("owner.activityLog.paginationSummary", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total, page: page + 1, total_pages: totalPages })}
              </div>
              <div className="flex gap-1">
                {[
                  { label: "«", act: () => setPage(0),               dis: page === 0 },
                  { label: "‹", act: () => setPage(p => p - 1),      dis: page === 0 },
                  { label: "›", act: () => setPage(p => p + 1),      dis: page >= totalPages - 1 },
                  { label: "»", act: () => setPage(totalPages - 1),   dis: page >= totalPages - 1 },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.act} disabled={btn.dis}
                    className="w-8 h-8 rounded-lg border border-line text-sm hover:bg-paper-tint disabled:opacity-30 disabled:cursor-not-allowed">
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal open={!!detailLog} onClose={() => setDetailLog(null)} title={t("owner.activityLog.detailModalTitle")} size="md"
        footer={<Btn variant="ghost" onClick={() => setDetailLog(null)}>{t("common.actions.close")}</Btn>}>
        {detailLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.activityLog.detailTime")}</div><div>{fmtShortDate(detailLog.created_at)} {fmtTime(detailLog.created_at)}</div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.activityLog.detailBranch")}</div><div><NoTranslate>{branchName(detailLog)}</NoTranslate></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.activityLog.detailBy")}</div><div className="font-semibold"><NoTranslate>{detailLog.user_name}</NoTranslate> <span className="text-xs text-ink-mute font-normal">({detailLog.user_role})</span></div></div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.activityLog.detailEntity")}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[detailLog.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                  {entityLabel[detailLog.entity_type] ?? <NoTranslate>{detailLog.entity_type}</NoTranslate>}
                </span>
              </div>
              <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.activityLog.detailAction")}</div><Status kind={ACTION_BADGE[detailLog.action] ?? "manual"}>{actionLabel[detailLog.action] ?? <NoTranslate>{detailLog.action}</NoTranslate>}</Status></div>
              {detailLog.entity_label && <div><div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("owner.activityLog.detailSubject")}</div><div className="font-semibold"><NoTranslate>{detailLog.entity_label}</NoTranslate></div></div>}
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-1">{t("owner.activityLog.detailDescription")}</div>
              <p className="text-sm text-ink leading-relaxed"><NoTranslate>{detailLog.label}</NoTranslate></p>
            </div>
            {detailLog.meta && Object.keys(detailLog.meta).length > 0 && (
              <div>
                <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-1">{t("owner.activityLog.detailMeta")}</div>
                <pre className="bg-paper-tint rounded-xl p-3 text-xs font-mono overflow-auto text-ink-soft">{JSON.stringify(detailLog.meta, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── System Storage ───────────────────────────────────────────────────────────

interface StorageCategory { prefix: string; label: string; icon: string; count: number; size: number }
interface StorageStats { categories: StorageCategory[]; totalSize: number; totalCount: number; fetchedAt: string }
interface BackupFileDbRef { table: string; column: string; id: string }
interface BackupFile { key: string; label: string; category: string; url: string; bucket: "next-storage" | "next-storage-private"; dbRef?: BackupFileDbRef }

function fmtBytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " KB";
  return n + " B";
}

function fmtRelTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return t("owner.storage.justNow");
  if (diff < 3600) return t("owner.storage.minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("owner.storage.hoursAgo", { n: Math.floor(diff / 3600) });
  return t("owner.storage.daysAgo", { n: Math.floor(diff / 86400) });
}

// Stable color per category (keyed by prefix, not array position) so the
// stacked bar and the legend below it always agree on which color means
// which category, regardless of sort order or which categories are empty.
const CATEGORY_COLOR_MAP: Record<string, string> = {
  avatars:     "bg-ocean-500",
  logos:       "bg-wave-500",
  classes:     "bg-ok-500",
  signatures:  "bg-manual-500",
  landing:     "bg-sub-500",
  attendances: "bg-warn-500",
  payments:    "bg-suspend-500",
  certs:       "bg-danger-500",
};
const EMPTY_COLOR = "bg-archive-500/30";
function categoryColor(prefix: string): string {
  return CATEGORY_COLOR_MAP[prefix] ?? EMPTY_COLOR;
}

const BACKUP_CATEGORIES = [
  { key: "avatars",     labelKey: "owner.storage.categoryAvatars"     },
  { key: "logos",       labelKey: "owner.storage.categoryLogos"       },
  { key: "classes",     labelKey: "owner.storage.categoryClasses"     },
  { key: "payments",    labelKey: "owner.storage.categoryPayments"    },
  { key: "certs",       labelKey: "owner.storage.categoryCerts"       },
  { key: "attendances", labelKey: "owner.storage.categoryAttendances" },
];

const BACKUP_PAGE_SIZE = 20;

function OwnerStorage({ userId, userName }: { userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();

  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [backupPage, setBackupPage] = useState(0);

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(["all"]));
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const confirm = useConfirm();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await fetch("/api/storage/stats");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as StorageStats;
      setStats(data);
    } catch {
      setStatsError(true);
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadBackupList = async () => {
    setBackupLoading(true);
    setBackupLoaded(false);
    try {
      // Fetch per selected category (or all)
      if (selectedCats.has("all")) {
        const res = await fetch("/api/storage/backup-list?category=all");
        if (!res.ok) throw new Error();
        const data = await res.json() as { files: BackupFile[] };
        setBackupList(data.files);
      } else {
        const allFiles: BackupFile[] = [];
        for (const cat of selectedCats) {
          const res = await fetch(`/api/storage/backup-list?category=${cat}`);
          if (!res.ok) continue;
          const data = await res.json() as { files: BackupFile[] };
          allFiles.push(...data.files);
        }
        setBackupList(allFiles);
      }
      setBackupLoaded(true);
      setBackupPage(0);
    } catch {
      toast.error(t("owner.storage.listLoadFailed"));
    }
    setBackupLoading(false);
  };

  const toggleCat = (key: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (key === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(key);
      }
      return next;
    });
    setBackupLoaded(false);
    setBackupList([]);
    setSelectMode(false);
    setSelectedFiles(new Set());
  };

  const toggleFile = (key: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deleteSelected = async () => {
    const targets = backupList.filter(f => selectedFiles.has(f.key));
    if (targets.length === 0) return;
    const yes = await confirm({
      title: t("owner.storage.deleteSelectedConfirmTitle", { count: targets.length }),
      body: t("owner.storage.deleteSelectedConfirmBody"),
      danger: true,
    });
    if (!yes) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: targets.map(f => ({ bucket: f.bucket, key: f.key, dbRef: f.dbRef })),
        }),
      });
      const data = await res.json() as { deleted: number; failed: { key: string; error: string }[] };
      if (!res.ok) throw new Error();

      toast.success(t("owner.storage.deleteSuccess", { count: data.deleted }), data.failed.length > 0 ? t("owner.storage.deleteFailedSub", { count: data.failed.length }) : undefined);
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "system_storage", entityId: "delete",
        action: "delete",
        label: t("owner.storage.activityDeleted", { count: data.deleted }),
        meta: { count: data.deleted, keys: targets.map(f => f.key) },
      });

      const deletedKeys = new Set(targets.map(f => f.key).filter(k => !data.failed.some(f => f.key === k)));
      setBackupList(prev => prev.filter(f => !deletedKeys.has(f.key)));
      setSelectedFiles(new Set());
      setSelectMode(false);
      loadStats();
    } catch {
      toast.error(t("owner.storage.deleteFailed"), t("owner.storage.deleteFailedGeneric"));
    }
    setDeleting(false);
  };

  const deleteSingle = async (f: BackupFile) => {
    const yes = await confirm({
      title: t("owner.storage.deleteFileConfirmTitle"),
      body: tNode("owner.storage.deleteFileConfirmBody", { name: f.label }),
      danger: true,
    });
    if (!yes) return;

    setDeletingKey(f.key);
    try {
      const res = await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ bucket: f.bucket, key: f.key, dbRef: f.dbRef }] }),
      });
      const data = await res.json() as { deleted: number; failed: { key: string; error: string }[] };
      if (!res.ok || data.failed.length > 0) throw new Error();

      toast.success(t("owner.storage.deleteSuccess", { count: 1 }));
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "system_storage", entityId: "delete",
        action: "delete",
        label: t("owner.storage.activityDeleted", { count: 1 }),
        meta: { count: 1, keys: [f.key] },
      });

      setBackupList(prev => prev.filter(x => x.key !== f.key));
      setSelectedFiles(prev => { const next = new Set(prev); next.delete(f.key); return next; });
      loadStats();
    } catch {
      toast.error(t("owner.storage.deleteFailed"), t("owner.storage.deleteFailedGeneric"));
    }
    setDeletingKey(null);
  };

  const downloadBackup = async () => {
    if (backupList.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ done: 0, total: backupList.length });
    let successCount = 0;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < backupList.length; i++) {
        const f = backupList[i];
        try {
          const res = await fetch(`/api/storage?key=${encodeURIComponent(f.key)}&stream=1`);
          if (res.ok) {
            const blob = await res.blob();
            const folder = f.category.replace(/[\s/\\]/g, "_");
            const filename = f.key.split("/").filter(Boolean).pop() ?? f.key;
            zip.file(`${folder}/${filename}`, blob);
            successCount++;
          }
        } catch { /* skip failed file */ }
        setDownloadProgress({ done: i + 1, total: backupList.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Storage-Backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("owner.storage.downloadSuccess", { count: successCount }));
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "system_storage", entityId: "backup",
        action: "create",
        label: t("owner.storage.activityBackupDownloaded", { success: successCount, total: backupList.length }),
        meta: { success_count: successCount, total_count: backupList.length },
      });
    } catch {
      toast.error(t("owner.storage.downloadFailed"), t("owner.storage.downloadFailedSub"));
    }
    setDownloading(false);
    setDownloadProgress(null);
  };

  // Pagination for backup list
  const totalBackupPages = Math.max(1, Math.ceil(backupList.length / BACKUP_PAGE_SIZE));
  const safeBackupPage   = Math.min(backupPage, Math.max(0, totalBackupPages - 1));
  const paginatedBackup  = backupList.slice(safeBackupPage * BACKUP_PAGE_SIZE, (safeBackupPage + 1) * BACKUP_PAGE_SIZE);

  // Group backup list by category for summary
  const backupByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of backupList) map[f.category] = (map[f.category] ?? 0) + 1;
    return map;
  }, [backupList]);

  const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1 GB (Supabase Free Tier)
  
  return (
    <div className="space-y-5">
      {/* ── Stats hero ── */}
      {statsLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-line shadow-card p-5 space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-7 w-14 rounded" />
            </div>
          ))}
        </div>
      ) : statsError ? (
        <Card>
          <div className="flex items-center gap-3 text-danger-600">
            <Icon name="warning" className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm">{t("owner.storage.statsLoadFailed")}</div>
              <div className="text-xs text-ink-mute mt-0.5">{t("owner.storage.statsLoadFailedSub")}</div>
            </div>
            <Btn variant="ghost" size="sm" icon="refresh" onClick={loadStats}>{t("common.actions.retry")}</Btn>
          </div>
        </Card>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-ocean-700 text-white rounded-2xl shadow-card p-5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-wave-500/30 blur-2xl" />
            <div className="relative">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-wave-200 text-[10px] uppercase tracking-widest font-bold">{t("owner.storage.totalSize")}</div>
                  <div className="font-display font-bold text-2xl mt-1">{fmtBytes(stats.totalSize)} <span className="text-sm font-medium text-white/70">{t("owner.storage.storageUnitLimit")}</span></div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-xl">{((stats.totalSize / STORAGE_LIMIT) * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-white/70 uppercase tracking-widest font-bold">{t("owner.storage.usedLabel")}</div>
                </div>
              </div>
              <div className="h-1.5 w-full bg-black/20 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-wave-400 rounded-full" style={{ width: `${Math.min((stats.totalSize / STORAGE_LIMIT) * 100, 100)}%` }} />
              </div>
              <div className="text-white/60 text-xs mt-2">{t("owner.storage.totalSizeSub")}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("owner.storage.totalFiles")}</div>
            <div className="font-display font-bold text-2xl text-ink mt-1 tabular-nums">{stats.totalCount.toLocaleString("id-ID")}</div>
            <div className="text-xs text-ink-mute mt-1">{t("owner.storage.activeCategoriesSub", { count: stats.categories.filter(c => c.count > 0).length })}</div>
          </div>
          <div className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("owner.storage.updatedAt")}</div>
            <div className="font-semibold text-ink text-sm mt-1">{fmtRelTime(stats.fetchedAt, t)}</div>
            <button
              type="button"
              onClick={loadStats}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ocean-600 hover:underline"
            >
              <Icon name="refresh" className="w-3.5 h-3.5" />
              {t("owner.storage.refreshBtn")}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Distribusi Storage ── */}
      {stats && (
        <Card>
          <SectionTitle sub={t("owner.storage.distributionSub")}>{t("owner.storage.distributionTitle")}</SectionTitle>
          {/* Stacked bar — calculated against STORAGE_LIMIT for realistic usage reflection */}
          <div className="h-4 rounded-full overflow-hidden flex mt-4 mb-5 bg-archive-500/30 relative">
            {stats.categories.map((cat) => {
              const pct = (cat.size / STORAGE_LIMIT) * 100;
              if (pct <= 0 && cat.size === 0) return null;
              return (
                <div
                  key={cat.prefix}
                  style={{ width: `${Math.max(pct, cat.size > 0 ? 0.5 : 0)}%` }}
                  className={`h-full ${categoryColor(cat.prefix)} transition-all`}
                  title={`${cat.label}: ${fmtBytes(cat.size)}`}
                />
              );
            })}
            {stats.totalSize === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-semibold text-ink-faint">{t("owner.storage.noFilesYet")}</span>
              </div>
            )}
          </div>
          {/* Legend + table — same categoryColor() function as the bar, so colors always match */}
          <div className="space-y-0">
            <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-widest font-bold text-ink-faint pb-2 border-b border-line">
              <div className="col-span-2">{t("owner.storage.colCategory")}</div>
              <div className="text-right">{t("owner.storage.colFiles")}</div>
              <div className="text-right">{t("owner.storage.colSize")}</div>
            </div>
            {stats.categories.map((cat) => {
              const pctOfLimit = (cat.size / STORAGE_LIMIT) * 100;
              const pctOfUsed = stats.totalSize > 0 ? (cat.size / stats.totalSize) * 100 : 0;
              const empty = cat.size === 0;
              return (
                <div key={cat.prefix} className={`grid grid-cols-4 gap-2 py-2.5 border-b border-line last:border-0 items-center ${empty ? "opacity-50" : ""}`}>
                  <div className="col-span-2 flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${categoryColor(cat.prefix)}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{cat.label}</div>
                      <div className="h-1 bg-paper-deep rounded-full overflow-hidden mt-0.5 w-24">
                        <div className={`h-full ${categoryColor(cat.prefix)}`} style={{ width: `${Math.max(pctOfUsed, empty ? 0 : 1)}%` }} title={`${pctOfUsed.toFixed(1)}% of total used`} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-ink-soft tabular-nums">{cat.count.toLocaleString("id-ID")}</div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink tabular-nums">{fmtBytes(cat.size)}</div>
                    <div className="text-[10px] text-ink-faint">{empty ? t("owner.storage.emptyBadge") : t("owner.storage.pctOfLimitLabel", { pct: pctOfLimit.toFixed(2) })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Backup System ── */}
      <Card>
        <SectionTitle sub={t("owner.storage.backupSub")}>{t("owner.storage.backupTitle")}</SectionTitle>

        {/* Category selector */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider">{t("owner.storage.selectCategoryLabel")}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setSelectedCats(new Set(["all"])); setBackupLoaded(false); setBackupList([]); setSelectMode(false); setSelectedFiles(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${selectedCats.has("all") ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line text-ink-soft hover:border-ocean-300"}`}
            >
              {t("owner.storage.allCategoriesBtn")}
            </button>
            {BACKUP_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCat(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${!selectedCats.has("all") && selectedCats.has(cat.key) ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line text-ink-soft hover:border-ocean-300"}`}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Load preview button */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Btn variant="soft" size="sm" icon="eye" disabled={backupLoading} onClick={loadBackupList}>
            {backupLoading ? t("owner.storage.loadingFileList") : t("owner.storage.viewFileListBtn")}
          </Btn>
          {backupLoaded && backupList.length > 0 && !selectMode && (
            <Btn variant="ghost" size="sm" icon="check" onClick={() => setSelectMode(true)}>{t("owner.storage.selectFilesBtn")}</Btn>
          )}
          {backupLoaded && (
            <span className="text-sm text-ink-mute">
              {t("owner.storage.filesFoundSummary", { count: backupList.length })}
              {Object.keys(backupByCat).length > 1 && (
                <> · {Object.entries(backupByCat).map(([cat, n]) => `${cat} (${n})`).join(", ")}</>
              )}
            </span>
          )}
        </div>

        {/* Select-mode toolbar */}
        {selectMode && (
          <div className="mt-3 flex items-center gap-3 flex-wrap px-3.5 py-2.5 rounded-xl bg-ocean-50 border border-ocean-100">
            <span className="text-sm font-semibold text-ocean-700">{t("owner.storage.filesSelected", { count: selectedFiles.size })}</span>
            <Btn variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set(backupList.map(f => f.key)))}>{t("owner.storage.selectAllBtn")}</Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelectedFiles(new Set()); }}>{t("owner.storage.cancelBtn")}</Btn>
            <Btn
              variant="danger"
              size="sm"
              icon="trash"
              className="ml-auto"
              disabled={selectedFiles.size === 0 || deleting}
              onClick={deleteSelected}
            >
              {deleting ? t("owner.storage.deletingBtn") : t("owner.storage.deleteSelectedBtn")}
            </Btn>
          </div>
        )}

        {/* File list preview */}
        {backupLoaded && backupList.length > 0 && (
          <div className="mt-4 border border-line rounded-xl overflow-hidden">
            <div className="divide-y divide-line max-h-72 overflow-y-auto no-scrollbar">
              {paginatedBackup.map((f, i) => (
                <div
                  key={`${f.key}-${i}`}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${selectMode ? "cursor-pointer" : ""} ${selectMode && selectedFiles.has(f.key) ? "bg-ocean-50" : "hover:bg-paper-tint"}`}
                  onClick={() => selectMode && toggleFile(f.key)}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(f.key)}
                      onChange={() => toggleFile(f.key)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded shrink-0"
                    />
                  )}
                  <Icon name="archive" className="w-4 h-4 text-ink-faint shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate font-medium"><NoTranslate>{f.label}</NoTranslate></div>
                    <div className="text-[11px] text-ink-faint truncate font-mono">{f.key}</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ocean-50 text-ocean-700 shrink-0">{f.category}</span>
                  {!selectMode && (
                    <button
                      type="button"
                      title={t("owner.storage.deleteFileTitleAttr")}
                      onClick={(e) => { e.stopPropagation(); deleteSingle(f); }}
                      disabled={deletingKey === f.key}
                      className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-mute hover:text-danger-600 transition-colors disabled:opacity-40 shrink-0"
                    >
                      {deletingKey === f.key ? (
                        <Icon name="refresh" className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icon name="trash" className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {totalBackupPages > 1 && (
              <div className="px-4 py-2.5 border-t border-line flex items-center justify-between bg-paper-tint">
                <span className="text-xs text-ink-mute">{t("owner.storage.backupPagination", { count: backupList.length, page: safeBackupPage + 1, total: totalBackupPages })}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={safeBackupPage === 0} onClick={() => setBackupPage(p => p - 1)}
                    className="px-2.5 py-1 rounded-lg border border-line text-xs disabled:opacity-40 hover:bg-white transition">‹</button>
                  <button type="button" disabled={safeBackupPage === totalBackupPages - 1} onClick={() => setBackupPage(p => p + 1)}
                    className="px-2.5 py-1 rounded-lg border border-line text-xs disabled:opacity-40 hover:bg-white transition">›</button>
                </div>
              </div>
            )}
          </div>
        )}

        {backupLoaded && backupList.length === 0 && (
          <div className="mt-4 py-8 text-center text-sm text-ink-mute">
            <Icon name="archive" className="w-8 h-8 text-ink-faint mx-auto mb-2" />
            {t("owner.storage.noFilesFoundForCategory")}
          </div>
        )}

        {/* Download button + progress */}
        <div className="mt-4 space-y-3">
          {downloadProgress ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-ink">{t("owner.storage.downloadingLabel")}</span>
                <span className="text-ink-mute tabular-nums">{downloadProgress.done}/{downloadProgress.total}</span>
              </div>
              <div className="h-2 bg-paper-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-ocean-500 rounded-full transition-all duration-200"
                  style={{ width: `${(downloadProgress.done / downloadProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-ink-mute">{t("owner.storage.zipHint")}</div>
            </div>
          ) : (
            <Btn
              variant="primary"
              icon="download"
              disabled={!backupLoaded || backupList.length === 0 || downloading}
              onClick={downloadBackup}
            >
              {downloading ? t("owner.storage.processingBtn") : (backupLoaded ? t("owner.storage.downloadBackupBtnCount", { count: backupList.length }) : t("owner.storage.downloadBackupBtn"))}
            </Btn>
          )}
        </div>

        {/* Warning note */}
        <div className="mt-4 p-3.5 bg-warn-50 border border-warn-200 rounded-xl flex items-start gap-2.5">
          <Icon name="warning" className="w-4 h-4 text-warn-600 shrink-0 mt-0.5" />
          <div className="text-xs text-warn-700 leading-relaxed">
            <span className="font-semibold">{t("owner.storage.warningTitle")}</span> {t("owner.storage.warningBody")}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Nav items ──────────────────────────────────────────────────────────────────

function buildNavItems(t: (key: string) => string): NavItem[] {
  return [
    { section: t("owner.nav.sectionOverview") },
    { id: "dashboard", label: t("owner.nav.dashboard"), icon: "grid"    },
    { section: t("owner.nav.sectionManagement") },
    { id: "master",    label: t("owner.nav.master"),    icon: "user"    },
    { id: "branches",  label: t("owner.nav.branches"),  icon: "pin"     },
    { id: "schools",   label: t("owner.nav.schools"),   icon: "book"    },
    { id: "accounts",  label: t("owner.nav.accounts"),  icon: "users"   },
    { id: "memberPrivate", label: t("owner.nav.memberPrivate"), icon: "target" },
    { id: "classes",   label: t("owner.nav.classes"),   icon: "swim"    },
    { id: "competitions", label: t("owner.nav.competitions"), icon: "flag" },
    { id: "levels",    label: t("owner.nav.levels"),    icon: "book"    },
    { section: t("owner.nav.sectionFinance") },
    { id: "rates",     label: t("owner.nav.rates"),     icon: "settings"},
    { id: "invoices",  label: t("owner.nav.invoices"),  icon: "invoice" },
    { id: "loans",     label: t("owner.nav.loans"),     icon: "wallet" },
    { id: "financial", label: t("owner.nav.financial"), icon: "chart"   },
    { section: t("owner.nav.sectionContent") },
    { id: "landing",   label: t("owner.nav.landing"),   icon: "star"      },
    { section: t("owner.nav.sectionSystem") },
    { id: "storage",   label: t("owner.nav.storage"),   icon: "archive"   },
    { id: "activity",  label: t("owner.nav.activity"),  icon: "clipboard" },
  ];
}

function buildTitles(t: (key: string) => string): Record<string, [string, string]> {
  return {
    dashboard: [t("owner.titles.dashboard.title"), t("owner.titles.dashboard.sub")],
    master:    [t("owner.titles.master.title"),    t("owner.titles.master.sub")],
    branches:  [t("owner.titles.branches.title"),  t("owner.titles.branches.sub")],
    schools:   [t("owner.titles.schools.title"),   t("owner.titles.schools.sub")],
    accounts:  [t("owner.titles.accounts.title"),  t("owner.titles.accounts.sub")],
    classes:   [t("owner.titles.classes.title"),   t("owner.titles.classes.sub")],
    competitions: [t("owner.titles.competitions.title"), t("owner.titles.competitions.sub")],
    levels:    [t("owner.titles.levels.title"),    t("owner.titles.levels.sub")],
    rates:     [t("owner.titles.rates.title"),     t("owner.titles.rates.sub")],
    invoices:  [t("owner.titles.invoices.title"),  t("owner.titles.invoices.sub")],
    loans:     [t("owner.titles.loans.title"),     t("owner.titles.loans.sub")],
    financial: [t("owner.titles.financial.title"), t("owner.titles.financial.sub")],
    landing:   [t("owner.titles.landing.title"),   t("owner.titles.landing.sub")],
    storage:   [t("owner.titles.storage.title"),   t("owner.titles.storage.sub")],
    activity:  [t("owner.titles.activity.title"),  t("owner.titles.activity.sub")],
  };
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OwnerPage() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useLocale();
  const [active, setActive] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [userId, setUserId] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    const [{ data: branchData }, { data: members }, { data: coaches }, { data: staffData }, { data: classes }] = await Promise.all([
      supabase.from("branches").select("id, name, city, address, lat, lng, status, wa_numbers, bank_name, bank_account, bank_holder, show_payments_to_admin").order("name"),
      supabase.from("members").select("id, branch_id").eq("status", "active"),
      supabase.from("profiles").select("id, branch_id").eq("role", "coach"),
      supabase.from("profiles").select("id, branch_id").eq("role", "staff"),
      supabase.from("classes").select("id, branch_id").eq("status", "active"),
    ]);

    if (branchData) {
      const memberMap = (members ?? []).reduce<Record<string, number>>((acc, m) => {
        if (m.branch_id) acc[m.branch_id] = (acc[m.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const coachMap = (coaches ?? []).reduce<Record<string, number>>((acc, c) => {
        if (c.branch_id) acc[c.branch_id] = (acc[c.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const staffMap = (staffData ?? []).reduce<Record<string, number>>((acc, s) => {
        if (s.branch_id) acc[s.branch_id] = (acc[s.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const classMap = (classes ?? []).reduce<Record<string, number>>((acc, c) => {
        if (c.branch_id) acc[c.branch_id] = (acc[c.branch_id] ?? 0) + 1;
        return acc;
      }, {});

      const flat = branchData.map((b) => ({
        ...b,
        member_count: memberMap[b.id] ?? 0,
        coach_count:  coachMap[b.id]  ?? 0,
        staff_count:  staffMap[b.id]  ?? 0,
        class_count:  classMap[b.id]  ?? 0,
      })) as Branch[];
      setBranches(flat);
    }
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    loadBranches();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const role = user.user_metadata?.role as string | undefined;
      // Owner: auto-recreate profile row if missing (e.g. after DB reset)
      if (role === "owner") {
        await fetch("/api/owner/init-profile", { method: "POST" });
        setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" });
        setUserId(user.id);
        return;
      }
      // Non-owner somehow on owner page
      const { data: prof } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!prof) {
        setInitError(t("owner.shell.notFoundBody"));
        return;
      }
      setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" });
      setUserId(user.id);
    });
  }, [loadBranches]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const ownerName = profile?.full_name ?? "Owner";
  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard branches={branches} />,
    master:    <OwnerMasterData />,
    branches:  <Branches branches={branches} onRefresh={loadBranches} userId={userId} userName={ownerName} />,
    schools:   <OwnerSchools branches={branches} />,
    accounts:  <OwnerAccountsMaster branches={branches} />,
    memberPrivate: <OwnerMemberPrivate branches={branches} />,
    classes:   <Classes branches={branches} />,
    competitions: <AdminCompetition branchId="" />,
    levels:    <OwnerRaporLevels />,
    rates:     <SettingsTarif branches={branches} />,
    invoices:  <Invoices branches={branches} userId={userId} userName={ownerName} />,
    loans:     <CoachLoans branches={branches} userId={userId} userName={ownerName} />,
    financial: <OwnerFinancial branches={branches} userId={userId} userName={ownerName} />,
    landing:   <LandingCMS />,
    storage:   <OwnerStorage userId={userId} userName={ownerName} />,
    activity:  <OwnerActivityLog branches={branches} />,
  };

  const navItems = useMemo(() => buildNavItems(t), [t]);
  const [title, sub] = buildTitles(t)[active] ?? ["Owner", ""];

  const brand = useMemo(() => (
    <div className="flex items-center gap-2.5">
      <Logo size={36} />
      <div className="min-w-0">
        <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">Owner Panel</div>
        <div className="text-[10px] text-ink-mute tracking-wide"><NoTranslate>{profile?.full_name ?? "Owner"}</NoTranslate> · {t("owner.shell.role")}</div>
      </div>
    </div>
  ), [profile?.full_name, t]);

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">{t("owner.shell.notFoundTitle")}</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          {t("owner.shell.backToLogin")}
        </Btn>
      </div>
    </div>
  );

  return (
    <div className="flex bg-paper-tint min-h-screen">
      <Sidebar
        items={navItems}
        active={active}
        onSelect={(id) => { setActive(id); setMobileNav(false); }}
        brand={brand}
        footer={
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint">
            <Icon name="logout" className="w-4 h-4" /> {t("common.actions.logout")}
          </button>
        }
      />

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-line p-3 overflow-y-auto">
            <div className="px-2 py-2 mb-2">{brand}</div>
            {navItems.map((it) =>
              it.section ? (
                <div key={it.section} className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest font-bold text-ink-faint">{it.section}</div>
              ) : (
                <button key={it.id} onClick={() => { setActive(it.id!); setMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                  <Icon name={it.icon!} className="w-4 h-4" />{it.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          sub={sub}
          search={t("owner.shell.searchPlaceholder")}
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <GoogleLanguageSwitcher />
              <Bell userId={userId} />
              <Avatar name={profile?.full_name ?? "O"} size={36} />
            </>
          }
        />
        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7">
          {pages[active]}
        </main>
      </div>

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="owner" />}
    </div>
  );
}
