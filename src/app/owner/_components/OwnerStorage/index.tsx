"use client";
import { useOwnerStorage } from "./useOwnerStorage";
import StorageOverview from "./StorageOverview";
import BackupManager from "./BackupManager";

export default function OwnerStorage({ userId, userName }: { userId: string; userName: string }) {
  const hook = useOwnerStorage({ userId, userName });

  return (
    <div className="space-y-6">
      <StorageOverview hook={hook} />
      <BackupManager hook={hook} />
    </div>
  );
}
