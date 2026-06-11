"use client";

import { useAuth } from "@/components/AuthProvider";
import { Bot, Pill, Calendar, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user.name}! 👋</h1>
          <p className="text-gray-500 text-lg">Monitor your medication schedule and adherence to stay healthy and fit.</p>
        </div>

        {/* Hello AI Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 md:w-2/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4 backdrop-blur-sm border border-white/30">
              <Bot size={16} />
              <span>Hello AI - Your Health Assistant</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
              Have questions about your medicine?
            </h2>
            <p className="text-blue-100 mb-6 text-lg">
              Ask about indications, side effects, dosage, or share your prescription images directly with Hello AI!
            </p>
            <Link 
              href="/chat"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm"
            >
              Start Chatting Now
              <ArrowRight size={20} />
            </Link>
          </div>
          <Bot className="absolute -bottom-10 -right-10 w-64 h-64 text-white opacity-10" />
        </div>

        {/* Quick Menu / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/jadwal-obat" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition">
              <Calendar size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Today's Schedule</h3>
            <p className="text-gray-500">View and manage your medication intake reminders.</p>
          </Link>
          
          <Link href="/obat" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition">
              <Pill size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Medication List</h3>
            <p className="text-gray-500">Manage the inventory of medications you are currently taking.</p>
          </Link>
          
          <Link href="/interaksi-obat" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-rose-600 group-hover:text-white transition">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Check Interactions</h3>
            <p className="text-gray-500">Check for potential harmful interactions between your medications.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
