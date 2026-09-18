"use client";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { useUpload } from "@/hooks/useUpload";

export default function ProfileGate({ studentName, onComplete, onLogout }: { studentName: string; onComplete: () => void; onLogout: () => void }) {
  const { upload, uploading } = useUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!avatarFile) return setError("Please choose a photo first");
    setError("");
    try {
      await upload.avatar(avatarFile);
      onComplete();
    } catch {
      setError("Failed to upload photo, please try again");
    }
  };

  return (
    <div className="min-h-screen bg-paper-tint flex flex-col items-center justify-center px-4 py-12">
      <Logo size={48} withWord />
      <div className="w-full max-w-xs mt-8 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display font-bold text-2xl text-ink">{"Complete Profile"}</h1>
          <p className="text-sm text-ink-mute">{"Upload a profile photo to start using the application."}</p>
        </div>
        <Card className="flex flex-col items-center gap-4">
          <label className="cursor-pointer group relative inline-block">
            <Avatar
              name={studentName || "?"}
              src={avatarPreview ?? undefined}
              size={112}
              className="ring-2 ring-dashed ring-line group-hover:ring-ocean-400 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-md">
              <Icon name="camera" className="w-4 h-4" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setAvatarFile(f);
              setAvatarPreview(f ? URL.createObjectURL(f) : null);
            }} />
          </label>
          <div className="text-center">
            <p className="text-sm text-ink-soft">{"Click photo to choose an image"}</p>
            <p className="text-xs text-ink-faint mt-0.5">{"Format: JPG / PNG · Max. 5 MB"}</p>
          </div>
          {error && <p className="text-xs text-danger-600 text-center">{error}</p>}
          <Btn variant="primary" className="w-full" disabled={uploading || !avatarFile} onClick={handleUpload}>
            {uploading ? "Uploading…" : "Save & Continue"}
          </Btn>
          <button onClick={onLogout} className="text-xs text-ink-mute hover:text-danger-600 transition-colors">{"Log out of account"}</button>
        </Card>
      </div>
    </div>
  );
}
