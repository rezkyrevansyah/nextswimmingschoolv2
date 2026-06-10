"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";

interface ToastItem {
  id: string;
  kind: "ok" | "err" | "info";
  msg: string;
  sub?: string;
  duration?: number;
}

interface ToastApi {
  success: (msg: string, sub?: string) => void;
  info:    (msg: string, sub?: string) => void;
  error:   (msg: string, sub?: string, duration?: number) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setItems((arr) => [...arr, { id, ...t }]);
    setTimeout(
      () => setItems((arr) => arr.filter((x) => x.id !== id)),
      t.duration ?? 3200
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg, sub) => push({ kind: "ok",  msg, sub }),
      info:    (msg, sub) => push({ kind: "info", msg, sub }),
      error:   (msg, sub, duration) => push({ kind: "err",  msg, sub, duration }),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-3 right-3 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-1.5rem)] sm:w-auto pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className="anim-in pointer-events-auto bg-white rounded-xl shadow-lift border border-line px-3.5 py-3 flex items-start gap-2.5"
          >
            <span
              className={`mt-0.5 inline-flex w-6 h-6 rounded-full items-center justify-center ${
                t.kind === "ok"
                  ? "bg-ok-50 text-ok-600"
                  : t.kind === "err"
                  ? "bg-danger-50 text-danger-500"
                  : "bg-wave-50 text-wave-600"
              }`}
            >
              <Icon
                name={t.kind === "ok" ? "check" : t.kind === "err" ? "warning" : "info"}
                className="w-3.5 h-3.5"
                strokeWidth={2.5}
              />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{t.msg}</div>
              {t.sub && <div className="text-xs text-ink-mute mt-0.5">{t.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
