"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import Modal from "@/components/ui/Modal";

interface ConfirmOptions {
  title?: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (val: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const ask = useCallback<ConfirmFn>(
    (opts) =>
      new Promise((resolve) => {
        setState({ ...opts, resolve });
      }),
    []
  );

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? "Konfirmasi"}
        size="sm"
        footer={
          <>
            <button
              onClick={() => close(false)}
              className="px-4 py-2 text-sm rounded-lg text-ink-soft hover:bg-paper-tint font-semibold"
            >
              Batal
            </button>
            <button
              onClick={() => close(true)}
              className={`px-4 py-2 text-sm rounded-lg font-semibold text-white shadow-sm ${
                state?.danger
                  ? "bg-danger-500 hover:bg-danger-600"
                  : "bg-ocean-600 hover:bg-ocean-700"
              }`}
            >
              {state?.confirmLabel ?? "Konfirmasi"}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft leading-relaxed">{state?.body}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
