"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f8fafc" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            Terjadi kesalahan sistem
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
            Halaman mengalami error yang tidak terduga. Tim kami sudah mendapat notifikasi.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", marginBottom: 24 }}>
              Error ID: {error.digest}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "#1A6BB0",
              color: "white",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Kembali ke beranda
          </a>
        </div>
      </body>
    </html>
  );
}
