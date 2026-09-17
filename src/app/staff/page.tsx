"use client";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import Sidebar, { type NavItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Bell from "@/components/layout/Bell";
import MobileNav from "@/components/layout/MobileNav";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { useLocale } from "@/components/providers/LocaleProvider";

import { useStaffData } from "./_components/useStaffData";
import StaffProfileGate from "./_components/StaffProfileGate";
import StaffClockInFlow from "./_components/StaffClockInFlow";
import StaffHome from "./_components/StaffHome";
import StaffAbsen from "./_components/StaffAbsen";
import StaffInvoice from "./_components/StaffInvoice";
import StaffPayslip from "./_components/StaffPayslip";
import StaffExpenses from "./_components/StaffExpenses";
import StaffProfileTab from "./_components/StaffProfileTab";
import ExpenseModal from "./_components/ExpenseModal";
import type { TabId } from "./_types";

export default function StaffPage() {
  const { t } = useLocale();
  const hook = useStaffData();
  const {
    active, setActive, mobileNav, setMobileNav,
    user, profile, setProfile, branch,
    showSelfieFlow, setShowSelfieFlow, clockLoading, handleClockIn,
    pageTitles, logout,
  } = hook;

  const navItems: NavItem[] = [
    { id: "home", label: t("staff.nav.home"), short: "Home", icon: "home" },
    { id: "absen", label: t("staff.nav.absen"), short: "Absen", icon: "check" },
    { id: "invoice", label: t("staff.nav.invoice"), short: "Invoice", icon: "invoice" },
    { id: "payslip", label: t("staff.nav.payslip"), short: "Payslip", icon: "wallet" },
    { id: "expenses", label: t("staff.nav.expenses"), short: "Reimburse", icon: "wallet" },
    { id: "profile", label: t("staff.nav.profile"), short: "Profil", icon: "user" },
  ];

  const mobileNavItems: NavItem[] = [
    { id: "home", label: t("staff.nav.home"), short: "Home", icon: "home" },
    { id: "absen", label: t("staff.nav.absen"), short: "Absen", icon: "check" },
    { id: "invoice", label: t("staff.nav.invoice"), short: "Invoice", icon: "invoice" },
    { id: "expenses", label: t("staff.nav.expenses"), short: "Reimburse", icon: "wallet" },
    { id: "profile", label: t("staff.nav.profile"), short: "Profil", icon: "user" },
  ];

  const [title, sub] = pageTitles[active];

  if (profile && !profile.is_profile_complete) {
    return (
      <StaffProfileGate
        profile={profile}
        onComplete={(updated) => {
          setProfile(prev => prev ? ({ ...prev, ...updated }) : prev);
        }}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="flex bg-paper-tint min-h-screen">
      {showSelfieFlow && (
        <StaffClockInFlow
          onCancel={() => setShowSelfieFlow(false)}
          onConfirm={handleClockIn}
          loading={clockLoading}
        />
      )}
      {/* Sidebar */}
      <Sidebar
        items={navItems}
        active={active}
        onSelect={(id) => { setActive(id as TabId); setMobileNav(false); }}
        brand={
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div className="min-w-0">
              <div className="font-display font-extrabold text-[14px] text-ocean-700 leading-tight">{t("staff.shell.brandTitle")}</div>
              <div className="text-[10px] text-ink-mute tracking-wide truncate">{branch?.name ?? "Next Swimming"}</div>
            </div>
          </div>
        }
        footer={
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-ink-mute hover:bg-paper-tint"
          >
            <Icon name="logout" className="w-4 h-4" /> {t("common.actions.logout")}
          </button>
        }
      />

      {/* Mobile Drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={() => setMobileNav(false)} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col z-10 anim-in">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo size={32} />
                <div className="min-w-0">
                  <div className="font-display font-extrabold text-sm text-ocean-700 leading-tight">{t("staff.shell.brandTitle")}</div>
                  <div className="text-[10px] text-ink-mute truncate">{branch?.name ?? "Next Swimming"}</div>
                </div>
              </div>
              <button onClick={() => setMobileNav(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-mute hover:bg-paper-tint">
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(it => (
                <button
                  key={it.id}
                  onClick={() => { setActive(it.id as TabId); setMobileNav(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                    active === it.id ? "bg-ocean-50 text-ocean-700 font-bold" : "text-ink-soft hover:bg-paper-tint"
                  }`}
                >
                  <Icon name={it.icon ?? ""} className={`w-4 h-4 ${active === it.id ? "text-ocean-600" : "text-ink-mute"}`} />
                  <span>{it.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-line">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger-600 hover:bg-danger-50 transition"
              >
                <Icon name="logout" className="w-4 h-4" /> {t("common.actions.logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          sub={sub}
          search={t("staff.shell.searchPlaceholder")}
          onMenu={() => setMobileNav(true)}
          right={
            <>
              <LanguageSwitcher />
              {user && <Bell userId={user.id} />}
              <Avatar name={profile?.full_name ?? "Staff"} size={36} />
            </>
          }
        />

        <main className="flex-1 p-4 lg:p-7 anim-in pb-24 lg:pb-7 space-y-6">
          {active === "home" && <StaffHome hook={hook} />}
          {active === "absen" && <StaffAbsen hook={hook} />}
          {active === "invoice" && (
            <StaffInvoice staffId={user?.id ?? ""} branchId={profile?.branch_id ?? ""} profile={profile} />
          )}
          {active === "payslip" && <StaffPayslip hook={hook} />}
          {active === "expenses" && <StaffExpenses hook={hook} />}
          {active === "profile" && <StaffProfileTab hook={hook} />}
        </main>
      </div>

      <ExpenseModal hook={hook} />

      <MobileNav items={mobileNavItems} active={active} onSelect={(id) => setActive(id as TabId)} />

      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="staff" />}
    </div>
  );
}
