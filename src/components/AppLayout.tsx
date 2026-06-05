"use client"

import { Sidebar } from "@/components/Sidebar";
import { Menu, X, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer
  const toggleSidebar = () => setIsOpen(!isOpen);
  
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} toggleSidebar={toggleSidebar} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Hamburger Button */}
        <div className="lg:hidden sticky top-0 z-10 flex p-4 shadow-sm bg-white border-b border-gray-200 items-center gap-4">
          <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold text-gray-800">Obibi</span>
        </div>
        {children}
      </main>
    </div>
  );
}
