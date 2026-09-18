"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import type { useClassData } from "./useClassData";

type ClassDataHook = ReturnType<typeof useClassData>;

export default function ClassPackagesModal({ hook }: { hook: ClassDataHook }) {
  const {
    packageClass, setPackageClass, packages, pkgForm, setPkgForm, savingPkg,
    savePackage, deletePackage, togglePackageActive,
  } = hook;

  return (
    <Modal open={!!packageClass} onClose={() => setPackageClass(null)} title={(<>{"Pricing — "}<NoTranslate>{packageClass?.name ?? ""}</NoTranslate></>)} size="sm"
      footer={<Btn variant="ghost" onClick={() => setPackageClass(null)}>{"Close"}</Btn>}>
      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="text-center py-6 text-ink-mute text-sm">{"No packages yet. Add a package below."}</div>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => (
              <div key={pkg.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pkg.active ? "border-line bg-white" : "border-line bg-paper-tint opacity-60"}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate"><NoTranslate>{pkg.name}</NoTranslate></div>
                  <div className="text-xs text-ink-mute">{`${pkg.sessions} sessions`} · {fmtIDR(pkg.price)}</div>
                </div>
                <button onClick={() => togglePackageActive(pkg)} className={`text-xs px-2 py-1 rounded-lg font-bold shrink-0 ${pkg.active ? "bg-ok-50 text-ok-600" : "bg-paper-tint text-ink-mute"}`}>
                  {pkg.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => deletePackage(pkg.id)} className="w-7 h-7 rounded-lg text-ink-mute hover:text-danger-500 hover:bg-danger-50 flex items-center justify-center shrink-0">
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-line pt-4 space-y-3">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">{"Add Package"}</div>
          <Field label={"Package name"} hint={"Optional — auto from session count if empty."}>
            <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder={"E.g. 10-Session Saver Package"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={"Number of sessions"} required>
              <Input type="number" min={1} value={pkgForm.sessions} onChange={e => setPkgForm(f => ({ ...f, sessions: e.target.value }))} placeholder="10" />
            </Field>
            <Field label={"Package price"} required>
              <Input type="number" min={0} value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} placeholder="1200000" className="font-mono" />
            </Field>
          </div>
          <Btn variant="primary" size="sm" icon="plus" onClick={savePackage} disabled={savingPkg}>{savingPkg ? "Saving…" : "Add Package"}</Btn>
        </div>
      </div>
    </Modal>
  );
}
