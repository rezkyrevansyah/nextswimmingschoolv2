-- ============================================================
-- HAPUS AUTH USERS — kecuali role 'owner'
-- Jalankan di Supabase SQL Editor
--
-- Script ini menghapus semua auth.users yang BUKAN owner.
-- Profile & data terkait harus sudah dihapus duluan
-- (jalankan reset_all_data.sql lebih dulu).
-- ============================================================

DELETE FROM auth.users
WHERE id != 'c69fe3b1-8411-4013-a0ce-885e70d2c6ee';
