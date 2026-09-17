export interface RegistrationRow {
  id: string; full_name: string; email: string | null; birth_date: string | null; gender: string | null;
  phone: string | null; phone_owner: string | null; parent_name: string | null;
  parent_phone: string | null; address: string | null; health_notes: string | null;
  status: string; created_at: string; branch_id?: string | null;
}

export interface CertRow {
  id: string; name: string; title: string | null; issuer: string | null; valid_from: string | null;
  valid_until: string | null; no_expiry: boolean; photo_url: string | null; status: string;
  profile?: { full_name: string } | null;
}
