"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Switch } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Branch } from "../_types";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-xl border border-line bg-paper-tint flex items-center justify-center text-xs text-ink-mute">Loading map...</div>,
});

export default function OwnerBranches({ branches, onRefresh, userId, userName }: { branches: Branch[]; onRefresh: () => void; userId: string; userName: string }) {
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

  const toggleShowPaymentsToAdmin = async (b: Branch) => {
    const nextVal = !b.show_payments_to_admin;
    const { error } = await supabase
      .from("branches")
      .update({ show_payments_to_admin: nextVal })
      .eq("id", b.id);
    if (error) {
      toast.error("Failed to update payment setting", error.message);
      return;
    }
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      entityType: "branches",
      entityId: b.id,
      entityLabel: b.name,
      action: "update",
      label: `Toggled show payments to admin: ${nextVal ? "ON" : "OFF"}`
    });
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
      {/* Top Filter Bar + New Center Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-paper-deep rounded-full border border-line">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "px-4 h-[34px] rounded-full text-xs transition cursor-pointer flex items-center gap-1.5",
              filterTab === "all"
                ? "bg-ocean-600 text-white font-semibold shadow-xs"
                : "text-ink-soft hover:bg-white/60 font-medium"
            )}
          >
            <span>{t("owner.branches.tabAll")}</span>
            <span className={cn("text-[11px] font-mono", filterTab === "all" ? "text-white/80" : "text-ink-mute")}>
              {branches.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={cn(
              "px-4 h-[34px] rounded-full text-xs transition cursor-pointer flex items-center gap-1.5",
              filterTab === "active"
                ? "bg-ocean-600 text-white font-semibold shadow-xs"
                : "text-ink-soft hover:bg-white/60 font-medium"
            )}
          >
            <span>{t("owner.branches.tabActive")}</span>
            <span className={cn("text-[11px] font-mono", filterTab === "active" ? "text-white/80" : "text-ink-mute")}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("archived")}
            className={cn(
              "px-4 h-[34px] rounded-full text-xs transition cursor-pointer flex items-center gap-1.5",
              filterTab === "archived"
                ? "bg-ocean-600 text-white font-semibold shadow-xs"
                : "text-ink-soft hover:bg-white/60 font-medium"
            )}
          >
            <span>{t("owner.branches.tabArchived")}</span>
            <span className={cn("text-[11px] font-mono", filterTab === "archived" ? "text-white/80" : "text-ink-mute")}>
              {archivedCount}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="h-11 px-4.5 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
        >
          <Icon name="plus" className="w-4 h-4 text-white" />
          <span>New center</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
        {/* Table Header */}
        <div className="bg-paper-deep px-5 h-9 flex items-center text-[10px] font-bold text-ink-faint tracking-wider uppercase border-b border-line">
          <span className="flex-1 min-w-[200px] text-left">CENTER</span>
          <span className="w-[140px] text-left hidden sm:block">WHATSAPP</span>
          <span className="w-[140px] text-center hidden md:block">PAYMENTS TO ADMIN</span>
          <span className="w-[100px] text-center">STATUS</span>
          <span className="w-[220px] text-right">ACTIONS</span>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-line">
          {filteredBranches.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-mute">
              {filterTab === "archived" ? "No archived centers." : "No centers registered yet."}
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isArchived = b.status === "archived";
              const primaryWa = b.wa_numbers?.[0] ?? "";
              return (
                <div
                  key={b.id}
                  className="px-5 min-h-[60px] py-3 flex items-center gap-3 hover:bg-paper-tint transition text-sm group"
                >
                  {/* Center Column */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold text-ink leading-tight flex items-center gap-2">
                      <NoTranslate>{b.name}</NoTranslate>
                      {b.lat && b.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open in Google Maps"
                          className="text-ink-faint hover:text-ocean-600 transition"
                        >
                          <Icon name="pin" className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-ink-mute mt-0.5 truncate max-w-sm">
                      <NoTranslate>{b.address || b.city}</NoTranslate>
                    </div>
                  </div>

                  {/* Whatsapp Column */}
                  <div className="w-[140px] hidden sm:flex items-center text-xs font-mono text-ink-soft truncate">
                    {primaryWa ? (
                      <span className="truncate">{primaryWa}</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </div>

                  {/* Payments to Admin Column */}
                  <div className="w-[140px] hidden md:flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => toggleShowPaymentsToAdmin(b)}
                      title={b.show_payments_to_admin ? "Payments visible to admin (Click to disable)" : "Payments hidden from admin (Click to enable)"}
                      className={cn(
                        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        b.show_payments_to_admin ? "bg-ocean-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          b.show_payments_to_admin ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Status Column */}
                  <div className="w-[100px] flex items-center justify-center">
                    {isArchived ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300/60 text-[10px] font-semibold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        ARCHIVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ok-50 text-ok-600 border border-ok-500/30 text-[10px] font-semibold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-ok-500" />
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="w-[220px] flex items-center justify-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openAdminPanel(b)}
                      className="px-2.5 h-8 rounded-lg bg-ocean-50 text-ocean-700 hover:bg-ocean-100 text-[11px] font-semibold transition cursor-pointer"
                    >
                      Open Admin Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      title="Edit Center"
                      className="w-8 h-8 rounded-lg text-ink-mute hover:text-ink hover:bg-paper-tint flex items-center justify-center transition cursor-pointer"
                    >
                      <Icon name="edit" className="w-4 h-4" />
                    </button>
                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => unarchive(b)}
                        title="Unarchive Center"
                        className="w-8 h-8 rounded-lg text-ok-600 hover:bg-ok-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Icon name="refresh" className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => archive(b)}
                        title="Archive Center"
                        className="w-8 h-8 rounded-lg text-ink-mute hover:text-ink hover:bg-paper-tint flex items-center justify-center transition cursor-pointer"
                      >
                        <Icon name="archive" className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteBranch(b)}
                      title="Delete Center"
                      className="w-8 h-8 rounded-lg text-danger-500 hover:bg-danger-50 flex items-center justify-center transition cursor-pointer"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
