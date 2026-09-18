"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import type { StudentRow } from "./_types";

export function useStudentQRData({ students }: { students: StudentRow[] }) {
  const toast = useToast();
  const [qrSelectMode, setQrSelectMode] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Set<string>>(new Set());
  const [generatingQR, setGeneratingQR] = useState(false);

  const bulkDownloadQR = async (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setGeneratingQR(true);
    try {
      const QRCode = await import("qrcode");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const mid of studentIds) {
        const m = students.find(r => r.id === mid);
        if (!m) continue;
        const qrValue = m.qr_code ?? m.id;
        const name = (m.profile?.full_name ?? mid).replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-");
        const dataUrl: string = await QRCode.toDataURL(qrValue, {
          width: 400,
          margin: 2,
          color: { dark: "#0A2540", light: "#ffffff" },
        });
        // dataUrl = "data:image/png;base64,..."
        const base64 = dataUrl.split(",")[1];
        zip.file(`QR-${name}.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-Student-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setQrSelectMode(false);
      setSelectedQR(new Set());
      toast.success("Download complete", `${studentIds.length} QR codes downloaded successfully`);
    } catch {
      toast.error("Failed to generate QR", "An error occurred while creating the ZIP file.");
    }
    setGeneratingQR(false);
  };

  return { qrSelectMode, setQrSelectMode, selectedQR, setSelectedQR, generatingQR, bulkDownloadQR };
}
