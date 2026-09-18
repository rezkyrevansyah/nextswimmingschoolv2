"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Btn from "@/components/ui/Btn";
import { Field, Input, Textarea } from "@/components/ui/FormFields";
import { revalidate } from "./_utils";

// Singleton form (landing_config, id=1) — no list, no modal, no delete.
export default function FooterTab() {
  const toast = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    footer_tagline: "", footer_address: "", footer_wa_number: "", contact_email: "",
    copyright_text: "", social_instagram: "", social_tiktok: "", social_youtube: "",
    floating_wa_message: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("landing_config").select("footer_tagline, footer_address, footer_wa_number, contact_email, copyright_text, social_instagram, social_tiktok, social_youtube, floating_wa_message").eq("id", 1).single();
    if (data) {
      setForm({
        footer_tagline: data.footer_tagline ?? "",
        footer_address: data.footer_address ?? "",
        footer_wa_number: data.footer_wa_number ?? "",
        contact_email: data.contact_email ?? "",
        copyright_text: data.copyright_text ?? "",
        social_instagram: data.social_instagram ?? "",
        social_tiktok: data.social_tiktok ?? "",
        social_youtube: data.social_youtube ?? "",
        floating_wa_message: data.floating_wa_message ?? "",
      });
    }
    setLoading(false);
  }, [supabase]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_config").update({
      footer_tagline: form.footer_tagline.trim(),
      footer_address: form.footer_address.trim() || null,
      footer_wa_number: form.footer_wa_number.trim(),
      contact_email: form.contact_email.trim() || null,
      copyright_text: form.copyright_text.trim() || null,
      social_instagram: form.social_instagram.trim() || null,
      social_tiktok: form.social_tiktok.trim() || null,
      social_youtube: form.social_youtube.trim() || null,
      floating_wa_message: form.floating_wa_message.trim(),
    }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error("Failed to save", error.message);
    await revalidate();
    toast.success("Footer saved");
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle sub={"Footer content shown at the bottom of the landing page"}>{"Footer"}</SectionTitle>
        <Btn variant="primary" size="sm" onClick={save} disabled={loading || saving}>{saving ? "Saving…" : "Save"}</Btn>
      </div>
      {loading ? (
        <div className="py-10 text-center text-ink-mute text-sm">{"Loading…"}</div>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label={"Tagline"}><Textarea rows={2} value={form.footer_tagline} onChange={(e) => setForm({ ...form, footer_tagline: e.target.value })} placeholder={"A modern swim school with an integrated digital ecosystem."} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={"Address"}><Input value={form.footer_address} onChange={(e) => setForm({ ...form, footer_address: e.target.value })} placeholder={"Jl. Sudirman No. 1, Jakarta Selatan"} /></Field>
          </div>
          <Field label={"WhatsApp Number"}><Input type="tel" value={form.footer_wa_number} onChange={(e) => setForm({ ...form, footer_wa_number: e.target.value })} className="font-mono" /></Field>
          <Field label={"Contact Email"}><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label={"Copyright Text"}><Input value={form.copyright_text} onChange={(e) => setForm({ ...form, copyright_text: e.target.value })} placeholder={"© {year} Next Swimming School. All rights reserved."} /></Field>
          </div>
          <Field label={"Instagram URL"}><Input type="url" value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} placeholder="https://instagram.com/..." /></Field>
          <Field label={"TikTok URL"}><Input type="url" value={form.social_tiktok} onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })} placeholder="https://tiktok.com/@..." /></Field>
          <Field label={"YouTube URL"}><Input type="url" value={form.social_youtube} onChange={(e) => setForm({ ...form, social_youtube: e.target.value })} placeholder="https://youtube.com/@..." /></Field>
          <div className="sm:col-span-2 pt-3 border-t border-line">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-2">{"Floating WhatsApp Button"}</div>
          </div>
          <div className="sm:col-span-2">
            <Field label={"Default Message"} hint={"Pre-filled message when a visitor taps the floating WhatsApp button. Uses the WhatsApp number above."}>
              <Textarea rows={2} value={form.floating_wa_message} onChange={(e) => setForm({ ...form, floating_wa_message: e.target.value })} placeholder={"Hi Next Swimming School admin, I'd like to ask about the swimming program. Can you help?"} />
            </Field>
          </div>
        </div>
      )}
    </Card>
  );
}
