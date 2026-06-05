"use client";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Loader, AlertCircle, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

// Types
interface Schedule {
  id: string;
  medicine_name: string;
  dosage: string;
  waktu_minum: Date;
}

// Pastel color palette with thick left border
const colorPalette = [
  { bg: "bg-blue-50", border: "border-l-blue-500" },
  { bg: "bg-purple-50", border: "border-l-purple-500" },
  { bg: "bg-pink-50", border: "border-l-pink-500" },
  { bg: "bg-orange-50", border: "border-l-orange-500" },
  { bg: "bg-green-50", border: "border-l-green-500" },
  { bg: "bg-indigo-50", border: "border-l-indigo-500" },
  { bg: "bg-cyan-50", border: "border-l-cyan-500" },
  { bg: "bg-amber-50", border: "border-l-amber-500" },
];

export default function JadwalObatPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obatCatalog, setObatCatalog] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date()); // Start from today
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date()); // Start from current month
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [formNamaObat, setFormNamaObat] = useState("");
  const [formJenisObat, setFormJenisObat] = useState("");
  const [formDosis, setFormDosis] = useState("");
  const [formWaktuMinum, setFormWaktuMinum] = useState("");
  const [formWaktuKirimReminder, setFormWaktuKirimReminder] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Slot waktu dari 00:00 hingga 23:00 (24 jam)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return `${String(hour).padStart(2, "0")}:00`;
  });

  // Hari dalam seminggu (Senin hingga Minggu)
  const daysOfWeek = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  // Fetch schedules from Supabase
  useEffect(() => {
    if (user) {
      fetchSchedules();
      fetchObatCatalog();
    }
  }, [user]);

  const fetchObatCatalog = async () => {
    const { data } = await supabase.from("obat").select("nama_obat");
    if (data) {
      setObatCatalog(data);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("jadwal_obat")
        .select("*")
        .eq("pasien_id", user?.id)
        .order("waktu_minum", { ascending: true });

      if (fetchError) {
        console.error("Fetch error:", fetchError);
        setError("Gagal memuat jadwal. Silakan coba lagi.");
        return;
      }

      // Mapping data dari jadwal_obat ke format Schedule
      const mappedSchedules = (data || []).map((item: any) => {
        return {
          id: String(item.jadwal_id),
          medicine_name: item.nama_obat,
          dosage: item.dosis || "",
          waktu_minum: new Date(item.waktu_minum),
        };
      });

      setSchedules(mappedSchedules);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError("Terjadi kesalahan yang tidak terduga.");
    } finally {
      setLoading(false);
    }
  };

  // Dapatkan minggu mulai dari Senin
  const getWeekDates = (date: Date): Date[] => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Sesuaikan ketika hari adalah Minggu
    const monday = new Date(d.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates(currentDate);

  // Dapatkan jadwal untuk hari dan waktu tertentu
  const getSchedulesForDayTime = (dayIndex: number, timeSlot: string) => {
    const targetDate = weekDates[dayIndex];
    const targetHour = parseInt(timeSlot.split(":")[0]);
    
    const results: any[] = [];

    schedules.forEach((s) => {
      const dosis = s.dosage.toLowerCase();
      let hours = [s.waktu_minum.getHours()];
      let appliesToThisDay = true; // Assume applies everyday unless constrained
      
      // If start date is in the future relative to targetDate, skip
      const startDate = new Date(s.waktu_minum);
      startDate.setHours(0, 0, 0, 0);
      const startOfTarget = new Date(targetDate);
      startOfTarget.setHours(0, 0, 0, 0);
      
      if (startOfTarget < startDate) return;

      // Frequency parsing
      if (dosis.includes("3x sehari") || dosis.includes("3x_every_day")) {
        hours = [8, 13, 20];
      } else if (dosis.includes("2x sehari") || dosis.includes("2x_every_day")) {
        hours = [8, 20];
      } else if (dosis.includes("1x sehari") || dosis.includes("1x_every_day")) {
        // Fall back to actual time or 08:00
        hours = [s.waktu_minum.getHours() || 8];
      }

      const isSeminggu = dosis.includes("seminggu") || dosis.includes("a_week");
      if (isSeminggu) {
        // Example: 3x seminggu -> Sen (1), Rab (3), Jum (5)
        const d = targetDate.getDay();
        if (dosis.includes("3x")) {
          appliesToThisDay = [1, 3, 5].includes(d);
        } else if (dosis.includes("2x")) {
          appliesToThisDay = [1, 4].includes(d);
        } else if (dosis.includes("1x")) {
          appliesToThisDay = [startDate.getDay()].includes(d);
        }
      }

      if (appliesToThisDay && hours.includes(targetHour)) {
        results.push({
          ...s,
          unique_id: `${s.id}-${targetDate.getTime()}-${targetHour}`,
          time: `${String(targetHour).padStart(2, "0")}:00`
        });
      }
    });

    return results;
  };

  // Penanganan navigasi
  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Helper functions untuk mini calendar
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const miniCalendarDays = Array.from(
    { length: getDaysInMonth(miniCalendarMonth) },
    (_, i) => i + 1
  );
  const firstDay = getFirstDayOfMonth(miniCalendarMonth);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(
      miniCalendarMonth.getFullYear(),
      miniCalendarMonth.getMonth(),
      day
    );
    setCurrentDate(selectedDate);
    setIsDatePickerOpen(false);
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(miniCalendarMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setMiniCalendarMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(miniCalendarMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setMiniCalendarMonth(newMonth);
  };

  // Check if a day is in the current week
  const isInCurrentWeek = (day: number) => {
    const testDate = new Date(
      miniCalendarMonth.getFullYear(),
      miniCalendarMonth.getMonth(),
      day
    );
    const dayOfWeek = testDate.getDay();
    const diff = testDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(testDate.getFullYear(), testDate.getMonth(), diff);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return currentDate >= weekStart && currentDate <= weekEnd;
  };

  const isSelectedDay = (day: number) => {
    return (
      day === currentDate.getDate() &&
      miniCalendarMonth.getMonth() === currentDate.getMonth() &&
      miniCalendarMonth.getFullYear() === currentDate.getFullYear()
    );
  };

  const handleAddJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaObat || !formWaktuMinum) return;
    setSubmitting(true);

    try {
      // Create jadwal_obat
      const { data: jadwalData, error: jadwalError } = await supabase
        .from("jadwal_obat")
        .insert([{
          pasien_id: user?.id,
          nama_obat: formNamaObat,
          jenis_obat: formJenisObat,
          dosis: formDosis,
          waktu_minum: new Date(formWaktuMinum).toISOString()
        }])
        .select()
        .single();

      if (jadwalError) throw jadwalError;

      // Create reminder if date is selected
      if (formWaktuKirimReminder && jadwalData) {
        const { error: reminderError } = await supabase
          .from("reminder")
          .insert([{
            jadwal_id: jadwalData.jadwal_id,
            waktu_kirim: new Date(formWaktuKirimReminder).toISOString(),
            status: false
          }]);
        
        if (reminderError) throw reminderError;
      }

      // Reset form
      setShowForm(false);
      setFormNamaObat("");
      setFormJenisObat("");
      setFormDosis("");
      setFormWaktuMinum("");
      setFormWaktuKirimReminder("");
      
      // Refresh
      fetchSchedules();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menambahkan jadwal obat: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-gray-500">Silakan masuk untuk melihat jadwal.</p>
      </div>
    );
  }

  const weekStartLabel = weekDates[0].toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const weekEndLabel = weekDates[6].toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-full flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Jadwal Minum Obat</h1>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <Plus size={16} /> Tambah Jadwal
              </button>
            </div>
            
            {/* Date Picker Trigger */}
            <div className="relative mt-3">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition font-medium"
              >
                <span>{weekStartLabel}</span>
                <span className="text-gray-500">-</span>
                <span>{weekEndLabel}</span>
                <ChevronRight
                  size={16}
                  className={`transition-transform ${
                    isDatePickerOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Date Picker Dropdown */}
              {isDatePickerOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 z-50 w-80">
                  {/* Mini Calendar Header */}
                  <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={handlePreviousMonth}
                      className="p-1 hover:bg-gray-100 rounded transition"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {miniCalendarMonth.toLocaleDateString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 hover:bg-gray-100 rounded transition"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>

                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-gray-500 py-2"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {emptyDays.map((i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {miniCalendarDays.map((day) => {
                      const isSelected = isSelectedDay(day);
                      const isInWeek = isInCurrentWeek(day);

                      return (
                        <button
                          key={day}
                          onClick={() => handleDateSelect(day)}
                          className={`py-2 text-sm font-medium rounded-lg transition ${
                            isSelected
                              ? "bg-teal-500 text-white"
                              : isInWeek
                                ? "bg-teal-50 text-teal-700"
                                : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setIsDatePickerOpen(false)}
                    className="w-full mt-4 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4 ml-6">
            <button
              onClick={handlePreviousWeek}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <ChevronLeft size={18} />
              Minggu Sebelumnya
            </button>
            <button
              onClick={handleNextWeek}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              Minggu Berikutnya
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Tambah Jadwal Obat</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddJadwal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Obat *</label>
                <input
                  required
                  type="text"
                  list="obat-list"
                  value={formNamaObat}
                  onChange={(e) => setFormNamaObat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. Paracetamol"
                  autoComplete="off"
                />
                <datalist id="obat-list">
                  {obatCatalog.map((obat, idx) => (
                    <option key={idx} value={obat.nama_obat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Obat</label>
                <input
                  type="text"
                  value={formJenisObat}
                  onChange={(e) => setFormJenisObat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. Tablet, Sirup"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosis</label>
                <input
                  type="text"
                  value={formDosis}
                  onChange={(e) => setFormDosis(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. 1 Tablet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Minum Saat Ini *</label>
                <input
                  required
                  type="datetime-local"
                  value={formWaktuMinum}
                  onChange={(e) => setFormWaktuMinum(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jadwalkan Pengingat Selanjutnya (Tanggal & Waktu)</label>
                <input
                  type="datetime-local"
                  value={formWaktuKirimReminder}
                  onChange={(e) => setFormWaktuKirimReminder(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-gray-500 mt-1">Isi jika Anda ingin mendapatkan notifikasi pengingat untuk jadwal berikutnya</p>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-full">
          {/* Status Memuat */}
          {loading && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
              <Loader
                size={32}
                className="text-teal-600 animate-spin mb-4"
              />
              <p className="text-gray-500">Memuat jadwal...</p>
            </div>
          )}

          {/* Status Error */}
          {error && (
            <div className="bg-white rounded-3xl shadow-sm border border-red-200 p-6 flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-red-600 flex-shrink-0 mt-1"
              />
              <div>
                <p className="font-medium text-red-900">{error}</p>
                <button
                  onClick={fetchSchedules}
                  className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {/* Grid Kalender Mingguan */}
          {!loading && !error && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* Header dengan nama hari */}
                  <div
                    className="grid gap-px bg-gray-100"
                    style={{
                      gridTemplateColumns: "100px repeat(7, 1fr)",
                    }}
                  >
                    {/* Sudut label waktu */}
                    <div className="bg-gray-100 p-4" />

                    {/* Hari dalam seminggu */}
                    {daysOfWeek.map((day, idx) => (
                      <div
                        key={day}
                        className="bg-white p-4 border-b border-gray-200 text-center"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {day}
                        </p>
                        <p className="text-lg font-bold text-teal-600 mt-1">
                          {weekDates[idx].getDate()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {weekDates[idx].toLocaleDateString("id-ID", {
                            month: "short",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Slot waktu dan kartu obat */}
                  <div
                    className="grid gap-px bg-gray-100"
                    style={{
                      gridTemplateColumns: "100px repeat(7, 1fr)",
                    }}
                  >
                    {/* Baris grid untuk setiap slot waktu */}
                    {timeSlots.map((timeSlot) => (
                      <div key={timeSlot} className="contents">
                        {/* Label waktu */}
                        <div className="bg-white p-4 border-r border-gray-200 text-right">
                          <p className="text-xs font-semibold text-gray-600">
                            {timeSlot}
                          </p>
                        </div>

                        {/* Sel hari */}
                        {Array.from({ length: 7 }).map((_, dayIdx) => {
                          const daySchedules = getSchedulesForDayTime(
                            dayIdx,
                            timeSlot
                          );

                          return (
                            <div
                              key={`${timeSlot}-day${dayIdx}`}
                              className="bg-white p-2 border-r border-b border-gray-200 min-h-24 flex flex-col gap-2"
                            >
                              {daySchedules.map((schedule, scheduleIdx) => {
                                const colorIndex =
                                  scheduleIdx % colorPalette.length;
                                const { bg, border } =
                                  colorPalette[colorIndex];

                                return (
                                  <div
                                    key={schedule.unique_id}
                                    className={`${bg} border-l-4 ${border} rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer`}
                                  >
                                    <p className="text-xs font-bold text-gray-900 line-clamp-2">
                                      {schedule.medicine_name}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {schedule.dosage}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1.5">
                                      {schedule.time}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status kosong */}
              {!loading && schedules.length === 0 && (
                <div className="text-center py-12 px-6">
                  <p className="text-gray-500 text-lg">
                    Tidak ada jadwal obat untuk minggu ini.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
