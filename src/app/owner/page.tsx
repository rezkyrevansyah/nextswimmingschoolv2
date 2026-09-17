"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { GoogleLanguageSwitcher } from "@/components/GoogleTranslate";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useLocale } from "@/components/providers/LocaleProvider";
import LandingCMS from "./_components/LandingCMS";
import OwnerSchools from "./_components/OwnerSchools";
import OwnerMasterData from "./_components/OwnerMasterData";
import OwnerAccountsMaster from "./_components/OwnerAccountsMaster";
import OwnerMemberPrivate from "./_components/OwnerMemberPrivate";
import OwnerStaffPresensi from "./_components/OwnerStaffPresensi";
import CoachLoans from "./payroll/CoachLoans";
import AdminCompetition from "../admin/_components/AdminCompetition";
import OwnerDashboard from "./_components/OwnerDashboard";
import OwnerBranches from "./_components/OwnerBranches";
import OwnerClasses from "./_components/OwnerClasses";
import OwnerTarif from "./_components/OwnerTarif";
import OwnerInvoices from "./_components/OwnerInvoices";
import OwnerActivityLog from "./_components/OwnerActivityLog";
import OwnerRaporLevels from "./_components/OwnerRaporLevels";
import OwnerStorage from "./_components/OwnerStorage";
import OwnerFinancial from "./_components/OwnerFinancial";
import type { Branch } from "./_types";

// ── Sub-pages ──────────────────────────────────────────────────────────────────



// ── Nav items ──────────────────────────────────────────────────────────────────

function buildNavItems(t: (key: string) => string): NavItem[] {
  return [
    { id: "dashboard",     label: t("owner.nav.dashboard"),     icon: "dashboard" },
    { id: "branches",      label: t("owner.nav.branches"),      icon: "apartment" },
    { id: "master",        label: t("owner.nav.master"),        icon: "database" },
    { id: "accounts",      label: t("owner.nav.accounts"),      icon: "manage_accounts" },
    { id: "schools",       label: t("owner.nav.schools"),       icon: "school" },
    { id: "levels",        label: t("owner.nav.levels"),        icon: "workspace_premium" },
    { id: "classes",       label: t("owner.nav.classes"),       icon: "pool" },
    { id: "memberPrivate", label: "Private Students",           icon: "person" },
    { id: "rates",         label: t("owner.nav.rates"),         icon: "sell" },
    { id: "competitions",  label: t("owner.nav.competitions"),  icon: "trophy" },
    { id: "staffPresensi", label: "Attendance",                 icon: "fact_check" },
    { id: "invoices",      label: t("owner.nav.invoices"),      icon: "receipt_long" },
    { id: "loans",         label: t("owner.nav.loans"),         icon: "wallet" },
    { id: "financial",     label: t("owner.nav.financial"),     icon: "chart" },
    { id: "landing",       label: t("owner.nav.landing"),       icon: "web" },
    { id: "storage",       label: t("owner.nav.storage"),       icon: "storage" },
    { id: "activity",      label: t("owner.nav.activity"),      icon: "history" },
  ];
}

function buildTitles(t: (key: string) => string): Record<string, [string, string]> {
  return {
    dashboard:     [t("owner.titles.dashboard.title"), t("owner.titles.dashboard.sub")],
    branches:      [t("owner.titles.branches.title"),  t("owner.titles.branches.sub")],
    master:        [t("owner.titles.master.title"),    t("owner.titles.master.sub")],
    accounts:      [t("owner.titles.accounts.title"),  t("owner.titles.accounts.sub")],
    schools:       [t("owner.titles.schools.title"),   t("owner.titles.schools.sub")],
    levels:        [t("owner.titles.levels.title"),    t("owner.titles.levels.sub")],
    classes:       [t("owner.titles.classes.title"),   t("owner.titles.classes.sub")],
    memberPrivate: ["Private Students", "Manage private student assignments and coaches"],
    rates:         [t("owner.titles.rates.title"),     t("owner.titles.rates.sub")],
    competitions:  [t("owner.titles.competitions.title"), t("owner.titles.competitions.sub")],
    staffPresensi: [t("owner.titles.staffPresensi.title"), t("owner.titles.staffPresensi.sub")],
    invoices:      [t("owner.titles.invoices.title"),  t("owner.titles.invoices.sub")],
    loans:         [t("owner.titles.loans.title"),     t("owner.titles.loans.sub")],
    financial:     [t("owner.titles.financial.title"), t("owner.titles.financial.sub")],
    landing:       [t("owner.titles.landing.title"),   t("owner.titles.landing.sub")],
    storage:       [t("owner.titles.storage.title"),   t("owner.titles.storage.sub")],
    activity:      [t("owner.titles.activity.title"),  t("owner.titles.activity.sub")],
  };
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OwnerPage() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useLocale();
  const [active, setActive] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [userId, setUserId] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    const [{ data: branchData }, { data: members }, { data: coaches }, { data: staffData }, { data: classes }] = await Promise.all([
      supabase.from("branches").select("id, name, city, address, lat, lng, status, wa_numbers, bank_name, bank_account, bank_holder, show_payments_to_admin").order("name"),
      supabase.from("members").select("id, branch_id").eq("status", "active"),
      supabase.from("profiles").select("id, branch_id").eq("role", "coach"),
      supabase.from("profiles").select("id, branch_id").eq("role", "staff"),
      supabase.from("classes").select("id, branch_id").eq("status", "active"),
    ]);

    if (branchData) {
      const memberMap = (members ?? []).reduce<Record<string, number>>((acc, m) => {
        if (m.branch_id) acc[m.branch_id] = (acc[m.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const coachMap = (coaches ?? []).reduce<Record<string, number>>((acc, c) => {
        if (c.branch_id) acc[c.branch_id] = (acc[c.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const staffMap = (staffData ?? []).reduce<Record<string, number>>((acc, s) => {
        if (s.branch_id) acc[s.branch_id] = (acc[s.branch_id] ?? 0) + 1;
        return acc;
      }, {});
      const classMap = (classes ?? []).reduce<Record<string, number>>((acc, c) => {
        if (c.branch_id) acc[c.branch_id] = (acc[c.branch_id] ?? 0) + 1;
        return acc;
      }, {});

      const flat = branchData.map((b) => ({
        ...b,
        member_count: memberMap[b.id] ?? 0,
        coach_count:  coachMap[b.id]  ?? 0,
        staff_count:  staffMap[b.id]  ?? 0,
        class_count:  classMap[b.id]  ?? 0,
      })) as Branch[];
      setBranches(flat);
    }
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    loadBranches();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const role = user.user_metadata?.role as string | undefined;
      // Owner: auto-recreate profile row if missing (e.g. after DB reset)
      if (role === "owner") {
        await fetch("/api/owner/init-profile", { method: "POST" });
        setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" });
        setUserId(user.id);
        return;
      }
      // Non-owner somehow on owner page
      const { data: prof } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!prof) {
        setInitError(t("owner.shell.notFoundBody"));
        return;
      }
      setProfile({ full_name: user.user_metadata?.full_name ?? "Owner" });
      setUserId(user.id);
    });
  }, [loadBranches]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const ownerName = profile?.full_name ?? "Owner";
  const pages: Record<string, React.ReactNode> = {
    dashboard: <OwnerDashboard branches={branches} onSelectTab={setActive} />,
    master:    <OwnerMasterData />,
    branches:  <OwnerBranches branches={branches} onRefresh={loadBranches} userId={userId} userName={ownerName} />,
    schools:   <OwnerSchools branches={branches} />,
    accounts:  <OwnerAccountsMaster branches={branches} />,
    staffPresensi: <OwnerStaffPresensi branches={branches} />,
    memberPrivate: <OwnerMemberPrivate branches={branches} />,
    classes:   <OwnerClasses branches={branches} />,
    competitions: <AdminCompetition branchId="" />,
    levels:    <OwnerRaporLevels />,
    rates:     <OwnerTarif branches={branches} />,
    invoices:  <OwnerInvoices branches={branches} userId={userId} userName={ownerName} />,
    loans:     <CoachLoans branches={branches} userId={userId} userName={ownerName} />,
    financial: <OwnerFinancial branches={branches} userId={userId} userName={ownerName} />,
    landing:   <LandingCMS />,
    storage:   <OwnerStorage userId={userId} userName={ownerName} />,
    activity:  <OwnerActivityLog branches={branches} />,
  };

  const navItems = useMemo(() => buildNavItems(t), [t]);
  const [title, sub] = buildTitles(t)[active] ?? ["Owner", ""];

  const brand = useMemo(() => (
    <div className="px-4 py-4 flex items-center justify-center min-h-[64px]">
      <img
        src="/logo_next_persegipanjang.png"
        alt="Next Swimming School"
        className="h-10 w-auto object-contain max-w-[170px]"
      />
    </div>
  ), []);

  const ownerInitials = useMemo(() => {
    if (!profile?.full_name) return "OW";
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile?.full_name]);

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">{t("owner.shell.notFoundTitle")}</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          {t("owner.shell.backToLogin")}
        </Btn>
      </div>
    </div>
  );

  return (
    <div className="flex bg-paper-tint min-h-screen">
      <Sidebar
        items={navItems}
        active={active}
        onSelect={(id) => { setActive(id); setMobileNav(false); }}
        brand={brand}
        footer={
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 h-[38px] rounded-[10px] text-sm font-medium text-ink-soft hover:bg-paper-tint hover:text-danger-600 transition group cursor-pointer"
          >
            <Icon name="logout" className="w-5 h-5 text-ink-mute group-hover:text-danger-600 transition-colors shrink-0" strokeWidth={1.8} />
            <span>{t("common.actions.logout")}</span>
          </button>
        }
      />

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white border-r border-line flex flex-col z-10 overflow-hidden">
            <div className="border-b border-line">{brand}</div>
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 no-scrollbar">
              {navItems.map((it) => (
                <button
                  key={it.id}
                  onClick={() => { setActive(it.id!); setMobileNav(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 h-[38px] rounded-[10px] text-sm transition group cursor-pointer",
                    active === it.id
                      ? "bg-ocean-50 text-ocean-700 font-semibold"
                      : "text-ink-soft hover:bg-paper-tint font-medium"
                  )}
                >
                  {it.icon && (
                    <Icon
                      name={it.icon}
                      className={cn(
                        "w-5 h-5 shrink-0 transition-colors",
                        active === it.id ? "text-ocean-600" : "text-ink-mute group-hover:text-ink-soft"
                      )}
                      strokeWidth={1.8}
                    />
                  )}
                  <span className="flex-1 text-left truncate">{it.label}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-line p-3 shrink-0">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 h-[38px] rounded-[10px] text-sm font-medium text-ink-soft hover:bg-paper-tint hover:text-danger-600 transition group cursor-pointer"
              >
                <Icon name="logout" className="w-5 h-5 text-ink-mute group-hover:text-danger-600 transition-colors shrink-0" strokeWidth={1.8} />
                <span>{t("common.actions.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          sub={sub}
          onMenu={() => setMobileNav(true)}
          right={
            <div className="flex items-center gap-3 md:gap-4">
              <Bell userId={userId} />
              <GoogleLanguageSwitcher variant="pill" />
              <div
                className="w-[34px] h-[34px] rounded-full bg-ocean-600 text-white font-bold text-xs flex items-center justify-center shrink-0 select-none shadow-xs"
                title={profile?.full_name ?? "Owner"}
              >
                {ownerInitials}
              </div>
            </div>
          }
        />
        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7">
          {pages[active]}
        </main>
      </div>

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="owner" />}
    </div>
  );
}
