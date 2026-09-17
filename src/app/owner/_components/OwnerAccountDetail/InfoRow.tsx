"use client";
import { type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function InfoRow({
  icon,
  label,
  value,
  title,
  onCopy,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  /** Full-text value shown on hover — set this whenever `value` can overflow (addresses, notes, etc.), since `value` itself may be wrapped JSX rather than a plain string. */
  title?: string;
  onCopy?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-paper-tint border border-line/60">
      <span className="w-7 h-7 rounded-lg bg-ocean-100 text-ocean-600 flex items-center justify-center shrink-0 mt-0.5">
        <Icon name={icon as Parameters<typeof Icon>[0]["name"]} className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{label}</div>
        <div className="text-sm text-ink font-medium truncate" title={title}>
          {value}
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="text-ink-mute hover:text-ocean-600 p-0.5 shrink-0 mt-1"
          title={t("owner.accountDetail.copyIconTitleAttr")}
        >
          <Icon name="copy" className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
