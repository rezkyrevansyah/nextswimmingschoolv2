"use client";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import { useAccountDetailData } from "./useAccountDetailData";
import AccountEditForm from "./AccountEditForm";
import AccountViewPanel from "./AccountViewPanel";
import type { Props } from "./_types";

export type { AccountProfile, AccountMemberData } from "./_types";

export default function OwnerAccountDetail(props: Props) {
  const hook = useAccountDetailData(props);
  const { t, account, open, editing, setEditing, setShowPwdReset, onClose } = hook;
  const { saving, saveEdit, banning, handleBanToggle, handleDelete } = hook;

  if (!account) return null;

  return (
    <Modal
      open={open}
      onClose={() => {
        setEditing(false);
        setShowPwdReset(false);
        onClose();
      }}
      title={editing ? t("owner.accountDetail.editTitle") : t("owner.accountDetail.viewTitle")}
      size="lg"
      footer={
        editing ? (
          <>
            <Btn variant="ghost" onClick={() => setEditing(false)}>
              {t("owner.accountDetail.cancelBtn")}
            </Btn>
            <Btn variant="primary" onClick={saveEdit} disabled={saving}>
              {saving ? t("owner.accountDetail.savingBtn") : t("owner.accountDetail.saveBtn")}
            </Btn>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={hook.openEdit}>
              {t("owner.accountDetail.editBtn")}
            </Btn>
            <Btn variant="ghost" icon="key" onClick={() => setShowPwdReset((v) => !v)}>
              {t("owner.accountDetail.resetPasswordBtn")}
            </Btn>
            <Btn
              variant="ghost"
              icon={account.is_archived ? "check" : "x"}
              className={
                account.is_archived ? "text-ok-600 hover:bg-ok-50" : "text-warn-600 hover:bg-warn-50"
              }
              onClick={handleBanToggle}
              disabled={banning}
            >
              {banning
                ? t("owner.accountDetail.processingBtn")
                : account.is_archived
                ? t("owner.accountDetail.reactivateBtn")
                : t("owner.accountDetail.deactivateBtn")}
            </Btn>
            <Btn
              variant="ghost"
              icon="trash"
              className="text-danger-600 hover:bg-danger-50"
              onClick={handleDelete}
            >
              {t("owner.accountDetail.deleteBtn")}
            </Btn>
          </div>
        )
      }
    >
      {editing ? <AccountEditForm hook={hook} /> : <AccountViewPanel hook={hook} />}
    </Modal>
  );
}
