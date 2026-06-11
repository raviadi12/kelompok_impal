-- ENGLISH STANDARDIZATION MIGRATION (Non-Destructive)
-- Project: Health Assistant (Obibi)
-- Description: Renames all Indonesian tables and columns to English standards while preserving existing data.

-- 1. RENAME TABLES
ALTER TABLE IF EXISTS public.obat RENAME TO medications;
ALTER TABLE IF EXISTS public.jadwal_obat RENAME TO medication_schedules;
ALTER TABLE IF EXISTS public.laporan_kepatuhan RENAME TO compliance_logs;
ALTER TABLE IF EXISTS public.interaksi_obat RENAME TO drug_interactions;
-- 'patients', 'chats', 'chat_messages', 'reminder', 'ai_assistant' are already English.

-- 2. RENAME COLUMNS: medications (formerly obat)
ALTER TABLE public.medications RENAME COLUMN obat_id TO id;
ALTER TABLE public.medications RENAME COLUMN nama_obat TO name;
ALTER TABLE public.medications RENAME COLUMN keterangan TO description;
ALTER TABLE public.medications RENAME COLUMN dosis TO dosage;
ALTER TABLE public.medications RENAME COLUMN efek_samping TO side_effects;
ALTER TABLE public.medications RENAME COLUMN bentuk_obat TO form;
ALTER TABLE public.medications RENAME COLUMN pasien_id TO patient_id;

-- 3. RENAME COLUMNS: medication_schedules (formerly jadwal_obat)
ALTER TABLE public.medication_schedules RENAME COLUMN jadwal_id TO id;
ALTER TABLE public.medication_schedules RENAME COLUMN waktu_minum TO scheduled_time;
ALTER TABLE public.medication_schedules RENAME COLUMN tanggal_mulai TO start_date;
ALTER TABLE public.medication_schedules RENAME COLUMN tanggal_selesai TO end_date;
ALTER TABLE public.medication_schedules RENAME COLUMN instruksi_konsumsi TO instructions;
ALTER TABLE public.medication_schedules RENAME COLUMN pasien_id TO patient_id;
ALTER TABLE public.medication_schedules RENAME COLUMN obat_id TO medication_id;
ALTER TABLE public.medication_schedules RENAME COLUMN laporan_id TO log_id;

-- 4. RENAME COLUMNS: compliance_logs (formerly laporan_kepatuhan)
ALTER TABLE public.compliance_logs RENAME COLUMN laporan_id TO id;
ALTER TABLE public.compliance_logs RENAME COLUMN tanggal TO logged_at;
ALTER TABLE public.compliance_logs RENAME COLUMN status_kepatuhan TO status;
ALTER TABLE public.compliance_logs RENAME COLUMN catatan_pasien TO notes;
ALTER TABLE public.compliance_logs RENAME COLUMN pasien_id TO patient_id;
ALTER TABLE public.compliance_logs RENAME COLUMN jadwal_obat_id TO schedule_id;

-- 5. RENAME COLUMNS: drug_interactions (formerly interaksi_obat)
ALTER TABLE public.drug_interactions RENAME COLUMN interaksi_id TO id;
ALTER TABLE public.drug_interactions RENAME COLUMN pasien_id TO patient_id;
ALTER TABLE public.drug_interactions RENAME COLUMN obat1 TO medication_pair;
ALTER TABLE public.drug_interactions RENAME COLUMN obat2 TO target_medication;
ALTER TABLE public.drug_interactions RENAME COLUMN tingkat_risiko TO risk_level;
ALTER TABLE public.drug_interactions RENAME COLUMN hasil_interaksi TO finding_details;

-- 6. RENAME COLUMNS: chats & chat_messages
ALTER TABLE public.chats RENAME COLUMN chat_id TO id;
ALTER TABLE public.chats RENAME COLUMN pasien_id TO patient_id;

ALTER TABLE public.chat_messages RENAME COLUMN message_id TO id;
ALTER TABLE public.chat_messages RENAME COLUMN pasien_id TO patient_id;
ALTER TABLE public.chat_messages RENAME COLUMN waktu TO created_at;

-- 7. RE-APPLY CONSTRAINTS (Ensuring English terms)
ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS check_bentuk_obat;
ALTER TABLE public.medications ADD CONSTRAINT check_medication_form 
CHECK (form IN ('tablet', 'capsule', 'liquid', 'injection', 'drops', 'cream', 'kapsul', 'sirup', 'tetes', 'salep', 'injeksi', 'cair'));

-- 8. STANDARDIZE TRIGGERS (Updating to new table names)
DROP TRIGGER IF EXISTS set_updated_at_obat ON public.medications;
CREATE TRIGGER set_updated_at_medications BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_jadwal ON public.medication_schedules;
CREATE TRIGGER set_updated_at_medication_schedules BEFORE UPDATE ON public.medication_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_laporan ON public.compliance_logs;
CREATE TRIGGER set_updated_at_compliance_logs BEFORE UPDATE ON public.compliance_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
