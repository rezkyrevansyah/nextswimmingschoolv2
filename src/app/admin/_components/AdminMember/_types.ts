// ── Private types (AdminMember only) ─────────────────────────────────────────

export interface MemberRow {
  id: string; profile_id: string; type: string; status: string;
  date_start: string; qr_code: string | null; school_id: string | null;
  school_grade: string | null;
  member_no: string | null;
  remaining_sessions: number | null; total_sessions: number | null;
  suspend_until?: string | null; suspend_reason?: string | null;
  profile?: {
    full_name: string; birth_date: string | null; phone: string | null;
    gender: string | null; address: string | null; health_notes: string | null;
    email: string | null; avatar_url: string | null;
  } | null;
  member_classes?: { class: { id: string; name: string } | null }[];
}

export interface ImportRow {
  nama_lengkap?: unknown;
  email?: unknown;
  password?: unknown;
  tipe_member?: unknown;
  tanggal_lahir?: unknown;
  jenis_kelamin?: unknown;
  no_hp?: unknown;
  alamat?: unknown;
  catatan_kesehatan?: unknown;
  jumlah_sesi?: unknown;
  harga_paket?: unknown;
  jadwal_hari?: unknown;
  jam_mulai?: unknown;
  jam_selesai?: unknown;
  coach_utama_hp?: unknown;
  coach_asisten_hp?: unknown;
  nama_kelas?: unknown;
  nama_sekolah?: unknown;
  kelas_sekolah?: unknown;
}

export type ImportRowStatus = "ok" | "warn" | "error";

export interface ValidatedRow {
  _rowNum: number;
  _status: ImportRowStatus;
  _errors: string[];
  _warnings: string[];
  // Normalised values
  full_name: string;
  email: string;
  password: string;
  member_type: "reguler" | "private" | "school_affiliate";
  birth_date?: string;
  gender?: string;
  phone?: string;
  address?: string;
  health_notes?: string;
  total_sessions?: number | null;
  class_id?: string | null;
  school_id?: string | null;
  school_grade?: string | null;
  // Private-only
  package_price?: number | null;
  schedule_days?: string[];
  time_start?: string;
  time_end?: string;
  head_coach_id?: string | null;
  assistant_coach_ids?: string[];
  // Display only
  nama_kelas_raw?: string;
  nama_sekolah_raw?: string;
}
