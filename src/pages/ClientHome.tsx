import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileModal } from "@/components/ProfileModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  MapPin,
  Bell,
  Scissors,
  Sparkles,
  Hand,
  Heart,
  Brush,
  Eye,
  Palette,
  Flower2,
  Footprints,
  LayoutGrid,
  ChevronRight,
  Home,
  Calendar,
  Star,
  User as UserIcon,
  Search as SearchIcon,
  Navigation,
  X,
  Clock,
} from "lucide-react";

/* ============================================================
 * GoHub — Nova Home do Cliente
 * Identidade clara/moderna; usa Supabase real para barbearias
 * e RPC get_my_appointments_safe para próximos agendamentos.
 * Categorias são front-end por enquanto (filtro local).
 * ============================================================ */

type Category = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
};

const CATEGORIES: Category[] = [
  { id: "barbearias", label: "Barbearias", icon: Scissors, bg: "bg-indigo-50", fg: "text-indigo-600" },
  { id: "cabeleireiros", label: "Cabeleireiros", icon: Brush, bg: "bg-sky-50", fg: "text-sky-600" },
  { id: "unhas", label: "Unhas", icon: Sparkles, bg: "bg-rose-50", fg: "text-rose-500" },
  { id: "estetica", label: "Estética", icon: Heart, bg: "bg-pink-50", fg: "text-pink-500" },
  { id: "massoterapia", label: "Massoterapia", icon: Hand, bg: "bg-emerald-50", fg: "text-emerald-600" },
  { id: "sobrancelhas", label: "Sobrancelhas", icon: Eye, bg: "bg-amber-50", fg: "text-amber-600" },
  { id: "maquiagem", label: "Maquiagem", icon: Palette, bg: "bg-fuchsia-50", fg: "text-fuchsia-600" },
  { id: "depilacao", label: "Depilação", icon: Flower2, bg: "bg-teal-50", fg: "text-teal-600" },
  { id: "podologia", label: "Podologia", icon: Footprints, bg: "bg-orange-50", fg: "text-orange-500" },
  { id: "todos", label: "Todos", icon: LayoutGrid, bg: "bg-violet-50", fg: "text-violet-600" },
];

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
}

interface Appointment {
  id: string;
  status: string;
  starts_at: string;
  price: number;
  barbershop_name: string;
  barber_name: string;
  barber_avatar_url: string | null;
  service_name: string;
  barbershop_id?: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/70 rounded ${className}`} />;
}

function ShopCard({ shop, onClick }: { shop: Barbershop; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="select-none flex-shrink-0 w-64 bg-white rounded-[8px] overflow-hidden border border-slate-100 hover:border-indigo-200 active:scale-[0.98] transition text-left shadow-sm"
    >
      <div className="h-28 bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center overflow-hidden">
        {shop.logo_url ? (
          <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <Scissors className="w-10 h-10 text-indigo-300" />
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-[#172033] text-sm truncate">{shop.name}</h3>
        <p className="text-xs text-slate-500 truncate">{shop.address || "Endereço não informado"}</p>
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-medium">Novo</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-emerald-600">
            <Clock className="w-3 h-3" /> Disponível
          </span>
        </div>
      </div>
    </button>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <h2 className="text-base font-bold text-[#172033]">{title}</h2>
      {action}
    </div>
  );
}

function LocationModal({
  open,
  onOpenChange,
  onPick,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (label: string) => void;
  current: string | null;
}) {
  const [query, setQuery] = useState("");
  const [requesting, setRequesting] = useState(false);

  const saved: string[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("gohub_saved_addresses") || "[]");
    } catch {
      return [];
    }
  }, [open]);

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização indisponível neste dispositivo.");
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = `Localização atual (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`;
        onPick(label);
        setRequesting(false);
      },
      () => {
        toast.error("Não foi possível obter sua localização. Use a busca.");
        setRequesting(false);
      },
      { timeout: 8000 }
    );
  };

  const submitSearch = () => {
    const v = query.trim();
    if (!v) return;
    const next = [v, ...saved.filter((s) => s !== v)].slice(0, 5);
    localStorage.setItem("gohub_saved_addresses", JSON.stringify(next));
    onPick(v);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#172033]">Sua localização</DialogTitle>
          <DialogDescription className="text-slate-500">
            {current ? `Atual: ${current}` : "Selecione uma localização para mostrar estabelecimentos próximos."}
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={useCurrentLocation}
          disabled={requesting}
          className="select-none w-full flex items-center gap-3 p-3 rounded-[8px] border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-left disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#172033]">Usar localização atual</p>
            <p className="text-xs text-slate-500">{requesting ? "Buscando..." : "Permitir GPS do dispositivo"}</p>
          </div>
        </button>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Pesquisar endereço</label>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rua, bairro ou cidade"
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              className="bg-white border-slate-200 text-[#172033]"
            />
            <Button onClick={submitSearch} className="bg-[#4338CA] hover:bg-[#3730A3] text-white">
              Usar
            </Button>
          </div>
        </div>

        {saved.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Endereços salvos</p>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {saved.map((s) => (
                <button
                  key={s}
                  onClick={() => onPick(s)}
                  className="select-none w-full flex items-center gap-3 p-2 rounded-[6px] hover:bg-slate-50 transition text-left"
                >
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-[#172033] truncate">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BottomNav({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  const items = [
    { key: "home", label: "Início", icon: Home },
    { key: "search", label: "Buscar", icon: SearchIcon },
    { key: "appts", label: "Agenda", icon: Calendar },
    { key: "favs", label: "Favoritos", icon: Heart },
    { key: "profile", label: "Perfil", icon: UserIcon },
  ];
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`select-none flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${
                isActive ? "text-[#4338CA]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function ClientHome() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(() =>
    localStorage.getItem("gohub_active_category")
  );
  const [location, setLocation] = useState<string | null>(() =>
    localStorage.getItem("gohub_location")
  );
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [notifCount] = useState(0);

  // Role-based routing guard — só clientes ficam aqui
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!profile) return;
    const role = String(profile.role || "client").toLowerCase();
    const force = localStorage.getItem("force_barber_panel") === "true";
    if (!force) {
      if (role === "superadmin") return navigate("/super-admin", { replace: true });
      if (role === "owner" || role === "admin") return navigate("/admin", { replace: true });
      if (role === "barber") return navigate("/barber-dashboard", { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  // Fetch real data
  useEffect(() => {
    if (!user || !profile) return;

    (async () => {
      setLoadingShops(true);
      try {
        const { data, error } = await supabase.rpc("get_available_barbershops");
        if (error) throw error;
        setBarbershops((data || []) as Barbershop[]);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoadingShops(false);
      }
    })();

    (async () => {
      setLoadingAppts(true);
      try {
        const { data } = await supabase.rpc("get_my_appointments_safe");
        if (data?.success) {
          setAppointments((data.active || []) as Appointment[]);
          setHistory((data.history || []) as Appointment[]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAppts(false);
      }
    })();
  }, [user, profile]);

  const handlePickCategory = (id: string) => {
    setActiveCategory(id);
    localStorage.setItem("gohub_active_category", id);
    // Sem tela dedicada de categoria nesta fase: rolar para "Perto de você".
    document.getElementById("perto-de-voce")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePickLocation = (label: string) => {
    setLocation(label);
    localStorage.setItem("gohub_location", label);
    setLocationOpen(false);
  };

  const handleOpenShop = async (shop: Barbershop) => {
    try {
      await supabase.rpc("set_my_selected_barbershop", { p_barbershop_id: shop.id });
      localStorage.setItem("selectedBarbershopId", shop.id);
    } catch {}
    navigate(`/barbers?barbershopId=${shop.id}`);
  };

  const handleTab = (k: string) => {
    setActiveTab(k);
    if (k === "profile") setProfileOpen(true);
    else if (k === "search") document.getElementById("gh-search")?.focus();
    else if (k === "appts") document.getElementById("proximos")?.scrollIntoView({ behavior: "smooth" });
    else if (k === "favs") toast.info("Favoritos em breve");
    else if (k === "home") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const firstName = (profile?.name || user?.user_metadata?.name || user?.email || "Cliente").split(" ")[0];

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barbershops;
    return barbershops.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [search, barbershops]);

  const nextAppt = appointments[0];
  const rebookSources = useMemo(() => {
    const seen = new Set<string>();
    const out: Appointment[] = [];
    for (const a of history) {
      const key = a.barbershop_id || a.barbershop_name;
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(a);
      }
    }
    return out.slice(0, 10);
  }, [history]);

  if (authLoading) return <LoadingScreen />;

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#172033] pb-24"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-md mx-auto">
        {/* HEADER */}
        <header className="bg-white px-4 pt-4 pb-3 rounded-b-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">Olá,</p>
              <h1 className="text-lg font-bold text-[#172033] truncate">{firstName}</h1>
              <button
                onClick={() => setLocationOpen(true)}
                className="select-none mt-1 flex items-center gap-1 text-xs text-[#4338CA] font-medium hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{location || "Selecionar localização"}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info("Notificações em breve")}
                className="select-none relative w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition"
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 text-[#172033]" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#FF6B6B] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {notifCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setProfileOpen(true)}
                className="select-none transition active:scale-95"
                aria-label="Perfil"
              >
                <UserAvatar
                  name={profile?.name}
                  email={user?.email}
                  avatarUrl={profile?.avatar_url}
                  size="md"
                  className="border-slate-200 shadow-none"
                />
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="gh-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qual serviço você procura?"
              className="bg-[#F7F9FC] border-slate-200 pl-9 h-11 rounded-[8px] text-[#172033] placeholder:text-slate-400"
            />
          </div>
        </header>

        {/* CATEGORIAS */}
        <section className="mt-5">
          <SectionHeader title="O que você procura?" />
          <div className="px-4 grid grid-cols-4 gap-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handlePickCategory(c.id)}
                  className={`select-none flex flex-col items-center gap-1.5 active:scale-95 transition ${
                    isActive ? "" : ""
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-[8px] ${c.bg} ${
                      isActive ? "ring-2 ring-[#4338CA] ring-offset-2 ring-offset-[#F7F9FC]" : ""
                    } flex items-center justify-center transition`}
                  >
                    <Icon className={`w-6 h-6 ${c.fg}`} />
                  </div>
                  <span className="text-[11px] text-center text-[#172033] font-medium leading-tight">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* PRÓXIMO AGENDAMENTO */}
        <section id="proximos" className="mt-6">
          <SectionHeader title="Seus próximos agendamentos" />
          <div className="px-4">
            {loadingAppts ? (
              <Skeleton className="h-24 w-full rounded-[8px]" />
            ) : nextAppt ? (
              <button
                onClick={() => navigate(`/barbers?barbershopId=${nextAppt.barbershop_id}`)}
                className="select-none w-full text-left bg-white border border-slate-100 rounded-[8px] p-4 hover:border-indigo-200 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#4338CA] font-semibold uppercase tracking-wide">
                      {nextAppt.service_name}
                    </p>
                    <p className="text-sm font-semibold text-[#172033] truncate mt-0.5">
                      {nextAppt.barbershop_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">com {nextAppt.barber_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      {format(new Date(nextAppt.starts_at), "dd/MM", { locale: ptBR })}
                    </p>
                    <p className="text-sm font-bold text-[#172033]">
                      {format(new Date(nextAppt.starts_at), "HH:mm")}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Confirmado
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-[8px] p-6 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Você não tem agendamentos ativos.</p>
              </div>
            )}
          </div>
        </section>

        {/* PERTO DE VOCÊ */}
        <section id="perto-de-voce" className="mt-6">
          <SectionHeader
            title="Perto de você"
            action={
              <button
                onClick={() => navigate("/", { state: { select: true } })}
                className="text-xs text-[#4338CA] font-medium hover:underline"
              >
                Ver todos
              </button>
            }
          />
          {loadingShops ? (
            <div className="px-4 flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 w-64 flex-shrink-0 rounded-[8px]" />
              ))}
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="px-4">
              <div className="bg-white border border-dashed border-slate-200 rounded-[8px] p-6 text-center">
                <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhum estabelecimento encontrado.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
              {filteredShops.map((s) => (
                <div key={s.id} className="snap-start">
                  <ShopCard shop={s} onClick={() => handleOpenShop(s)} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AGENDE NOVAMENTE */}
        {rebookSources.length > 0 && (
          <section className="mt-6">
            <SectionHeader title="Agende novamente" />
            <div className="flex gap-3 overflow-x-auto px-4 pb-1">
              {rebookSources.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/barbers?barbershopId=${a.barbershop_id}`)}
                  className="select-none flex-shrink-0 w-56 bg-white rounded-[8px] border border-slate-100 hover:border-indigo-200 transition p-3 text-left active:scale-[0.98] shadow-sm"
                >
                  <p className="text-xs font-semibold text-[#172033] truncate">{a.barbershop_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {a.service_name} • {a.barber_name}
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-[#4338CA] bg-indigo-50 px-2 py-0.5 rounded">
                    Repetir agendamento
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* DESTAQUES */}
        <section className="mt-6">
          <SectionHeader title="Destaques" />
          {loadingShops ? (
            <div className="px-4">
              <Skeleton className="h-32 w-full rounded-[8px]" />
            </div>
          ) : filteredShops.length > 0 ? (
            <div className="px-4 space-y-3">
              {filteredShops.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleOpenShop(s)}
                  className="select-none w-full flex items-center gap-3 bg-white rounded-[8px] border border-slate-100 hover:border-sky-200 transition p-3 text-left active:scale-[0.99] shadow-sm"
                >
                  <div className="w-14 h-14 rounded-[8px] bg-gradient-to-br from-sky-50 to-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-[#0EA5E9]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#172033] truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {s.description || s.address || "Confira novidades"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-white bg-[#FF6B6B] px-2 py-1 rounded">
                    Novo
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4">
              <div className="bg-white border border-dashed border-slate-200 rounded-[8px] p-6 text-center">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Sem destaques no momento.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <BottomNav active={activeTab} onChange={handleTab} />

      <LocationModal
        open={locationOpen}
        onOpenChange={setLocationOpen}
        onPick={handlePickLocation}
        current={location}
      />
      <ProfileModal isOpen={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}