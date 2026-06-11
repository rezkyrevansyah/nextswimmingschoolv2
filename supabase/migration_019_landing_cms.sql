-- ============================================================
-- Migration 019: CMS untuk Landing Page
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Patch profiles: flag coach show on landing ────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT false;

-- ── Hero section (singleton, id = 1) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_hero (
  id               integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  headline         text    NOT NULL DEFAULT 'Belajar renang lebih aman, modern, dan profesional.',
  body_text        text    NOT NULL DEFAULT 'Next Swimming School membantu anak hingga dewasa belajar renang dengan metode modern, coach bersertifikat, dan sistem digital yang memudahkan orang tua memantau setiap progres.',
  badge_text       text    NOT NULL DEFAULT 'Sistem digital terintegrasi — 5+ cabang aktif',
  bg_image_url     text    NOT NULL DEFAULT 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1800&q=80&auto=format&fit=crop',
  cta_primary_text text    NOT NULL DEFAULT 'Konsultasi Sekarang',
  cta_primary_wa   text    NOT NULL DEFAULT 'Halo, saya ingin tanya soal program & jadwal Next Swimming School.',
  cta_secondary_text text  NOT NULL DEFAULT 'Daftar Online',
  feature_1_icon   text    NOT NULL DEFAULT 'shield',
  feature_1_text   text    NOT NULL DEFAULT 'Coach bersertifikat',
  feature_2_icon   text    NOT NULL DEFAULT 'chart',
  feature_2_text   text    NOT NULL DEFAULT 'Progress monitoring',
  feature_3_icon   text    NOT NULL DEFAULT 'users',
  feature_3_text   text    NOT NULL DEFAULT 'Rasio kelas kecil',
  feature_4_icon   text    NOT NULL DEFAULT 'qr',
  feature_4_text   text    NOT NULL DEFAULT 'Sistem QR absensi',
  updated_at       timestamp with time zone NOT NULL DEFAULT now()
);

-- Stat cards (4 rows, sort_order 1–4)
CREATE TABLE IF NOT EXISTS public.landing_hero_stats (
  id         uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  value      text    NOT NULL DEFAULT '0',
  suffix     text    NOT NULL DEFAULT '',
  label      text    NOT NULL DEFAULT '',
  sub        text    NOT NULL DEFAULT '',
  icon       text    NOT NULL DEFAULT 'star',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── WhyUs section (singleton, id = 1) ────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_whyus (
  id                   integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  section_label        text NOT NULL DEFAULT 'Mengapa Kami',
  headline             text NOT NULL DEFAULT 'Lima alasan keluarga mempercayakan kami.',
  body_text            text NOT NULL DEFAULT 'Bukan sekadar belajar renang — kami menghadirkan ekosistem yang mempermudah orang tua, coach, dan administrasi sekolah dalam satu sistem.',
  wa_button_text       text NOT NULL DEFAULT 'Hubungi Admin via WhatsApp',
  wa_message           text NOT NULL DEFAULT 'Halo, saya ingin tanya kelebihan & detail program di Next Swimming School.',
  featured_icon        text NOT NULL DEFAULT 'shield',
  featured_title       text NOT NULL DEFAULT 'Coach Profesional',
  featured_desc        text NOT NULL DEFAULT 'Setiap coach memiliki sertifikasi yang diverifikasi admin sebelum mengajar.',
  featured_stat1_label text NOT NULL DEFAULT 'Sertifikasi',
  featured_stat1_value text NOT NULL DEFAULT '100%',
  featured_stat2_label text NOT NULL DEFAULT 'Lifeguard ARC',
  featured_stat2_value text NOT NULL DEFAULT 'Aktif',
  updated_at           timestamp with time zone NOT NULL DEFAULT now()
);

-- Regular feature cards (4 rows)
CREATE TABLE IF NOT EXISTS public.landing_whyus_cards (
  id          uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  sort_order  integer NOT NULL DEFAULT 0,
  icon        text    NOT NULL DEFAULT 'chart',
  title       text    NOT NULL DEFAULT '',
  description text    NOT NULL DEFAULT '',
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

-- ── Testimonials ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_testimonials (
  id         uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  name       text    NOT NULL DEFAULT '',
  role       text    NOT NULL DEFAULT '',
  body_text  text    NOT NULL DEFAULT '',
  avatar_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── FAQ ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_faqs (
  id         uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  question   text    NOT NULL DEFAULT '',
  answer     text    NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── FinalCTA section (singleton, id = 1) ─────────────────────
CREATE TABLE IF NOT EXISTS public.landing_finalcta (
  id              integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  headline        text NOT NULL DEFAULT 'Mulai perjalanan renangmu bersama Next Swimming School.',
  body_text       text NOT NULL DEFAULT 'Chat admin kami untuk konsultasi program yang paling sesuai dengan anak Anda atau diri sendiri.',
  cta_wa_text     text NOT NULL DEFAULT 'Chat admin sekarang',
  cta_wa_message  text NOT NULL DEFAULT 'Halo, saya tertarik untuk daftar di Next Swimming School.',
  cta_sec_text    text NOT NULL DEFAULT 'Lihat program',
  updated_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- ── Global landing config (singleton, id = 1) ─────────────────
CREATE TABLE IF NOT EXISTS public.landing_config (
  id                  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  footer_wa_number    text NOT NULL DEFAULT '082110009667',
  footer_tagline      text NOT NULL DEFAULT 'Sekolah renang modern dengan ekosistem digital terintegrasi. Cabang aktif di Jakarta Selatan, Bogor, dan Bandung.',
  floating_wa_message text NOT NULL DEFAULT 'Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?',
  nav_cta_text        text NOT NULL DEFAULT 'Konsultasi Sekarang',
  nav_cta_message     text NOT NULL DEFAULT 'Halo Admin Next Swimming School, saya ingin konsultasi program renang.',
  updated_at          timestamp with time zone NOT NULL DEFAULT now()
);

-- Nav links
CREATE TABLE IF NOT EXISTS public.landing_nav_links (
  id         uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  sort_order integer NOT NULL DEFAULT 0,
  label      text    NOT NULL DEFAULT '',
  href       text    NOT NULL DEFAULT '#',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.landing_hero          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_hero_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_whyus         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_whyus_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_testimonials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_faqs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_finalcta      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_nav_links     ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "public read" ON public.landing_hero          FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_hero_stats    FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_whyus         FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_whyus_cards   FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_testimonials  FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_faqs          FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_finalcta      FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_config        FOR SELECT USING (true);
CREATE POLICY "public read" ON public.landing_nav_links     FOR SELECT USING (true);

-- Authenticated write
CREATE POLICY "auth write" ON public.landing_hero          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_hero_stats    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_whyus         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_whyus_cards   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_testimonials  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_faqs          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_finalcta      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_config        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth write" ON public.landing_nav_links     FOR ALL USING (auth.role() = 'authenticated');

-- ── Seed singleton rows ───────────────────────────────────────
INSERT INTO public.landing_hero     (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.landing_whyus    (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.landing_finalcta (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.landing_config   (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── Seed hero stats ───────────────────────────────────────────
INSERT INTO public.landing_hero_stats (sort_order, value, suffix, label, sub, icon) VALUES
  (1, '5',   '+', 'Cabang aktif',        'Jakarta, Bogor, Bandung',  'map'),
  (2, '500', '+', 'Member terdaftar',    'Anak hingga dewasa',        'users'),
  (3, '30',  '+', 'Coach bersertifikat', 'Tersertifikasi resmi',      'shield'),
  (4, '20',  '+', 'Program & kelas',     'Berbagai level kemampuan',  'book')
ON CONFLICT DO NOTHING;

-- ── Seed whyus cards ─────────────────────────────────────────
INSERT INTO public.landing_whyus_cards (sort_order, icon, title, description) VALUES
  (1, 'chart',    'Progress Monitoring',   'Rapor digital per semester dengan aspek penilaian yang disesuaikan per kelas.'),
  (2, 'qr',       'Sistem Digital Modern', 'QR absensi, notifikasi real-time, dan dashboard untuk orang tua.'),
  (3, 'calendar', 'Jadwal Fleksibel',      'Kelas reguler, private, hingga afiliasi sekolah — pilih yang paling cocok.'),
  (4, 'target',   'Kelas Nyaman & Aman',   'Rasio coach-member kecil, kolam diawasi, dan SOP keamanan yang ketat.')
ON CONFLICT DO NOTHING;

-- ── Seed testimonials ─────────────────────────────────────────
INSERT INTO public.landing_testimonials (sort_order, name, role, body_text, avatar_url) VALUES
  (1, 'Ibu Maya Wijaya', 'Ibu dari Calista (7 thn)',
   'Anak saya yang awalnya takut air, sekarang antusias banget tiap mau latihan. Coach-nya sabar dan metodenya bagus banget untuk anak-anak.',
   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
  (2, 'Bpk. Andika Pratama', 'Ayah dari Rizvan (10 thn)',
   'Sistem digitalnya keren — bisa pantau absensi anak lewat HP. Invoice tagihan juga langsung masuk notifikasi. Sangat memudahkan orang tua.',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'),
  (3, 'Reza Mahendra', 'Member Dewasa',
   'Sudah 6 bulan ikut kelas privat dan progres renang saya pesat banget. Rapor digitalnya membantu saya tahu area mana yang perlu ditingkatkan.',
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

-- ── Seed FAQs ─────────────────────────────────────────────────
INSERT INTO public.landing_faqs (sort_order, question, answer) VALUES
  (1, 'Mulai usia berapa anak bisa ikut?', 'Mulai 4 tahun sudah bisa bergabung kelas Starter kami yang dirancang khusus untuk anak-anak yang baru mengenal air.'),
  (2, 'Bagaimana sistem pembayarannya?', 'Member reguler membayar tagihan bulanan. Kami juga menyediakan kelas private dengan tarif per sesi. Semua transaksi tercatat di sistem digital kami.'),
  (3, 'Apakah ada uji coba gratis?', 'Kami menyediakan sesi konsultasi & orientasi gratis. Hubungi admin kami via WhatsApp untuk jadwalkan kunjungan kolam.'),
  (4, 'Berapa rasio coach ke murid?', 'Maksimal 8 murid per coach di kelas reguler, dan 1:1 untuk kelas privat. Kami menjaga rasio kecil agar setiap anak mendapat perhatian penuh.'),
  (5, 'Apakah ada program untuk sekolah?', 'Ya! Kami bermitra dengan sekolah melalui program afiliasi. Murid sekolah mitra mendapat akses kelas dengan tarif khusus.'),
  (6, 'Bagaimana memantau progres anak?', 'Setiap semester orang tua menerima rapor digital berisi penilaian teknik, kehadiran, dan catatan coach. Semua bisa diakses lewat portal member.'),
  (7, 'Bagaimana jika ingin ganti jadwal atau izin?', 'Pengajuan izin dan pergantian jadwal bisa dilakukan melalui aplikasi member kami, minimal 24 jam sebelum sesi.')
ON CONFLICT DO NOTHING;

-- ── Seed nav links ────────────────────────────────────────────
INSERT INTO public.landing_nav_links (sort_order, label, href) VALUES
  (1, 'Beranda',      '#home'),
  (2, 'Mengapa Kami', '#why'),
  (3, 'Program',      '#program'),
  (4, 'Coach',        '#coach'),
  (5, 'FAQ',          '#faq')
ON CONFLICT DO NOTHING;
