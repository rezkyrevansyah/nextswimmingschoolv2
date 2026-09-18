"use client";
import { useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import { GoogleLanguageSwitcher } from "@/components/GoogleTranslate";
import { NoTranslate } from "@/components/ui/NoTranslate";
import MobileNav from "@/components/layout/MobileNav";
import type { NavItem as MobileNavItem } from "@/components/layout/Sidebar";
import Bell from "@/components/layout/Bell";
import type { TabId } from "../_types";

function buildNavItems(): MobileNavItem[] {
  return [
    { id: "home",    label: "Home",    short: "Home",    icon: "home"    },
    { id: "absen",   label: "Attendance",   short: "Attend.",   icon: "check"   },
    { id: "kelas",   label: "Class",   short: "Class",   icon: "swim"    },
    { id: "invoice", label: "Invoice", short: "Invoice", icon: "invoice" },
    { id: "rapor",   label: "Report Card",   short: "Report",   icon: "book"    },
    { id: "payslip", label: "Payslip", short: "Payslip", icon: "wallet"  },
    { id: "profile", label: "Profile", short: "Me", icon: "user"    },
  ];
}

export default function CoachShell({ children, active, onNav, title, sub, user, avatarUrl, branches, activeBranchId, onBranchChange }: {
  children: React.ReactNode;
  active: TabId; onNav: (id: TabId) => void;
  title: React.ReactNode; sub: string; user: User | null; avatarUrl?: string | null;
  branches?: { branch_id: string; name: string }[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navItems = useMemo(() => buildNavItems(), []);

  const isMoreActive = ["invoice", "payslip", "profile"].includes(active);
  const mobileNavItems: MobileNavItem[] = useMemo(() => [
    { id: "home", label: "Home", short: "Home", icon: "home" },
    { id: "absen", label: "Attendance", short: "Attend.", icon: "check" },
    { id: "kelas", label: "Class", short: "Class", icon: "swim" },
    { id: "rapor", label: "Report Card", short: "Report", icon: "book" },
    { id: "more", label: "Menu", short: "Menu", icon: "menu" },
  ], []);

  const handleMobileNavSelect = (id: string) => {
    if (id === "more") {
      setShowMoreMenu(true);
    } else {
      setShowMoreMenu(false);
      onNav(id as TabId);
    }
  };

  return (
    <div className="min-h-screen bg-paper-tint pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-line">
        <div className="px-4 lg:px-7 h-16 flex items-center gap-3">
          <Logo size={32} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">{title}</h1>
            <p className="text-xs text-ink-mute truncate">{sub}</p>
          </div>
          {/* Branch selector — only shown when coach has multiple branches */}
          {branches && branches.length > 1 && onBranchChange && (
            <select
              value={activeBranchId}
              onChange={e => onBranchChange(e.target.value)}
              className="text-xs font-semibold text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ocean-400 max-w-[120px] truncate"
            >
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
              ))}
            </select>
          )}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((it) => (
              <button key={it.id} onClick={() => onNav(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon ?? ""} className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </div>
          <GoogleLanguageSwitcher variant="pill" />
          <Bell userId={user?.id ?? ""} />
          <button onClick={() => onNav("profile")} title={"Profile"}>
            <Avatar name={user?.user_metadata?.full_name ?? "C"} src={avatarUrl ?? undefined} size={36} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 lg:p-7">{children}</main>

      {/* Mobile More Menu Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={() => setShowMoreMenu(false)} />
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] space-y-4 z-10 anim-in">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <Avatar name={user?.user_metadata?.full_name ?? "Coach"} src={avatarUrl ?? undefined} size={40} />
                <div>
                  <div className="font-display font-bold text-sm text-ink"><NoTranslate>{user?.user_metadata?.full_name ?? "Coach"}</NoTranslate></div>
                  <div className="text-xs text-ink-mute"><NoTranslate>{user?.email}</NoTranslate></div>
                </div>
              </div>
              <button onClick={() => setShowMoreMenu(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:bg-paper-tint">
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            {branches && branches.length > 1 && onBranchChange && (
              <div className="bg-ocean-50 p-3 rounded-xl border border-ocean-200">
                <label className="text-[11px] font-bold text-ocean-800 uppercase tracking-wide block mb-1.5">Pilih Cabang</label>
                <select
                  value={activeBranchId}
                  onChange={e => { onBranchChange(e.target.value); }}
                  className="w-full text-xs font-semibold text-ocean-800 bg-white border border-ocean-300 rounded-lg px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  {branches.map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { onNav("invoice"); setShowMoreMenu(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  active === "invoice" ? "bg-ocean-50 border-ocean-300 text-ocean-800 font-bold" : "border-line hover:bg-paper-tint text-ink"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-ocean-100/60 flex items-center justify-center text-ocean-700">
                  <Icon name="invoice" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{"Invoice"}</div>
                  <div className="text-xs text-ink-mute">Klaim honor sesi & reimbursement</div>
                </div>
                <Icon name="arrowRight" className="w-4 h-4 text-ink-faint" />
              </button>

              <button
                onClick={() => { onNav("payslip"); setShowMoreMenu(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  active === "payslip" ? "bg-ocean-50 border-ocean-300 text-ocean-800 font-bold" : "border-line hover:bg-paper-tint text-ink"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-ok-50 flex items-center justify-center text-ok-700">
                  <Icon name="wallet" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{"Payslip"}</div>
                  <div className="text-xs text-ink-mute">Riwayat & slip gaji bulanan</div>
                </div>
                <Icon name="arrowRight" className="w-4 h-4 text-ink-faint" />
              </button>

              <button
                onClick={() => { onNav("profile"); setShowMoreMenu(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  active === "profile" ? "bg-ocean-50 border-ocean-300 text-ocean-800 font-bold" : "border-line hover:bg-paper-tint text-ink"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-paper-tint flex items-center justify-center text-ink-soft">
                  <Icon name="user" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{"Profile"}</div>
                  <div className="text-xs text-ink-mute">Data pelatih, bio & rekening bank</div>
                </div>
                <Icon name="arrowRight" className="w-4 h-4 text-ink-faint" />
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav items={mobileNavItems} active={isMoreActive ? "more" : active} onSelect={handleMobileNavSelect} />
    </div>
  );
}
