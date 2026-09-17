// Private types for the Owner "System Storage" screen (usage stats + backup/file manager).

export interface StorageCategory { prefix: string; label: string; icon: string; count: number; size: number }
export interface StorageStats { categories: StorageCategory[]; totalSize: number; totalCount: number; fetchedAt: string }
export interface BackupFileDbRef { table: string; column: string; id: string }
export interface BackupFile { key: string; label: string; category: string; url: string; bucket: "next-storage" | "next-storage-private"; dbRef?: BackupFileDbRef }
