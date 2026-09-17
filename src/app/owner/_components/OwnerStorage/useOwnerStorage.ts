"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { logActivity } from "@/lib/activityLog";
import type { StorageStats, BackupFile } from "./_types";
import { BACKUP_PAGE_SIZE } from "./_utils";

export function useOwnerStorage({ userId, userName }: { userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [backupPage, setBackupPage] = useState(0);

  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(["all"]));
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await fetch("/api/storage/stats");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as StorageStats;
      setStats(data);
    } catch {
      setStatsError(true);
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadBackupList = async () => {
    setBackupLoading(true);
    setBackupLoaded(false);
    try {
      // Fetch per selected category (or all)
      if (selectedCats.has("all")) {
        const res = await fetch("/api/storage/backup-list?category=all");
        if (!res.ok) throw new Error();
        const data = await res.json() as { files: BackupFile[] };
        setBackupList(data.files);
      } else {
        const allFiles: BackupFile[] = [];
        for (const cat of selectedCats) {
          const res = await fetch(`/api/storage/backup-list?category=${cat}`);
          if (!res.ok) continue;
          const data = await res.json() as { files: BackupFile[] };
          allFiles.push(...data.files);
        }
        setBackupList(allFiles);
      }
      setBackupLoaded(true);
      setBackupPage(0);
    } catch {
      toast.error(t("owner.storage.listLoadFailed"));
    }
    setBackupLoading(false);
  };

  const toggleCat = (key: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (key === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(key);
      }
      return next;
    });
    setBackupLoaded(false);
    setBackupList([]);
    setSelectMode(false);
    setSelectedFiles(new Set());
  };

  const toggleFile = (key: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deleteSelected = async () => {
    const targets = backupList.filter(f => selectedFiles.has(f.key));
    if (targets.length === 0) return;
    const yes = await confirm({
      title: t("owner.storage.deleteSelectedConfirmTitle", { count: targets.length }),
      body: t("owner.storage.deleteSelectedConfirmBody"),
      danger: true,
    });
    if (!yes) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: targets.map(f => ({ bucket: f.bucket, key: f.key, dbRef: f.dbRef })),
        }),
      });
      const data = await res.json() as { deleted: number; failed: { key: string; error: string }[] };
      if (!res.ok) throw new Error();

      toast.success(t("owner.storage.deleteSuccess", { count: data.deleted }), data.failed.length > 0 ? t("owner.storage.deleteFailedSub", { count: data.failed.length }) : undefined);
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "system_storage", entityId: "delete",
        action: "delete",
        label: t("owner.storage.activityDeleted", { count: data.deleted }),
        meta: { count: data.deleted, keys: targets.map(f => f.key) },
      });

      const deletedKeys = new Set(targets.map(f => f.key).filter(k => !data.failed.some(f => f.key === k)));
      setBackupList(prev => prev.filter(f => !deletedKeys.has(f.key)));
      setSelectedFiles(new Set());
      setSelectMode(false);
      loadStats();
    } catch {
      toast.error(t("owner.storage.deleteFailed"), t("owner.storage.deleteFailedGeneric"));
    }
    setDeleting(false);
  };

  const deleteSingle = async (f: BackupFile) => {
    const yes = await confirm({
      title: t("owner.storage.deleteFileConfirmTitle"),
      body: tNode("owner.storage.deleteFileConfirmBody", { name: f.label }),
      danger: true,
    });
    if (!yes) return;

    setDeletingKey(f.key);
    try {
      const res = await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ bucket: f.bucket, key: f.key, dbRef: f.dbRef }] }),
      });
      const data = await res.json() as { deleted: number; failed: { key: string; error: string }[] };
      if (!res.ok || data.failed.length > 0) throw new Error();

      toast.success(t("owner.storage.deleteSuccess", { count: 1 }));
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "system_storage", entityId: "delete",
        action: "delete",
        label: t("owner.storage.activityDeleted", { count: 1 }),
        meta: { count: 1, keys: [f.key] },
      });

      setBackupList(prev => prev.filter(x => x.key !== f.key));
      setSelectedFiles(prev => { const next = new Set(prev); next.delete(f.key); return next; });
      loadStats();
    } catch {
      toast.error(t("owner.storage.deleteFailed"), t("owner.storage.deleteFailedGeneric"));
    }
    setDeletingKey(null);
  };

  const downloadBackup = async () => {
    if (backupList.length === 0) return;
    setDownloading(true);
    setDownloadProgress({ done: 0, total: backupList.length });
    let successCount = 0;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < backupList.length; i++) {
        const f = backupList[i];
        try {
          const res = await fetch(`/api/storage?key=${encodeURIComponent(f.key)}&stream=1`);
          if (res.ok) {
            const blob = await res.blob();
            const folder = f.category.replace(/[\s/\\]/g, "_");
            const filename = f.key.split("/").filter(Boolean).pop() ?? f.key;
            zip.file(`${folder}/${filename}`, blob);
            successCount++;
          }
        } catch { /* skip failed file */ }
        setDownloadProgress({ done: i + 1, total: backupList.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Storage-Backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("owner.storage.downloadSuccess", { count: successCount }));
      logActivity(supabase, {
        userId, userRole: "owner", userName,
        entityType: "system_storage", entityId: "backup",
        action: "create",
        label: t("owner.storage.activityBackupDownloaded", { success: successCount, total: backupList.length }),
        meta: { success_count: successCount, total_count: backupList.length },
      });
    } catch {
      toast.error(t("owner.storage.downloadFailed"), t("owner.storage.downloadFailedSub"));
    }
    setDownloading(false);
    setDownloadProgress(null);
  };

  // Pagination for backup list
  const totalBackupPages = Math.max(1, Math.ceil(backupList.length / BACKUP_PAGE_SIZE));
  const safeBackupPage   = Math.min(backupPage, Math.max(0, totalBackupPages - 1));
  const paginatedBackup  = backupList.slice(safeBackupPage * BACKUP_PAGE_SIZE, (safeBackupPage + 1) * BACKUP_PAGE_SIZE);

  // Group backup list by category for summary
  const backupByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of backupList) map[f.category] = (map[f.category] ?? 0) + 1;
    return map;
  }, [backupList]);

  const publicSize = useMemo(() => {
    if (!stats) return 0;
    const pubPrefixes = new Set(["avatars", "logos", "classes", "signatures", "landing"]);
    return stats.categories.filter(c => pubPrefixes.has(c.prefix)).reduce((sum, c) => sum + c.size, 0);
  }, [stats]);

  const privateSize = useMemo(() => {
    if (!stats) return 0;
    const privPrefixes = new Set(["attendances", "payments", "certs"]);
    return stats.categories.filter(c => privPrefixes.has(c.prefix)).reduce((sum, c) => sum + c.size, 0);
  }, [stats]);

  return {
    statsLoading, stats, statsError, loadStats, publicSize, privateSize,
    backupList, backupLoading, backupLoaded, backupPage, setBackupPage,
    selectedCats, setSelectedCats, setBackupLoaded, setBackupList,
    downloading, downloadProgress,
    selectMode, setSelectMode, selectedFiles, setSelectedFiles, deleting, deletingKey,
    loadBackupList, toggleCat, toggleFile, deleteSelected, deleteSingle, downloadBackup,
    totalBackupPages, safeBackupPage, paginatedBackup, backupByCat,
  };
}
