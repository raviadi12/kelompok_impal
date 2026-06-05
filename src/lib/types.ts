export type Pasien = {
  id: string; // auth.users.id
  name: string;
  email: string;
};

export type Obat = {
  obat_id: number;
  nama_obat: string;
  keterangan: string;
  dosis: string;
  efek_samping: string;
};

export type AIAssistant = {
  ai_id: number;
  keterangan: string;
  model: string;
};

export type Chat = {
  chat_id: number;
  pasien_id: string;
  ai_id: number;
  chat: string[];
  respon_ai: string;
  waktu: string;
};

export type InteraksiObat = {
  interaksi_id: number;
  pasien_id: string;
  obat1: string[];
  obat2: string;
  tingkat_risiko: string;
  hasil_interaksi: string;
};

export type LaporanKepatuhan = {
  laporan_id: number;
  pasien_id: string;
  tanggal: string;
  status_kepatuhan: string;
};

export type JadwalObat = {
  jadwal_id: number;
  laporan_id: number;
  nama_obat: string;
  jenis_obat: string;
  waktu_minum: string;
  dosis: string;
};

export type Reminder = {
  reminder_id: number;
  jadwal_id: number;
  waktu_kirim: string;
  status: boolean;
};

export type Schedule = {
  id: string;
  medicine_name: string;
  dosage: string;
  time: string;
  date: string;
  status: "pending" | "done" | "skipped";
  user_id: string;
};
