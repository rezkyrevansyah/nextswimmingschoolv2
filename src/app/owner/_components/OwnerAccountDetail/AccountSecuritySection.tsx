"use client";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input, SectionLabel } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { BANK_ACCOUNT_ROLES } from "./_types";
import type { useAccountDetailData } from "./useAccountDetailData";

type AccountDetailDataHook = ReturnType<typeof useAccountDetailData>;
type PersonalSource = { bank_name: string | null; bank_account: string | null; bank_holder: string | null };

export default function AccountSecuritySection({ hook, personalSource }: { hook: AccountDetailDataHook; personalSource: PersonalSource }) {
  const {
    t, account, linkedStaff, copyToClipboard, openEdit,
    showPwdReset, newPassword, setNewPassword, showNewPwd, setShowNewPwd, resettingPwd, handleResetPassword,
  } = hook;
  if (!account) return null;

  return (
    <>
      {/* Bank Account — only roles that get paid through this system */}
      {BANK_ACCOUNT_ROLES.includes(account.role) && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <SectionLabel className="flex-1">{t("owner.accountDetail.bankAccountTitle")}</SectionLabel>
            {linkedStaff && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-full px-2 py-0.5 shrink-0">
                {t("owner.accountDetail.viaLinkedStaffBadge")}
              </span>
            )}
          </div>
          {personalSource.bank_account ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-ink">
                  <NoTranslate>{personalSource.bank_name ?? "—"}</NoTranslate>
                </div>
                <div className="font-mono text-ocean-700 text-lg font-bold mt-0.5">
                  <NoTranslate>{personalSource.bank_account}</NoTranslate>
                </div>
                <div className="text-sm text-ink-mute">
                  {t("owner.accountDetail.accountHolderPrefix")}{" "}
                  <NoTranslate>{personalSource.bank_holder ?? "—"}</NoTranslate>
                </div>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(personalSource.bank_account!, t("owner.accountDetail.fieldBankAccount"))
                }
                className="w-10 h-10 rounded-xl border border-ocean-200 bg-ocean-50 text-ocean-700 hover:bg-ocean-100 flex items-center justify-center transition-colors"
                title={t("owner.accountDetail.copyBankAccountTitleAttr")}
              >
                <Icon name="copy" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-mute italic">
              {t("owner.accountDetail.bankAccountEmpty")}{" "}
              <button onClick={openEdit} className="text-ocean-600 underline">
                {t("owner.accountDetail.addBankAccountLink")}
              </button>
            </p>
          )}
        </div>
      )}

      {/* Reset Password */}
      {showPwdReset && (
        <div className="rounded-xl border border-warn-200 bg-warn-50 p-4 space-y-3">
          <p className="text-sm font-bold text-warn-700 flex items-center gap-2">
            <Icon name="key" className="w-4 h-4" />
            {t("owner.accountDetail.resetPasswordTitle")}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showNewPwd ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("owner.accountDetail.newPasswordPlaceholder")}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNewPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
              >
                <Icon name={showNewPwd ? "eye-off" : "eye"} className="w-4 h-4" />
              </button>
            </div>
            <Btn
              variant="primary"
              size="sm"
              onClick={handleResetPassword}
              disabled={resettingPwd || !newPassword.trim()}
            >
              {resettingPwd
                ? t("owner.accountDetail.processingBtn")
                : t("owner.accountDetail.setPasswordBtn")}
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}
