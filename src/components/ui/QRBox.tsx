"use client";
import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRBoxProps {
  size?: number;
  value?: string;
  /** If true, renders a download <a> below the QR */
  downloadable?: boolean;
  downloadName?: string;
}

export default function QRBox({ size = 132, value = "NSS-XXX-000", downloadable, downloadName }: QRBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0A2540", light: "#ffffff" },
    }).then(() => {
      if (downloadable) setDataUrl(canvasRef.current!.toDataURL("image/png"));
    }).catch(() => {});
  }, [value, size, downloadable]);

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="p-2.5 bg-white rounded-xl border border-line shadow-sm">
        <canvas ref={canvasRef} width={size} height={size} className="block rounded-md" />
      </div>
      <div className="text-[10px] font-mono text-ink-mute tracking-wide">{value}</div>
      {downloadable && dataUrl && (
        <a
          href={dataUrl}
          download={`${downloadName ?? value}.png`}
          className="text-xs font-semibold text-ocean-600 hover:text-ocean-700 flex items-center gap-1 mt-0.5"
        >
          ↓ Download PNG
        </a>
      )}
    </div>
  );
}
