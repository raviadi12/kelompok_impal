"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Pasien } from "@/lib/types";
import { User as SupabaseUser } from "@supabase/supabase-js";

type AuthContextType = {
  user: Pasien | null;
  loading: boolean;
  login: (userData: Pasien) => void; // kept for backward compatibility if needed
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Pasien | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to fetch full Pasien data from your table
  const loadPatientData = useCallback(
    async (supabaseUser: SupabaseUser) => {
      try {
        const { data: patientData, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", supabaseUser.id)
          .single();

        if (error) {
          console.error("Error fetching pasien data:", error);
          // Update fallback to use 'name' instead of 'nama'
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "",
          }); // Use 'any' if the Pasien type hasn't been updated yet
        } else {
          setUser(patientData); // This object will now have 'name' from the DB
        }
      } catch (err) {
        console.error("Unexpected error loading patient data:", err);
        setUser(null);
      }
    },
    []
  );

  // Listen to Supabase auth state changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      if (session) {
        await loadPatientData(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    getInitialSession();

    // Subscribe to auth changes (login, logout, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log("Auth event:", event); // Helpful for debugging
      if (!mounted) return;

      if (session?.user) {
        await loadPatientData(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadPatientData]);

  const login = (userData: Pasien) => {
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
