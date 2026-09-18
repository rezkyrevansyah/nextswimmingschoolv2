"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/FormFields";

export default function ImageField({
  label,
  url,
  onUrlChange,
  onFileChange,
  hint,
  square = false,
}: {
  label: string;
  url: string;
  onUrlChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
  hint?: string;
  /** Pad the uploaded image to a square canvas (no crop, transparent padding for PNG/WebP) — for logos. */
  square?: boolean;
}) {
  const [mode, setMode] = useState<"url" | "upload">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);

  return (
    <Field label={label} hint={square ? "The image will automatically be padded to a square (no crop, transparent padding)." : (hint ?? "Use storage upload. Manual URL is only for pre-approved domains.")}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("upload"); onFileChange(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "upload" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
          >
            {"Upload File"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("url"); onFileChange(null); setPreview(null); setFileName(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${mode === "url" ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}
          >
            {"Use URL"}
          </button>
        </div>

        {mode === "upload" ? (
          <>
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line hover:border-ocean-400 bg-paper-tint hover:bg-ocean-50/30 transition-colors py-6 px-3">
              <Icon name="camera" className="w-6 h-6 text-ink-mute" />
              <span className="text-xs text-ink-mute font-medium">{processing ? "Processing image..." : (fileName || "Click to choose an image")}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={processing}
                onChange={async (e) => {
                  const raw = e.target.files?.[0] ?? null;
                  if (!raw) { onFileChange(null); setFileName(""); setPreview(null); return; }
                  if (!square) {
                    onFileChange(raw);
                    setFileName(raw.name);
                    setPreview(URL.createObjectURL(raw));
                    return;
                  }
                  setProcessing(true);
                  try {
                    const { padImageToSquare } = await import("@/lib/imageSquarePad");
                    const padded = await padImageToSquare(raw);
                    onFileChange(padded);
                    setFileName(padded.name);
                    setPreview(URL.createObjectURL(padded));
                  } finally {
                    setProcessing(false);
                  }
                }}
              />
            </label>
            {(preview || url) && (
              <img
                src={preview ?? url}
                alt="preview"
                className={square ? "w-36 h-36 mx-auto object-contain rounded-lg border border-line [background-image:linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0]" : "w-full h-36 object-cover rounded-lg border border-line"}
              />
            )}
          </>
        ) : (
          <>
            <Input value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." />
            {url && <img src={url} alt="preview" className="w-full h-36 object-cover rounded-lg border border-line" />}
          </>
        )}
      </div>
    </Field>
  );
}
