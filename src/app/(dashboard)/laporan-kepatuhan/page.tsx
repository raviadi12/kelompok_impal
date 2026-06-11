"use client";

import { CheckCircle2, Circle, TrendingUp, AlertCircle, Loader } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function ComplianceLogsPage() {
  const { user } = useAuth();
  
  // Real data state
  const [todayMedicines, setTodayMedicines] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchComplianceData();
    }
  }, [user]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      // Fetch user's schedules
      const { data: scheduleData } = await supabase
        .from("medication_schedules")
        .select("*, medications(name)")
        .eq("patient_id", user?.id)
        .order("scheduled_time", { ascending: true });

      // Generate today's schedule based on frequency
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const generatedToday: any[] = [];

      (scheduleData || []).forEach(s => {
        const dosageInfo = (s.dosage_quantity || "").toString();
        // For simplicity, we assume the scheduled_time is what we use
        let hours = [parseInt(s.scheduled_time.split(":")[0]) || 8];
        let appliesToThisDay = true;

        const startDate = new Date(s.start_date);
        startDate.setHours(0, 0, 0, 0);
        
        if (today < startDate) return;

        // Custom frequency logic can be added here
        
        if (appliesToThisDay) {
          hours.forEach(hr => {
            const timeLabel = hr < 11 ? "Morning" : hr <= 15 ? "Afternoon" : hr <= 18 ? "Evening" : "Night";
            generatedToday.push({
              id: `${s.id}-${hr}`, // using composite id for uniqueness per time
              schedule_id: s.id,
              name: s.medications?.name || "Unknown",
              dosage: `${s.dosage_quantity} ${s.dosage_unit}`,
              time: `${timeLabel} (${String(hr).padStart(2, "0")}:00)`,
              uniqueHour: hr,
              status: "pending" 
            });
          });
        }
      });

      // Fetch compliance status for today
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: complianceData } = await supabase
        .from("compliance_logs")
        .select("*")
        .eq("patient_id", user?.id)
        .gte("logged_at", todayStr + "T00:00:00Z");

      if (complianceData && complianceData.length > 0) {
        // Match status based on some logic (this depends on how you store status in DB)
        // For now, let's assume 'status' column stores 'taken' if any record exists for that schedule
        complianceData.forEach(log => {
          const med = generatedToday.find(m => m.schedule_id === log.schedule_id);
          if (med && log.status === 'taken') med.status = "taken";
        });
      }

      setTodayMedicines(generatedToday.sort((a,b) => a.uniqueHour - b.uniqueHour));

      // Generate dummy chart data
      const mockChart = Array.from({length: 7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          percent: Math.floor(Math.random() * 40) + 60 
        };
      });
      setChartData(mockChart);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsTaken = async (med: any) => {
    if (!user) return;
    try {
      // Optimistic update
      setTodayMedicines(prev => prev.map(m => m.id === med.id ? { ...m, status: "taken" } : m));

      await supabase
        .from("compliance_logs")
        .insert([{
          patient_id: user.id,
          schedule_id: med.schedule_id,
          status: 'taken',
          logged_at: new Date().toISOString()
        }]);
        
    } catch (err) {
      console.error("Failed to mark as taken", err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-gray-50/50">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Compliance Reports</h1>
          <p className="text-gray-500 mt-2">Monitor your daily medication adherence levels.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Adherence Analysis (Last 7 Days)
            </h2>
          </div>
          
          <div className="relative h-64 w-full mt-4">
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-400 text-right pr-4">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            
            <div className="absolute left-12 right-0 top-0 bottom-8 flex justify-between items-end gap-2 border-l border-b border-gray-200 pb-1">
              <div className="absolute left-0 right-0 bottom-0 top-0 flex flex-col justify-between pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t border-gray-100 border-dashed" />
                ))}
              </div>

              {chartData.map((item, index) => (
                <div key={index} className="relative flex flex-col items-center w-full group z-10 h-full justify-end">
                  <span className="text-xs font-medium text-gray-600 mb-2">{item.percent}%</span>
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
            
            <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between items-end pt-2">
              {chartData.map((item, index) => (
                <div key={index} className="w-full text-center text-xs text-gray-500 font-medium truncate px-1">
                  {item.date}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Medications to take today:
            </h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : todayMedicines.length === 0 ? (
            <div className="text-center p-8 text-gray-500">No medications scheduled for today.</div>
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
                  onClick={() => med.status !== 'taken' && markAsTaken(med)}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shrink-0
                    ${med.status === 'taken' 
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow active:scale-95'}`}
                >
                  {med.status === 'taken' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Taken
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4" />
                      Mark as taken
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
