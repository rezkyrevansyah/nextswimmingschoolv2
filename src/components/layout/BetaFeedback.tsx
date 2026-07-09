"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";

// ── BETA FLAG — set false atau hapus file ini untuk menonaktifkan ─────────────
export const BETA_FEEDBACK_ENABLED = true;

type Role = "owner" | "admin" | "coach" | "member" | "school";

const ROLE_LABELS: Record<Role, string> = {
  owner:  "Owner Panel",
  admin:  "Admin Panel",
  coach:  "Coach Panel",
  member: "Member Panel",
  school: "School Panel",
};

// Nomor developer — sengaja hardcode di sini, bukan dari data.ts
const DEV_WA = "6289563729069"; // +62 895-6372-90699

export default function BetaFeedback({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!BETA_FEEDBACK_ENABLED || dismissed) return null;

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });

  const waMessage = [
    "[BETA FEEDBACK]",
    "Halo Kak, saya ingin melaporkan bug / memberi masukan untuk aplikasi Next Swimming School.",
    "",
    `Panel   : ${ROLE_LABELS[role]}`,
    `Tanggal : ${today}`,
    "",
    "Deskripsi kendala / masukan:",
    "(tulis di sini)",
  ].join("\n");

  const waHref = `https://wa.me/${DEV_WA}?text=${encodeURIComponent(waMessage)}`;

  return (
    <>
      {/* FAB — bottom-left, tidak tabrakan dengan RoleSwitcher (bottom-right, z-[80]) */}
      <div className="fixed left-3 bottom-20 lg:bottom-4 z-[60] flex items-center gap-1">
        <button
          onClick={() => setOpen(true)}
          aria-label="Laporkan bug ke developer"
          className="shadow-float bg-[#25D366] text-white rounded-full px-3 py-2.5 flex items-center gap-2 font-bold text-sm hover:bg-[#1FB855] active:scale-95 transition-all duration-150"
        >
          <Icon name="whatsapp" className="w-5 h-5" />
          <span className="hidden sm:inline">Laporkan Bug</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Tutup notifikasi beta"
          className="w-5 h-5 rounded-full bg-ink/20 hover:bg-ink/40 text-white flex items-center justify-center transition-colors"
        >
          <Icon name="x" className="w-3 h-3" />
        </button>
      </div>

      {/* Modal — createPortal z-[90] via Modal.tsx, selalu di atas semua elemen */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Laporkan Bug / Masukan Beta"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center font-semibold transition-colors text-sm px-4 py-2.5 min-h-[44px] rounded-xl gap-2 text-ink-soft hover:bg-paper-tint"
            >
              Batal
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center font-semibold transition-colors text-sm px-4 py-2.5 min-h-[44px] rounded-xl gap-2 bg-[#25D366] text-white hover:bg-[#1FB855]"
            >
              <Icon name="whatsapp" className="w-4 h-4" />
              Chat via WhatsApp
            </a>
          </>
        }
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warn-50 border border-warn-500/20 text-warn-600 text-xs font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-warn-500 animate-pulse" />
            Versi Beta
          </div>

          <p className="text-sm text-ink-soft leading-relaxed">
            Aplikasi ini sedang dalam masa <strong className="text-ink">beta</strong> dan
            mungkin masih terdapat bug atau kekurangan. Bantu kami meningkatkan kualitas
            dengan melaporkan kendala yang Anda temukan langsung ke developer.
          </p>

          <div className="bg-paper-tint border border-line rounded-xl px-4 py-3 text-sm">
            <div className="text-xs text-ink-mute uppercase tracking-widest font-bold mb-1">Panel aktif</div>
            <div className="font-semibold text-ink">{ROLE_LABELS[role]}</div>
          </div>

          <p className="text-xs text-ink-mute leading-relaxed">
            Pesan WhatsApp akan disiapkan otomatis beserta informasi panel yang sedang
            Anda gunakan agar developer dapat menindaklanjuti lebih cepat.
          </p>
        </div>
      </Modal>
    </>
  );
}
