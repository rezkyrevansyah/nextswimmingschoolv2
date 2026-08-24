"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useLocale } from "@/components/providers/LocaleProvider";
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
import AdminCompetition from "./_components/AdminCompetition";
import type { Branch } from "./_types";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

// ── Nav ────────────────────────────────────────────────────────────────────────

function buildNavItems(t: (key: string) => string): NavItem[] {
  return [
    { section: t("admin.nav.sectionOperasional") },
    { id: "dashboard",  label: t("admin.nav.dashboard"), icon: "grid"      },
    { id: "activity",   label: t("admin.nav.activity"),  icon: "calendar"  },
    { section: t("admin.nav.sectionManajemen") },
    { id: "classes",    label: t("admin.nav.classes"),   icon: "swim"      },
    { id: "members",    label: t("admin.nav.members"),   icon: "users"     },
    { id: "coaches",    label: t("admin.nav.coaches"),   icon: "shield"    },
    { id: "competitions", label: t("admin.nav.competitions"), icon: "flag" },
    { id: "absensi",    label: t("admin.nav.absensi"),   icon: "check"     },
    { id: "announce",   label: t("admin.nav.announce"),  icon: "bell"      },
    { section: t("admin.nav.sectionPersetujuan") },
    { id: "izin",       label: t("admin.nav.izin"),      icon: "clipboard" },
    { id: "approve",    label: t("admin.nav.approve"),   icon: "check"     },
    { section: t("admin.nav.sectionKeuanganRapor") },
    { id: "pay",        label: t("admin.nav.pay"),       icon: "wallet"    },
    { id: "financial",  label: t("admin.nav.financial"), icon: "invoice"   },
    { id: "rapor",      label: t("admin.nav.rapor"),     icon: "book"      },
    { id: "school",     label: t("admin.nav.school"),    icon: "school"    },
    { section: t("admin.nav.sectionSystem") },
    { id: "settings",   label: t("admin.nav.settings"),  icon: "settings"  },
  ];
}

function buildTitles(t: (key: string) => string): Record<string, [string, string]> {
  return {
    dashboard: [t("admin.titles.dashboard.title"), t("admin.titles.dashboard.sub")],
    activity:  [t("admin.titles.activity.title"),  t("admin.titles.activity.sub")],
    classes:   [t("admin.titles.classes.title"),   t("admin.titles.classes.sub")],
    members:   [t("admin.titles.members.title"),   t("admin.titles.members.sub")],
    coaches:   [t("admin.titles.coaches.title"),   t("admin.titles.coaches.sub")],
    competitions: [t("admin.titles.competitions.title"), t("admin.titles.competitions.sub")],
    absensi:   [t("admin.titles.absensi.title"),   t("admin.titles.absensi.sub")],
    announce:  [t("admin.titles.announce.title"),  t("admin.titles.announce.sub")],
    izin:      [t("admin.titles.izin.title"),      t("admin.titles.izin.sub")],
    approve:   [t("admin.titles.approve.title"),   t("admin.titles.approve.sub")],
    pay:       [t("admin.titles.pay.title"),       t("admin.titles.pay.sub")],
    financial: [t("admin.titles.financial.title"), t("admin.titles.financial.sub")],
    rapor:     [t("admin.titles.rapor.title"),     t("admin.titles.rapor.sub")],
    school:    [t("admin.titles.school.title"),    t("admin.titles.school.sub")],
    settings:  [t("admin.titles.settings.title"),  t("admin.titles.settings.sub")],
  };
}

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
  const [approveBadge, setApproveBadge] = useState(0);
  const { t } = useLocale();

  const loadBranch = useCallback(async (branchId: string) => {
    const { data } = await supabase.from("branches").select("id, name, city, address, lat, lng, wa_numbers, logo_url").eq("id", branchId).single();
    if (data) setBranch(data as Branch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadApproveBadge = useCallback(async (bid: string) => {
    if (!bid) return;
    const [{ count: regCount }, { data: certs }] = await Promise.all([
      supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("branch_id", bid)
        .eq("status", "pending"),
      supabase
        .from("certifications")
        .select("profile:profiles!certifications_coach_id_fkey(branch_id), status")
        .eq("status", "pending"),
    ]);
    const certCount = (certs ?? []).filter(c => (c.profile as any)?.branch_id === bid).length;
    setApproveBadge((regCount ?? 0) + certCount);
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
        setInitError(t("admin.shell.notFoundBody"));
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

  useEffect(() => {
    if (!resolvedBranchId) return;
    loadApproveBadge(resolvedBranchId);
    const channel = supabase
      .channel(`approve_badge:${resolvedBranchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations", filter: `branch_id=eq.${resolvedBranchId}` },
        () => loadApproveBadge(resolvedBranchId))
      .on("postgres_changes", { event: "*", schema: "public", table: "certifications" },
        () => loadApproveBadge(resolvedBranchId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resolvedBranchId, loadApproveBadge]); // eslint-disable-line react-hooks/exhaustive-deps

  const backToOwner = () => {
    sessionStorage.removeItem("ownerPreviewBranch");
    router.push("/owner");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const branchId = resolvedBranchId || (currentUser?.user_metadata?.branch_id as string ?? "");

  const navItems = useMemo(() =>
    buildNavItems(t).map(it =>
      it.id === "approve" && approveBadge > 0
        ? { ...it, badge: approveBadge }
        : it
    ),
  [approveBadge, t]);

  function renderPage() {
    if (!resolvedBranchId && active !== "settings") return (
      <div className="flex items-center justify-center h-64 text-ink-mute">{t("admin.shell.loadingBranch")}</div>
    );
    switch (active) {
      case "dashboard": return <AdminDashboard branchId={branchId} />;
      case "activity":  return <AdminClassActivity branchId={branchId} />;
      case "classes":   return <AdminClass branchId={branchId} />;
      case "members":   return <AdminMember branchId={branchId} />;
      case "coaches":   return <AdminCoach branchId={branchId} />;
      case "competitions": return <AdminCompetition branchId={branchId} />;
      case "absensi":   return <AdminAbsensi branchId={branchId} />;
      case "announce":  return <AdminPengumuman branchId={branchId} />;
      case "izin":      return <AdminIzin branchId={branchId} />;
      case "approve":   return <AdminApprovement branchId={branchId} />;
      case "pay":       return <AdminPembayaran branchId={branchId} />;
      case "financial": return <AdminFinancial branchId={branchId} userId={currentUser?.id ?? ""} userName={currentUser?.user_metadata?.full_name ?? "Admin"} />;
      case "rapor":     return <AdminRapor branchId={branchId} />;
      case "school":    return <AdminSchoolPanel branchId={branchId} />;
      case "settings":  return <AdminSettings branch={branch} onRefresh={() => branchId && loadBranch(branchId)} userId={currentUser?.id ?? ""} />;
      default:          return null;
    }
  }

  const [title] = buildTitles(t)[active] ?? [t("admin.shell.brandTitle"), ""];
  const subTitle = active === "dashboard" ? branch?.name ?? t("admin.shell.brandTitle") : (buildTitles(t)[active]?.[1] ?? "");

  const brand = useMemo(() => (
    <div className="flex items-center gap-2.5">
      {branch?.logo_url ? <Image src={branch.logo_url} alt="logo" width={36} height={36} className="w-9 h-9 rounded-lg object-cover" /> : <Logo size={36} />}
      <div className="min-w-0">
        <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">{t("admin.shell.brandTitle")}</div>
        <div className="text-[10px] text-ink-mute tracking-wide truncate">{branch?.name ?? t("admin.shell.brandLoading")}</div>
      </div>
    </div>
  ), [branch, t]);

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">{t("admin.shell.notFoundTitle")}</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          {t("admin.shell.backToLogin")}
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
            {t("admin.shell.ownerPreviewBanner")} <span className="text-wave-200 font-bold">{ownerPreview.name}</span>
          </span>
          <button
            onClick={backToOwner}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
          >
            <Icon name="arrowL" className="w-4 h-4" /> {t("admin.shell.backToOwnerBtn")}
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      <Sidebar
        items={navItems}
        active={active}
        onSelect={(id) => { setActive(id); setMobileNav(false); }}
        brand={brand}
        footer={
          <div className="space-y-2">
            {branch && (
              <Card className="!p-3 bg-wave-50 border-wave-100">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-700">{t("admin.shell.activeBranchLabel")}</div>
                <div className="font-display font-bold text-ink mt-0.5 text-sm">{branch.name}</div>
              </Card>
            )}
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint">
              <Icon name="logout" className="w-4 h-4" /> {t("common.actions.logout")}
            </button>
          </div>
        }
      />

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
                  <Icon name={it.icon!} className="w-4 h-4" />
                  <span className="flex-1 text-left">{it.label}</span>
                  {it.badge ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-500 text-white">{it.badge}</span>
                  ) : null}
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
          search={t("admin.shell.searchPlaceholder")}
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <LanguageSwitcher />
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

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="admin" />}
    </div>
  );
}
