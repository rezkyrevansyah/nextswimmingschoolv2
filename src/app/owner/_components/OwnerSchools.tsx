"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input, Switch } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useUpload } from "@/hooks/useUpload";

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

export default function OwnerSchools({ branches }: { branches: Branch[] }) {
  const toast = useToast();
  const confirm = useConfirm();
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
        toast.success("Logo berhasil diunggah");
        setSchools(prev => prev.map(s => s.id === school.id ? { ...s, logo_url: url } : s));
        if (selectedSchool?.id === school.id) {
          setSelectedSchool(prev => prev ? { ...prev, logo_url: url } : null);
        }
      }
    } catch (err) {
      toast.error("Gagal mengunggah logo", err instanceof Error ? err.message : undefined);
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
      toast.success("Pengaturan tanda tangan berhasil disimpan");
      setSchools(prev => prev.map(s => s.id === selectedSchool.id ? { ...s, ...configForm } : s));
      setSelectedSchool(prev => prev ? { ...prev, ...configForm } : null);
    } catch (err) {
      toast.error("Gagal menyimpan pengaturan", err instanceof Error ? err.message : undefined);
    } finally {
      setConfigSaving(false);
    }
  };

  const saveSignature = async () => {
    if (!selectedSchool) return;
    if (!sigForm.name || !sigForm.title) return toast.error("Nama dan Jabatan wajib diisi");
    if (!sigForm.id && !sigFile) return toast.error("File gambar tanda tangan wajib diunggah untuk tanda tangan baru");

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
        toast.success("Tanda tangan berhasil diperbarui");
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
        toast.success("Tanda tangan baru berhasil ditambahkan");
      }
      setShowSigModal(false);
      loadSignatures(selectedSchool.id);
    } catch (err) {
      toast.error("Gagal menyimpan tanda tangan", err instanceof Error ? err.message : undefined);
    } finally {
      setSigSaving(false);
    }
  };

  const toggleSigActive = async (sig: SchoolSignature) => {
    const nextState = !sig.is_active;
    const { error } = await supabase.from("school_signatures")
      .update({ is_active: nextState })
      .eq("id", sig.id);
    if (error) return toast.error("Gagal mengubah status", error.message);
    setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, is_active: nextState } : s));
  };

  const deleteSignature = async (sig: SchoolSignature) => {
    const yes = await confirm({ title: `Hapus tanda tangan ${sig.name}?`, danger: true });
    if (!yes) return;
    const { error } = await supabase.from("school_signatures").delete().eq("id", sig.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    toast.success("Tanda tangan berhasil dihapus");
    if (selectedSchool) loadSignatures(selectedSchool.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">Schools & Rapor Assets</h2>
        <p className="text-ink-mute text-sm mt-0.5">Kelola logo sekolah, layout tanda tangan rapor, dan tanda tangan digital kepala sekolah/pejabat.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: School List */}
        <Card className="space-y-4 lg:col-span-1">
          <SectionTitle>Daftar Sekolah</SectionTitle>
          {loading ? (
            <div className="text-center py-10 text-ink-mute text-sm">Memuat data sekolah...</div>
          ) : schools.length === 0 ? (
            <div className="text-center py-10 text-ink-mute text-sm">Belum ada sekolah yang terdaftar.</div>
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
                    <div className="font-semibold text-sm text-ink truncate">{school.name}</div>
                    <div className="text-xs text-ink-mute truncate">{school.branch?.name}</div>
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
              <SectionTitle sub="Logo sekolah akan tampil di header rapor sebelah kanan mendampingi logo NEXT Swimming School">
                Logo Sekolah: {selectedSchool.name}
              </SectionTitle>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 border border-line rounded-2xl bg-paper-tint">
                <div 
                  className="w-24 h-24 rounded-2xl bg-white border border-line flex items-center justify-center overflow-hidden cursor-pointer hover:border-ocean-400 transition-all shadow-sm shrink-0"
                  onClick={() => logoInputRef.current?.click()}
                  title="Klik untuk memilih logo baru"
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
                    {uploading ? "Mengunggah..." : "Upload Logo Sekolah"}
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
                <SectionTitle sub="Atur tanda tangan siapa saja yang wajib tampil di lembar rapor sekolah ini">
                  Pengaturan Tanda Tangan Rapor
                </SectionTitle>
                <Btn variant="primary" size="sm" onClick={saveConfig} disabled={configSaving}>
                  {configSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                </Btn>
              </div>

              <div className="space-y-4 pt-1">
                {/* Toggle 1: Coach */}
                <div className="p-4 rounded-xl border border-line bg-paper-tint/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={configForm.show_coach_sig} onChange={c => setConfigForm(f => ({ ...f, show_coach_sig: c }))} />
                    <div>
                      <div className="font-semibold text-sm text-ink">Tampilkan Tanda Tangan Coach</div>
                      <div className="text-xs text-ink-mute">Tanda tangan coach pengajar kelas murid</div>
                    </div>
                  </div>
                  {configForm.show_coach_sig && (
                    <div className="w-full sm:w-56">
                      <Input 
                        value={configForm.coach_sig_title} 
                        onChange={e => setConfigForm(f => ({ ...f, coach_sig_title: e.target.value }))}
                        placeholder="Jabatan Coach (e.g. HEAD COACH)"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle 2: Head of NEXT */}
                <div className="p-4 rounded-xl border border-line bg-paper-tint/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={configForm.show_head_sig} onChange={c => setConfigForm(f => ({ ...f, show_head_sig: c }))} />
                    <div>
                      <div className="font-semibold text-sm text-ink">Tampilkan TTD Head of NEXT Swimming School</div>
                      <div className="text-xs text-ink-mute">Tanda tangan resmi pimpinan NEXT Swimming (Syahril Sidik)</div>
                    </div>
                  </div>
                  {configForm.show_head_sig && (
                    <div className="w-full sm:w-56">
                      <Input 
                        value={configForm.head_sig_title} 
                        onChange={e => setConfigForm(f => ({ ...f, head_sig_title: e.target.value }))}
                        placeholder="Jabatan Head (e.g. HEAD OF NEXT SWIMMING)"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle 3: School Signature */}
                <div className="p-4 rounded-xl border border-line bg-paper-tint/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={configForm.show_school_sig} onChange={c => setConfigForm(f => ({ ...f, show_school_sig: c }))} />
                    <div>
                      <div className="font-semibold text-sm text-ink">Tampilkan Tanda Tangan Sekolah (Kepala Sekolah / Pejabat)</div>
                      <div className="text-xs text-ink-mute">Tanda tangan digital dari daftar di bawah yang berstatus Aktif</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. School Digital Signatures (CRUD) */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle sub="Kelola master tanda tangan digital sekolah">
                  Tanda Tangan Sekolah ({selectedSchool.name})
                </SectionTitle>
                <Btn variant="outline" size="sm" icon="plus" onClick={() => {
                  setSigForm({ id: "", name: "", title: "Kepala Sekolah", is_active: true });
                  setSigFile(null);
                  setShowSigModal(true);
                }}>Tambah TTD</Btn>
              </div>
              
              {sigLoading ? (
                <div className="text-center py-6 text-ink-mute text-sm">Memuat data tanda tangan...</div>
              ) : signatures.length === 0 ? (
                <div className="text-center py-8 text-ink-mute text-sm border-2 border-dashed border-line rounded-xl">
                  Belum ada tanda tangan yang diunggah untuk sekolah ini.
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
                          <button onClick={() => { setSigForm({ id: sig.id, name: sig.name, title: sig.title, is_active: sig.is_active }); setSigFile(null); setShowSigModal(true); }} className="text-ink-mute hover:text-ocean-600 p-1.5 rounded-lg hover:bg-white transition" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                          <button onClick={() => deleteSignature(sig)} className="text-ink-mute hover:text-danger-500 p-1.5 rounded-lg hover:bg-white transition" title="Hapus"><Icon name="trash" className="w-4 h-4" /></button>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-ink">{sig.name}</div>
                        <div className="text-xs text-ink-mute font-medium">{sig.title}</div>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch checked={sig.is_active} onChange={() => toggleSigActive(sig)} />
                          <span className={`text-xs font-bold ${sig.is_active ? "text-ok-700" : "text-ink-mute"}`}>
                            {sig.is_active ? "Aktif di Rapor" : "Non-aktif"}
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
            <span>Pilih salah satu sekolah di sebelah kiri untuk mengatur logo dan tanda tangan</span>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Signature */}
      <Modal open={showSigModal} onClose={() => setShowSigModal(false)} title={sigForm.id ? "Edit Tanda Tangan" : "Tambah Tanda Tangan Baru"} size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setShowSigModal(false)}>Batal</Btn>
            <Btn variant="primary" onClick={saveSignature} disabled={sigSaving}>{sigSaving ? "Menyimpan..." : "Simpan Tanda Tangan"}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Penandatangan" required>
            <Input value={sigForm.name} onChange={e => setSigForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dra. Hj. Siti Aminah, M.Pd" />
          </Field>
          <Field label="Jabatan / Title (Bebas diisi sesuai sebutan sekolah)" required>
            <Input value={sigForm.title} onChange={e => setSigForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Kepala Sekolah SMAN 70 Jakarta / Principal / Koordinator" />
          </Field>
          <Field label="Status Aktif di Rapor">
            <div className="flex items-center gap-3">
              <Switch checked={sigForm.is_active} onChange={checked => setSigForm(f => ({ ...f, is_active: checked }))} />
              <span className="text-sm text-ink-mute">Gunakan tanda tangan ini di lembar rapor sekolah</span>
            </div>
          </Field>
          <Field label="File Gambar Tanda Tangan" required={!sigForm.id}>
            <input type="file" accept="image/*" onChange={e => setSigFile(e.target.files?.[0] ?? null)} className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer" />
            <div className="text-xs text-ink-mute mt-1.5">Disarankan format PNG transparan dengan kontras tajam (garis tinta hitam/biru tua).</div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
