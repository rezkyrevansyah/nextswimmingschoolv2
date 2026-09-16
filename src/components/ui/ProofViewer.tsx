"use client";

import React, { useState } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";

interface ProofViewerProps {
  proofUrl: string | null | undefined;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function ProofViewer({ proofUrl, label, size = "md" }: ProofViewerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const resolvedUrl = useSignedUrl(proofUrl);

  if (!proofUrl) return null;

  const isPdf = proofUrl.toLowerCase().endsWith(".pdf") || proofUrl.toLowerCase().includes(".pdf");

  if (!resolvedUrl) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-ink-mute py-1">
        <span className="w-3 h-3 border border-ocean-600 border-t-transparent rounded-full animate-spin" />
        <span>Memuat bukti...</span>
      </div>
    );
  }

  if (isPdf) {
    return (
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-danger-700 bg-danger-50 border border-danger-200 rounded-lg hover:bg-danger-100 transition-colors shadow-2xs mt-1"
      >
        <Icon name="link" className="w-3.5 h-3.5" />
        <span>Buka Dokumen PDF Bukti</span>
      </a>
    );
  }

  const thumbDim = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-20 h-20" : "w-14 h-14";

  return (
    <>
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`relative ${thumbDim} rounded-lg border border-line bg-paper-tint overflow-hidden group cursor-pointer shadow-2xs hover:border-ocean-400 transition-all shrink-0 focus:outline-hidden focus:ring-2 focus:ring-ocean-500`}
          title="Klik untuk melihat bukti gambar penuh"
        >
          <img
            src={resolvedUrl}
            alt={label || "Bukti Transfer / Kwitansi"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute inset-0 bg-ink-pure/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Icon name="eye" className="w-4 h-4 drop-shadow-sm" />
          </div>
        </button>

        <div className="text-left">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-semibold text-ocean-700 hover:text-ocean-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Icon name="camera" className="w-3.5 h-3.5" />
            <span>Lihat Foto Bukti</span>
          </button>
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-ink-mute hover:text-ink hover:underline block"
          >
            Buka di tab baru ↗
          </a>
        </div>
      </div>

      {/* Lightbox Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-pure/75 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-surface rounded-2xl shadow-2xl p-4 flex flex-col items-center overflow-hidden border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="camera" className="w-4 h-4 text-ocean-600" />
                <span>Bukti Lampiran: {label ? <NoTranslate>{label}</NoTranslate> : "Struk / Kwitansi"}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-xs font-semibold text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-lg hover:bg-ocean-100 transition-colors flex items-center gap-1"
                >
                  <Icon name="download" className="w-3.5 h-3.5" />
                  <span>Buka Gambar Asli</span>
                </a>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-ink-mute hover:text-ink hover:bg-paper-tint transition-colors cursor-pointer"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="w-full flex-1 flex items-center justify-center overflow-auto max-h-[70vh] bg-paper-deep/50 rounded-xl p-2">
              <img
                src={resolvedUrl}
                alt={label || "Bukti Transfer"}
                className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
