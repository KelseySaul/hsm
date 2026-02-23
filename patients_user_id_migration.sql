-- ============================================================
-- Migration: Link patients table to Supabase Auth users
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add user_id column (nullable so existing records aren't broken)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- 3. (Optional) RLS policy so patients can only read their own record
-- Uncomment if you have RLS enabled on patients:
-- CREATE POLICY "patients_own_read" ON patients
--   FOR SELECT USING (auth.uid() = user_id);
