import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

type DentalClinic = {
  clinic_id: string;
  name: string;
  logo_url?: string | null;
  role?: string | null;
  subscription_status?: string | null;
  blocked?: boolean | null;
};

type DentalContextValue = {
  user: any;
  clinics: DentalClinic[];
  activeClinic: DentalClinic | null;
  loading: boolean;
  refreshClinics: () => Promise<void>;
};

const DentalContext = createContext<DentalContextValue>({
  user: null,
  clinics: [],
  activeClinic: null,
  loading: true,
  refreshClinics: async () => undefined,
});

export function useDental() {
  return useContext(DentalContext);
}

export function DentalAuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [clinics, setClinics] = useState<DentalClinic[]>([]);
  const [activeClinic, setActiveClinic] = useState<DentalClinic | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectTo = `${location.pathname}${location.search}`;

  const loadClinics = async (currentUser: any) => {
    const { data, error } = await supabase.rpc("get_my_dental_clinics" as any);

    if (error) {
      throw error;
    }

    let nextClinics = ((data as DentalClinic[]) || []).filter(Boolean);

    if (nextClinics.length === 0) {
      const clinicName =
        currentUser?.user_metadata?.dental_clinic_name ||
        currentUser?.user_metadata?.clinic_name ||
        "Minha Clinica";

      const { data: created, error: bootstrapError } = await supabase.rpc(
        "bootstrap_my_dental_clinic" as any,
        { p_name: clinicName } as any,
      );

      if (bootstrapError) {
        throw bootstrapError;
      }

      if (!(created as any)?.success) {
        throw new Error((created as any)?.error || "Nao foi possivel criar a clinica dental.");
      }

      const { data: reloaded, error: reloadError } = await supabase.rpc("get_my_dental_clinics" as any);

      if (reloadError) {
        throw reloadError;
      }

      nextClinics = ((reloaded as DentalClinic[]) || []).filter(Boolean);
    }

    const storedClinicId = localStorage.getItem("active_dental_clinic_id");
    const selected =
      nextClinics.find((clinic) => clinic.clinic_id === storedClinicId) ||
      nextClinics[0] ||
      null;

    if (selected?.clinic_id) {
      localStorage.setItem("active_dental_clinic_id", selected.clinic_id);
    }

    setClinics(nextClinics);
    setActiveClinic(selected);
  };

  const refreshClinics = async () => {
    if (!user) return;
    await loadClinics(user);
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setClinics([]);
        setActiveClinic(null);
        setLoading(false);
        return;
      }

      setUser(session.user);

      try {
        await loadClinics(session.user);
      } catch (error: any) {
        toast.error(error.message || "Erro ao carregar clinica dental.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        navigate(`/dental/login?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, clinics, activeClinic, loading, refreshClinics }),
    [user, clinics, activeClinic, loading],
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to={`/dental/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <DentalContext.Provider value={value}>{children}</DentalContext.Provider>;
}
