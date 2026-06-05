"use client";

import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { LogOut, MessageSquare, Pill, Plus, Calendar, FileText, AlertTriangle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import ButtonBita from "@/components/ButtonBita";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({isOpen, setIsOpen, toggleSidebar}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<{ chat_id: number }[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse
  
  // Fetch chats
  useEffect(() => {
    if (user) {
      const fetchChats = async () => {
        const { data } = await supabase
          .from("chat")
          .select("chat_id")
          .eq("pasien_id", user.id)
          .order("waktu", { ascending: false });
        if (data) setChats(data);
      };
      fetchChats();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleNewChat = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("chat")
      .insert([{ pasien_id: user.id, chat: [] }])
      .select("chat_id")
      .single();

    if (error) {
      console.error("Failed to create chat", error);
      return;
    }

    if (data) {
      setChats([{ chat_id: data.chat_id }, ...chats]);
      router.push(`/chat/${data.chat_id}`);
      setIsOpen(false); // close mobile menu after action
    }
  };

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  if (!user) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 
          w-64 bg-gray-50 border-r border-gray-200 
          flex flex-col h-full transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">H</span>
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-semibold text-lg text-blue-600">Obibi</h2>
                <p className="text-sm text-gray-500 truncate">Hi, {user.name}</p>
              </div>
            )}
          </div>

          {/* Collapse Button - Desktop only */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:block p-1.5 hover:bg-gray-200 rounded-lg transition"
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition font-medium"
          >
            <Plus size={20} />
            {!isCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {[
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/obat", icon: Pill, label: "Obat" },
            { href: "/jadwal-obat", icon: Calendar, label: "Jadwal Obat" },
            { href: "/laporan-kepatuhan", icon: FileText, label: "Laporan Kepatuhan" },
            { href: "/interaksi-obat", icon: AlertTriangle, label: "Interaksi Obat" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          ))}

          {/* Chat History */}
          {!isCollapsed && (
            <div className="pt-6 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Chat History
            </div>
          )}

          <div className="space-y-1">
            {chats.map((c) => (
              <Link
                key={c.chat_id}
                href={`/chat/${c.chat_id}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-gray-100 transition text-sm ${isCollapsed ? "justify-center" : ""}`}
              >
                <MessageSquare size={18} />
                {!isCollapsed && <span className="truncate">Chat #{c.chat_id}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition w-full ${isCollapsed ? "justify-center" : ""}`}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
}