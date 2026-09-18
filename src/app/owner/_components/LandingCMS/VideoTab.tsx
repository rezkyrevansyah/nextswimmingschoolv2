"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { revalidate, getYouTubeEmbedUrl } from "./_utils";

export default function VideoTab() {
  const toast = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    youtube_video_url: "",
    youtube_video_url_2: "",
    youtube_video_url_3: "",
    youtube_section_title: "",
    youtube_section_subtitle: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("landing_config")
      .select("youtube_video_url, youtube_video_url_2, youtube_video_url_3, youtube_section_title, youtube_section_subtitle")
      .eq("id", 1)
      .single();
    if (data) {
      setForm({
        youtube_video_url: data.youtube_video_url ?? "",
        youtube_video_url_2: (data as unknown as { youtube_video_url_2?: string }).youtube_video_url_2 ?? "",
        youtube_video_url_3: (data as unknown as { youtube_video_url_3?: string }).youtube_video_url_3 ?? "",
        youtube_section_title: data.youtube_section_title ?? "",
        youtube_section_subtitle: data.youtube_section_subtitle ?? "",
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("landing_config") as any)
      .update({
        youtube_video_url: form.youtube_video_url.trim() || null,
        youtube_video_url_2: form.youtube_video_url_2.trim() || null,
        youtube_video_url_3: form.youtube_video_url_3.trim() || null,
        youtube_section_title: form.youtube_section_title.trim() || null,
        youtube_section_subtitle: form.youtube_section_subtitle.trim() || null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error("Failed to save", error.message);
    await revalidate();
    toast.success("Profile video settings saved");
  };

  const embedPreviewUrl = getYouTubeEmbedUrl(form.youtube_video_url);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={"Configure the YouTube profile video shown on the landing page"}>
          {"Profile Video"}
        </SectionTitle>
        <Btn variant="primary" size="sm" onClick={save} disabled={loading || saving}>
          {saving ? "Saving…" : "Save"}
        </Btn>
      </div>

      {loading ? (
        <div className="py-10 text-center text-ink-mute text-sm">{"Loading…"}</div>
      ) : (
        <div className="mt-4 space-y-5">
          <Field
            label={"Video URL 1"}
            hint={"Main YouTube video shown on the landing page"}
          >
            <Input
              type="url"
              value={form.youtube_video_url}
              onChange={(e) => setForm({ ...form, youtube_video_url: e.target.value })}
              placeholder="E.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            />
          </Field>

          <Field label={"Video URL 2 (optional)"} hint={"Second video, shown as an alternate/additional option"}>
            <Input
              type="url"
              value={form.youtube_video_url_2}
              onChange={(e) => setForm({ ...form, youtube_video_url_2: e.target.value })}
              placeholder="E.g. https://www.youtube.com/watch?v=..."
            />
          </Field>

          <Field label={"Video URL 3 (optional)"} hint={"Third video, shown as an alternate/additional option"}>
            <Input
              type="url"
              value={form.youtube_video_url_3}
              onChange={(e) => setForm({ ...form, youtube_video_url_3: e.target.value })}
              placeholder="E.g. https://www.youtube.com/watch?v=..."
            />
          </Field>

          <Field label={"Section Title"} hint={"Heading shown above the video on the landing page"}>
            <Input
              value={form.youtube_section_title}
              onChange={(e) => setForm({ ...form, youtube_section_title: e.target.value })}
              placeholder={"E.g. See Us in Action"}
            />
          </Field>

          <Field label={"Section Subtitle"}>
            <Textarea
              rows={2}
              value={form.youtube_section_subtitle}
              onChange={(e) => setForm({ ...form, youtube_section_subtitle: e.target.value })}
              placeholder={"E.g. A glimpse into our swimming programs"}
            />
          </Field>

          {/* Live Preview */}
          <div className="border-t border-line pt-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Live Video Preview</div>
            {embedPreviewUrl ? (
              <div className="rounded-2xl overflow-hidden shadow-card border border-line bg-black aspect-video max-w-2xl">
                <iframe
                  src={embedPreviewUrl}
                  title="YouTube Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : form.youtube_video_url.trim() ? (
              <div className="p-4 rounded-xl bg-warn-50 border border-warn-200 text-xs text-warn-700 font-semibold">
                Format link YouTube tidak dikenali. Pastikan memasukkan tautan YouTube yang valid (contoh: https://www.youtube.com/watch?v=xxx atau https://youtu.be/xxx).
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-paper-tint border border-dashed border-line text-center text-xs text-ink-mute">
                Masukkan link YouTube di atas untuk melihat pratinjau video. Jika dikosongkan, section video di landing page tidak akan ditampilkan.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
