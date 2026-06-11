"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { waLink } from "@/lib/utils";

const WA_DEFAULT = "Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?";

export default function WAFloatingButton({ message = WA_DEFAULT, waPhone }: { message?: string; waPhone?: string }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-end gap-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      }`}
    >
      {/* Tooltip card */}
      <div
        className={`transition-all duration-200 ${
          hovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
        }`}
      >
        <div className="bg-white rounded-2xl shadow-float ring-1 ring-line px-4 py-3 text-sm max-w-[200px]">
          <div className="font-display font-bold text-ink text-[13px] leading-tight">Chat Admin</div>
          <div className="text-ink-mute text-xs mt-0.5 leading-relaxed">Tanya jadwal, program, dan pendaftaran via WhatsApp</div>
          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 ring-1 ring-line clip-arrow" />
        </div>
      </div>

      <a
        href={waLink(message, waPhone)}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        aria-label="Chat WhatsApp dengan admin"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-[waRing_2s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-20 animate-[waRing_2s_ease-out_0.6s_infinite]" />
        <span className="relative w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-[0_4px_14px_rgba(37,211,102,0.45)] hover:bg-[#20bc5a] active:scale-95 transition-all duration-150">
          <Image
            src="/icons/whatsapp_logo.png"
            alt="WhatsApp"
            width={32}
            height={32}
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
        </span>
      </a>
    </div>
  );
}
