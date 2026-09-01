"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import OwnerAccountDetail, { type AccountProfile } from "./OwnerAccountDetail";
import {
  downloadBulkQRZip,
  downloadSingleQRCard,
  printQRCardSheet,
  type QRCardAccount,
} from "@/lib/qrCardGenerator";

type RoleFilter = "all" | "owner" | "admin" | "coach" | "member" | "school" | "staff";
type CreatableRole = "admin" | "coach" | "member" | "school" | "staff";

const EMPTY_FORM = {
  role: "staff" as CreatableRole,
  full_name: "",
  email: "",
  phone: "",
  branch_id: "",
  password: "",
  custom_role_label: "",
  member_type: "reguler" as "reguler" | "private" | "school_affiliate",
  school_id: "",
  total_sessions: "",
};

export default function OwnerAccountsMaster({ branches }: { branches: { id: string; name: string }[] }) {
  const { t } = useLocale();
  const toast = useToast();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<AccountProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);

  const [selected, setSelected] = useState<AccountProfile | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoCreateStaff, setAutoCreateStaff] = useState(false);
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // ── Batch QR Download State ──────────────────────────────────────────────────
  const [qrSelectMode, setQrSelectMode] = useState(false);
  const [selectedQRIds, setSelectedQRIds] = useState<Set<string>>(new Set());
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrProgress, setQrProgress] = useState<{ current: number; total: number } | null>(null);

  // Quick Preset Download Modal
  const [showQuickDownloadModal, setShowQuickDownloadModal] = useState(false);
  const [quickRole, setQuickRole] = useState<RoleFilter>("all");
  const [quickBranch, setQuickBranch] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, role, custom_role_label, branch_id, avatar_url, birth_date, gender, address, bank_name, bank_account, bank_holder, user_no, qr_code, is_archived, created_at, specialization, bio, branch:branches(id, name), members:members!members_profile_id_fkey(id, member_no, qr_code, type, status, remaining_sessions, total_sessions, school_id, date_start)"
      )
      .order("full_name");
    if (roleFilter !== "all") q = q.eq("role", roleFilter);
    if (branchFilter) q = q.eq("branch_id", branchFilter);
    const { data } = await q;
    if (data) setAccounts(data as unknown as AccountProfile[]);
    setLoading(false);
  }, [supabase, roleFilter, branchFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from("schools")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSchools(data);
      });
  }, [supabase]);

  const roleLabel = (role: string) =>
    ({
      owner: t("owner.accounts.roleOwner"),
      admin: t("owner.accounts.roleAdmin"),
      coach: t("owner.accounts.roleCoach"),
      member: t("owner.accounts.roleMember"),
      school: t("owner.accounts.roleSchool"),
      staff: t("owner.accounts.roleStaff"),
    })[role] ?? role;

  const filtered = useMemo(() => {
    return accounts
      .filter((a) => showArchived || !a.is_archived)
      .filter((a) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        const nameMatch = (a.full_name ?? "").toLowerCase().includes(s);
        const emailMatch = (a.email ?? "").toLowerCase().includes(s);
        const roleMatch = roleLabel(a.role).toLowerCase().includes(s);
        const branchMatch = (a.branch?.name ?? "").toLowerCase().includes(s);
        const userNoMatch = (a.user_no ?? "").toLowerCase().includes(s);
        const memberNoMatch = (a.members && a.members[0]?.member_no?.toLowerCase().includes(s)) || false;
        return nameMatch || emailMatch || roleMatch || branchMatch || userNoMatch || memberNoMatch;
      });
  }, [accounts, showArchived, search]);

  // Map account to QRCardAccount format
  const toQRCardAccount = (a: AccountProfile): QRCardAccount => {
    const m = a.members && a.members[0];
    return {
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      role: a.role,
      custom_role_label: a.custom_role_label,
      user_no: a.user_no,
      member_no: m?.member_no,
      member_type: m?.type,
      qr_code: m?.qr_code || a.qr_code || m?.member_no || a.user_no || a.id,
      branch: a.branch,
      phone: a.phone,
    };
  };

  // Toggle selection for a single account
  const toggleSelectAccount = (id: string) => {
    setSelectedQRIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all currently filtered accounts
  const toggleSelectAllFiltered = () => {
    if (filtered.length === 0) return;
    const allSelected = filtered.every((a) => selectedQRIds.has(a.id));
    if (allSelected) {
      setSelectedQRIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedQRIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  // ── Batch Downloads ─────────────────────────────────────────────────────────
  const handleDownloadSelectedZip = async () => {
    const selectedAccounts = accounts.filter((a) => selectedQRIds.has(a.id)).map(toQRCardAccount);
    if (selectedAccounts.length === 0) return toast.error("Pilih setidaknya 1 akun untuk diunduh.");

    setGeneratingQR(true);
    setQrProgress({ current: 0, total: selectedAccounts.length });

    try {
      const zipName = `NEXT-QR-Selected-${selectedAccounts.length}-Akun-${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadBulkQRZip(selectedAccounts, zipName, (curr, tot) => {
        setQrProgress({ current: curr, total: tot });
      });
      toast.success("Berhasil mengunduh ZIP!", `${selectedAccounts.length} file QR code tersimpan.`);
      setQrSelectMode(false);
      setSelectedQRIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat file ZIP");
    }

    setGeneratingQR(false);
    setQrProgress(null);
  };

  const handlePrintSelectedSheet = async () => {
    const selectedAccounts = accounts.filter((a) => selectedQRIds.has(a.id)).map(toQRCardAccount);
    if (selectedAccounts.length === 0) return toast.error("Pilih setidaknya 1 akun untuk dicetak.");

    try {
      await printQRCardSheet(selectedAccounts);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuka jendela cetak");
    }
  };

  // ── Quick Preset Downloads ──────────────────────────────────────────────────
  const handleExecuteQuickDownload = async (format: "zip" | "print") => {
    let target = accounts;
    if (quickRole !== "all") target = target.filter((a) => a.role === quickRole);
    if (quickBranch !== "all") target = target.filter((a) => a.branch_id === quickBranch);

    if (target.length === 0) {
      return toast.error("Tidak ada akun yang cocok dengan filter yang dipilih.");
    }

    const cardAccounts = target.map(toQRCardAccount);

    if (format === "print") {
      setShowQuickDownloadModal(false);
      await printQRCardSheet(cardAccounts);
      return;
    }

    setShowQuickDownloadModal(false);
    setGeneratingQR(true);
    setQrProgress({ current: 0, total: cardAccounts.length });

    try {
      const roleStr = quickRole !== "all" ? quickRole.toUpperCase() : "ALL-ROLES";
      const branchObj = branches.find((b) => b.id === quickBranch);
      const branchStr = branchObj ? branchObj.name.replace(/\s+/g, "-") : "ALL-BRANCHES";
      const zipName = `NEXT-QR-${roleStr}-${branchStr}-${new Date().toISOString().slice(0, 10)}.zip`;

      await downloadBulkQRZip(cardAccounts, zipName, (curr, tot) => {
        setQrProgress({ current: curr, total: tot });
      });
      toast.success("Berhasil mengunduh ZIP!", `${cardAccounts.length} file QR code tersimpan.`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat file ZIP");
    }

    setGeneratingQR(false);
    setQrProgress(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setAutoCreateStaff(false);
    setStaffFullName("");
    setStaffEmail("");
    setStaffPassword("");
    setShowAdd(true);
  };

  const saveNewAccount = async () => {
    if (!form.full_name || !form.email || !form.password || !form.branch_id) {
      return toast.error(t("owner.accounts.allFieldsRequired"));
    }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        branch_id: form.branch_id,
        phone: form.phone || undefined,
        custom_role_label:
          form.role === "staff" || form.role === "admin" ? form.custom_role_label || undefined : undefined,
        ...(form.role === "member"
          ? {
              member_type: form.member_type,
              school_id: form.member_type === "school_affiliate" ? form.school_id || undefined : undefined,
              total_sessions: form.member_type === "private" ? Number(form.total_sessions) || undefined : undefined,
            }
          : {}),
        ...(form.role === "admin" && autoCreateStaff && staffEmail && staffPassword
          ? { auto_staff: { email: staffEmail, password: staffPassword, full_name: staffFullName.trim() || undefined } }
          : {}),
      }),
    });
    const json = (await res.json()) as { error?: string; code?: string; user_id?: string; staff_warning?: string };
    if (!res.ok) {
      const isEmailTaken = json.code === "EMAIL_TAKEN";
      toast.error(isEmailTaken ? t("owner.accounts.emailTaken") : t("owner.accounts.createFailed"), json.error);
      setSaving(false);
      return;
    }
    if (json.staff_warning) {
      toast.error("Perhatian", json.staff_warning);
    }
    if (form.role === "school" && json.user_id) {
      await supabase.from("schools").insert({
        branch_id: form.branch_id,
        profile_id: json.user_id,
        name: form.full_name,
        email: form.email,
      });
    }
    setSaving(false);
    toast.success(t("owner.accounts.created"), t("owner.accounts.createdSub"));
    setShowAdd(false);
    load();
  };

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selectedQRIds.has(a.id));

  return (
    <div className="space-y-5">
      {/* ── Top Action Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("owner.accounts.searchPlaceholder")}
            className="!w-56"
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="!w-40"
          >
            <option value="all">{t("owner.accounts.roleFilterAll")}</option>
            <option value="owner">{t("owner.accounts.roleOwner")}</option>
            <option value="admin">{t("owner.accounts.roleAdmin")}</option>
            <option value="coach">{t("owner.accounts.roleCoach")}</option>
            <option value="member">{t("owner.accounts.roleMember")}</option>
            <option value="school">{t("owner.accounts.roleSchool")}</option>
            <option value="staff">{t("owner.accounts.roleStaff")}</option>
          </Select>
          <Select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="!w-40"
          >
            <option value="">{t("owner.accounts.branchFilterAll")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-1.5 text-sm text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            {t("owner.accounts.showArchivedToggle")}
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick QR Download Preset Button */}
          <Btn
            variant="outline"
            icon="qr"
            onClick={() => {
              setQuickRole(roleFilter);
              setQuickBranch(branchFilter || "all");
              setShowQuickDownloadModal(true);
            }}
          >
            Unduh Cepat QR
          </Btn>

          {/* Toggle Checkbox Select Mode */}
          <Btn
            variant={qrSelectMode ? "soft" : "outline"}
            icon="check"
            onClick={() => {
              setQrSelectMode((prev) => !prev);
              if (qrSelectMode) setSelectedQRIds(new Set());
            }}
          >
            {qrSelectMode ? "Selesai Memilih" : "Mode Unduh QR"}
          </Btn>

          <Btn variant="primary" icon="plus" onClick={openCreate}>
            {t("owner.accounts.addAccountBtn")}
          </Btn>
        </div>
      </div>

      {/* ── Floating Batch Action Bar (When in QR Select Mode) ── */}
      {qrSelectMode && (
        <div className="bg-ocean-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border border-ocean-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-ocean-800 text-ocean-300 flex items-center justify-center font-bold text-sm">
              {selectedQRIds.size}
            </span>
            <div>
              <div className="font-bold text-sm">
                {selectedQRIds.size > 0
                  ? `${selectedQRIds.size} Akun Terpilih`
                  : "Pilih akun pada tabel untuk mengunduh QR Code"}
              </div>
              <div className="text-xs text-ocean-300">
                {filtered.length} akun cocok dengan filter saat ini
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Btn
              variant="soft"
              size="sm"
              onClick={toggleSelectAllFiltered}
              className="!bg-ocean-800 !text-white hover:!bg-ocean-700"
            >
              {isAllFilteredSelected
                ? "Batalkan Pilihan Terfilter"
                : `Pilih Semua Terfilter (${filtered.length})`}
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              icon="download"
              disabled={selectedQRIds.size === 0 || generatingQR}
              onClick={handleDownloadSelectedZip}
            >
              {generatingQR ? "Menghasilkan…" : `Unduh ZIP (${selectedQRIds.size})`}
            </Btn>
            <Btn
              variant="soft"
              size="sm"
              icon="print"
              disabled={selectedQRIds.size === 0 || generatingQR}
              onClick={handlePrintSelectedSheet}
              className="!bg-ocean-800 !text-white hover:!bg-ocean-700"
            >
              Cetak Lembar A4
            </Btn>
            <button
              onClick={() => {
                setQrSelectMode(false);
                setSelectedQRIds(new Set());
              }}
              className="text-xs text-ocean-300 hover:text-white underline ml-2"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ── Master Data Accounts Table ── */}
      <Card padded={false}>
        {loading ? (
          <div className="p-10 text-center text-ink-mute">{t("owner.accounts.loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                  {qrSelectMode && (
                    <th className="py-3 pl-5 pr-2 w-10 text-left">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-5 font-bold">{t("owner.accounts.colName")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.accounts.colRole")}</th>
                  <th className="text-left py-3 font-bold hidden sm:table-cell">ID &amp; QR</th>
                  <th className="text-left py-3 font-bold hidden md:table-cell">{t("owner.accounts.colBranch")}</th>
                  <th className="text-left py-3 font-bold">{t("owner.accounts.colStatus")}</th>
                  <th className="text-right py-3 pr-5 font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((a) => {
                  const displayName = a.full_name?.trim() || a.email?.split("@")[0] || roleLabel(a.role) || "—";
                  const m = a.members && a.members[0];
                  const code = m?.member_no || a.user_no || a.qr_code || a.id.slice(0, 8).toUpperCase();
                  const isChecked = selectedQRIds.has(a.id);

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-paper-tint cursor-pointer transition-colors ${
                        qrSelectMode && isChecked ? "bg-ocean-50/70" : ""
                      }`}
                      onClick={() => {
                        if (qrSelectMode) toggleSelectAccount(a.id);
                        else setSelected(a);
                      }}
                    >
                      {qrSelectMode && (
                        <td className="py-3.5 pl-5 pr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectAccount(a.id)}
                            className="w-4 h-4 rounded accent-ocean-600 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={displayName} src={a.avatar_url ?? undefined} size={36} />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink-strong truncate max-w-[160px] sm:max-w-none">
                              {displayName}
                            </div>
                            <div className="text-xs text-ink-mute truncate max-w-[160px] sm:max-w-none">
                              {a.email ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-ink-soft">
                        <span className="font-medium">{roleLabel(a.role)}</span>
                        {a.custom_role_label && !a.custom_role_label.includes("@") && (
                          <span className="text-ink-faint text-xs"> · {a.custom_role_label}</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-ocean-700 bg-ocean-50 px-2 py-0.5 rounded border border-ocean-200">
                            {code}
                          </span>
                        </div>
                      </td>
                      <td className="text-ink-soft hidden md:table-cell">{a.branch?.name ?? "—"}</td>
                      <td>
                        {a.is_archived ? (
                          <Status kind="archived">{t("owner.accountDetail.inactiveBadge")}</Status>
                        ) : (
                          <Status kind="active">{t("owner.accountDetail.activeBadge")}</Status>
                        )}
                      </td>
                      <td className="text-right pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => downloadSingleQRCard(toQRCardAccount(a))}
                            className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-ocean-50 text-ink-mute hover:text-ocean-700 flex items-center justify-center transition-colors"
                            title="Unduh ID Card (PNG)"
                          >
                            <Icon name="download" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelected(a)}
                            className="w-8 h-8 rounded-lg border border-line bg-white hover:bg-paper-tint text-ink-mute hover:text-ink-strong flex items-center justify-center transition-colors"
                            title="Lihat Detail Akun"
                          >
                            <Icon name="eye" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={qrSelectMode ? 7 : 6} className="text-center py-10 text-ink-mute">
                      {t("owner.accounts.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Detail Modal ── */}
      <OwnerAccountDetail
        account={selected}
        branches={branches}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRefresh={load}
      />

      {/* ── Modal: Quick Batch Download Preset ── */}
      <Modal
        open={showQuickDownloadModal}
        onClose={() => setShowQuickDownloadModal(false)}
        title="Unduh Cepat QR Code Akun"
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Btn variant="ghost" onClick={() => setShowQuickDownloadModal(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="soft" icon="print" onClick={() => handleExecuteQuickDownload("print")}>
              Cetak Lembar A4
            </Btn>
            <Btn variant="primary" icon="download" onClick={() => handleExecuteQuickDownload("zip")}>
              Unduh ZIP
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Pilih filter role atau cabang untuk mengunduh semua QR Code sekaligus tanpa harus mencentang manual.
          </p>

          <Field label="Filter Role">
            <Select value={quickRole} onChange={(e) => setQuickRole(e.target.value as RoleFilter)}>
              <option value="all">Semua Role</option>
              <option value="coach">Semua Coach</option>
              <option value="member">Semua Member</option>
              <option value="staff">Semua Staff</option>
              <option value="admin">Semua Admin</option>
              <option value="school">Semua Sekolah</option>
            </Select>
          </Field>

          <Field label="Filter Cabang">
            <Select value={quickBranch} onChange={(e) => setQuickBranch(e.target.value)}>
              <option value="all">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="p-3 bg-paper-tint rounded-xl border border-line text-xs text-ink-mute space-y-1">
            <div className="font-semibold text-ink">Format Gambar yang Dihasilkan:</div>
            <div>• Setiap kartu ID dilengkapi nama, role badge, nomor identitas, dan QR Code.</div>
            <div>
              • Penamaan file otomatis:{" "}
              <code className="font-mono text-ocean-700 bg-white px-1 rounded">
                [ROLE]_[NAMA]_[USER_NO].png
              </code>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Batch QR Generation Progress ── */}
      <Modal open={generatingQR && qrProgress !== null} onClose={() => {}} title="Membuat File ZIP..." size="sm">
        <div className="py-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center animate-pulse">
            <Icon name="download" className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-ink">
              Sedang Menghasilkan Kartu QR...
            </div>
            <div className="text-xs text-ink-mute mt-1">
              Memproses {qrProgress?.current || 0} dari {qrProgress?.total || 0} akun
            </div>
          </div>
          {qrProgress && (
            <div className="w-full bg-paper-deep rounded-full h-2 overflow-hidden border border-line">
              <div
                className="bg-ocean-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(qrProgress.current / qrProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Add New Account ── */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t("owner.accounts.createModalTitle")}
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>
              {t("common.actions.cancel")}
            </Btn>
            <Btn variant="primary" onClick={saveNewAccount} disabled={saving}>
              {saving ? t("common.actions.saving") : t("owner.accounts.addAccountBtn")}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("owner.accounts.fieldAccountType")} required>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreatableRole }))}
            >
              <option value="admin">{t("owner.accounts.roleAdmin")}</option>
              <option value="coach">{t("owner.accounts.roleCoach")}</option>
              <option value="member">{t("owner.accounts.roleMember")}</option>
              <option value="school">{t("owner.accounts.roleSchool")}</option>
              <option value="staff">{t("owner.accounts.roleStaff")}</option>
            </Select>
          </Field>
          <Field label={t("owner.accounts.fieldFullName")} required>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              autoComplete="off"
            />
          </Field>
          <Field label={t("owner.accounts.fieldEmail")} required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
            />
          </Field>
          <Field label={t("owner.accounts.fieldPhone")}>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="08xxxxxxxxxx"
              autoComplete="off"
            />
          </Field>
          <Field label={t("owner.accounts.fieldBranch")} required>
            <Select
              value={form.branch_id}
              onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="" disabled>
                {t("owner.accounts.fieldBranchPlaceholder")}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          {(form.role === "staff" || form.role === "admin") && (
            <Field
              label={t("owner.accounts.fieldCustomRoleLabel")}
              hint={t("owner.accounts.customRoleLabelHint")}
            >
              <Input
                value={form.custom_role_label}
                onChange={(e) => setForm((f) => ({ ...f, custom_role_label: e.target.value }))}
                placeholder={t("owner.accounts.customRoleLabelPlaceholder")}
                autoComplete="off"
              />
            </Field>
          )}
          {form.role === "admin" && (
            <div className="rounded-xl border border-line bg-paper-tint p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Buat akun Staff otomatis</p>
                  <p className="text-xs text-ink-mute mt-0.5">
                    Admin juga mendapat akun Staff terpisah untuk absen &amp; payslip
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCreateStaff((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
                    autoCreateStaff ? "bg-ocean-600" : "bg-line"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                      autoCreateStaff ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {autoCreateStaff && (
                <>
                  <Field label="Nama Staff" hint="Opsional, contoh: Dewi (Staff)">
                    <Input
                      value={staffFullName}
                      onChange={(e) => setStaffFullName(e.target.value)}
                      placeholder="Nama staff..."
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Email akun Staff" required>
                    <Input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="staff@example.com"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Password akun Staff" required>
                    <Input
                      type="password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Min 8 karakter"
                      autoComplete="new-password"
                    />
                  </Field>
                </>
              )}
            </div>
          )}
          {form.role === "member" && (
            <>
              <Field label={t("owner.accounts.fieldMemberType")}>
                <Select
                  value={form.member_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, member_type: e.target.value as typeof f.member_type }))
                  }
                >
                  <option value="reguler">{t("owner.accounts.memberTypeRegular")}</option>
                  <option value="private">{t("owner.accounts.memberTypePrivate")}</option>
                  <option value="school_affiliate">{t("owner.accounts.memberTypeSchoolAffiliate")}</option>
                </Select>
              </Field>
              {form.member_type === "school_affiliate" && (
                <Field label={t("owner.accounts.fieldSchool")}>
                  <Select
                    value={form.school_id}
                    onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
                  >
                    <option value="">{t("owner.accounts.fieldSchoolPlaceholder")}</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {form.member_type === "private" && (
                <Field label={t("owner.accounts.fieldTotalSessions")}>
                  <Input
                    type="number"
                    min={0}
                    value={form.total_sessions}
                    onChange={(e) => setForm((f) => ({ ...f, total_sessions: e.target.value }))}
                  />
                </Field>
              )}
            </>
          )}
          <Field
            label={t("owner.accounts.fieldPassword")}
            required
            hint={t("owner.accounts.fieldPasswordHint")}
          >
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors"
              >
                <Icon name={showPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
