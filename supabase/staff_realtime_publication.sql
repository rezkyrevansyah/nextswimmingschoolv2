-- Adds staff_attendances and staff_leaves to the supabase_realtime
-- publication. Without this, a postgres_changes subscription on either
-- table compiles and looks correct but silently never fires — the app's
-- other realtime-subscribed tables (coach_attendances, member_attendances,
-- bills, notifications) were already in this publication; these two were
-- added later and never included.
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_leaves;
