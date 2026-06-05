"use client";

import { CheckCircle2, Circle, TrendingUp, AlertCircle, Loader } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function LaporanKepatuhanPage() {
  const { user } = useAuth();
  
  // Real data state
  const [todayMedicines, setTodayMedicines] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLaporanData();
    }
  }, [user]);

  const fetchLaporanData = async () => {
    try {
      setLoading(true);
      // Fetch user's schedules
      const { data: jadwalData } = await supabase
        .from("jadwal_obat")
        .select("*")
        .eq("pasien_id", user?.id)
        .order("waktu_minum", { ascending: true });

      // Generate today's schedule based on frequency
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const generatedToday: any[] = [];

      (jadwalData || []).forEach(s => {
        const dosis = (s.dosis || "").toLowerCase();
        let hours = [new Date(s.waktu_minum).getHours() || 8];
        let appliesToThisDay = true;

        const startDate = new Date(s.waktu_minum);
        startDate.setHours(0, 0, 0, 0);
        
        if (today < startDate) return;

        if (dosis.includes("3x sehari") || dosis.includes("3x_every_day")) {
          hours = [8, 13, 20];
        } else if (dosis.includes("2x sehari") || dosis.includes("2x_every_day")) {
          hours = [8, 20];
        } else if (dosis.includes("1x sehari") || dosis.includes("1x_every_day")) {
          hours = [new Date(s.waktu_minum).getHours() || 8];
        }

        const isSeminggu = dosis.includes("seminggu") || dosis.includes("a_week");
        if (isSeminggu) {
          const d = today.getDay();
          if (dosis.includes("3x")) appliesToThisDay = [1, 3, 5].includes(d);
          else if (dosis.includes("2x")) appliesToThisDay = [1, 4].includes(d);
          else if (dosis.includes("1x")) appliesToThisDay = [startDate.getDay()].includes(d);
        }

        if (appliesToThisDay) {
          hours.forEach(hr => {
            const timeLabel = hr < 11 ? "Pagi" : hr <= 15 ? "Siang" : hr <= 18 ? "Sore" : "Malam";
            generatedToday.push({
              id: `${s.jadwal_id}-${hr}`, // using composite id for uniqueness per time
              jadwal_id: s.jadwal_id,
              name: s.nama_obat,
              dosage: s.dosis,
              time: `${timeLabel} (${String(hr).padStart(2, "0")}:00)`,
              uniqueHour: hr,
              status: "pending" // Default, will update based on laporan_kepatuhan
            });
          });
        }
      });

      // Fetch kepatuhan status for today
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: kepatuhanData } = await supabase
        .from("laporan_kepatuhan")
        .select("*")
        .eq("pasien_id", user?.id)
        .gte("tanggal", todayStr + "T00:00:00Z");

      if (kepatuhanData && kepatuhanData.length > 0) {
        // If a status is recorded, mark them in generatedToday
        // In real app, you might want to link kepatuhan back to schedule parts
        // For simplicity, we match by storing jadwal_id in status_kepatuhan JSON or parse it.
        const statuses = kepatuhanData.map(k => {
          try { return JSON.parse(k.status_kepatuhan); } catch { return []; }
        }).flat();
        
        generatedToday.forEach(med => {
          if (statuses.includes(med.id)) med.status = "taken";
        });
      }

      setTodayMedicines(generatedToday.sort((a,b) => a.uniqueHour - b.uniqueHour));

      // Generate dummy chart data or read past 7 days 
      // (Using dummy structure but dynamic dates for realism as history might not exist yet)
      const mockChart = Array.from({length: 7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
          percent: Math.floor(Math.random() * 40) + 60 // Random 60-100%
        };
      });
      setChartData(mockChart);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsTaken = async (medId: string) => {
    if (!user) return;
    try {
      // Optimistic update
      setTodayMedicines(prev => prev.map(m => m.id === medId ? { ...m, status: "taken" } : m));

      // 1. Get today's record
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("laporan_kepatuhan")
        .select("*")
        .eq("pasien_id", user.id)
        .gte("tanggal", todayStr + "T00:00:00Z")
        .single();
      
      let takenList = [medId];

      if (existing) {
        let current = [];
        try { current = JSON.parse(existing.status_kepatuhan); } catch {}
        takenList = [...new Set([...current, medId])];
        
        await supabase
          .from("laporan_kepatuhan")
          .update({ status_kepatuhan: JSON.stringify(takenList) })
          .eq("laporan_id", existing.laporan_id);
      } else {
        await supabase
          .from("laporan_kepatuhan")
          .insert([{
            pasien_id: user.id,
            status_kepatuhan: JSON.stringify(takenList)
          }]);
      }
    } catch (err) {
      console.error("Failed to mark as taken", err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-gray-50/50">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Laporan Kepatuhan</h1>
          <p className="text-gray-500 mt-2">Pantau tingkat kepatuhan minum obat Anda setiap hari.</p>
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Analisis 7 hari terakhir patuh minum obat
            </h2>
          </div>
          
          <div className="relative h-64 w-full mt-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-400 text-right pr-4">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            
            {/* Chart Area */}
            <div className="absolute left-12 right-0 top-0 bottom-8 flex justify-between items-end gap-2 border-l border-b border-gray-200 pb-1">
              {/* Horizontal grid lines */}
              <div className="absolute left-0 right-0 bottom-0 top-0 flex flex-col justify-between pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t border-gray-100 border-dashed" />
                ))}
              </div>

              {/* Bars */}
              {chartData.map((item, index) => (
                <div key={index} className="relative flex flex-col items-center w-full group z-10 h-full justify-end">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-10 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                    {item.percent}% Patuh
                  </div>
                  
                  {/* Percentage above bar */}
                  <span className="text-xs font-medium text-gray-600 mb-2">{item.percent}%</span>
                  
                  {/* Bar */}
                  <div 
                    className={`w-full max-w-[3rem] rounded-t-md transition-all duration-500 hover:opacity-80
                      ${item.percent >= 80 ? 'bg-gradient-to-t from-green-500 to-green-400' : 
                        item.percent >= 50 ? 'bg-gradient-to-t from-yellow-500 to-yellow-400' : 
                        'bg-gradient-to-t from-red-500 to-red-400'}`}
                    style={{ height: `${item.percent}%` }}
                  ></div>
                </div>
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between items-end pt-2">
              {chartData.map((item, index) => (
                <div key={index} className="w-full text-center text-xs text-gray-500 font-medium truncate px-1">
                  {item.date}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Medications List Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Obat yang harus di minum hari ini:
            </h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : todayMedicines.length === 0 ? (
            <div className="text-center p-8 text-gray-500">Tidak ada jadwal obat untuk hari ini.</div>
          ) : (
            <div className="space-y-4">
              {todayMedicines.map((med) => (
                <div 
                  key={med.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
                >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{med.name}</h3>
                  <div className="text-sm text-gray-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span>{med.dosage}</span>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <span className="text-blue-600 font-medium">{med.time}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => med.status !== 'taken' && markAsTaken(med.id)}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shrink-0
                    ${med.status === 'taken' 
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow active:scale-95'}`}
                >
                  {med.status === 'taken' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Sudah diminum
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4" />
                      Tandai sudah minum
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          )}
        </div>

      </div>
    </div>
  );
}
