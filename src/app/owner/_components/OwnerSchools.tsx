"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input, Switch } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useUpload } from "@/hooks/useUpload";
import { NoTranslate } from "@/components/ui/NoTranslate";

interface Branch {
  id: string;
  name: string;
}

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  branch_id: string;
  branch?: { name: string } | null;
  show_coach_sig?: boolean;
  show_head_sig?: boolean;
  show_school_sig?: boolean;
  coach_sig_title?: string;
  head_sig_title?: string;
}

interface SchoolSignature {
  id: string;
  school_id: string;
  name: string;
  title: string;
  image_url: string;
  is_active: boolean;
}

export default function OwnerSchools({}: { branches: Branch[] }) {
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
    if (data) setSchools(data as unknown as School[]);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">{t("owner.schools.title")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{t("owner.schools.sub")}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: School List */}
        <Card className="space-y-4 lg:col-span-1">
          <SectionTitle>{t("owner.schools.schoolsListTitle")}</SectionTitle>
          {loading ? (
            <div className="text-center py-10 text-ink-mute text-sm">{t("common.actions.saving")}</div>
          ) : schools.length === 0 ? (
            <div className="text-center py-10 text-ink-mute text-sm">{t("owner.schools.noSchools")}</div>
          ) : (
            <div className="space-y-2.5">
              {schools.map(school => (
                <div key={school.id} 
                  className={`p-3 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all ${selectedSchool?.id === school.id ? "border-ocean-500 bg-ocean-50/80 shadow-sm" : "border-line bg-white hover:border-ocean-300"}`}
                  onClick={() => setSelectedSchool(school)}
                >
                  <div className="w-12 h-12 rounded-lg bg-white border border-line flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {school.logo_url ? (
                      <Image src={school.logo_url} alt="Logo" width={48} height={48} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Icon name="book" className="w-5 h-5 text-ink-faint" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink truncate"><NoTranslate>{school.name}</NoTranslate></div>
                    <div className="text-xs text-ink-mute truncate"><NoTranslate>{school.branch?.name}</NoTranslate></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: School Config & Signatures */}
        {selectedSchool ? (
          <div className="space-y-6 lg:col-span-2">
            {/* 1. School Logo */}
            <Card className="space-y-4">
              <SectionTitle sub={t("owner.schools.sub")}>
                <NoTranslate>{selectedSchool.name}</NoTranslate>
              </SectionTitle>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 border border-line rounded-2xl bg-paper-tint">
                <div 
                  className="w-24 h-24 rounded-2xl bg-white border border-line flex items-center justify-center overflow-hidden cursor-pointer hover:border-ocean-400 transition-all shadow-sm shrink-0"
                  onClick={() => logoInputRef.current?.click()}
                  title={t("owner.schools.changeLogoBtn")}
                >
                  {selectedSchool.logo_url ? (
                    <Image src={selectedSchool.logo_url} alt="Logo" width={96} height={96} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-ink-faint">
                      <Icon name="image" className="w-7 h-7" />
                      <span className="text-[10px] font-bold">NO LOGO</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <Btn 
                    variant="outline" 
                    size="sm" 
                    icon="upload" 
                    disabled={uploading} 
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploading ? t("common.actions.saving") : t("owner.schools.uploadLogoBtn")}
                  </Btn>
                  <input 
                    ref={logoInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleLogo(e, selectedSchool)} 
                  />
                  <p className="text-xs text-ink-mute">Disarankan format PNG dengan latar belakang transparan (resolusi minimal 300x300px).</p>
                </div>
              </div>
            </Card>

            {/* 2. Rapor Signature Display Settings */}
            <Card className="space-y-5">
              <div className="flex items-center justify-between">
                <SectionTitle sub={t("owner.schools.sigConfigSub")}>
                  {t("owner.schools.sigConfigTitle")}
                </SectionTitle>
                <Btn variant="primary" size="sm" onClick={saveConfig} disabled={configSaving}>
                  {configSaving ? t("owner.schools.savingConfigBtn") : t("owner.schools.saveConfigBtn")}
                </Btn>
              </div>

              <div className="space-y-4 pt-1">
                {/* Toggle 1: Coach */}
                <div className="p-4 rounded-xl border border-line bg-paper-tint/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={configForm.show_coach_sig} onChange={c => setConfigForm(f => ({ ...f, show_coach_sig: c }))} />
                    <div>
                      <div className="font-semibold text-sm text-ink">{t("owner.schools.showCoachSig")}</div>
                      <div className="text-xs text-ink-mute">{t("owner.schools.coachSigSub")}</div>
                    </div>
                  </div>
                  {configForm.show_coach_sig && (
                    <div className="w-full sm:w-56">
                      <Input 
                        value={configForm.coach_sig_title} 
                        onChange={e => setConfigForm(f => ({ ...f, coach_sig_title: e.target.value }))}
                        placeholder={t("owner.schools.coachSigTitleField")}
                      />
                    </div>
                  )}
                </div>

                {/* Toggle 2: Head of NEXT */}
                <div className="p-4 rounded-xl border border-line bg-paper-tint/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={configForm.show_head_sig} onChange={c => setConfigForm(f => ({ ...f, show_head_sig: c }))} />
                    <div>
                      <div className="font-semibold text-sm text-ink">{t("owner.schools.showHeadSig")}</div>
                      <div className="text-xs text-ink-mute">{t("owner.schools.headSigSub")}</div>
                    </div>
                  </div>
                  {configForm.show_head_sig && (
                    <div className="w-full sm:w-56">
                      <Input 
                        value={configForm.head_sig_title} 
                        onChange={e => setConfigForm(f => ({ ...f, head_sig_title: e.target.value }))}
                        placeholder={t("owner.schools.headSigTitleField")}
                      />
                    </div>
                  )}
                </div>

                {/* Toggle 3: School Signature */}
                <div className="p-4 rounded-xl border border-line bg-paper-tint/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={configForm.show_school_sig} onChange={c => setConfigForm(f => ({ ...f, show_school_sig: c }))} />
                    <div>
                      <div className="font-semibold text-sm text-ink">{t("owner.schools.showSchoolSig")}</div>
                      <div className="text-xs text-ink-mute">{t("owner.schools.schoolSigSub")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. School Digital Signatures (CRUD) */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle sub={t("owner.schools.digitalSignaturesSub")}>
                  {t("owner.schools.digitalSignaturesTitle")} (<NoTranslate>{selectedSchool.name}</NoTranslate>)
                </SectionTitle>
                <Btn variant="outline" size="sm" icon="plus" onClick={() => {
                  setSigForm({ id: "", name: "", title: "Principal", is_active: true });
                  setSigFile(null);
                  setShowSigModal(true);
                }}>{t("owner.schools.addSigBtn")}</Btn>
              </div>
              
              {sigLoading ? (
                <div className="text-center py-6 text-ink-mute text-sm">{t("common.actions.saving")}</div>
              ) : signatures.length === 0 ? (
                <div className="text-center py-8 text-ink-mute text-sm border-2 border-dashed border-line rounded-xl">
                  {t("owner.schools.noSignaturesYet")}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3.5">
                  {signatures.map(sig => (
                    <div key={sig.id} className={`p-4 border rounded-2xl flex flex-col justify-between gap-3 transition-all ${sig.is_active ? "border-ok-300 bg-ok-50/30 shadow-xs" : "border-line bg-paper-tint"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-24 h-16 bg-white border border-line rounded-xl flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                          {sig.image_url && sig.image_url !== "pending" ? (
                            <img src={sig.image_url} alt="Sig" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                          ) : <span className="text-xs text-ink-mute">Pending</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSigForm({ id: sig.id, name: sig.name, title: sig.title, is_active: sig.is_active }); setSigFile(null); setShowSigModal(true); }} className="text-ink-mute hover:text-ocean-600 p-1.5 rounded-lg hover:bg-white transition" title={t("common.actions.edit")}><Icon name="edit" className="w-4 h-4" /></button>
                          <button onClick={() => deleteSignature(sig)} className="text-ink-mute hover:text-danger-500 p-1.5 rounded-lg hover:bg-white transition" title={t("common.actions.delete")}><Icon name="trash" className="w-4 h-4" /></button>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-ink"><NoTranslate>{sig.name}</NoTranslate></div>
                        <div className="text-xs text-ink-mute font-medium"><NoTranslate>{sig.title}</NoTranslate></div>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch checked={sig.is_active} onChange={() => toggleSigActive(sig)} />
                          <span className={`text-xs font-bold ${sig.is_active ? "text-ok-700" : "text-ink-mute"}`}>
                            {sig.is_active ? t("owner.schools.activeSigBadge") : t("owner.schools.inactiveSigBadge")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2 flex flex-col items-center justify-center text-ink-mute text-sm p-12 border-2 border-dashed border-line rounded-2xl min-h-[300px]">
            <Icon name="book" className="w-10 h-10 text-ink-faint mb-2" />
            <span>{t("owner.schools.selectSchoolPrompt")}</span>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Signature */}
      <Modal open={showSigModal} onClose={() => setShowSigModal(false)} title={sigForm.id ? t("owner.schools.editSigModalTitle") : t("owner.schools.addSigModalTitle")} size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowSigModal(false)}>{t("common.actions.cancel")}</Btn>
            <Btn variant="primary" onClick={saveSignature} disabled={sigSaving}>{sigSaving ? t("common.actions.saving") : t("owner.schools.sigSaved")}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("owner.schools.fieldSignerName")} required>
            <Input value={sigForm.name} onChange={e => setSigForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dra. Hj. Siti Aminah, M.Pd" />
          </Field>
          <Field label={t("owner.schools.fieldSignerTitle")} required>
            <Input value={sigForm.title} onChange={e => setSigForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Kepala Sekolah SMAN 70 Jakarta / Principal" />
          </Field>
          <Field label={t("owner.schools.fieldSignerActive")}>
            <div className="flex items-center gap-3">
              <Switch checked={sigForm.is_active} onChange={checked => setSigForm(f => ({ ...f, is_active: checked }))} />
              <span className="text-sm text-ink-mute">{t("owner.schools.activeSigBadge")}</span>
            </div>
          </Field>
          <Field label={t("owner.schools.fieldSignerImage")} required={!sigForm.id}>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" onChange={e => setSigFile(e.target.files?.[0] ?? null)} className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer" />
            <div className="text-xs text-ink-mute mt-1.5">Disarankan format PNG transparan atau SVG dengan kontras tajam (garis tinta hitam/biru tua).</div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
