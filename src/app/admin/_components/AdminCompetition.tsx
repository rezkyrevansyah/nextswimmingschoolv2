"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, Stat } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import DatePicker from "@/components/ui/DatePicker";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { fmtDate, parseSwimTime } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompetitionRow {
  id: string;
  name: string;
  organizer: string | null;
  location: string | null;
  city: string | null;
  start_date: string;
  end_date: string | null;
  level: string;
  description: string | null;
  created_by_id: string | null;
  created_at: string;
  participations_count?: number;
  medals_count?: number;
}

export interface ParticipationRow {
  id: string;
  competition_id: string;
  member_id: string;
  branch_id: string;
  coach_id: string | null;
  category: string;
  stroke: string | null;
  distance_meters: number | null;
  age_group: string | null;
  time_seconds: number | null;
  time_formatted: string | null;
  rank: number | null;
  result_status: string;
  award: string;
  custom_award_label: string | null;
  certificate_url: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  member?: {
    id: string;
    profile?: { full_name: string; avatar_url: string | null } | null;
  } | null;
  branch?: { name: string } | null;
  coach?: { full_name: string } | null;
}

export interface MemberOption {
  id: string;
  full_name: string;
  branch_name?: string;
  branch_id: string;
}

export interface CoachOption {
  id: string;
  full_name: string;
}

const AWARD_LABELS: Record<string, { label: string; icon: string; style: string }> = {
  gold: { label: "Medali Emas", icon: "🥇", style: "bg-amber-100 text-amber-900 border-amber-300 font-bold" },
  silver: { label: "Medali Perak", icon: "🥈", style: "bg-slate-100 text-slate-800 border-slate-300 font-bold" },
  bronze: { label: "Medali Perunggu", icon: "🥉", style: "bg-amber-900/10 text-amber-800 border-amber-800/30 font-bold" },
  fourth_place: { label: "Juara 4", icon: "🏅", style: "bg-blue-50 text-blue-800 border-blue-200" },
  finalist: { label: "Finalis", icon: "⭐", style: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  participant: { label: "Peserta", icon: "🏊", style: "bg-gray-100 text-gray-700 border-gray-200" },
  custom: { label: "Khusus", icon: "🏆", style: "bg-purple-50 text-purple-800 border-purple-200 font-bold" },
};

export default function AdminCompetition({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useLocale();

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  // Modals state
  const [openCompForm, setOpenCompForm] = useState(false);
  const [editComp, setEditComp] = useState<CompetitionRow | null>(null);
  const [compForm, setCompForm] = useState({
    name: "",
    organizer: "",
    location: "",
    city: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    level: "local",
    description: "",
  });
  const [savingComp, setSavingComp] = useState(false);

  // Detail Modal State
  const [selectedComp, setSelectedComp] = useState<CompetitionRow | null>(null);
  const [participations, setParticipations] = useState<ParticipationRow[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // Add/Edit Participant Modal State
  const [openPartForm, setOpenPartForm] = useState(false);
  const [editPart, setEditPart] = useState<ParticipationRow | null>(null);
  const [partForm, setPartForm] = useState({
    member_id: "",
    coach_id: "",
    category: "",
    age_group: "",
    time_raw: "",
    rank: "",
    result_status: "finished",
    award: "participant",
    custom_award_label: "",
    notes: "",
  });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [savingPart, setSavingPart] = useState(false);

  // Member & Coach options for selector
  const [membersList, setMembersList] = useState<MemberOption[]>([]);
  const [coachesList, setCoachesList] = useState<CoachOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── Load Competitions ──────────────────────────────────────────────────────
  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    const { data: compsData, error } = await supabase
      .from("competitions")
      .select("id, name, organizer, location, city, start_date, end_date, level, description, created_by_id, created_at")
      .order("start_date", { ascending: false });

    if (error) {
      toast.error("Gagal memuat daftar perlombaan: " + error.message);
      setLoading(false);
      return;
    }

    // Load participation counts
    const { data: parts } = await supabase
      .from("competition_participations")
      .select("competition_id, award");

    const countsMap: Record<string, { total: number; medals: number }> = {};
    (parts ?? []).forEach(p => {
      if (!countsMap[p.competition_id]) countsMap[p.competition_id] = { total: 0, medals: 0 };
      countsMap[p.competition_id].total++;
      if (["gold", "silver", "bronze", "custom"].includes(p.award)) {
        countsMap[p.competition_id].medals++;
      }
    });

    const enriched = (compsData ?? []).map(c => ({
      ...c,
      participations_count: countsMap[c.id]?.total ?? 0,
      medals_count: countsMap[c.id]?.medals ?? 0,
    }));

    setCompetitions(enriched);
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  // ── Load Members & Coaches Options ──────────────────────────────────────────
  const loadOptions = useCallback(async () => {
    let q = supabase
      .from("members")
      .select("id, branch_id, profile:profiles(full_name), branch:branches(name)")
      .eq("status", "active");

    if (branchId) {
      q = q.eq("branch_id", branchId);
    }

    const [{ data: mData }, { data: cData }] = await Promise.all([
      q,
      supabase.from("profiles").select("id, full_name").eq("role", "coach"),
    ]);

    if (mData) {
      setMembersList(
        mData.map(m => ({
          id: m.id,
          branch_id: m.branch_id,
          full_name: (m.profile as any)?.full_name ?? "Tanpa Nama",
          branch_name: (m.branch as any)?.name ?? "",
        }))
      );
    }

    if (cData) {
      setCoachesList(cData.map(c => ({ id: c.id, full_name: c.full_name })));
    }
  }, [supabase, branchId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // ── Load Competition Details ──────────────────────────────────────────────
  const loadParticipations = useCallback(async (compId: string) => {
    setLoadingParts(true);
    const { data, error } = await supabase
      .from("competition_participations")
      .select(`
        id, competition_id, member_id, branch_id, coach_id, category, stroke, distance_meters, age_group,
        time_seconds, time_formatted, rank, result_status, award, custom_award_label, certificate_url, photo_url, notes, created_at,
        member:members(id, profile:profiles(full_name, avatar_url)),
        branch:branches(name),
        coach:profiles!competition_participations_coach_id_fkey(full_name)
      `)
      .eq("competition_id", compId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat peserta: " + error.message);
    } else {
      setParticipations((data as unknown as ParticipationRow[]) ?? []);
    }
    setLoadingParts(false);
  }, [supabase, toast]);

  // Helper for logging activity
  const triggerLog = async (action: "create" | "update" | "delete", entityId: string, entityLabel: string, label: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
    await logActivity(supabase, {
      userId: user.id,
      userRole: prof?.role ?? "admin",
      userName: prof?.full_name ?? "Admin",
      branchId: branchId || null,
      entityType: "competitions",
      entityId,
      entityLabel,
      action,
      label,
    });
  };

  // ── Comp Form Handlers ─────────────────────────────────────────────────────
  const openCreateComp = () => {
    setEditComp(null);
    setCompForm({
      name: "",
      organizer: "",
      location: "",
      city: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      level: "local",
      description: "",
    });
    setOpenCompForm(true);
  };

  const openEditComp = (comp: CompetitionRow) => {
    setEditComp(comp);
    setCompForm({
      name: comp.name,
      organizer: comp.organizer ?? "",
      location: comp.location ?? "",
      city: comp.city ?? "",
      start_date: comp.start_date,
      end_date: comp.end_date ?? "",
      level: comp.level ?? "local",
      description: comp.description ?? "",
    });
    setOpenCompForm(true);
  };

  const handleSaveComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name.trim() || !compForm.start_date) {
      toast.error("Nama perlombaan dan tanggal mulai wajib diisi.");
      return;
    }

    setSavingComp(true);
    const { data: userData } = await supabase.auth.getUser();

    if (editComp) {
      const { error } = await supabase
        .from("competitions")
        .update({
          name: compForm.name.trim(),
          organizer: compForm.organizer.trim() || null,
          location: compForm.location.trim() || null,
          city: compForm.city.trim() || null,
          start_date: compForm.start_date,
          end_date: compForm.end_date || null,
          level: compForm.level,
          description: compForm.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editComp.id);

      if (error) {
        toast.error("Gagal mengubah perlombaan: " + error.message);
      } else {
        toast.success("Perlombaan berhasil diperbarui.");
        await triggerLog("update", editComp.id, compForm.name, `Memperbarui perlombaan ${compForm.name}`);
        setOpenCompForm(false);
        loadCompetitions();
      }
    } else {
      const { data: newComp, error } = await supabase
        .from("competitions")
        .insert({
          name: compForm.name.trim(),
          organizer: compForm.organizer.trim() || null,
          location: compForm.location.trim() || null,
          city: compForm.city.trim() || null,
          start_date: compForm.start_date,
          end_date: compForm.end_date || null,
          level: compForm.level,
          description: compForm.description.trim() || null,
          created_by_id: userData?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Gagal menambah perlombaan: " + error.message);
      } else {
        toast.success("Perlombaan baru berhasil ditambahkan.");
        if (newComp) {
          await triggerLog("create", newComp.id, compForm.name, `Menambahkan perlombaan ${compForm.name}`);
        }
        setOpenCompForm(false);
        loadCompetitions();
      }
    }
    setSavingComp(false);
  };

  const handleDeleteComp = async (comp: CompetitionRow) => {
    const ok = await confirm({
      title: `Hapus Perlombaan "${comp.name}"?`,
      body: `Menghapus perlombaan ini akan menghapus seluruh data keikutsertaan & hasil ${comp.participations_count ?? 0} peserta. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus Perlombaan",
      danger: true,
    });

    if (!ok) return;

    const { error } = await supabase.from("competitions").delete().eq("id", comp.id);
    if (error) {
      toast.error("Gagal menghapus perlombaan: " + error.message);
    } else {
      toast.success("Perlombaan berhasil dihapus.");
      await triggerLog("delete", comp.id, comp.name, `Menghapus perlombaan ${comp.name}`);
      loadCompetitions();
      if (selectedComp?.id === comp.id) setSelectedComp(null);
    }
  };

  // ── Participation Handlers ────────────────────────────────────────────────
  const openAddParticipant = () => {
    setEditPart(null);
    setPartForm({
      member_id: "",
      coach_id: "",
      category: "",
      age_group: "",
      time_raw: "",
      rank: "",
      result_status: "finished",
      award: "participant",
      custom_award_label: "",
      notes: "",
    });
    setCertFile(null);
    setOpenPartForm(true);
  };

  const openEditParticipant = (p: ParticipationRow) => {
    setEditPart(p);
    setPartForm({
      member_id: p.member_id,
      coach_id: p.coach_id ?? "",
      category: p.category,
      age_group: p.age_group ?? "",
      time_raw: p.time_formatted || (p.time_seconds ? `${p.time_seconds}` : ""),
      rank: p.rank ? `${p.rank}` : "",
      result_status: p.result_status || "finished",
      award: p.award || "participant",
      custom_award_label: p.custom_award_label ?? "",
      notes: p.notes ?? "",
    });
    setCertFile(null);
    setOpenPartForm(true);
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    if (!partForm.member_id || !partForm.category.trim()) {
      toast.error("Member dan kategori/nomor lomba wajib diisi.");
      return;
    }

    setSavingPart(true);
    const parsedTime = parseSwimTime(partForm.time_raw);

    if (editPart) {
      const { error } = await supabase
        .from("competition_participations")
        .update({
          member_id: partForm.member_id,
          coach_id: partForm.coach_id || null,
          category: partForm.category.trim(),
          age_group: partForm.age_group.trim() || null,
          time_seconds: parsedTime.seconds,
          time_formatted: parsedTime.formatted || null,
          rank: partForm.rank ? parseInt(partForm.rank, 10) : null,
          result_status: partForm.result_status,
          award: partForm.award,
          custom_award_label: partForm.award === "custom" ? partForm.custom_award_label.trim() : null,
          notes: partForm.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editPart.id);

      if (error) {
        toast.error("Gagal memperbarui hasil peserta: " + error.message);
        setSavingPart(false);
        return;
      }

      // Upload file if selected
      if (certFile) {
        const fd = new FormData();
        fd.append("file", certFile);
        fd.append("partId", editPart.id);
        await fetch("/api/upload/competition-doc", { method: "POST", body: fd });
      }

      toast.success("Hasil peserta berhasil diperbarui.");
      setOpenPartForm(false);
      loadParticipations(selectedComp.id);
      loadCompetitions();
    } else {
      const selectedMember = membersList.find(m => m.id === partForm.member_id);
      const targetBranchId = branchId || selectedMember?.branch_id || "";

      const { data: newPart, error } = await supabase
        .from("competition_participations")
        .insert({
          competition_id: selectedComp.id,
          member_id: partForm.member_id,
          branch_id: targetBranchId,
          coach_id: partForm.coach_id || null,
          category: partForm.category.trim(),
          age_group: partForm.age_group.trim() || null,
          time_seconds: parsedTime.seconds,
          time_formatted: parsedTime.formatted || null,
          rank: partForm.rank ? parseInt(partForm.rank, 10) : null,
          result_status: partForm.result_status,
          award: partForm.award,
          custom_award_label: partForm.award === "custom" ? partForm.custom_award_label.trim() : null,
          notes: partForm.notes.trim() || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Gagal menambah peserta: " + error.message);
        setSavingPart(false);
        return;
      }

      // Upload file if selected
      if (certFile && newPart) {
        const fd = new FormData();
        fd.append("file", certFile);
        fd.append("partId", newPart.id);
        await fetch("/api/upload/competition-doc", { method: "POST", body: fd });
      }

      toast.success("Peserta perlombaan berhasil ditambahkan.");
      setOpenPartForm(false);
      loadParticipations(selectedComp.id);
      loadCompetitions();
    }
    setSavingPart(false);
  };

  const handleRemoveParticipant = async (p: ParticipationRow) => {
    const ok = await confirm({
      title: "Hapus Peserta dari Perlombaan?",
      body: `Hapus data keikutsertaan ${ (p.member?.profile as any)?.full_name ?? "Member" } pada nomor ${p.category}? (Data akun member TIDAK akan terhapus)`,
      confirmLabel: "Hapus Peserta",
      danger: true,
    });

    if (!ok) return;

    const { error } = await supabase.from("competition_participations").delete().eq("id", p.id);
    if (error) {
      toast.error("Gagal menghapus peserta: " + error.message);
    } else {
      toast.success("Peserta berhasil dihapus dari perlombaan.");
      if (selectedComp) loadParticipations(selectedComp.id);
      loadCompetitions();
    }
  };

  // ── Derived Stats & Filtering ─────────────────────────────────────────────
  const filteredComps = useMemo(() => {
    return competitions.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.organizer ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.location ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLevel = levelFilter === "all" || c.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [competitions, search, levelFilter]);

  const totalComps = competitions.length;
  const totalParticipations = competitions.reduce((acc, c) => acc + (c.participations_count ?? 0), 0);
  const totalMedals = competitions.reduce((acc, c) => acc + (c.medals_count ?? 0), 0);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return membersList.slice(0, 30);
    return membersList.filter(m =>
      m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
    ).slice(0, 30);
  }, [membersList, memberSearch]);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total Perlombaan" value={totalComps} icon="flag" tone="ocean" sub="Kejurda, O2SN, Cup" />
        <Stat label="Total Keikutsertaan" value={totalParticipations} icon="users" tone="wave" sub="Total nomor lomba diikuti" />
        <Stat label="Total Prestasi / Medali" value={totalMedals} icon="star" tone="warn" sub="Emas, Perak, Perunggu, Custom" />
      </div>

      {/* ── Actions Header & Filter ── */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Input
              placeholder="Cari perlombaan, penyelenggara, lokasi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="w-40">
              <option value="all">Semua Level</option>
              <option value="internal">Internal</option>
              <option value="local">Lokal / Kota</option>
              <option value="regional">Regional / Jabar</option>
              <option value="national">Nasional</option>
              <option value="international">Internasional</option>
            </Select>
          </div>
          <Btn variant="primary" icon="plus" onClick={openCreateComp}>
            Tambah Perlombaan
          </Btn>
        </div>

        {/* ── Competitions Table ── */}
        {loading ? (
          <div className="py-12 text-center text-ink-mute">Memuat data perlombaan...</div>
        ) : filteredComps.length === 0 ? (
          <div className="py-12 text-center text-ink-mute">
            Belum ada perlombaan terdaftar. Klik <strong>Tambah Perlombaan</strong> untuk mencatat event baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  <th className="py-3 px-3">Nama Perlombaan</th>
                  <th className="py-3 px-3">Tanggal & Lokasi</th>
                  <th className="py-3 px-3">Penyelenggara</th>
                  <th className="py-3 px-3 text-center">Level</th>
                  <th className="py-3 px-3 text-center">Peserta</th>
                  <th className="py-3 px-3 text-center">Medali</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredComps.map(comp => (
                  <tr key={comp.id} className="hover:bg-paper-tint transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-ink-strong">{comp.name}</div>
                      {comp.description && <div className="text-xs text-ink-mute truncate max-w-xs">{comp.description}</div>}
                    </td>
                    <td className="py-3 px-3 text-ink-soft">
                      <div>{fmtDate(comp.start_date)}</div>
                      <div className="text-xs text-ink-mute">{comp.location || comp.city || "—"}</div>
                    </td>
                    <td className="py-3 px-3 text-ink-soft">{comp.organizer || "—"}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-ocean-50 text-ocean-700 border border-ocean-200">
                        {comp.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-ink-strong">
                      {comp.participations_count}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${comp.medals_count ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-ink-mute"}`}>
                        🏆 {comp.medals_count}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Btn
                          variant="soft"
                          size="sm"
                          icon="eye"
                          onClick={() => {
                            setSelectedComp(comp);
                            loadParticipations(comp.id);
                          }}
                        >
                          Detail Peserta
                        </Btn>
                        <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEditComp(comp)} />
                        <Btn variant="ghost" size="sm" icon="trash" onClick={() => handleDeleteComp(comp)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal: Create / Edit Competition ── */}
      {openCompForm && (
        <Modal
          open={openCompForm}
          onClose={() => setOpenCompForm(false)}
          title={editComp ? "Edit Perlombaan" : "Tambah Perlombaan Baru"}
        >
          <form onSubmit={handleSaveComp} className="space-y-4">
            <Field label="Nama Perlombaan" required hint="Contoh: Kejurda Renang Jawa Barat 2026">
              <Input
                value={compForm.name}
                onChange={e => setCompForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Masukkan nama resmi perlombaan"
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Penyelenggara" hint="Contoh: PRSI Jabar / Kemenpora">
                <Input
                  value={compForm.organizer}
                  onChange={e => setCompForm(prev => ({ ...prev, organizer: e.target.value }))}
                  placeholder="Penyelenggara lomba"
                />
              </Field>
              <Field label="Tingkat / Level">
                <Select value={compForm.level} onChange={e => setCompForm(prev => ({ ...prev, level: e.target.value }))}>
                  <option value="internal">Internal Sekolah</option>
                  <option value="local">Lokal / Kota</option>
                  <option value="regional">Regional / Provinsi</option>
                  <option value="national">Nasional</option>
                  <option value="international">Internasional</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lokasi Pool / Tempat">
                <Input
                  value={compForm.location}
                  onChange={e => setCompForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Contoh: Kolam Renang UPI Bandung"
                />
              </Field>
              <Field label="Kota">
                <Input
                  value={compForm.city}
                  onChange={e => setCompForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Contoh: Bandung"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tanggal Mulai" required>
                <DatePicker
                  value={compForm.start_date}
                  onChange={d => setCompForm(prev => ({ ...prev, start_date: d }))}
                />
              </Field>
              <Field label="Tanggal Selesai (Opsional)">
                <DatePicker
                  value={compForm.end_date}
                  onChange={d => setCompForm(prev => ({ ...prev, end_date: d }))}
                />
              </Field>
            </div>

            <Field label="Catatan / Deskripsi (Opsional)">
              <Textarea
                rows={3}
                value={compForm.description}
                onChange={e => setCompForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Catatan tambahan mengenai babak kualifikasi, syarat umur, dll."
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Btn variant="ghost" onClick={() => setOpenCompForm(false)}>
                Batal
              </Btn>
              <Btn variant="primary" type="submit" disabled={savingComp}>
                {savingComp ? "Menyimpan..." : editComp ? "Simpan Perubahan" : "Buat Perlombaan"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Competition Detail & Participant Management ── */}
      {selectedComp && (
        <Modal
          open={!!selectedComp}
          onClose={() => setSelectedComp(null)}
          title={`Detail Perlombaan — ${selectedComp.name}`}
          size="xl"
        >
          <div className="space-y-5">
            {/* Comp Header Info Card */}
            <div className="bg-ocean-50/70 border border-ocean-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-bold text-ocean-900 text-base">{selectedComp.name}</div>
                <div className="text-ocean-700 text-xs mt-0.5">
                  📍 {selectedComp.location || selectedComp.city || "Lokasi belum diisi"} | 📅 {fmtDate(selectedComp.start_date)}
                  {selectedComp.organizer && ` | 🏢 ${selectedComp.organizer}`}
                </div>
              </div>
              <Btn variant="primary" size="sm" icon="plus" onClick={openAddParticipant}>
                Tambah Hasil Member
              </Btn>
            </div>

            {/* Participants Table */}
            <div className="space-y-3">
              <div className="font-bold text-ink-strong flex items-center justify-between">
                <span>Daftar Peserta & Hasil ({participations.length})</span>
              </div>

              {loadingParts ? (
                <div className="py-8 text-center text-ink-mute">Memuat data peserta...</div>
              ) : participations.length === 0 ? (
                <div className="py-8 text-center text-ink-mute border border-dashed border-line rounded-xl">
                  Belum ada peserta terdaftar dalam perlombaan ini. Klik tombol <strong>Tambah Hasil Member</strong> di atas.
                </div>
              ) : (
                <div className="overflow-x-auto border border-line rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-paper-tint text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-line">
                        <th className="py-2.5 px-3">Member & Cabang</th>
                        <th className="py-2.5 px-3">Kategori & KU</th>
                        <th className="py-2.5 px-3">Waktu Result</th>
                        <th className="py-2.5 px-3 text-center">Peringkat</th>
                        <th className="py-2.5 px-3 text-center">Hasil / Medali</th>
                        <th className="py-2.5 px-3">Coach</th>
                        <th className="py-2.5 px-3 text-center">Sertifikat</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {participations.map(p => {
                        const awardInfo = AWARD_LABELS[p.award] || AWARD_LABELS.participant;
                        const memberName = (p.member?.profile as any)?.full_name ?? "Member";
                        const avatarUrl = (p.member?.profile as any)?.avatar_url;

                        return (
                          <tr key={p.id} className="hover:bg-paper-tint/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <Avatar src={avatarUrl ?? undefined} name={memberName} size={32} />
                                <div>
                                  <div className="font-bold text-ink-strong">{memberName}</div>
                                  <div className="text-xs text-ink-mute">{p.branch?.name || "Center"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-ink-strong">{p.category}</div>
                              {p.age_group && <div className="text-xs text-ink-mute">{p.age_group}</div>}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-ocean-700">
                              {p.time_formatted || (p.time_seconds ? `${p.time_seconds}s` : "—")}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-ink-strong">
                              {p.rank ? `#${p.rank}` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${awardInfo.style}`}>
                                {awardInfo.icon} {p.award === "custom" && p.custom_award_label ? p.custom_award_label : awardInfo.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-ink-soft">
                              {p.coach?.full_name || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {p.certificate_url ? (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(p.certificate_url)}
                                  className="text-xs font-semibold text-ocean-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                                >
                                  <Icon name="eye" className="w-3.5 h-3.5" /> Lihat
                                </button>
                              ) : (
                                <span className="text-xs text-ink-faint">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEditParticipant(p)} />
                                <Btn variant="ghost" size="sm" icon="trash" onClick={() => handleRemoveParticipant(p)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Add / Edit Participant Result ── */}
      {openPartForm && (
        <Modal
          open={openPartForm}
          onClose={() => setOpenPartForm(false)}
          title={editPart ? "Edit Hasil Member" : "Tambah Hasil Member"}
        >
          <form onSubmit={handleSaveParticipant} className="space-y-4">
            <Field label="Pilih Member" required>
              {editPart ? (
                <div className="p-2.5 bg-paper-tint rounded-lg font-bold text-ink-strong">
                  {(editPart.member?.profile as any)?.full_name}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Ketik untuk mencari member..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                  <Select
                    value={partForm.member_id}
                    onChange={e => setPartForm(prev => ({ ...prev, member_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Pilih Member --</option>
                    {filteredMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.branch_name || "Center"})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Kategori / Nomor Lomba" required hint="Misal: 50m Gaya Bebas / 100m Dada">
                <Input
                  value={partForm.category}
                  onChange={e => setPartForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="50m Gaya Bebas"
                  required
                />
              </Field>
              <Field label="Kelompok Umur (KU)" hint="Misal: KU-4 (11-12 th) / Open">
                <Input
                  value={partForm.age_group}
                  onChange={e => setPartForm(prev => ({ ...prev, age_group: e.target.value }))}
                  placeholder="KU-4 (U-12)"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Waktu Hasil" hint="Misal: 32.41 atau 1:12.20">
                <Input
                  value={partForm.time_raw}
                  onChange={e => setPartForm(prev => ({ ...prev, time_raw: e.target.value }))}
                  placeholder="32.41"
                />
              </Field>
              <Field label="Peringkat / Juara" hint="Misal: 1, 2, 3">
                <Input
                  type="number"
                  min={1}
                  value={partForm.rank}
                  onChange={e => setPartForm(prev => ({ ...prev, rank: e.target.value }))}
                  placeholder="1"
                />
              </Field>
              <Field label="Status Hasil">
                <Select value={partForm.result_status} onChange={e => setPartForm(prev => ({ ...prev, result_status: e.target.value }))}>
                  <option value="finished">Selesai (Finished)</option>
                  <option value="finalist">Finalis</option>
                  <option value="dq">Disklualifikasi (DQ)</option>
                  <option value="dns">Did Not Start (DNS)</option>
                  <option value="dnf">Did Not Finish (DNF)</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Penghargaan / Medali">
                <Select value={partForm.award} onChange={e => setPartForm(prev => ({ ...prev, award: e.target.value }))}>
                  <option value="participant">🏊 Peserta (Participant)</option>
                  <option value="gold">🥇 Medali Emas (Gold)</option>
                  <option value="silver">🥈 Medali Perak (Silver)</option>
                  <option value="bronze">🥉 Medali Perunggu (Bronze)</option>
                  <option value="fourth_place">🏅 Juara 4</option>
                  <option value="finalist">⭐ Finalis</option>
                  <option value="custom">🏆 Penghargaan Khusus</option>
                </Select>
              </Field>
              {partForm.award === "custom" && (
                <Field label="Nama Penghargaan Khusus">
                  <Input
                    value={partForm.custom_award_label}
                    onChange={e => setPartForm(prev => ({ ...prev, custom_award_label: e.target.value }))}
                    placeholder="Misal: Best Swimmer"
                  />
                </Field>
              )}
              <Field label="Coach Pendamping (Opsional)">
                <Select value={partForm.coach_id} onChange={e => setPartForm(prev => ({ ...prev, coach_id: e.target.value }))}>
                  <option value="">-- Tidak ada / Ditentukan kemudian --</option>
                  {coachesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Upload Sertifikat / Foto Hasil (Opsional)" hint="Format: JPG, PNG, PDF (Maks 10MB)">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setCertFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-ink-soft file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100"
              />
            </Field>

            <Field label="Catatan Tambahan (Opsional)">
              <Textarea
                rows={2}
                value={partForm.notes}
                onChange={e => setPartForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Catatan personal best, angin, kondisi kolam, dll."
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Btn variant="ghost" onClick={() => setOpenPartForm(false)}>
                Batal
              </Btn>
              <Btn variant="primary" type="submit" disabled={savingPart}>
                {savingPart ? "Menyimpan..." : "Simpan Hasil"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Lightbox Preview */}
      {lightboxUrl && (
        <PhotoLightbox
          src={lightboxUrl}
          name="Sertifikat / Bukti Hasil Perlombaan"
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}
