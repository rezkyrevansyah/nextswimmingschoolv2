"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { fmtIDR } from "@/lib/utils";
import type { useClassData } from "./useClassData";

type ClassDataHook = ReturnType<typeof useClassData>;

export default function ClassPackagesModal({ hook }: { hook: ClassDataHook }) {
  const {
    t, packageClass, setPackageClass, packages, pkgForm, setPkgForm, savingPkg,
    savePackage, deletePackage, togglePackageActive,
  } = hook;

  return (
    <Modal open={!!packageClass} onClose={() => setPackageClass(null)} title={t("admin.classes.pricingModalTitle", { name: packageClass?.name ?? "" })} size="sm"
      footer={<Btn variant="ghost" onClick={() => setPackageClass(null)}>{t("common.actions.close")}</Btn>}>
      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="text-center py-6 text-ink-mute text-sm">{t("admin.classes.noPackagesYet")}</div>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => (
              <div key={pkg.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pkg.active ? "border-line bg-white" : "border-line bg-paper-tint opacity-60"}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">{pkg.name}</div>
                  <div className="text-xs text-ink-mute">{t("admin.classes.sessionsCountSuffix", { count: pkg.sessions })} · {fmtIDR(pkg.price)}</div>
                </div>
                <button onClick={() => togglePackageActive(pkg)} className={`text-xs px-2 py-1 rounded-lg font-bold shrink-0 ${pkg.active ? "bg-ok-50 text-ok-600" : "bg-paper-tint text-ink-mute"}`}>
                  {pkg.active ? t("admin.classes.activeBadge2") : t("admin.classes.inactiveBadge2")}
                </button>
                <button onClick={() => deletePackage(pkg.id)} className="w-7 h-7 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center shrink-0">
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-line pt-4 space-y-3">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{t("admin.classes.addPackageLabel")}</div>
          <Field label={t("admin.classes.fieldPackageName")} hint={t("admin.classes.packageNameHint")}>
            <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder={t("admin.classes.packageNamePlaceholder")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.classes.fieldSessionCount")} required>
              <Input type="number" min={1} value={pkgForm.sessions} onChange={e => setPkgForm(f => ({ ...f, sessions: e.target.value }))} placeholder="10" />
            </Field>
            <Field label={t("admin.classes.fieldPackagePrice")} required>
              <Input type="number" min={0} value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} placeholder="1200000" className="font-mono" />
            </Field>
          </div>
          <Btn variant="primary" size="sm" icon="plus" onClick={savePackage} disabled={savingPkg}>{savingPkg ? t("common.actions.saving") : t("admin.classes.addPackageBtn")}</Btn>
        </div>
      </div>
    </Modal>
  );
}
