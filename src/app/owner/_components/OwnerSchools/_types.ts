export interface School {
  id: string;
  name: string;
  logo_url: string | null;
  branch_id: string;
  branch?: { name: string } | null;
  show_coach_sig?: boolean;
  show_head_sig?: boolean;
  show_school_sig?: boolean;
  coach_sig_title?: string;
  head_sig_title?: string;
}

export interface SchoolSignature {
  id: string;
  school_id: string;
  name: string;
  title: string;
  image_url: string;
  is_active: boolean;
}
