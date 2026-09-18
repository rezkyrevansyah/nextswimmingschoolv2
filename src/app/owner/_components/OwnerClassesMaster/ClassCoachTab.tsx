"use client";
import Btn from "@/components/ui/Btn";
import { Select } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { OwnerClassesMasterHook } from "./_hook";

export default function ClassCoachTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const {
    detailClass, detailLoading, availableCoachesForDetail, addCoachId, setAddCoachId, addingCoach,
    assignCoachToClass, detailCoaches, settingRole, setCoachRole, removeCoachFromClass, savingSigner, setRaporSigner,
  } = hook;

  return (
    <div className="space-y-4">
      {detailLoading ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"Loading…"}</div>
      ) : (
        <>
          {/* Add Coach Selector */}
          {availableCoachesForDetail.length > 0 && (
            <div className="p-3 bg-paper-tint rounded-xl border border-line flex items-center gap-2">
              <select
                value={addCoachId}
                onChange={(e) => setAddCoachId(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-line pl-3 pr-8 py-2 bg-white text-ink appearance-none cursor-pointer focus:outline-none focus:border-ocean-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23577496' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>")`,
                  backgroundPosition: "right 10px center",
                  backgroundSize: "12px",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <option value="">{"Select coach to assign…"}</option>
                {availableCoachesForDetail.map((c) => (
                  <option key={c.id} value={c.id} translate="no">
                    {c.full_name}
                  </option>
                ))}
              </select>
              <Btn variant="primary" size="sm" disabled={!addCoachId || addingCoach} onClick={assignCoachToClass}>
                {"Assign"}
              </Btn>
            </div>
          )}

          {detailCoaches.length === 0 ? (
            <div className="text-center py-8 text-ink-mute text-sm">{"No coach in this class yet."}</div>
          ) : (
            <div className="divide-y divide-line border rounded-xl overflow-hidden">
              {detailCoaches.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-white hover:bg-paper-tint transition-colors">
                  <Avatar name={c.full_name} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink text-xs"><NoTranslate>{c.full_name}</NoTranslate></div>
                    <div className="text-[11px] text-ink-mute">{c.phone ?? "—"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => detailClass && setCoachRole(detailClass.id, c.id, "head")}
                      disabled={settingRole === c.id}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                        c.role === "head"
                          ? "bg-ocean-700 text-white"
                          : "bg-paper-deep text-ink-soft hover:bg-paper-deep/80"
                      }`}
                    >
                      {"Head Coach"}
                    </button>
                    <button
                      type="button"
                      onClick={() => detailClass && setCoachRole(detailClass.id, c.id, "assistant")}
                      disabled={settingRole === c.id}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                        c.role === "assistant"
                          ? "bg-ocean-700 text-white"
                          : "bg-paper-deep text-ink-soft hover:bg-paper-deep/80"
                      }`}
                    >
                      {"Assistant"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCoachFromClass(c.id, c.full_name)}
                      className="p-1 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rapor Signer Coach Override */}
          <div className="border-t border-line pt-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">
              {"Report Signature Owner"}
            </div>
            <Select
              value={detailClass?.rapor_signer_coach_id ?? ""}
              disabled={savingSigner}
              onChange={(e) => detailClass && setRaporSigner(detailClass.id, e.target.value || null)}
            >
              <option value="">{"Automatic (follows Head Coach)"}</option>
              {detailCoaches.map((c) => (
                <option key={c.id} value={c.id} translate="no">
                  {c.full_name}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-ink-faint mt-1">{"The printed report label always shows “Head Coach” regardless of which coach is selected here."}</p>
          </div>
        </>
      )}
    </div>
  );
}
