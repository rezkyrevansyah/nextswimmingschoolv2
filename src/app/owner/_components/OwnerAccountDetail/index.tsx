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
  const { account, open, editing, setEditing, setShowPwdReset, onClose } = hook;
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
      title={editing ? "Edit Account Profile" : "Account Detail"}
      size="lg"
      footer={
        editing ? (
          <>
            <Btn variant="ghost" onClick={() => setEditing(false)}>
              {"Cancel"}
            </Btn>
            <Btn variant="primary" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Btn>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Btn variant="ghost" icon="edit" onClick={hook.openEdit}>
              {"Edit"}
            </Btn>
            <Btn variant="ghost" icon="key" onClick={() => setShowPwdReset((v) => !v)}>
              {"Reset Password"}
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
                ? "Processing..."
                : account.is_archived
                ? "Reactivate"
                : "Deactivate"}
            </Btn>
            <Btn
              variant="ghost"
              icon="trash"
              className="text-danger-600 hover:bg-danger-50"
              onClick={handleDelete}
            >
              {"Delete"}
            </Btn>
          </div>
        )
      }
    >
      {editing ? <AccountEditForm hook={hook} /> : <AccountViewPanel hook={hook} />}
    </Modal>
  );
}
