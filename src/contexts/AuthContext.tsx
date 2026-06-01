import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const isFetchingProfile = useRef(false);
  const initialized = useRef(false);

  const fetchProfileData = useCallback(async (userId: string) => {
    if (isFetchingProfile.current) return null;
    isFetchingProfile.current = true;
    
    try {
      console.log("AuthProvider: Fetching profile for:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("role, barbershop_id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("AuthProvider: Error fetching profile:", error);
        return null;
      }
      
      console.log("AuthProvider: Profile found:", data);
      return data ? { ...data, name: data.full_name } : null;
    } catch (err) {
      console.error("AuthProvider: Unexpected error in fetchProfile:", err);
      return null;
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfileData(user.id);
      setProfile(p);
    }
  }, [user, fetchProfileData]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    async function initialize() {
      try {
        console.log("AuthProvider: Checking initial session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          console.log("AuthProvider: Session found during init", session.user.id);
          setUser(session.user);
          const p = await fetchProfileData(session.user.id);
          if (mounted) setProfile(p);
        } else {
          console.log("AuthProvider: No session found during init");
        }
      } catch (err) {
        console.error("AuthProvider: Initialization error", err);
      } finally {
        if (mounted) {
          console.log("AuthProvider: Init complete, loading -> false");
          setLoading(false);
        }
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth event:", event);
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      
      // Update states
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        setUser(currentUser);
        if (currentUser) {
          const p = await fetchProfileData(currentUser.id);
          if (mounted) setProfile(p);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

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
