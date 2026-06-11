-- SUPABASE STANDARDIZED MIGRATION
-- Project: Health Assistant (Obibi)
-- Description: Standardized, scalable schema with Auth sync and automated inventory tracking.

-- 1. CLEANUP (Careful: This drops existing tables to apply the new standard)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.drug_interactions CASCADE;
DROP TABLE IF EXISTS public.compliance_logs CASCADE;
DROP TABLE IF EXISTS public.medication_schedules CASCADE;
DROP TABLE IF EXISTS public.medications CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;

-- 2. CUSTOM TYPES (Enums for data integrity)
DO $$ BEGIN
    CREATE TYPE public.medication_form AS ENUM ('tablet', 'capsule', 'liquid', 'injection', 'cream', 'drops', 'inhaler');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.medication_unit AS ENUM ('piece', 'ml', 'mg', 'drop', 'puff', 'teaspoon');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.compliance_status AS ENUM ('taken', 'skipped', 'missed', 'snoozed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES

-- Patients (Synced with Supabase Auth)
CREATE TABLE public.patients (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Medications (Merged Catalog & Inventory)
CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  side_effects text,
  
  -- Classification
  form public.medication_form NOT NULL,
  strength text, -- e.g., '500mg'
  
  -- Inventory (Numeric handles both Discrete and Continuous)
  current_stock numeric(10,2) DEFAULT 0.00 NOT NULL,
  stock_unit public.medication_unit NOT NULL,
  low_stock_threshold numeric(10,2),
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Medication Schedules
CREATE TABLE public.medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  
  scheduled_time time NOT NULL,
  dosage_quantity numeric(10,2) NOT NULL,
  dosage_unit public.medication_unit NOT NULL,
  
  start_date date DEFAULT CURRENT_DATE NOT NULL,
  end_date date,
  instructions text,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Compliance Logs
CREATE TABLE public.compliance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  status public.compliance_status NOT NULL,
  taken_at timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Chats
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Chat Messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role public.chat_role NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Drug Interactions
CREATE TABLE public.drug_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_pair text[] NOT NULL,
  risk_level text,
  finding_details text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. FUNCTIONS & TRIGGERS

-- Updated_at Auto-refresh
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_patients BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_medications BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_schedules BEFORE UPDATE ON public.medication_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_chats BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Supabase Auth Sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.patients (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Valued Patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. INDEXES (Scalability)
CREATE INDEX idx_medications_patient ON public.medications(patient_id);
CREATE INDEX idx_schedules_patient ON public.medication_schedules(patient_id);
CREATE INDEX idx_logs_patient_date ON public.compliance_logs(patient_id, created_at);
CREATE INDEX idx_chat_messages_chat ON public.chat_messages(chat_id);

-- 6. RLS POLICIES (Security)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Users can only see their own data
CREATE POLICY "Users can manage their own profile" ON public.patients FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their own medications" ON public.medications FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Users can manage their own schedules" ON public.medication_schedules FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Users can manage their own logs" ON public.compliance_logs FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Users can manage their own chats" ON public.chats FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Users can manage messages in their chats" ON public.chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND patient_id = auth.uid())
);
CREATE POLICY "Users can see their drug interactions" ON public.drug_interactions FOR ALL USING (auth.uid() = patient_id);
