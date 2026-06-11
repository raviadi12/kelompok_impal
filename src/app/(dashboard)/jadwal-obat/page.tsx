"use client";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Loader, AlertCircle, Bell, Pill, TrendingUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";

// Types
interface UI_Schedule {
  id: string;
  medicine_name: string;
  dosage: string;
  time: string;
  date: string;
  dateISO: string;
  user_id: string;
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

export default function MedicationSchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<UI_Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"calendar" | "all" | "upcoming">("calendar");

  // Fetch schedules from Supabase
  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("medication_schedules")
        .select("*, medications(name)")
        .eq("patient_id", user.id)
        .order("start_date", { ascending: true })
        .order("scheduled_time", { ascending: true });


      if (fetchError) {
        console.error("Fetch error:", fetchError);
        setError("Failed to load schedules. Please try again.");
        return;
      }

      const mappedSchedules = (data || []).map((item: any) => {
        try {
          const [hours = "00", minutes = "00"] = item.scheduled_time?.toString().split(":") || [];
          const time = `${hours.padStart(2, "0")}.${minutes.padStart(2, "0")}`;

          const scheduleDate = item.start_date ? new Date(item.start_date) : null;
          const safeDate = scheduleDate && !isNaN(scheduleDate.getTime()) ? scheduleDate : new Date();
          const year = safeDate.getFullYear();
          const month = String(safeDate.getMonth() + 1).padStart(2, "0");
          const day = String(safeDate.getDate()).padStart(2, "0");
          const date = `${year}-${month}-${day}`;
          const dateISO = date;

          const medication = item.medications;
          const medicineName = medication?.name;

          return {
            id: String(item.id),
            medicine_name: medicineName || "Unknown Medication",
            dosage: item.dosage_quantity ? `${item.dosage_quantity} ${item.dosage_unit || ''}` : "-",
            time,
            date,
            dateISO,
            user_id: String(item.patient_id || ""),
          };
        } catch (err) {
          console.error("Error mapping schedule item:", item, err);
          return {
            id: String(item.id) || "unknown",
            medicine_name: item.medications?.name || "Unknown Medication",
            dosage: "-",
            time: "00.00",
            date: "",
            dateISO: "",
            user_id: String(item.patient_id || ""),
          };
        }
      });

      setSchedules(mappedSchedules);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getSchedulesForSelectedDate = () => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const dateISO = `${year}-${month}-${day}`;

    return schedules.filter((s) => s.dateISO === dateISO).sort((a, b) => a.time.localeCompare(b.time));
  };

  const stats = {
    active: schedules.length,
    today: getSchedulesForSelectedDate().length,
    compliance: 0,
    upcoming: schedules.filter((s) => {
      const today = new Date();
      const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return s.dateISO >= todayISO;
    }).length,
  };

  const handleDateSelect = (day: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const selectedDateFormatted = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentMonthFormatted = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedSchedules = getSchedulesForSelectedDate();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Medication Schedule</h1>
          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-lg mt-3 w-fit">
            <Bell size={16} />
            <p className="text-sm font-medium">Set reminders to help you take your medicine on time.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Reminders</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stats.active}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Bell size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Today's Dosage</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stats.today}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Pill size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Compliance Rate</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stats.compliance}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Upcoming</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stats.upcoming}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 border-b border-gray-200 bg-white">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 md:px-6 py-3 font-medium text-sm md:text-base border-b-2 transition ${
              activeTab === "calendar"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 md:px-6 py-3 font-medium text-sm md:text-base border-b-2 transition ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            All Reminders
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 md:px-6 py-3 font-medium text-sm md:text-base border-b-2 transition ${
              activeTab === "upcoming"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 py-6">
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 flex flex-col items-center justify-center">
            <Loader size={32} className="text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 text-center">Loading schedule...</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-4 md:p-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-red-900">{error}</p>
              <button
                onClick={fetchSchedules}
                className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Select Date</h3>
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft size={18} />
                  </button>
                  <h4 className="text-sm font-semibold text-gray-900">{currentMonthFormatted}</h4>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight size={18} />
                  </button>
                </div>
                {/* Simplified Calendar Grid for now */}
                <div className="grid grid-cols-7 gap-2">
                  {/* ... Logic to render calendar days ... */}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Schedule for {selectedDateFormatted}</h3>
                <div className="space-y-4">
                  {selectedSchedules.length > 0 ? (
                    selectedSchedules.map((schedule, idx) => {
                      const colorIndex = idx % colorPalette.length;
                      return (
                        <div key={schedule.id} className={`${colorPalette[colorIndex].bg} border-l-4 ${colorPalette[colorIndex].border} rounded-lg p-4 shadow-sm`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-base font-bold text-gray-900">{schedule.medicine_name}</p>
                              <p className="text-sm text-gray-600 mt-1">{schedule.dosage}</p>
                            </div>
                            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Active</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gray-500" />
                            <p className="text-sm text-gray-600">at {schedule.time}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-500 py-8">No medications scheduled for this day.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
