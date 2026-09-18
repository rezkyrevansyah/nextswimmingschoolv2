"use client";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import { GoogleLanguageSwitcher } from "@/components/GoogleTranslate";
import MobileNav from "@/components/layout/MobileNav";
import type { NavItem as MobileNavItem } from "@/components/layout/Sidebar";
import Bell from "@/components/layout/Bell";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { TabId } from "../_types";

function getNavItems(): MobileNavItem[] {
  return [
    { id: "home",     label: "Home",   short: "Home",     icon: "home"     },
    { id: "schedule", label: "Schedule", short: "Schedule", icon: "calendar" },
    { id: "bills",    label: "Bills",  short: "Pay",    icon: "wallet"   },
    { id: "rapor",    label: "Report Card",  short: "Report",    icon: "book"     },
    { id: "profile",  label: "Profile",short: "Me",  icon: "user"     },
  ];
}

function getAllItems(): MobileNavItem[] {
  return [
    ...getNavItems().slice(0, 2),
    { id: "absen",   label: "Attendance", short: "Attend", icon: "check"     },
    { id: "bills",   label: "Bills",      short: "Pay",      icon: "wallet"    },
    { id: "leave",   label: "Leave",      short: "Leave",      icon: "clipboard" },
    { id: "rapor",   label: "Report Card",      short: "Report",      icon: "book"      },
    { id: "profile", label: "Profile",    short: "Me",    icon: "user"      },
  ];
}

export default function StudentShell({ children, active, setActive, name, branchName, userId, avatarUrl, isSchoolAffiliate }: {
  children: React.ReactNode;
  active: TabId;
  setActive: (id: TabId) => void;
  name: string;
  branchName: string;
  userId: string;
  avatarUrl?: string | null;
  isSchoolAffiliate?: boolean;
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const allItems = getAllItems();

  const isMoreActive = ["bills", "leave", "profile"].includes(active);
  const mobileNavItems: MobileNavItem[] = [
    { id: "home", label: "Home", short: "Home", icon: "home" },
    { id: "schedule", label: "Schedule", short: "Schedule", icon: "calendar" },
    { id: "absen", label: "Attendance", short: "Attend", icon: "check" },
    { id: "rapor", label: "Report Card", short: "Report", icon: "book" },
    { id: "more", label: "Menu", short: "Menu", icon: "menu" },
  ];

  const handleMobileNavSelect = (id: string) => {
    if (id === "more") {
      setShowMoreMenu(true);
    } else {
      setShowMoreMenu(false);
      setActive(id as TabId);
    }
  };

  const title = active === "home" ? (<>{"Hi, "}<NoTranslate>{name || "…"}</NoTranslate></>) : {
    schedule: "Schedule", absen: "Attendance", bills: "Bills",
    leave: "Leave", rapor: "Report Card", profile: "Profile",
  }[active] ?? "";

  const sub = active === "home"
    ? (<>{"Student · "}<NoTranslate>{branchName || "…"}</NoTranslate></>)
    : { schedule: "Classes you're enrolled in", absen: "Attendance history",
        bills: "Class payments", leave: "Absence requests",
        rapor: "Coach's assessment results", profile: "Personal data & QR" }[active] ?? "";

  return (
    <div className="min-h-screen bg-paper-tint pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-line">
        <div className="px-4 lg:px-7 h-16 flex items-center gap-3">
          <Logo size={32} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">{title}</h1>
            <p className="text-xs text-ink-mute truncate">{sub}</p>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {allItems.filter(it => !(isSchoolAffiliate && it.id === "bills")).map((it) => (
              <button key={it.id} onClick={() => setActive(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon ?? ""} className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </div>
          <GoogleLanguageSwitcher variant="pill" />
          <Bell userId={userId} />
          <button onClick={() => setActive("profile")} title={"Profile"}>
            <Avatar name={name} src={avatarUrl ?? undefined} size={36} />
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 lg:p-7 anim-in">{children}</main>

      {/* Mobile More Menu Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={() => setShowMoreMenu(false)} />
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] space-y-4 z-10 anim-in">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <Avatar name={name} src={avatarUrl ?? undefined} size={40} />
                <div>
                  <div className="font-display font-bold text-sm text-ink"><NoTranslate>{name}</NoTranslate></div>
                  <div className="text-xs text-ink-mute">{branchName ? <NoTranslate>{branchName}</NoTranslate> : "Next Swimming"}</div>
                </div>
              </div>
              <button onClick={() => setShowMoreMenu(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:bg-paper-tint">
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setActive("profile"); setShowMoreMenu(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  active === "profile" ? "bg-ocean-50 border-ocean-300 text-ocean-800 font-bold" : "border-line hover:bg-paper-tint text-ink"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-paper-tint flex items-center justify-center text-ink-soft">
                  <Icon name="user" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{"Profile"}</div>
                  <div className="text-xs text-ink-mute">Data diri, nomor kontak & kartu QR</div>
                </div>
                <Icon name="arrowRight" className="w-4 h-4 text-ink-faint" />
              </button>

              {!isSchoolAffiliate && (
                <button
                  onClick={() => { setActive("bills"); setShowMoreMenu(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                    active === "bills" ? "bg-ocean-50 border-ocean-300 text-ocean-800 font-bold" : "border-line hover:bg-paper-tint text-ink"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-ocean-100/60 flex items-center justify-center text-ocean-700">
                    <Icon name="wallet" className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{"Bills"}</div>
                    <div className="text-xs text-ink-mute">Status iuran bulanan & upload bukti bayar</div>
                  </div>
                  <Icon name="arrowRight" className="w-4 h-4 text-ink-faint" />
                </button>
              )}

              <button
                onClick={() => { setActive("leave"); setShowMoreMenu(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  active === "leave" ? "bg-ocean-50 border-ocean-300 text-ocean-800 font-bold" : "border-line hover:bg-paper-tint text-ink"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <Icon name="clipboard" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{"Leave"}</div>
                  <div className="text-xs text-ink-mute">Form pengajuan izin tidak hadir</div>
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
