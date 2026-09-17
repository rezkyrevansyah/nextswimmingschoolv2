"use client";
import OwnerAccountDetail from "../OwnerAccountDetail";
import { useAccountsMasterData } from "./useAccountsMasterData";
import AccountsToolbar from "./AccountsToolbar";
import AccountsTable from "./AccountsTable";
import QRModals from "./QRModals";
import AddAccountModal from "./AddAccountModal";

export default function OwnerAccountsMaster({ branches }: { branches: { id: string; name: string }[] }) {
  const hook = useAccountsMasterData(branches);
  const { selected, setSelected, load } = hook;

  return (
    <div className="space-y-4">
      <AccountsToolbar hook={hook} />
      <AccountsTable hook={hook} />

      {/* ── Detail Modal ── */}
      <OwnerAccountDetail
        account={selected}
        branches={branches}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRefresh={load}
      />

      <QRModals hook={hook} />
      <AddAccountModal hook={hook} />
    </div>
  );
}
