export interface PrivateStudentRow {
  id: string; // student id
  profile_id: string;
  branch_id: string;
  branch: { name: string } | null;
  status: string;
  qr_code: string | null;
  student_no: string | null;
  remaining_sessions: number | null;
  total_sessions: number | null;
  profile: {
    full_name: string; email: string | null; phone: string | null; birth_date: string | null;
    gender: string | null; address: string | null; health_notes: string | null; avatar_url: string | null;
  } | null;
  class: {
    id: string; name: string; schedule_days: string[]; time_start: string | null; time_end: string | null;
    location_type: string | null; external_location_name: string | null; external_location_address: string | null;
    google_maps_url: string | null; custom_location_lat: number | null; custom_location_lng: number | null;
    class_coaches?: { coach_id: string; role: string; profile: { id: string; full_name: string } | null }[];
  } | null;
}

export const DAY_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const EMPTY_FORM = {
  full_name: "", email: "", password: "", phone: "", birth_date: "", gender: "",
  address: "", health_notes: "", jumlah_sesi: "", package_price: "",
  schedule_days: [] as string[], time_start: "", time_end: "",
  location_type: "branch", external_location_name: "", external_location_address: "", google_maps_url: "",
  external_lat: "", external_lng: "", target_branch_id: "",
};
