"use client";

import { createContext, useCallback, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Patient } from "@/lib/types";
import { User as SupabaseUser } from "@supabase/supabase-js";

type AuthContextType = {
  user: Patient | null;
  loading: boolean;
  login: (userData: Patient) => void; // kept for backward compatibility if needed
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  // Helper function to fetch full Patient data from your table
  const loadPatientData = useCallback(
    async (supabaseUser: SupabaseUser) => {
      try {
        const { data: patientData, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", supabaseUser.id)
          .single();

        if (error) {
          console.error("Error fetching patient data:", error);
          // Update fallback to use 'name' instead of 'nama'
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "",
          }); 
        } else {
          setUser(patientData); 
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
    let authSubscription: any = null;

    const initializeAuth = async () => {
      console.log('[AuthProvider] Initializing auth with supabase client:', !!supabase);
      // Prevent strict mode rapid re-firing of getSession
      if (initRef.current) return;
      initRef.current = true;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session) {
          await loadPatientData(session.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn("Ignored Auth getSession error", err);
      } finally {
        if (mounted) setLoading(false);
      }

      // ONLY subscribe after getSession completes to avoid concurrent Storage Locks!
      if (!mounted) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === "INITIAL_SESSION") return; // We already fetched it

        if (session?.user) {
          await loadPatientData(session.user);
        } else {
          setUser(null);
        }
      });
      authSubscription = subscription;
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [loadPatientData]);

  const login = (userData: Patient) => {
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
