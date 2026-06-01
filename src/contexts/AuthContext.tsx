import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("AuthProvider: Fetching profile for:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("role, barbershop_id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log("AuthProvider: No profile found in DB for user:", userId);
          return null;
        }
        console.error("AuthProvider: Error fetching profile from DB:", error);
        return null;
      }
      
      console.log("AuthProvider: Profile found:", data);
      return data ? { ...data, name: data.full_name } : null;
    } catch (err) {
      console.error("AuthProvider: Unexpected error in fetchProfile:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        console.log("AuthProvider: Initializing...");
        // Get session once
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("AuthProvider: Session error:", sessionError);
        }

        if (!mounted) return;

        if (session?.user) {
          console.log("AuthProvider: Session found for user:", session.user.id);
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mounted) setProfile(p);
        } else {
          console.log("AuthProvider: No session found during init");
        }
      } catch (err) {
        console.error("AuthProvider: Auth initialization exception:", err);
      } finally {
        if (mounted) {
          console.log("AuthProvider: Initialization complete, setting loading false");
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // The subscription should not reset loading to true unless it's a real login event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth change event:", event);
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      
      // Only trigger a profile fetch if the user has changed
      if (currentUser?.id !== user?.id) {
        setUser(currentUser);
        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          if (mounted) setProfile(p);
        } else {
          if (mounted) setProfile(null);
        }
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [user?.id]); // Adding user?.id to dependencies to track changes safely

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
