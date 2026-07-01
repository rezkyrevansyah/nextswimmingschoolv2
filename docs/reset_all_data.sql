-- ============================================================
-- RESET ALL DATA — Next Swimming School
-- Hapus semua data dari semua tabel (urutan child → parent)
-- Jalankan di Supabase SQL Editor
--
-- PERINGATAN: Script ini menghapus SEMUA data secara permanen.
-- Struktur tabel (schema, kolom, constraint) TIDAK dihapus.
-- Auth users (auth.users) TIDAK dihapus — hapus manual lewat
-- Supabase Dashboard > Authentication > Users jika perlu.
-- ============================================================

-- 1. Leaf tables (tidak ada yang FK-dependan)
DELETE FROM public.activity_logs;
DELETE FROM public.notifications;
DELETE FROM public.announcement_classes;
DELETE FROM public.announcements;
DELETE FROM public.class_programs;
DELETE FROM public.class_holidays;
DELETE FROM public.landing_hero_stats;
DELETE FROM public.landing_whyus_cards;
DELETE FROM public.landing_testimonials;
DELETE FROM public.landing_faqs;
DELETE FROM public.landing_nav_links;

-- 2. Best times & reviews
DELETE FROM public.member_best_times;
DELETE FROM public.member_reviews;

-- 3. Rapor
DELETE FROM public.rapor_entries;
DELETE FROM public.rapor_periods;

-- 4. Attendance
DELETE FROM public.member_attendances;
DELETE FROM public.coach_attendances;

-- 5. Leaves
DELETE FROM public.member_leave_classes;
DELETE FROM public.member_leaves;
DELETE FROM public.coach_leave_classes;
DELETE FROM public.coach_leaves;

-- 6. Bills & invoices
DELETE FROM public.bills;
DELETE FROM public.coach_invoice_items;
DELETE FROM public.coach_invoices;
DELETE FROM public.payslips;

-- 7. Registrations
DELETE FROM public.registrations;

-- 8. Member enrollment & classes
DELETE FROM public.member_classes;
DELETE FROM public.class_criteria;
DELETE FROM public.class_packages;
DELETE FROM public.class_coach_spreadsheets;
DELETE FROM public.class_coaches;
DELETE FROM public.coach_rates;
DELETE FROM public.classes;

-- 9. Members & certifications
DELETE FROM public.certifications;
DELETE FROM public.members;

-- 10. Schools
DELETE FROM public.schools;

-- 11. Coach branches
DELETE FROM public.coach_branches;

-- 12. Profiles (hapus setelah semua child sudah bersih)
DELETE FROM public.profiles;

-- 13. Branches (paling atas hierarki)
DELETE FROM public.branches;

-- 14. Landing singleton rows — reset ke default (bukan delete)
--     karena tabel ini pakai id = 1 check constraint
UPDATE public.landing_hero SET
  headline   = 'Belajar renang lebih aman, modern, dan profesional.',
  body_text  = 'Next Swimming School membantu anak hingga dewasa belajar renang dengan metode modern, coach bersertifikat, dan sistem digital yang memudahkan orang tua memantau setiap progres.',
  badge_text = 'Sistem digital terintegrasi — 5+ cabang aktif',
  bg_image_url = 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1800&q=80&auto=format&fit=crop',
  cta_primary_text = 'Konsultasi Sekarang',
  cta_primary_wa   = 'Halo, saya ingin tanya soal program & jadwal Next Swimming School.',
  cta_secondary_text = 'Daftar Online',
  feature_1_icon = 'shield', feature_1_text = 'Coach bersertifikat',
  feature_2_icon = 'chart',  feature_2_text = 'Progress monitoring',
  feature_3_icon = 'users',  feature_3_text = 'Rasio kelas kecil',
  feature_4_icon = 'qr',     feature_4_text = 'Sistem QR absensi',
  updated_at = now();

UPDATE public.landing_whyus SET
  section_label   = 'Mengapa Kami',
  headline        = 'Lima alasan keluarga mempercayakan kami.',
  body_text       = 'Bukan sekadar belajar renang — kami menghadirkan ekosistem yang mempermudah orang tua, coach, dan administrasi sekolah dalam satu sistem.',
  wa_button_text  = 'Hubungi Admin via WhatsApp',
  wa_message      = 'Halo, saya ingin tanya kelebihan & detail program di Next Swimming School.',
  featured_icon   = 'shield',
  featured_title  = 'Coach Profesional',
  featured_desc   = 'Setiap coach memiliki sertifikasi yang diverifikasi admin sebelum mengajar.',
  featured_stat1_label = 'Sertifikasi', featured_stat1_value = '100%',
  featured_stat2_label = 'Lifeguard ARC', featured_stat2_value = 'Aktif',
  updated_at = now();

UPDATE public.landing_finalcta SET
  headline        = 'Mulai perjalanan renangmu bersama Next Swimming School.',
  body_text       = 'Chat admin kami untuk konsultasi program yang paling sesuai dengan anak Anda atau diri sendiri.',
  cta_wa_text     = 'Chat admin sekarang',
  cta_wa_message  = 'Halo, saya tertarik untuk daftar di Next Swimming School.',
  cta_sec_text    = 'Lihat program',
  updated_at = now();

UPDATE public.landing_config SET
  footer_wa_number   = '082110009667',
  footer_tagline     = 'Sekolah renang modern dengan ekosistem digital terintegrasi. Cabang aktif di Jakarta Selatan, Bogor, dan Bandung.',
  floating_wa_message = 'Halo Admin Next Swimming School, saya ingin bertanya tentang program les renang. Bisa dibantu?',
  nav_cta_text       = 'Konsultasi Sekarang',
  nav_cta_message    = 'Halo Admin Next Swimming School, saya ingin konsultasi program renang.',
  updated_at = now();
