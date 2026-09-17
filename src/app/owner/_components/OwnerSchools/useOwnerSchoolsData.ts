"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useUpload } from "@/hooks/useUpload";
import type { School, SchoolSignature } from "./_types";

export function useOwnerSchoolsData() {
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const { upload, uploading } = useUpload();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [signatures, setSignatures] = useState<SchoolSignature[]>([]);
  const [sigLoading, setSigLoading] = useState(false);

  // Signature modal state
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigForm, setSigForm] = useState({ id: "", name: "", title: "", is_active: true });
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigSaving, setSigSaving] = useState(false);

  // Rapor signature display configuration state
  const [configForm, setConfigForm] = useState({
    show_coach_sig: true,
    show_head_sig: false,
    show_school_sig: true,
    coach_sig_title: "HEAD COACH",
    head_sig_title: "HEAD OF NEXT SWIMMING",
  });
  const [configSaving, setConfigSaving] = useState(false);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("schools")
      .select("id, name, logo_url, branch_id, show_coach_sig, show_head_sig, show_school_sig, coach_sig_title, head_sig_title, branch:branches(name)")
      .order("name");
    if (data) {
      const list = data as unknown as School[];
      setSchools(list);
      setSelectedSchool(prev => prev ? list.find(s => s.id === prev.id) || list[0] : list[0] || null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const loadSignatures = useCallback(async (schoolId: string) => {
    setSigLoading(true);
    const { data } = await supabase
      .from("school_signatures")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    if (data) setSignatures(data as SchoolSignature[]);
    setSigLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (selectedSchool) {
      loadSignatures(selectedSchool.id);
      setConfigForm({
        show_coach_sig: selectedSchool.show_coach_sig ?? true,
        show_head_sig: selectedSchool.show_head_sig ?? false,
        show_school_sig: selectedSchool.show_school_sig ?? true,
        coach_sig_title: selectedSchool.coach_sig_title || "HEAD COACH",
        head_sig_title: selectedSchool.head_sig_title || "HEAD OF NEXT SWIMMING",
      });
    }
  }, [selectedSchool, loadSignatures]);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>, school: School) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload.schoolLogo(file, school.id);
      if (url) {
        toast.success(t("owner.schools.logoUpdated"));
        setSchools(prev => prev.map(s => s.id === school.id ? { ...s, logo_url: url } : s));
        if (selectedSchool?.id === school.id) {
          setSelectedSchool(prev => prev ? { ...prev, logo_url: url } : null);
        }
      }
    } catch (err) {
      toast.error(t("owner.schools.uploadLogoFailed"), err instanceof Error ? err.message : undefined);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const saveConfig = async () => {
    if (!selectedSchool) return;
    setConfigSaving(true);
    try {
      const { error } = await supabase.from("schools").update({
        show_coach_sig: configForm.show_coach_sig,
        show_head_sig: configForm.show_head_sig,
        show_school_sig: configForm.show_school_sig,
        coach_sig_title: configForm.coach_sig_title || "HEAD COACH",
        head_sig_title: configForm.head_sig_title || "HEAD OF NEXT SWIMMING",
      }).eq("id", selectedSchool.id);
      if (error) throw error;
      toast.success(t("owner.schools.configSaved"));
      setSchools(prev => prev.map(s => s.id === selectedSchool.id ? { ...s, ...configForm } : s));
      setSelectedSchool(prev => prev ? { ...prev, ...configForm } : null);
    } catch (err) {
      toast.error(t("owner.schools.saveConfigFailed"), err instanceof Error ? err.message : undefined);
    } finally {
      setConfigSaving(false);
    }
  };

  const saveSignature = async () => {
    if (!selectedSchool) return;
    if (!sigForm.name || !sigForm.title) return toast.error(t("owner.schools.nameTitleRequired"));
    if (!sigForm.id && !sigFile) return toast.error(t("owner.schools.sigFileRequired"));

    setSigSaving(true);
    try {
      if (sigForm.id) {
        // Update existing
        const { error } = await supabase.from("school_signatures")
          .update({ name: sigForm.name, title: sigForm.title, is_active: sigForm.is_active })
          .eq("id", sigForm.id);
        if (error) throw error;

        if (sigFile) {
          await upload.schoolSignature(sigFile, selectedSchool.id, sigForm.id);
        }
        toast.success(t("owner.schools.sigSaved"));
      } else {
        // Insert new
        const { data: inserted, error } = await supabase.from("school_signatures")
          .insert({
            school_id: selectedSchool.id,
            name: sigForm.name,
            title: sigForm.title,
            image_url: "pending",
            is_active: sigForm.is_active,
          }).select("id").single();
        if (error) throw error;

        if (sigFile) {
          await upload.schoolSignature(sigFile, selectedSchool.id, inserted.id);
        }
        toast.success(t("owner.schools.sigSaved"));
      }
      setShowSigModal(false);
      loadSignatures(selectedSchool.id);
    } catch (err) {
      toast.error(t("owner.schools.saveSigFailed"), err instanceof Error ? err.message : undefined);
    } finally {
      setSigSaving(false);
    }
  };

  const toggleSigActive = async (sig: SchoolSignature) => {
    const nextState = !sig.is_active;
    const { error } = await supabase.from("school_signatures")
      .update({ is_active: nextState })
      .eq("id", sig.id);
    if (error) return toast.error(t("owner.schools.saveSigFailed"), error.message);
    setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, is_active: nextState } : s));
  };

  const deleteSignature = async (sig: SchoolSignature) => {
    const yes = await confirm({ title: tNode("owner.schools.deleteSigConfirm", { name: sig.name }), danger: true });
    if (!yes) return;
    const { error } = await supabase.from("school_signatures").delete().eq("id", sig.id);
    if (error) return toast.error(t("owner.schools.deleteSigFailed"), error.message);
    toast.success(t("owner.schools.sigDeleted"));
    if (selectedSchool) loadSignatures(selectedSchool.id);
  };

  return {
    uploading, logoInputRef,
    schools, loading, selectedSchool, setSelectedSchool, signatures, sigLoading,
    showSigModal, setShowSigModal, sigForm, setSigForm, sigFile, setSigFile, sigSaving,
    configForm, setConfigForm, configSaving,
    handleLogo, saveConfig, saveSignature, toggleSigActive, deleteSignature,
  };
}
