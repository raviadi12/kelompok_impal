-- SAFE STANDARDIZATION MIGRATION (Non-Destructive)
-- Project: Health Assistant (Obibi)
-- Purpose: Standardize existing tables, add classifications, and backfill auth users without data loss.

-- 1. BACKFILL PATIENTS FROM AUTH.USERS
-- Ensures any users who signed up before the trigger was added are present in the public table.
INSERT INTO public.patients (id, email, name)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'Valued Patient')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.patients)
ON CONFLICT (id) DO NOTHING;

-- 2. ENHANCE 'obat' TABLE (Merging Ownership & Classification)
-- Adding columns to handle user-specific medicines and stock levels.
ALTER TABLE public.obat 
ADD COLUMN IF NOT EXISTS pasien_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS stock_quantity numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_unit text DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 3. MIGRATE DATA FROM kepemilikan_obat TO obat
-- This preserves the existing relationship data into the merged table structure.
UPDATE public.obat o
SET 
  pasien_id = k.pasien_id,
  stock_quantity = k.stok_obat,
  is_active = k.status_aktif
FROM public.kepemilikan_obat k
WHERE o.obat_id = k.obat_id
AND o.pasien_id IS NULL; -- Only update if not already set

-- 4. STANDARDIZE TRIGGER FUNCTIONS
-- Creating a unified function for handling 'updated_at' timestamps.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply automated updates to existing tables
DROP TRIGGER IF EXISTS set_updated_at_obat ON public.obat;
CREATE TRIGGER set_updated_at_obat BEFORE UPDATE ON public.obat FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_jadwal ON public.jadwal_obat;
CREATE TRIGGER set_updated_at_jadwal BEFORE UPDATE ON public.jadwal_obat FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. DATA INTEGRITY CONSTRAINTS
-- Classification of medicine forms (Liquid/Discrete)
-- We check for Indonesian terms to match your existing 'bentuk_obat' column
ALTER TABLE public.obat 
DROP CONSTRAINT IF EXISTS check_bentuk_obat;

ALTER TABLE public.obat 
ADD CONSTRAINT check_bentuk_obat 
CHECK (bentuk_obat IN ('tablet', 'kapsul', 'sirup', 'tetes', 'salep', 'injeksi', 'cair'));

-- 6. INDEXING FOR SCALABILITY
CREATE INDEX IF NOT EXISTS idx_obat_pasien ON public.obat(pasien_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_pasien ON public.jadwal_obat(pasien_id);
CREATE INDEX IF NOT EXISTS idx_laporan_pasien ON public.laporan_kepatuhan(pasien_id);

-- 7. NOTIFY (Optional Comment)
-- Note: 'public.kepemilikan_obat' can now be considered deprecated. 
-- Do not drop it until you have updated your frontend API calls to use public.obat.pasien_id directly.
