"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import Icon from "./Icon";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative w-full bg-white sm:rounded-2xl rounded-t-3xl shadow-lift border border-line max-h-[92vh] flex flex-col",
          SIZE_CLASSES[size]
        )}
      >
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-paper-tint flex items-center justify-center text-ink-mute"
          >
            <Icon name="close" className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-line bg-paper-tint/60 sm:rounded-b-2xl flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
