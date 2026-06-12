import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Bell,
  Car,
  Gift,
  ChevronRight,
  HeartPulse,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  Search,
  Scissors,
  Sparkles,
  Star,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoutButton } from "@/components/LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGear } from "@/components/AdminGear";
import { UserAvatar } from "@/components/UserAvatar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ProfileModal } from "@/components/ProfileModal";
import { cn } from "@/lib/utils";

type BusinessType =
  | "all"
  | "barbershop"
  | "auto_aesthetic"
  | "clinic"
  | "beauty"
  | "wellness";

interface HubBusiness {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  business_type: BusinessType | string | null;
  latitude: number | null;
  longitude: number | null;
  average_rating: number | null;
  rating_count: number | null;
  min_price: number | null;
  services_count: number | null;
  matched_services: string[] | null;
  distance_km: number | null;
}

const categories: Array<{
  id: BusinessType;
  label: string;
  shortLabel: string;
  icon: typeof Scissors;
  color: string;
}> = [
  { id: "all", label: "Todos", shortLabel: "Todos", icon: Store, color: "bg-slate-900 text-white" },
  { id: "barbershop", label: "Barbearias", shortLabel: "Barba", icon: Scissors, color: "bg-[#111827] text-[#f8c33a]" },
  { id: "beauty", label: "Beleza", shortLabel: "Beleza", icon: Sparkles, color: "bg-[#ffe4ee] text-[#c9184a]" },
  { id: "auto_aesthetic", label: "Estetica auto", shortLabel: "Auto", icon: Car, color: "bg-[#dcfce7] text-[#047857]" },
  { id: "clinic", label: "Clinicas", shortLabel: "Clinica", icon: HeartPulse, color: "bg-[#dbeafe] text-[#1d4ed8]" },
  { id: "wellness", label: "Bem-estar", shortLabel: "Bem-estar", icon: Building2, color: "bg-[#fef3c7] text-[#b45309]" },
];

const businessTypeLabel: Record<string, string> = {
  barbershop: "Barbearia",
  beauty: "Beleza",
  auto_aesthetic: "Estetica automotiva",
  clinic: "Clinica",
  wellness: "Bem-estar",
};

const formatDistance = (distance: number | null) => {
  if (distance === null || distance === undefined) return null;
  if (distance < 1) return `${Math.max(50, Math.round(distance * 1000 / 50) * 50)} m`;
  return `${distance.toFixed(distance < 10 ? 1 : 0).replace(".", ",")} km`;
};

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price);
};

const normalizeBusiness = (shop: any): HubBusiness => ({
  id: shop.id,
  name: shop.name,
  address: shop.address ?? null,
  phone: shop.phone ?? null,
  logo_url: shop.logo_url ?? null,
  cover_url: shop.cover_url ?? null,
  description: shop.description ?? null,
  business_type: shop.business_type ?? "barbershop",
  latitude: shop.latitude === null || shop.latitude === undefined ? null : Number(shop.latitude),
  longitude: shop.longitude === null || shop.longitude === undefined ? null : Number(shop.longitude),
  average_rating: shop.average_rating === null || shop.average_rating === undefined ? 5 : Number(shop.average_rating),
  rating_count: shop.rating_count === null || shop.rating_count === undefined ? 0 : Number(shop.rating_count),
  min_price: shop.min_price === null || shop.min_price === undefined ? null : Number(shop.min_price),
  services_count: shop.services_count === null || shop.services_count === undefined ? null : Number(shop.services_count),
  matched_services: Array.isArray(shop.matched_services) ? shop.matched_services : [],
  distance_km: shop.distance_km === null || shop.distance_km === undefined ? null : Number(shop.distance_km),
});

export default function SelectBarbershop() {
  const [businesses, setBusinesses] = useState<HubBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [canBrowse, setCanBrowse] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BusinessType>("all");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const manualSelection = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("select") === "true" || location.state?.select === true;
  }, [location.state]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (!profile) return;

    if (!manualSelection) {
      if (profile.isSuperAdmin) {
        navigate("/super-admin", { replace: true });
        return;
      }

      if (profile.isOwner || profile.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      if (profile.role === "barber") {
        navigate("/barber-dashboard", { replace: true });
        return;
      }
    }

    setCanBrowse(true);
  }, [authLoading, user, profile, manualSelection, navigate]);

  const fetchBusinesses = useCallback(async () => {
    if (!canBrowse) return;

    setIsLoading(true);

    const { data, error } = await supabase.rpc("get_hub_businesses" as any, {
      p_search: search.trim() || null,
      p_business_type: selectedCategory === "all" ? null : selectedCategory,
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
    } as any);

    if (!error) {
      setBusinesses((data || []).map(normalizeBusiness));
      setIsLoading(false);
      return;
    }

    console.error("HUB BUSINESSES ERROR", error);

    const fallback = await supabase.rpc("get_available_barbershops");

    if (fallback.error) {
      console.error("BARBERSHOPS ERROR", fallback.error);
      toast.error(fallback.error.message);
      setIsLoading(false);
      return;
    }

    setBusinesses((fallback.data || []).map(normalizeBusiness));
    setIsLoading(false);
  }, [canBrowse, coords?.lat, coords?.lng, search, selectedCategory]);

  useEffect(() => {
    const timeout = window.setTimeout(fetchBusinesses, search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [fetchBusinesses, search]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Localizacao nao disponivel neste aparelho.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
        toast.success("Empresas ordenadas por proximidade.");
      },
      () => {
        setIsLocating(false);
        toast.error("Nao foi possivel acessar sua localizacao.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const handleSelect = async (business: HubBusiness) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("set_my_selected_barbershop", {
        p_barbershop_id: business.id,
      });

      if (error) {
        console.error("Error setting business:", error);
        toast.error(error.message || "Erro ao salvar estabelecimento selecionado");
        return;
      }

      if (data?.success === false) {
        toast.error(data.error || "Erro ao salvar estabelecimento selecionado");
        return;
      }

      if (data?.success) {
        await refreshProfile?.();
        localStorage.setItem("selectedBarbershopId", data.barbershop_id);
        navigate("/client-home", { replace: true });
      }
    } catch (error: any) {
      console.error("Unexpected error selecting business:", error);
      toast.error(error.message || "Ocorreu um erro inesperado");
    }
  };

  const openMaps = (business: HubBusiness, event: React.MouseEvent) => {
    event.stopPropagation();

    const query = business.latitude && business.longitude
      ? `${business.latitude},${business.longitude}`
      : `${business.name} ${business.address || ""}`;

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
  };

  if (isLoading && !businesses.length || authLoading || !canBrowse) {
    return <LoadingScreen />;
  }

  const firstName = profile?.name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "Usuario";
  const nearbyCount = businesses.filter((business) => business.distance_km !== null).length;

  return (
    <div className="min-h-screen bg-[#f4f5f8] pb-24 font-sans text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-[#f4f5f8]">
        <section className="relative min-h-[290px] overflow-hidden bg-gradient-to-br from-[#e90046] via-[#ed174f] to-[#8d35ff] px-5 pb-16 pt-7 text-white">
          <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -right-16 top-20 h-56 w-56 rounded-full bg-black/10" />
          <div className="absolute bottom-4 right-5 flex h-28 w-28 rotate-6 items-center justify-center rounded-[32px] bg-white/15 backdrop-blur">
            <img src="/Logo-GoHub.png" alt="GoHub" className="w-24 rounded-2xl bg-white p-2 shadow-xl" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <img src="/Logo-GoHub.png" alt="GoHub" className="h-10 rounded-2xl bg-white px-3 py-2" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="rounded-full bg-white/15 p-1 active:scale-95"
              >
                <UserAvatar
                  name={profile?.name}
                  email={user?.email}
                  avatarUrl={profile?.avatar_url}
                  size="md"
                  className="border border-white/40 bg-white"
                />
              </button>
              <LogoutButton showText={false} />
            </div>
          </div>

          <div className="relative z-10 mt-10 max-w-[250px]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">GoHub chegou</p>
            <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-tight">
              servicos perto de voce
            </h1>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/90">
              Encontre empresas locais, escolha um servico e agende em poucos toques.
            </p>
          </div>
        </section>

        <main className="relative -mt-10 rounded-t-[34px] bg-white px-5 pb-8 pt-6 shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Boa tarde, {firstName}</p>
              <button
                type="button"
                onClick={requestLocation}
                className="mt-1 flex max-w-[260px] items-center gap-1 text-left text-base font-black text-slate-950"
              >
                <MapPin className="h-4 w-4 shrink-0 text-[#ed174f]" />
                <span className="truncate">{coords ? "Empresas perto de voce" : "Usar minha localizacao"}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>
            <button
              type="button"
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-900"
              aria-label="Notificacoes"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ed174f] px-1 text-[10px] font-black text-white">
                1
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-[22px] bg-[#f7e8ff] px-4 py-3 text-[#8d35ff]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
                  <Gift className="h-5 w-5" />
                </span>
                <p className="text-sm font-extrabold">Voce ganhou uma nova forma de agendar!</p>
              </div>
              <span className="text-lg font-bold leading-none">x</span>
            </div>
          </div>

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar corte, barba, estetica, consulta..."
              className="h-13 rounded-2xl border-slate-200 bg-slate-50 py-6 pl-11 pr-4 text-[15px] font-semibold text-slate-950 placeholder:text-slate-400 focus-visible:ring-[#ed174f]"
            />
          </div>

          <section className="mt-6">
            <div className="grid grid-cols-3 gap-x-3 gap-y-5">
              {categories.map((category) => {
                const Icon = category.icon;
                const selected = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex flex-col items-center gap-2 active:scale-95"
                  >
                    <span
                      className={cn(
                        "flex h-[62px] w-[62px] items-center justify-center rounded-3xl border shadow-sm",
                        selected ? "border-[#ed174f] bg-[#fff1f5]" : "border-slate-100 bg-slate-50",
                      )}
                    >
                      <Icon className={cn("h-7 w-7", selected ? "text-[#ed174f]" : "text-slate-700")} />
                    </span>
                    <span className="max-w-[92px] truncate text-center text-xs font-extrabold text-slate-800">
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#c77dff] to-[#8d35ff] p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">GoHub Pro</p>
                <h2 className="mt-1 text-2xl font-black leading-tight">Agende sem ligar</h2>
                <p className="mt-2 text-sm font-semibold text-white/85">
                  Horarios disponiveis, empresas perto de voce e lembretes automaticos.
                </p>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/18">
                <Sparkles className="h-8 w-8" />
              </div>
            </div>
          </section>

          <section className="mt-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {search ? "Resultado da busca" : "Estabelecimentos"}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {coords && nearbyCount > 0
                    ? `${nearbyCount} com distancia calculada. Todos aparecem.`
                    : "Ative a localizacao para ver os mais proximos primeiro."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={requestLocation}
                disabled={isLocating}
                className="h-9 rounded-full px-3 text-xs font-black text-[#ed174f] hover:bg-pink-50 hover:text-[#ed174f]"
              >
                <LocateFixed className={cn("mr-1 h-4 w-4", isLocating && "animate-pulse")} />
                Perto
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {isLoading && (
                <div className="rounded-3xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  Buscando os melhores horarios...
                </div>
              )}

              {!isLoading && businesses.map((business) => {
                const distance = formatDistance(business.distance_km);
                const minPrice = formatPrice(business.min_price);
                const label = businessTypeLabel[business.business_type || "barbershop"] || "Servico local";
                const services = (business.matched_services || []).slice(0, 3);

                return (
                  <article
                    key={business.id}
                    onClick={() => handleSelect(business)}
                    onContextMenu={(event) => event.preventDefault()}
                    className="overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition active:scale-[0.99]"
                  >
                    <div className="relative h-28 bg-slate-200">
                      {business.cover_url || business.logo_url ? (
                        <img
                          src={business.cover_url || business.logo_url || ""}
                          alt={business.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#22005d] to-[#119cff]">
                          <Store className="h-9 w-9 text-white/80" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
                          {business.logo_url ? (
                            <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
                          ) : (
                            <Store className="h-7 w-7 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 text-white">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">{label}</p>
                          <h3 className="truncate text-lg font-black">{business.name}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {(business.average_rating || 5).toFixed(1).replace(".", ",")}
                            </span>
                            {distance && <span>{distance}</span>}
                            {minPrice && <span>A partir de {minPrice}</span>}
                          </div>
                          {business.address && (
                            <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">{business.address}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => openMaps(business, event)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#119cff] active:scale-95"
                          aria-label="Abrir no mapa"
                        >
                          <MapPin className="h-5 w-5" />
                        </button>
                      </div>

                      {business.description && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {business.description}
                        </p>
                      )}

                      {services.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {services.map((service) => (
                            <span
                              key={service}
                              className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      )}

                      <Button
                        type="button"
                        className="h-11 w-full rounded-2xl bg-[#ed174f] text-sm font-extrabold text-white hover:bg-[#c81042]"
                      >
                        Ver horarios
                      </Button>
                    </div>
                  </article>
                );
              })}

              {!isLoading && businesses.length === 0 && (
                <div className="rounded-3xl bg-slate-50 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                    <Search className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">Nada encontrado</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Tente buscar por outro servico ou selecione uma categoria diferente.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t border-slate-200 bg-white px-4 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
          <button type="button" className="flex flex-col items-center gap-1 text-[#ed174f]">
            <Store className="h-6 w-6" />
            <span className="text-[11px] font-black">Inicio</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1 text-slate-400">
            <Search className="h-6 w-6" />
            <span className="text-[11px] font-black">Busca</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (profile?.barbershop_id) {
                navigate("/client-home");
              } else {
                toast.info("Escolha um estabelecimento para ver sua agenda.");
              }
            }}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <Scissors className="h-6 w-6" />
            <span className="text-[11px] font-black">Agenda</span>
          </button>
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <UserAvatar
              name={profile?.name}
              email={user?.email}
              avatarUrl={profile?.avatar_url}
              size="sm"
              className="border border-slate-200"
            />
            <span className="text-[11px] font-black">Perfil</span>
          </button>
        </nav>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
    </div>
  );
}
