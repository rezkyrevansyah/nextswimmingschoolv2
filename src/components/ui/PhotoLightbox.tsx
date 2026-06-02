"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import Avatar from "./Avatar";

interface PhotoLightboxProps {
  src: string | null;
  name: string;
  onClose: () => void;
  /** Optional "change photo" file-input handler */
  onChangePick?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading?: boolean;
}

export default function PhotoLightbox({ src, name, onClose, onChangePick, uploading }: PhotoLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/85 flex flex-col items-center justify-center p-6 gap-5"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
        onClick={onClose}
      >
        <Icon name="x" className="w-5 h-5" />
      </button>

      <div onClick={e => e.stopPropagation()}>
        {src ? (
          <img
            src={src}
            alt={name}
            className="max-h-[72vh] max-w-[80vw] rounded-2xl object-contain shadow-float"
          />
        ) : (
          <Avatar name={name} size={160} />
        )}
      </div>

      {onChangePick && (
        <label className="cursor-pointer" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-ink font-semibold text-sm hover:bg-paper-tint transition-colors shadow-card">
            <Icon name="camera" className="w-4 h-4" />
            {uploading ? "Mengupload…" : "Ganti Foto"}
          </div>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={onChangePick}
          />
        </label>
      )}
    </div>,
    document.body
  );
}
