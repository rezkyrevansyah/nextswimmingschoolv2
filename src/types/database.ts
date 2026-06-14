export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcement_classes: {
        Row: {
          announcement_id: string
          class_id: string
        }
        Insert: {
          announcement_id: string
          class_id: string
        }
        Update: {
          announcement_id?: string
          class_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_classes_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          body: string
          branch_id: string
          created_at: string
          created_by: string
          id: string
          target_all: boolean
          target_roles: string[]
          title: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          body: string
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          target_all?: boolean
          target_roles?: string[]
          title: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          body?: string
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          target_all?: boolean
          target_roles?: string[]
          title?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          admin_notes: string | null
          amount: number
          branch_id: string
          class_id: string | null
          created_at: string
          discount: number
          discount_reason: string | null
          id: string
          member_id: string
          paid_at: string | null
          paid_method: string | null
          period_label: string
          proof_url: string | null
          sessions_total: number | null
          sessions_used: number
          status: Database["public"]["Enums"]["payment_status"]
          total: number | null
          type: Database["public"]["Enums"]["bill_type"]
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          branch_id: string
          class_id?: string | null
          created_at?: string
          discount?: number
          discount_reason?: string | null
          id?: string
          member_id: string
          paid_at?: string | null
          paid_method?: string | null
          period_label: string
          proof_url?: string | null
          sessions_total?: number | null
          sessions_used?: number
          status?: Database["public"]["Enums"]["payment_status"]
          total?: number | null
          type?: Database["public"]["Enums"]["bill_type"]
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          branch_id?: string
          class_id?: string | null
          created_at?: string
          discount?: number
          discount_reason?: string | null
          id?: string
          member_id?: string
          paid_at?: string | null
          paid_method?: string | null
          period_label?: string
          proof_url?: string | null
          sessions_total?: number | null
          sessions_used?: number
          status?: Database["public"]["Enums"]["payment_status"]
          total?: number | null
          type?: Database["public"]["Enums"]["bill_type"]
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_holder: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          phone: string | null
          status: string
          wa_numbers: string[]
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string
          wa_numbers?: string[]
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          wa_numbers?: string[]
        }
        Relationships: []
      }
      certifications: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          issuer: string | null
          name: string
          no_expiry: boolean
          photo_url: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["cert_status"]
          title: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          issuer?: string | null
          name: string
          no_expiry?: boolean
          photo_url?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          title?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          issuer?: string | null
          name?: string
          no_expiry?: boolean
          photo_url?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          title?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_branches: {
        Row: {
          id: string
          coach_id: string
          branch_id: string
          joined_at: string
          is_primary: boolean
        }
        Insert: {
          id?: string
          coach_id: string
          branch_id: string
          joined_at?: string
          is_primary?: boolean
        }
        Update: {
          id?: string
          coach_id?: string
          branch_id?: string
          joined_at?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "coach_branches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      class_coaches: {
        Row: {
          class_id: string
          coach_id: string
          created_at: string
          is_primary: boolean
        }
        Insert: {
          class_id: string
          coach_id: string
          created_at?: string
          is_primary?: boolean
        }
        Update: {
          class_id?: string
          coach_id?: string
          created_at?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "class_coaches_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_coaches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_criteria: {
        Row: {
          class_id: string
          created_at: string
          id: string
          kind: string
          label: string
          options: string[] | null
          sort_order: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          kind: string
          label: string
          options?: string[] | null
          sort_order?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string
          options?: string[] | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_criteria_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_holidays: {
        Row: {
          branch_id: string
          class_id: string
          created_at: string
          created_by: string | null
          holiday_date: string
          id: string
          reason: string | null
        }
        Insert: {
          branch_id: string
          class_id: string
          created_at?: string
          created_by?: string | null
          holiday_date: string
          id?: string
          reason?: string | null
        }
        Update: {
          branch_id?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          holiday_date?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_holidays_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_coach_spreadsheets: {
        Row: {
          id: string
          class_id: string
          coach_id: string
          spreadsheet_url: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          coach_id: string
          spreadsheet_url: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          coach_id?: string
          spreadsheet_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_coach_spreadsheets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_coach_spreadsheets_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_programs: {
        Row: {
          class_id: string
          coach_id: string
          created_at: string
          description: string | null
          id: string
          month: string
          topic: string
          updated_at: string
          week: number
        }
        Insert: {
          class_id: string
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          month: string
          topic: string
          updated_at?: string
          week: number
        }
        Update: {
          class_id?: string
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          month?: string
          topic?: string
          updated_at?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_programs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          age_max: number | null
          age_min: number | null
          branch_id: string
          capacity: number
          class_type: string
          created_at: string
          description: string | null
          enrolled: number
          goal: string | null
          goals: string | null
          id: string
          location_name: string | null
          name: string
          photo_url: string | null
          price_monthly: number
          price_per_session: number | null
          schedule_days: string[]
          schedule_time: string | null
          schedule_times: Json | null
          sessions_per_month: number
          sessions_per_week: number
          show_on_landing: boolean
          spreadsheet_filled: boolean
          spreadsheet_url: string | null
          status: string
          time_end: string
          time_start: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          branch_id: string
          capacity?: number
          class_type?: string
          created_at?: string
          description?: string | null
          enrolled?: number
          goal?: string | null
          goals?: string | null
          id?: string
          location_name?: string | null
          name: string
          photo_url?: string | null
          price_monthly?: number
          price_per_session?: number | null
          schedule_days?: string[]
          schedule_time?: string | null
          schedule_times?: Json | null
          sessions_per_month?: number
          sessions_per_week?: number
          show_on_landing?: boolean
          spreadsheet_filled?: boolean
          spreadsheet_url?: string | null
          status?: string
          time_end: string
          time_start: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          branch_id?: string
          capacity?: number
          class_type?: string
          created_at?: string
          description?: string | null
          enrolled?: number
          goal?: string | null
          goals?: string | null
          id?: string
          location_name?: string | null
          name?: string
          photo_url?: string | null
          price_monthly?: number
          price_per_session?: number | null
          schedule_days?: string[]
          schedule_time?: string | null
          schedule_times?: Json | null
          sessions_per_month?: number
          sessions_per_week?: number
          show_on_landing?: boolean
          spreadsheet_filled?: boolean
          spreadsheet_url?: string | null
          status?: string
          time_end?: string
          time_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_attendances: {
        Row: {
          branch_id: string
          class_id: string
          clock_in_at: string
          clock_in_time: string | null
          coach_id: string
          created_at: string
          distance_meters: number | null
          id: string
          invoice_id: string | null
          is_manual: boolean
          manual_by: string | null
          manual_note: string | null
          manual_reason: string | null
          selfie_url: string | null
          session_date: string
          status: "present" | "absent" | "late"
        }
        Insert: {
          branch_id: string
          class_id: string
          clock_in_at?: string
          clock_in_time?: string | null
          coach_id: string
          created_at?: string
          distance_meters?: number | null
          id?: string
          invoice_id?: string | null
          is_manual?: boolean
          manual_by?: string | null
          manual_note?: string | null
          manual_reason?: string | null
          selfie_url?: string | null
          session_date: string
          status?: "present" | "absent" | "late"
        }
        Update: {
          branch_id?: string
          class_id?: string
          clock_in_at?: string
          clock_in_time?: string | null
          coach_id?: string
          created_at?: string
          distance_meters?: number | null
          id?: string
          invoice_id?: string | null
          is_manual?: boolean
          manual_by?: string | null
          manual_note?: string | null
          manual_reason?: string | null
          selfie_url?: string | null
          session_date?: string
          status?: "present" | "absent" | "late"
        }
        Relationships: [
          {
            foreignKeyName: "coach_attendances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_attendances_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_attendances_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_attendances_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "coach_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_attendances_manual_by_fkey"
            columns: ["manual_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invoice_items: {
        Row: {
          attendance_id: string | null
          class_id: string
          id: string
          invoice_id: string
          rate: number
          session_count: number
          subtotal: number | null
        }
        Insert: {
          attendance_id?: string | null
          class_id: string
          id?: string
          invoice_id: string
          rate: number
          session_count: number
          subtotal?: number | null
        }
        Update: {
          attendance_id?: string | null
          class_id?: string
          id?: string
          invoice_id?: string
          rate?: number
          session_count?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_invoice_items_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "coach_attendances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invoice_items_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "coach_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invoices: {
        Row: {
          bank_info: string | null
          branch_id: string
          coach_id: string
          created_at: string
          id: string
          invoice_number: string | null
          paid_at: string | null
          pdf_url: string | null
          period_label: string
          status: Database["public"]["Enums"]["invoice_status"]
          submitted_at: string
          total_amount: number
        }
        Insert: {
          bank_info?: string | null
          branch_id: string
          coach_id: string
          created_at?: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          period_label: string
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string
          total_amount: number
        }
        Update: {
          bank_info?: string | null
          branch_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          period_label?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invoices_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_leave_classes: {
        Row: {
          class_id: string
          leave_id: string
          substitute_id: string | null
        }
        Insert: {
          class_id: string
          leave_id: string
          substitute_id?: string | null
        }
        Update: {
          class_id?: string
          leave_id?: string
          substitute_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_leave_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_leave_classes_leave_id_fkey"
            columns: ["leave_id"]
            isOneToOne: false
            referencedRelation: "coach_leaves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_leave_classes_substitute_id_fkey"
            columns: ["substitute_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_leaves: {
        Row: {
          branch_id: string | null
          coach_id: string
          created_at: string
          created_by_admin: boolean
          date_from: string
          date_to: string
          id: string
          reason: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["leave_status"]
          substitute_id: string | null
          type: Database["public"]["Enums"]["leave_type"]
        }
        Insert: {
          branch_id?: string | null
          coach_id: string
          created_at?: string
          created_by_admin?: boolean
          date_from: string
          date_to: string
          id?: string
          reason?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          substitute_id?: string | null
          type: Database["public"]["Enums"]["leave_type"]
        }
        Update: {
          branch_id?: string | null
          coach_id?: string
          created_at?: string
          created_by_admin?: boolean
          date_from?: string
          date_to?: string
          id?: string
          reason?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          substitute_id?: string | null
          type?: Database["public"]["Enums"]["leave_type"]
        }
        Relationships: [
          {
            foreignKeyName: "coach_leaves_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_leaves_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_leaves_substitute_id_fkey"
            columns: ["substitute_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_rates: {
        Row: {
          class_id: string
          coach_id: string | null
          created_at: string
          id: string
          rate: number
          rate_per_session: number | null
          set_by: string | null
        }
        Insert: {
          class_id: string
          coach_id?: string | null
          created_at?: string
          id?: string
          rate: number
          rate_per_session?: number | null
          set_by?: string | null
        }
        Update: {
          class_id?: string
          coach_id?: string | null
          created_at?: string
          id?: string
          rate?: number
          rate_per_session?: number | null
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_rates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_rates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_config: {
        Row: {
          floating_wa_message: string
          footer_tagline: string
          footer_wa_number: string
          id: number
          nav_cta_message: string
          nav_cta_text: string
          updated_at: string
        }
        Insert: {
          floating_wa_message?: string
          footer_tagline?: string
          footer_wa_number?: string
          id?: number
          nav_cta_message?: string
          nav_cta_text?: string
          updated_at?: string
        }
        Update: {
          floating_wa_message?: string
          footer_tagline?: string
          footer_wa_number?: string
          id?: number
          nav_cta_message?: string
          nav_cta_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_faqs: {
        Row: {
          answer: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_finalcta: {
        Row: {
          body_text: string
          cta_sec_text: string
          cta_wa_message: string
          cta_wa_text: string
          headline: string
          id: number
          updated_at: string
        }
        Insert: {
          body_text?: string
          cta_sec_text?: string
          cta_wa_message?: string
          cta_wa_text?: string
          headline?: string
          id?: number
          updated_at?: string
        }
        Update: {
          body_text?: string
          cta_sec_text?: string
          cta_wa_message?: string
          cta_wa_text?: string
          headline?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_hero: {
        Row: {
          badge_text: string
          bg_image_url: string
          body_text: string
          cta_primary_text: string
          cta_primary_wa: string
          cta_secondary_text: string
          feature_1_icon: string
          feature_1_text: string
          feature_2_icon: string
          feature_2_text: string
          feature_3_icon: string
          feature_3_text: string
          feature_4_icon: string
          feature_4_text: string
          headline: string
          id: number
          updated_at: string
        }
        Insert: {
          badge_text?: string
          bg_image_url?: string
          body_text?: string
          cta_primary_text?: string
          cta_primary_wa?: string
          cta_secondary_text?: string
          feature_1_icon?: string
          feature_1_text?: string
          feature_2_icon?: string
          feature_2_text?: string
          feature_3_icon?: string
          feature_3_text?: string
          feature_4_icon?: string
          feature_4_text?: string
          headline?: string
          id?: number
          updated_at?: string
        }
        Update: {
          badge_text?: string
          bg_image_url?: string
          body_text?: string
          cta_primary_text?: string
          cta_primary_wa?: string
          cta_secondary_text?: string
          feature_1_icon?: string
          feature_1_text?: string
          feature_2_icon?: string
          feature_2_text?: string
          feature_3_icon?: string
          feature_3_text?: string
          feature_4_icon?: string
          feature_4_text?: string
          headline?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_hero_stats: {
        Row: {
          icon: string
          id: string
          label: string
          sort_order: number
          sub: string
          suffix: string
          updated_at: string
          value: string
        }
        Insert: {
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          sub?: string
          suffix?: string
          updated_at?: string
          value?: string
        }
        Update: {
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          sub?: string
          suffix?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      landing_nav_links: {
        Row: {
          href: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          href?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          href?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_testimonials: {
        Row: {
          avatar_url: string | null
          body_text: string
          id: string
          name: string
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          body_text?: string
          id?: string
          name?: string
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          body_text?: string
          id?: string
          name?: string
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_whyus: {
        Row: {
          body_text: string
          featured_desc: string
          featured_icon: string
          featured_stat1_label: string
          featured_stat1_value: string
          featured_stat2_label: string
          featured_stat2_value: string
          featured_title: string
          headline: string
          id: number
          section_label: string
          updated_at: string
          wa_button_text: string
          wa_message: string
        }
        Insert: {
          body_text?: string
          featured_desc?: string
          featured_icon?: string
          featured_stat1_label?: string
          featured_stat1_value?: string
          featured_stat2_label?: string
          featured_stat2_value?: string
          featured_title?: string
          headline?: string
          id?: number
          section_label?: string
          updated_at?: string
          wa_button_text?: string
          wa_message?: string
        }
        Update: {
          body_text?: string
          featured_desc?: string
          featured_icon?: string
          featured_stat1_label?: string
          featured_stat1_value?: string
          featured_stat2_label?: string
          featured_stat2_value?: string
          featured_title?: string
          headline?: string
          id?: number
          section_label?: string
          updated_at?: string
          wa_button_text?: string
          wa_message?: string
        }
        Relationships: []
      }
      landing_whyus_cards: {
        Row: {
          description: string
          icon: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          icon?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_attendances: {
        Row: {
          class_id: string
          created_at: string
          id: string
          marked_by: string | null
          member_id: string
          method: Database["public"]["Enums"]["attendance_method"] | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          marked_by?: string | null
          member_id: string
          method?: Database["public"]["Enums"]["attendance_method"] | null
          session_date: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          member_id?: string
          method?: Database["public"]["Enums"]["attendance_method"] | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "member_attendances_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_attendances_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_classes: {
        Row: {
          class_id: string
          joined_at: string
          member_id: string
        }
        Insert: {
          class_id: string
          joined_at?: string
          member_id: string
        }
        Update: {
          class_id?: string
          joined_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_classes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_classes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_leave_classes: {
        Row: {
          class_id: string
          leave_id: string
        }
        Insert: {
          class_id: string
          leave_id: string
        }
        Update: {
          class_id?: string
          leave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_leave_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_leave_classes_leave_id_fkey"
            columns: ["leave_id"]
            isOneToOne: false
            referencedRelation: "member_leaves"
            referencedColumns: ["id"]
          },
        ]
      }
      member_leaves: {
        Row: {
          created_at: string
          created_by_admin: boolean
          date_from: string
          date_to: string
          id: string
          member_id: string
          reason: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["leave_status"]
          type: Database["public"]["Enums"]["leave_type"]
        }
        Insert: {
          created_at?: string
          created_by_admin?: boolean
          date_from: string
          date_to: string
          id?: string
          member_id: string
          reason?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          type: Database["public"]["Enums"]["leave_type"]
        }
        Update: {
          created_at?: string
          created_by_admin?: boolean
          date_from?: string
          date_to?: string
          id?: string
          member_id?: string
          reason?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          type?: Database["public"]["Enums"]["leave_type"]
        }
        Relationships: [
          {
            foreignKeyName: "member_leaves_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_leaves_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_leaves_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_reviews: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          member_id: string
          message: string | null
          rapor_id: string
          stars: number
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          member_id: string
          message?: string | null
          rapor_id: string
          stars: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          member_id?: string
          message?: string | null
          rapor_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_reviews_rapor_id_fkey"
            columns: ["rapor_id"]
            isOneToOne: false
            referencedRelation: "rapor_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          admin_notes: string | null
          branch_id: string
          created_at: string
          date_start: string
          id: string
          pay_status: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          qr_code: string
          remaining_sessions: number | null
          school_id: string | null
          status: Database["public"]["Enums"]["member_status"]
          suspend_reason: string | null
          suspend_until: string | null
          total_sessions: number | null
          type: Database["public"]["Enums"]["member_type"]
        }
        Insert: {
          admin_notes?: string | null
          branch_id: string
          created_at?: string
          date_start?: string
          id?: string
          pay_status?: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          qr_code?: string
          remaining_sessions?: number | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          suspend_reason?: string | null
          suspend_until?: string | null
          total_sessions?: number | null
          type?: Database["public"]["Enums"]["member_type"]
        }
        Update: {
          admin_notes?: string | null
          branch_id?: string
          created_at?: string
          date_start?: string
          id?: string
          pay_status?: Database["public"]["Enums"]["payment_status"]
          profile_id?: string
          qr_code?: string
          remaining_sessions?: number | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          suspend_reason?: string | null
          suspend_until?: string | null
          total_sessions?: number | null
          type?: Database["public"]["Enums"]["member_type"]
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          icon: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          icon?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          icon?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_holder: string | null
          bank_name: string | null
          bio: string | null
          birth_date: string | null
          branch_id: string | null
          created_at: string
          education_institution: string | null
          education_level: string | null
          email: string | null
          full_name: string
          gender: string | null
          health_notes: string | null
          id: string
          is_archived: boolean
          is_profile_complete: boolean
          nick_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          show_on_landing: boolean
          specialization: string | null
          suspend_reason: string | null
          suspend_until: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          bio?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          education_institution?: string | null
          education_level?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          health_notes?: string | null
          id: string
          is_archived?: boolean
          is_profile_complete?: boolean
          nick_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          show_on_landing?: boolean
          specialization?: string | null
          suspend_reason?: string | null
          suspend_until?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          bio?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          education_institution?: string | null
          education_level?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          health_notes?: string | null
          id?: string
          is_archived?: boolean
          is_profile_complete?: boolean
          nick_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          show_on_landing?: boolean
          specialization?: string | null
          suspend_reason?: string | null
          suspend_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      rapor_entries: {
        Row: {
          class_id: string
          coach_id: string
          created_at: string
          filled_at: string | null
          id: string
          locked: boolean
          member_id: string
          notes: string | null
          period_id: string
          scores: Json
        }
        Insert: {
          class_id: string
          coach_id: string
          created_at?: string
          filled_at?: string | null
          id?: string
          locked?: boolean
          member_id: string
          notes?: string | null
          period_id: string
          scores?: Json
        }
        Update: {
          class_id?: string
          coach_id?: string
          created_at?: string
          filled_at?: string | null
          id?: string
          locked?: boolean
          member_id?: string
          notes?: string | null
          period_id?: string
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rapor_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapor_entries_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapor_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapor_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapor_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "rapor_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      rapor_periods: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          date_from: string
          date_to: string
          id: string
          is_open: boolean
          label: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          date_from: string
          date_to: string
          id?: string
          is_open?: boolean
          label: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          date_from?: string
          date_to?: string
          id?: string
          is_open?: boolean
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapor_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapor_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          address: string | null
          birth_date: string | null
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          health_notes: string | null
          id: string
          member_id: string | null
          parent_name: string | null
          parent_phone: string | null
          phone: string | null
          phone_owner: string | null
          proof_url: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          health_notes?: string | null
          id?: string
          member_id?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          phone_owner?: string | null
          proof_url?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          health_notes?: string | null
          id?: string
          member_id?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          phone_owner?: string | null
          proof_url?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          branch_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          pic_name: string | null
          pic_phone: string | null
          profile_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          pic_name?: string | null
          pic_phone?: string | null
          profile_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          pic_name?: string | null
          pic_phone?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_profiles: {
        Row: {
          address: string | null
          admin_notes: string | null
          avatar_url: string | null
          birth_date: string | null
          branch_id: string | null
          created_at: string | null
          date_start: string | null
          full_name: string | null
          gender: string | null
          health_notes: string | null
          id: string | null
          nick_name: string | null
          parent_name: string | null
          parent_phone: string | null
          pay_status: Database["public"]["Enums"]["payment_status"] | null
          phone: string | null
          profile_id: string | null
          qr_code: string | null
          remaining_sessions: number | null
          school_id: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          total_sessions: number | null
          type: Database["public"]["Enums"]["member_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_branch_id: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      attendance_method: "selfie" | "qr" | "manual"
      attendance_status: "hadir" | "izin" | "sakit" | "tidak_hadir" | "telat"
      bill_type: "monthly" | "package" | "custom" | "session_pack"
      cert_status: "pending" | "approved" | "rejected"
      coach_status: "active" | "suspended" | "archived"
      invoice_status: "pending" | "paid"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "izin" | "sakit" | "ujian" | "lainnya"
      member_status: "active" | "suspended" | "archived"
      member_type: "reguler" | "private" | "school_affiliate"
      payment_status: "unpaid" | "partial" | "paid" | "free" | "school_covered"
      user_role: "owner" | "admin" | "coach" | "member" | "school"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_method: ["selfie", "qr", "manual"],
      attendance_status: ["hadir", "izin", "sakit", "tidak_hadir", "telat"],
      bill_type: ["monthly", "package", "custom", "session_pack"],
      cert_status: ["pending", "approved", "rejected"],
      coach_status: ["active", "suspended", "archived"],
      invoice_status: ["pending", "paid"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["izin", "sakit", "ujian", "lainnya"],
      member_status: ["active", "suspended", "archived"],
      member_type: ["reguler", "private", "school_affiliate"],
      payment_status: ["unpaid", "partial", "paid", "free", "school_covered"],
      user_role: ["owner", "admin", "coach", "member", "school"],
    },
  },
} as const
