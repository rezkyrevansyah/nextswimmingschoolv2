"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import AdminSettings from "./_components/AdminSettings";
import AdminDashboard from "./_components/AdminDashboard";
import AdminClass from "./_components/AdminClass";
import AdminMember from "./_components/AdminMember";
import AdminCoach from "./_components/AdminCoach";
import AdminClassActivity from "./_components/AdminClassActivity";
import AdminAbsensi from "./_components/AdminAbsensi";
import AdminPengumuman from "./_components/AdminPengumuman";
import AdminIzin from "./_components/AdminIzin";
import AdminPembayaran from "./_components/AdminPembayaran";
import AdminApprovement from "./_components/AdminApprovement";
import AdminRapor from "./_components/AdminRapor";
import AdminSchoolPanel from "./_components/AdminSchoolPanel";
import AdminFinancial from "./_components/AdminFinancial";
import type { Branch } from "./_types";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

// ── Nav ────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { section: "Operasional" },
  { id: "dashboard",  label: "Dashboard",      icon: "grid"      },
  { id: "activity",   label: "Class Activity", icon: "calendar"  },
  { section: "Manajemen" },
  { id: "classes",    label: "Class",          icon: "swim"      },
  { id: "members",    label: "Member",         icon: "users"     },
  { id: "coaches",    label: "Coach",          icon: "shield"    },
  { id: "absensi",    label: "Absensi",        icon: "check"     },
  { id: "announce",   label: "Pengumuman",     icon: "bell"      },
  { section: "Persetujuan" },
  { id: "izin",       label: "Izin",           icon: "clipboard" },
  { id: "approve",    label: "Approvement",    icon: "check"     },
  { section: "Keuangan & rapor" },
  { id: "pay",        label: "Pembayaran",     icon: "wallet"    },
  { id: "financial",  label: "Financial",      icon: "invoice"   },
  { id: "rapor",      label: "Rapor",          icon: "book"      },
  { id: "school",     label: "School Panel",   icon: "school"    },
  { section: "System" },
  { id: "settings",   label: "Settings",       icon: "settings"  },
];

const TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard",       ""],
  activity:  ["Class Activity",  "Kalender semua kelas"],
  classes:   ["Class",           "CRUD kelas & jadwal"],
  members:   ["Member",          "Manajemen member cabang"],
  coaches:   ["Coach",           "Coach cabang Anda"],
  absensi:   ["Absensi",         "Coach & member · SSDP"],
  announce:  ["Pengumuman",      "Notifikasi ke member"],
  izin:      ["Izin",            "Approve & buat izin"],
  approve:   ["Approvement",     "Antrian persetujuan"],
  pay:       ["Pembayaran",      "Tagihan & verifikasi"],
  financial: ["Financial",       "Database keuangan & pembayaran"],
  rapor:     ["Rapor",           "Periode pengisian rapor"],
  school:    ["School Panel",    "Sekolah afiliasi"],
  settings:  ["Settings",        "Logo, lokasi, WA admin"],
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState("");
  const [ownerPreview, setOwnerPreview] = useState<{ id: string; name: string } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const loadBranch = useCallback(async (branchId: string) => {
    const { data } = await supabase.from("branches").select("id, name, city, address, lat, lng, wa_numbers, logo_url").eq("id", branchId).single();
    if (data) setBranch(data as Branch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- init from sessionStorage */
  useEffect(() => {
    // Check if owner navigated here to preview a branch
    const raw = sessionStorage.getItem("ownerPreviewBranch");
    if (raw) {
      try {
        const preview = JSON.parse(raw) as { id: string; name: string };
        setOwnerPreview(preview);
        setResolvedBranchId(preview.id);
        loadBranch(preview.id);
      } catch { /* ignore */ }
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setCurrentUser(user);

      // If owner preview is active, skip normal branch resolution
      if (sessionStorage.getItem("ownerPreviewBranch")) return;

      // Verify profile row exists — if not, data was wiped, force re-login
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        setInitError("Data akun tidak ditemukan di database. Kemungkinan data telah direset. Silakan hubungi owner untuk membuat ulang akun Anda.");
        return;
      }

      const branchId = (profile.branch_id ?? user.user_metadata?.branch_id) as string | undefined;
      if (branchId) {
        setResolvedBranchId(branchId);
        loadBranch(branchId);
      }
    });
  }, [loadBranch]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const backToOwner = () => {
    sessionStorage.removeItem("ownerPreviewBranch");
    router.push("/owner");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const branchId = resolvedBranchId || (currentUser?.user_metadata?.branch_id as string ?? "");

  function renderPage() {
    if (!resolvedBranchId && active !== "settings") return (
      <div className="flex items-center justify-center h-64 text-ink-mute">Memuat data cabang…</div>
    );
    switch (active) {
      case "dashboard": return <AdminDashboard branchId={branchId} />;
      case "activity":  return <AdminClassActivity branchId={branchId} />;
      case "classes":   return <AdminClass branchId={branchId} />;
      case "members":   return <AdminMember branchId={branchId} />;
      case "coaches":   return <AdminCoach branchId={branchId} />;
      case "absensi":   return <AdminAbsensi branchId={branchId} />;
      case "announce":  return <AdminPengumuman branchId={branchId} />;
      case "izin":      return <AdminIzin branchId={branchId} />;
      case "approve":   return <AdminApprovement branchId={branchId} />;
      case "pay":       return <AdminPembayaran branchId={branchId} />;
      case "financial": return <AdminFinancial branchId={branchId} />;
      case "rapor":     return <AdminRapor branchId={branchId} />;
      case "school":    return <AdminSchoolPanel branchId={branchId} />;
      case "settings":  return <AdminSettings branch={branch} onRefresh={() => branchId && loadBranch(branchId)} userId={currentUser?.id ?? ""} />;
      default:          return null;
    }
  }

  const [title] = TITLES[active] ?? ["Admin", ""];
  const subTitle = active === "dashboard" ? branch?.name ?? "Admin Panel" : (TITLES[active]?.[1] ?? "");

  const brand = useMemo(() => (
    <div className="flex items-center gap-2.5">
      {branch?.logo_url ? <Image src={branch.logo_url} alt="logo" width={36} height={36} className="w-9 h-9 rounded-lg object-cover" /> : <Logo size={36} />}
      <div className="min-w-0">
        <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">Admin Panel</div>
        <div className="text-[10px] text-ink-mute tracking-wide truncate">{branch?.name ?? "Memuat…"}</div>
      </div>
    </div>
  ), [branch]);

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">Data Tidak Ditemukan</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          Kembali ke Login
        </Btn>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-paper-tint min-h-screen">
      {ownerPreview && (
        <div className="bg-ocean-800 text-white px-4 py-2.5 flex items-center gap-3 z-50 shrink-0">
          <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Icon name="shield" className="w-3.5 h-3.5 text-wave-200" />
          </span>
          <span className="text-sm font-semibold flex-1">
            Mode pratinjau Owner — Admin Panel <span className="text-wave-200 font-bold">{ownerPreview.name}</span>
          </span>
          <button
            onClick={backToOwner}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
          >
            <Icon name="arrowL" className="w-4 h-4" /> Kembali ke Owner Panel
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      <Sidebar
        items={NAV_ITEMS}
        active={active}
        onSelect={(id) => { setActive(id); setMobileNav(false); }}
        brand={brand}
        footer={
          <div className="space-y-2">
            {branch && (
              <Card className="!p-3 bg-wave-50 border-wave-100">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-700">Cabang Aktif</div>
                <div className="font-display font-bold text-ink mt-0.5 text-sm">{branch.name}</div>
              </Card>
            )}
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint">
              <Icon name="logout" className="w-4 h-4" /> Logout
            </button>
          </div>
        }
      />

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-line p-3 overflow-y-auto">
            <div className="px-2 py-2 mb-2">{brand}</div>
            {NAV_ITEMS.map((it) =>
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
          sub={subTitle}
          search="Cari member, coach, tagihan…"
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <Bell userId={currentUser?.id ?? ""} />
              <Avatar name={currentUser?.user_metadata?.full_name ?? "A"} size={36} />
            </>
          }
        />
        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7">
          {renderPage()}
        </main>
      </div>
      </div>

    </div>
  );
}
