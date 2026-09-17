"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { useOwnerRaporLevels } from "./useOwnerRaporLevels";

type Hook = ReturnType<typeof useOwnerRaporLevels>;

export default function ClassScopeModal({ hook }: { hook: Hook }) {
  const { t, tNode } = useLocale();
  const { classScopeLevel, setClassScopeLevel, classOptions, selectedClassIds, setAllClasses, toggleClassSelection } = hook;

  const close = () => setClassScopeLevel(null);

  return (
    <Modal open={!!classScopeLevel} onClose={close}
      title={tNode("owner.raporLevels.classScopeModalTitle", { level: classScopeLevel?.name ?? "" })} size="md"
      footer={<Btn variant="ghost" onClick={close}>{t("common.actions.close")}</Btn>}>
      {classScopeLevel && (
        <div className="space-y-4">
          <p className="text-xs text-ink-mute">{t("owner.raporLevels.classScopeHint")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAllClasses(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${classScopeLevel.all_classes ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}>
              {t("owner.raporLevels.allClasses")}
            </button>
            <button type="button" onClick={() => setAllClasses(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${!classScopeLevel.all_classes ? "bg-ocean-700 text-white border-ocean-700" : "bg-white text-ink-soft border-line hover:bg-paper-tint"}`}>
              {t("owner.raporLevels.specificClasses")}
            </button>
          </div>

          {!classScopeLevel.all_classes && (
            classOptions.length === 0 ? (
              <p className="text-sm text-ink-mute">{t("owner.raporLevels.classesEmpty")}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-line border border-line rounded-xl">
                {classOptions.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-paper-tint cursor-pointer">
                    <input type="checkbox" className="rounded border-line accent-ocean-600"
                      checked={selectedClassIds.has(c.id)} onChange={() => toggleClassSelection(c.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm"><NoTranslate>{c.name}</NoTranslate></div>
                      {c.branch_name && <div className="text-xs text-ink-mute"><NoTranslate>{c.branch_name}</NoTranslate></div>}
                    </div>
                  </label>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
}
