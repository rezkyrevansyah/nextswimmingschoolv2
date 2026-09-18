"use client";
import { useState, useEffect, useCallback } from "react";
import { fmtIDR } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { resolveTaxSetting } from "@/lib/payroll";

export function useTaxSettings({ userId, userName }: { userId: string; userName: string }) {
  const supabase = createClient();
  const toast = useToast();

  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxMode, setTaxMode] = useState<"percent" | "fixed">("percent");
  const [taxPercent, setTaxPercent] = useState("");
  const [taxFixed, setTaxFixed] = useState("");
  const [taxSettingId, setTaxSettingId] = useState<string | null>(null);
  const [savingTax, setSavingTax] = useState(false);

  const loadTaxSetting = useCallback(async () => {
    const setting = await resolveTaxSetting(supabase);
    if (setting) {
      setTaxSettingId(setting.id);
      setTaxMode(setting.mode);
      setTaxPercent(setting.percent_value != null ? String(setting.percent_value) : "");
      setTaxFixed(setting.fixed_value != null ? String(setting.fixed_value) : "");
    }
  }, [supabase]);

  useEffect(() => {
    loadTaxSetting();
  }, [loadTaxSetting]);

  const saveTaxSetting = async () => {
    if (taxMode === "percent" && (!taxPercent || Number(taxPercent) <= 0))
      return toast.error("Enter a valid tax percentage");
    if (taxMode === "fixed" && (!taxFixed || Number(taxFixed) <= 0))
      return toast.error("Enter a valid tax amount");
    setSavingTax(true);
    const payload = {
      coach_id: null,
      mode: taxMode,
      percent_value: taxMode === "percent" ? Number(taxPercent) : null,
      fixed_value: taxMode === "fixed" ? Number(taxFixed) : null,
      is_active: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const op = taxSettingId
      ? supabase.from("tax_settings").update(payload).eq("id", taxSettingId)
      : supabase.from("tax_settings").insert(payload);
    const { error } = await op;
    setSavingTax(false);
    if (error) return toast.error("Failed to save tax setting", error.message);
    toast.success("Tax setting saved");
    setShowTaxModal(false);
    logActivity(supabase, {
      userId,
      userRole: "owner",
      userName,
      entityType: "tax_settings",
      entityId: taxSettingId ?? "new",
      action: "update",
      label: `Tax setting changed to ${taxMode === "percent" ? `${taxPercent}%` : fmtIDR(Number(taxFixed))}`,
    });
    loadTaxSetting();
  };

  return {
    showTaxModal, setShowTaxModal,
    taxMode, setTaxMode, taxPercent, setTaxPercent, taxFixed, setTaxFixed,
    savingTax, saveTaxSetting,
  };
}
