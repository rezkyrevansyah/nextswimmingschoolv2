"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { FinancialRow, ManualTxnRow, IncomeRow, ManualTxnCategory, FinTab } from "./_types";

const PAGE_SIZE = 25;

export function useAdminFinancialData({ branchId, userId, userName }: { branchId: string; userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();
  const [tab, setTab] = useState<FinTab>("income");

  const [bills, setBills] = useState<FinancialRow[]>([]);
  const [manualTxns, setManualTxns] = useState<ManualTxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"paid_at" | "created_at" | "total">("paid_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch ALL bills for this branch, paginated — a hard .limit() here would
    // silently drop older rows once a branch accumulates more history than
    // the cap, making the financial totals below quietly wrong.
    const PAGE = 1000;
    const all: FinancialRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data } = await supabase
        .from("bills")
        .select("id, member_id, class_id, period_label, amount, discount, total, status, type, paid_at, paid_method, created_at, member:members(profile:profiles(full_name)), class:classes(name)")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as FinancialRow[]));
      if (data.length < PAGE) break;
    }
    setBills(all);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadManualTxns = useCallback(async () => {
    const { data } = await supabase.from("manual_transactions")
      .select("id, branch_id, kind, category, description, amount, occurred_at, notes, is_reimburse, proof_url")
      .eq("branch_id", branchId)
      .order("occurred_at", { ascending: false });
    if (data) setManualTxns(data as unknown as ManualTxnRow[]);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [categories, setCategories] = useState<ManualTxnCategory[]>([]);
  const categoriesByKind = (kind: "income" | "expense") => categories.filter(c => c.kind === kind);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    load();
    loadManualTxns();
    supabase.from("classes").select("id, name").eq("branch_id", branchId).order("name")
      .then(({ data }) => { if (data) setClassList(data as { id: string; name: string }[]); });
    supabase.from("manual_transaction_categories").select("id, kind, name, sort_order").order("sort_order")
      .then(({ data }) => { if (data) setCategories(data as unknown as ManualTxnCategory[]); });
  }, [load, loadManualTxns]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset page on any filter change
  useEffect(() => { setPage(0); }, [search, filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo]);

  const manualIncome = useMemo(() => manualTxns.filter(t => t.kind === "income"), [manualTxns]);
  const manualExpense = useMemo(() => manualTxns.filter(t => t.kind === "expense"), [manualTxns]);

  const filtered = useMemo(() => {
    let r: IncomeRow[] = [
      ...bills.map(b => ({ ...b, source: "bill" as const })),
      ...manualIncome.map(t => ({ ...t, source: "manual" as const })),
    ];
    if (filterStatus) r = r.filter(row => row.source === "manual" || row.status === filterStatus);
    if (filterType)   r = r.filter(row => row.source === "manual" || row.type === filterType);
    if (filterClass)  r = r.filter(row => row.source === "manual" || row.class_id === filterClass);
    if (filterMethod) r = r.filter(row => row.source === "manual" || (row.paid_method ?? "").toLowerCase() === filterMethod);
    if (filterDateFrom) r = r.filter(row => (row.source === "manual" ? row.occurred_at : (row.paid_at ?? row.created_at)).slice(0, 10) >= filterDateFrom);
    if (filterDateTo)   r = r.filter(row => (row.source === "manual" ? row.occurred_at : (row.paid_at ?? row.created_at)).slice(0, 10) <= filterDateTo);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(row => row.source === "manual"
        ? row.description.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q)
        : row.member?.profile?.full_name?.toLowerCase().includes(q) || row.period_label.toLowerCase().includes(q) || (row.class?.name ?? "").toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b2) => {
      const va = sortBy === "total" ? (a.source === "manual" ? a.amount : a.total ?? 0) : (a.source === "manual" ? a.occurred_at : (a[sortBy] ?? ""));
      const vb = sortBy === "total" ? (b2.source === "manual" ? b2.amount : b2.total ?? 0) : (b2.source === "manual" ? b2.occurred_at : (b2[sortBy] ?? ""));
      if (va === vb) return 0;
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [bills, manualIncome, search, filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activeFilterCount = [filterStatus, filterType, filterClass, filterMethod, filterDateFrom, filterDateTo].filter(Boolean).length;
  const resetFilters = () => { setFilterStatus(""); setFilterType(""); setFilterClass(""); setFilterMethod(""); setFilterDateFrom(""); setFilterDateTo(""); };

  // Summary stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const paidBills = bills.filter(b => b.status === "paid");
  const unpaidBills = bills.filter(b => b.status === "unpaid" || b.status === "partial");
  const totalPaid = paidBills.reduce((a, b) => a + (b.total ?? 0), 0) + manualIncome.reduce((a, t) => a + t.amount, 0);
  const totalUnpaid = unpaidBills.reduce((a, b) => a + (b.total ?? 0), 0);
  const totalDiscount = bills.reduce((a, b) => a + (b.discount ?? 0), 0);
  const thisMonthPaid = paidBills.filter(b => (b.paid_at ?? b.created_at).startsWith(thisMonth));
  const thisMonthManual = manualIncome.filter(t => t.occurred_at.startsWith(thisMonth));
  const thisMonthTotal = thisMonthPaid.reduce((a, b) => a + (b.total ?? 0), 0) + thisMonthManual.reduce((a, t) => a + t.amount, 0);
  const totalExpenseManual = manualExpense.reduce((a, t) => a + t.amount, 0);

  const typeLabel = (ty: string) => ({ monthly: t("admin.pembayaran.typeMonthly"), session_pack: t("admin.pembayaran.typeSessionPack"), custom: t("admin.pembayaran.typeCustom"), package: t("admin.financial.typePackage") }[ty] ?? ty);
  const statusKind = (s: string): "paid" | "unpaid" | "school_covered" | "pending" => ({ paid: "paid", unpaid: "unpaid", partial: "pending", school_covered: "school_covered", free: "paid" }[s] as "paid" | "unpaid" | "school_covered" | "pending" ?? "unpaid");
  const statusLabel = (s: string) => ({ paid: t("admin.pembayaran.statusPaid"), unpaid: t("admin.pembayaran.statusUnpaid"), partial: t("admin.pembayaran.statusPartial"), school_covered: t("admin.pembayaran.statusSchoolCovered"), free: t("admin.pembayaran.statusFree") }[s] ?? s);

  // ── Manual transaction CRUD ──────────────────────────────────────────────────
  const [showTxnModal, setShowTxnModal] = useState<{ kind: "income" | "expense"; edit: ManualTxnRow | null } | null>(null);
  const [txnForm, setTxnForm] = useState({ category: "", categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
  const [savingTxn, setSavingTxn] = useState(false);

  const openAddTxn = (kind: "income" | "expense") => {
    const names = categoriesByKind(kind).map(c => c.name);
    setTxnForm({ category: names[0] ?? "Lainnya", categoryOther: "", description: "", amount: "", occurred_at: new Date().toISOString().slice(0, 10), notes: "", isReimburse: false, proofUrl: "" });
    setShowTxnModal({ kind, edit: null });
  };

  const openEditTxn = (row: ManualTxnRow) => {
    const names = categoriesByKind(row.kind).map(c => c.name);
    const knownCategory = names.includes(row.category ?? "") ? (row.category ?? names[0] ?? "Lainnya") : "Lainnya";
    setTxnForm({
      category: knownCategory, categoryOther: knownCategory === "Lainnya" ? (row.category ?? "") : "",
      description: row.description, amount: String(row.amount), occurred_at: row.occurred_at, notes: row.notes ?? "",
      isReimburse: row.is_reimburse, proofUrl: row.proof_url ?? "",
    });
    setShowTxnModal({ kind: row.kind, edit: row });
  };

  const saveTxn = async () => {
    if (!showTxnModal) return;
    if (!txnForm.description.trim()) return toast.error(t("admin.financial.descriptionRequired"));
    const amount = Number(txnForm.amount || 0);
    if (!amount || amount <= 0) return toast.error(t("admin.financial.invalidAmount"));
    if (txnForm.isReimburse && !txnForm.proofUrl.trim()) return toast.error(t("admin.financial.proofLinkRequired"));
    const category = txnForm.category === "Lainnya" ? (txnForm.categoryOther.trim() || "Lainnya") : txnForm.category;

    setSavingTxn(true);
    const payload = {
      branch_id: branchId, kind: showTxnModal.kind, category, description: txnForm.description.trim(),
      amount, occurred_at: txnForm.occurred_at, notes: txnForm.notes.trim() || null,
      is_reimburse: txnForm.isReimburse, proof_url: txnForm.isReimburse ? txnForm.proofUrl.trim() : null,
    };
    const isEdit = !!showTxnModal.edit;
    const { error } = isEdit
      ? await supabase.from("manual_transactions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", showTxnModal.edit!.id)
      : await supabase.from("manual_transactions").insert({ ...payload, created_by: userId, created_by_role: "admin" });
    setSavingTxn(false);
    if (error) return toast.error(isEdit ? t("admin.financial.txnSaveFailed") : t("admin.financial.txnAddFailed"), error.message);
    toast.success(isEdit ? t("admin.financial.txnUpdatedToast") : t("admin.financial.txnAddedToast"));
    logActivity(supabase, {
      userId, userRole: "admin", userName, branchId, entityType: "manual_transactions",
      entityId: showTxnModal.edit?.id ?? "new", action: isEdit ? "update" : "create",
      label: t(isEdit ? "admin.financial.activityTxnUpdated2" : "admin.financial.activityTxnAdded2", {
        kind: t(showTxnModal.kind === "income" ? "admin.financial.kindIncome" : "admin.financial.kindExpense"),
        description: txnForm.description.trim(), amount: fmtIDR(amount),
      }),
      meta: { amount, category },
    });
    setShowTxnModal(null);
    loadManualTxns();
  };

  const deleteTxn = async (row: ManualTxnRow) => {
    const ok = await confirm({ title: t("admin.financial.deleteConfirmTitle2"), body: t("admin.financial.deleteConfirmBody2", { description: row.description, amount: fmtIDR(row.amount) }), confirmLabel: t("common.actions.delete"), danger: true });
    if (!ok) return;
    const { error } = await supabase.from("manual_transactions").delete().eq("id", row.id);
    if (error) return toast.error(t("admin.financial.deleteFailedGeneric"), error.message);
    toast.success(t("admin.financial.txnDeletedToast"));
    logActivity(supabase, {
      userId, userRole: "admin", userName, branchId, entityType: "manual_transactions",
      entityId: row.id, action: "delete", label: t("admin.financial.activityTxnDeleted2", {
        kind: t(row.kind === "income" ? "admin.financial.kindIncome" : "admin.financial.kindExpense"),
        description: row.description, amount: fmtIDR(row.amount),
      }),
    });
    setManualTxns(prev => prev.filter(t => t.id !== row.id));
  };

  return {
    tab, setTab, bills, manualTxns, loading, load, loadManualTxns,
    search, setSearch, filterStatus, setFilterStatus, filterType, setFilterType, filterClass, setFilterClass,
    filterMethod, setFilterMethod, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
    showFilters, setShowFilters, sortBy, setSortBy, sortDir, setSortDir, page, setPage, PAGE_SIZE, classList,
    manualIncome, manualExpense, filtered, totalPages, safePage, paginated,
    activeFilterCount, resetFilters,
    thisMonth, paidBills, unpaidBills, totalPaid, totalUnpaid, totalDiscount, thisMonthPaid, thisMonthManual, thisMonthTotal, totalExpenseManual,
    typeLabel, statusKind, statusLabel,
    showTxnModal, setShowTxnModal, txnForm, setTxnForm, savingTxn,
    openAddTxn, openEditTxn, saveTxn, deleteTxn, categoriesByKind,
  };
}
