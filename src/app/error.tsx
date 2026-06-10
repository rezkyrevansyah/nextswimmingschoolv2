"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Logo from "@/components/ui/Logo";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6"><Logo size={48} /></div>
      <div className="w-16 h-16 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto mb-5">
        <Icon name="alert" className="w-8 h-8" />
      </div>
      <h1 className="font-display font-bold text-2xl text-ink mb-2">
        Terjadi kesalahan
      </h1>
      <p className="text-ink-mute text-sm max-w-sm mb-6 leading-relaxed">
        Halaman ini mengalami error yang tidak terduga. Tim kami sudah mendapat
        notifikasi. Coba muat ulang halaman atau kembali ke beranda.
      </p>
      {error.digest && (
        <p className="text-xs text-ink-faint font-mono mb-6">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        <Btn variant="primary" onClick={reset}>
          Coba lagi
        </Btn>
        <Btn variant="ghost" onClick={() => (window.location.href = "/")}>
          Kembali ke beranda
        </Btn>
      </div>
    </div>
  );
}
