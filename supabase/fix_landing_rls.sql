-- Fix RLS policies for landing tables
-- auth.role() = 'authenticated' is deprecated; replace with auth.uid() IS NOT NULL

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'landing_hero', 'landing_hero_stats', 'landing_whyus', 'landing_whyus_cards',
    'landing_testimonials', 'landing_faqs', 'landing_finalcta', 'landing_config', 'landing_nav_links'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth write" ON public.%I', t);
    EXECUTE format('CREATE POLICY "auth write" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL)', t);
  END LOOP;
END $$;

-- Ensure singleton seed rows exist
INSERT INTO public.landing_hero     (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.landing_whyus    (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.landing_finalcta (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.landing_config   (id) VALUES (1) ON CONFLICT DO NOTHING;
