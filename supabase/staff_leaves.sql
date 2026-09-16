-- Staff leave/approval workflow, mirroring coach_leaves/member_leaves: staff
-- submits an izin/sakit request, an owner reviews it, and only on approval
-- does it get reflected onto staff_attendances. Closes the gap where staff
-- previously self-attested izin/sakit directly onto staff_attendances with
-- zero review (unlike coach/member, which both already had a leave table).
--
-- type is a plain CHECK, not the shared leave_type enum: that enum carries
-- member-only values (ujian/lainnya) and has no 'cuti', while staff only
-- ever needs izin/sakit (matching the two self-attest buttons that existed
-- before this table). status reuses the existing leave_status enum as-is.
-- No staff_leave_classes junction — staff attendance is per-calendar-day,
-- there's no class concept to attach.
CREATE TABLE public.staff_leaves (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL,
  branch_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['izin'::text, 'sakit'::text])),
  reason text,
  date_from date NOT NULL,
  date_to date NOT NULL,
  status public.leave_status NOT NULL DEFAULT 'pending'::leave_status,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  reject_reason text,
  created_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_leaves_pkey PRIMARY KEY (id),
  CONSTRAINT staff_leaves_date_range_chk CHECK (date_to >= date_from),
  CONSTRAINT staff_leaves_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT staff_leaves_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT staff_leaves_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

CREATE INDEX staff_leaves_staff_id_idx ON public.staff_leaves (staff_id);
CREATE INDEX staff_leaves_status_idx ON public.staff_leaves (status);

-- Real RLS from day one (staff sees/inserts only their own rows; owner can
-- review/decide). Sibling leave tables (coach_leaves/member_leaves) have RLS
-- fully off today — deliberately not touched here, out of scope for this fix.
ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_leaves: staff select own" ON public.staff_leaves
  FOR SELECT TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "staff_leaves: staff insert own" ON public.staff_leaves
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid() AND status = 'pending');

CREATE POLICY "staff_leaves: owner all" ON public.staff_leaves
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));
