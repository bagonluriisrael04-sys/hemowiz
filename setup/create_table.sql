-- ============================================================
--  HemoWiz Supabase Table Setup
--  Run this once in the Supabase SQL Editor:
--  https://supabase.com/dashboard/project/ioqbwaufzczdyrhmgevy/sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hemowiz_records (
  id               TEXT         PRIMARY KEY,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  patient_name     TEXT,
  age              INTEGER,
  gender           TEXT,
  pregnancy_status TEXT,
  anemic_status    TEXT,
  height           NUMERIC,
  weight           NUMERIC,
  bmi              NUMERIC,
  bmi_category     TEXT,
  skin_type        TEXT,
  skin_desc        TEXT,
  reference_hb     NUMERIC,
  r                NUMERIC,
  p                NUMERIC,
  h                NUMERIC,
  hb_error         NUMERIC,
  raw_payload      TEXT,
  diagnosis_status   TEXT,
  diagnosis_severity TEXT,
  diagnosis_summary  TEXT
);

-- Enable Row Level Security
ALTER TABLE public.hemowiz_records ENABLE ROW LEVEL SECURITY;

-- Allow full public access (single-user research app, anon key is safe)
CREATE POLICY "Public full access"
  ON public.hemowiz_records
  FOR ALL
  USING (true)
  WITH CHECK (true);
