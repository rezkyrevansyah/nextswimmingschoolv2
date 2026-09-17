"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { useLocale } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import { buildTabs, revalidate } from "./_utils";
import type { Tab } from "./_types";
import ProgramsTab from "./ProgramsTab";
import CoachesTab from "./CoachesTab";
import VideoTab from "./VideoTab";
import WhyNextTab from "./WhyNextTab";
import TestimonialsTab from "./TestimonialsTab";
import PartnersTab from "./PartnersTab";
import BranchesTab from "./BranchesTab";
import FaqTab from "./FaqTab";
import FooterTab from "./FooterTab";

export default function LandingCMS() {
  const { t } = useLocale();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("programs");
  const [republishing, setRepublishing] = useState(false);
  const tabs = buildTabs(t);

  const handleRepublish = async () => {
    setRepublishing(true);
    try {
      await revalidate();
      toast.success(t("owner.landingCms.republished") || "Halaman landing berhasil dipublikasikan ulang!");
    } catch {
      toast.error("Gagal mempublikasikan ulang halaman landing.");
    } finally {
      setRepublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title and Republish header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">Public Landing Page</h2>
          <p className="text-ink-mute text-sm mt-0.5">Sembilan blok konten. Hero section dikelola langsung di kode halaman publik.</p>
        </div>
        <Btn variant="primary" icon="refresh" onClick={handleRepublish} disabled={republishing}>
          {republishing ? "Mempublikasikan..." : "Republish"}
        </Btn>
      </div>

      {/* Notice banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-ocean-50 border border-ocean-200/60 text-ocean-800 text-xs">
        <Icon name="info" className="w-4 h-4 text-ocean-600 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          Kelola konten landing page di sini. Setiap perubahan yang disimpan otomatis diperbarui dan disinkronkan ke cache halaman publik.
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "h-9 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              tab === tb.id
                ? "bg-ocean-600 text-white shadow-xs"
                : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
            )}
          >
            <Icon name={tb.icon} className={cn("w-3.5 h-3.5", tab === tb.id ? "text-white" : "text-ink-mute")} />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "programs"     && <ProgramsTab />}
      {tab === "coaches"      && <CoachesTab />}
      {tab === "video"        && <VideoTab />}
      {tab === "whynext"      && <WhyNextTab />}
      {tab === "testimonials" && <TestimonialsTab />}
      {tab === "partners"     && <PartnersTab />}
      {tab === "branches"     && <BranchesTab />}
      {tab === "faq"          && <FaqTab />}
      {tab === "footer"       && <FooterTab />}
    </div>
  );
}
