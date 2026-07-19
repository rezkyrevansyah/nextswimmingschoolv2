"use client";
import React, { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/utils/supabase/client";
import type { Notification } from "@/lib/data";
import { useLocale } from "@/components/providers/LocaleProvider";

interface BellProps {
  /** Pass either static items (mock/demo) or a userId to load from DB */
  items?: Notification[];
  userId?: string;
}

interface DbNotif {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  icon: string | null;
  read: boolean;
  created_at: string;
}

function relativeTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("common.bell.justNow");
  if (mins < 60) return t("common.bell.minutesAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("common.bell.hoursAgo", { n: hrs });
  return t("common.bell.daysAgo", { n: Math.floor(hrs / 24) });
}

export default function Bell({ items: staticItems, userId }: BellProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [dbItems, setDbItems] = useState<DbNotif[]>([]);
  const supabase = createClient();

  const loadNotifs = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, kind, icon, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setDbItems(data as DbNotif[]);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader + realtime */
  useEffect(() => {
    if (!userId) return;
    loadNotifs();
    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        loadNotifs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadNotifs]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const markAllRead = async () => {
    if (userId) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
      setDbItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  // Use DB items if userId provided, else fall back to static items
  const useDb = !!userId;
  const unread = useDb
    ? dbItems.filter((n) => !n.read).length
    : (staticItems ?? []).filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-full hover:bg-paper-tint flex items-center justify-center text-ink-soft"
      >
        <Icon name="bell" className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-wave-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] bg-white rounded-2xl border border-line shadow-lift z-40 anim-in overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-ink">{t("common.bell.title")}</div>
                <div className="text-xs text-ink-mute">{t("common.bell.unread", { n: unread })}</div>
              </div>
              {unread > 0 && (
                <button className="text-xs font-semibold text-ocean-600 hover:text-ocean-700" onClick={markAllRead}>
                  {t("common.bell.markAllRead")}
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-line">
              {useDb ? (
                dbItems.length === 0 ? (
                  <div className="p-6 text-center text-sm text-ink-mute">{t("common.bell.empty")}</div>
                ) : dbItems.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 hover:bg-paper-tint cursor-pointer ${!n.read ? "bg-wave-50/40" : ""}`}
                  >
                    <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                      n.kind === "success" ? "bg-ok-50 text-ok-600"
                      : n.kind === "warn" ? "bg-warn-50 text-warn-600"
                      : n.kind === "danger" ? "bg-danger-50 text-danger-500"
                      : "bg-wave-50 text-wave-600"
                    }`}>
                      <Icon name={(n.icon ?? "info") as Parameters<typeof Icon>[0]["name"]} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink leading-tight">{n.title}</div>
                      {n.body && <div className="text-xs text-ink-mute mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-ink-faint uppercase tracking-wide mt-1">{relativeTime(n.created_at, t)}</div>
                    </div>
                  </div>
                ))
              ) : (
                (staticItems ?? []).length === 0 ? (
                  <div className="p-6 text-center text-sm text-ink-mute">{t("common.bell.empty")}</div>
                ) : (staticItems ?? []).map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 hover:bg-paper-tint cursor-pointer ${!n.read ? "bg-wave-50/40" : ""}`}
                  >
                    <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                      n.kind === "success" ? "bg-ok-50 text-ok-600"
                      : n.kind === "warn" ? "bg-warn-50 text-warn-600"
                      : n.kind === "danger" ? "bg-danger-50 text-danger-500"
                      : "bg-wave-50 text-wave-600"
                    }`}>
                      <Icon name={n.icon || "info"} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink leading-tight">{n.title}</div>
                      {n.body && <div className="text-xs text-ink-mute mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-ink-faint uppercase tracking-wide mt-1">{n.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
