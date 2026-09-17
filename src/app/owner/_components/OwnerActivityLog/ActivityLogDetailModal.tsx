"use client";
import { useLocale } from "@/components/providers/LocaleProvider";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import Modal from "@/components/ui/Modal";
import { ACTION_BADGE, ENTITY_COLORS } from "./_types";
import type { useActivityLogData } from "./useActivityLogData";

type ActivityLogDataHook = ReturnType<typeof useActivityLogData>;

export default function ActivityLogDetailModal({ hook }: { hook: ActivityLogDataHook }) {
  const { t } = useLocale();
  const { detailLog, setDetailLog, fmtTime, fmtShortDate, branchName, entityLabel, actionLabel } = hook;

  return (
    <Modal
      open={!!detailLog}
      onClose={() => setDetailLog(null)}
      title={t("owner.activityLog.detailModalTitle")}
      size="md"
      footer={<Btn variant="ghost" onClick={() => setDetailLog(null)}>{t("common.actions.close")}</Btn>}
    >
      {detailLog && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailTime")}</div>
              <div className="font-semibold text-ink">{fmtShortDate(detailLog.created_at)} {fmtTime(detailLog.created_at)}</div>
            </div>
            <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailBranch")}</div>
              <div className="font-semibold text-ink"><NoTranslate>{branchName(detailLog)}</NoTranslate></div>
            </div>
            <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailBy")}</div>
              <div className="font-semibold text-ink">
                <NoTranslate>{detailLog.user_name}</NoTranslate>{" "}
                <span className="text-xs text-ink-mute font-normal">({detailLog.user_role})</span>
              </div>
            </div>
            <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailEntity")}</div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ENTITY_COLORS[detailLog.entity_type] ?? "bg-paper-deep text-ink-soft"}`}>
                {entityLabel[detailLog.entity_type] ?? <NoTranslate>{detailLog.entity_type}</NoTranslate>}
              </span>
            </div>
            <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailAction")}</div>
              <Status kind={ACTION_BADGE[detailLog.action] ?? "manual"}>
                {actionLabel[detailLog.action] ?? <NoTranslate>{detailLog.action}</NoTranslate>}
              </Status>
            </div>
            {detailLog.entity_label && (
              <div className="bg-paper-tint/50 rounded-xl p-3 border border-line/60">
                <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1">{t("owner.activityLog.detailSubject")}</div>
                <div className="font-semibold text-ink"><NoTranslate>{detailLog.entity_label}</NoTranslate></div>
              </div>
            )}
          </div>

          <div className="border-t border-line pt-3">
            <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1.5">{t("owner.activityLog.detailDescription")}</div>
            <p className="text-sm font-medium text-ink leading-relaxed bg-paper-tint/30 rounded-xl p-3 border border-line/50">
              <NoTranslate>{detailLog.label}</NoTranslate>
            </p>
          </div>

          {detailLog.meta && Object.keys(detailLog.meta).length > 0 && (
            <div>
              <div className="text-[10px] text-ink-faint uppercase tracking-wider font-bold mb-1.5">{t("owner.activityLog.detailMeta")}</div>
              <pre className="bg-paper-deep rounded-xl p-3 text-xs font-mono overflow-auto text-ink-soft max-h-48 border border-line/60">
                {JSON.stringify(detailLog.meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
