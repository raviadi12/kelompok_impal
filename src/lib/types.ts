export type Patient = {
  id: string; // auth.users.id
  name: string;
  email: string;
  avatar_url?: string;
};

export type Medication = {
  id: string;
  patient_id: string;
  name: string;
  description: string;
  dosage: string;
  side_effects: string;
  form: string;
  stock_quantity: number;
  stock_unit: string;
  is_active: boolean;
};

export type AIAssistant = {
  ai_id: number;
  keterangan: string;
  model: string;
};

export type Chat = {
  id: string;
  patient_id: string;
  ai_id?: number;
  title: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: any;
};

export type DrugInteraction = {
  id: string;
  patient_id: string;
  medication_pair: string[];
  target_medication: string;
  risk_level: string;
  finding_details: string;
};

export type ComplianceLog = {
  id: string;
  schedule_id: string;
  patient_id: string;
  status: 'taken' | 'skipped' | 'missed' | 'snoozed';
  logged_at: string;
  notes?: string;
};

export type MedicationSchedule = {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_time: string;
  dosage_quantity: number;
  dosage_unit: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
};

export type Reminder = {
  reminder_id: number;
  jadwal_id: number;
  waktu_kirim: string;
  status: boolean;
};

// Legacy support or UI specific types
export type Schedule = {
  id: string;
  medicine_name: string;
  dosage: string;
  time: string;
  date: string;
  status: "pending" | "done" | "skipped";
  user_id: string;
};
