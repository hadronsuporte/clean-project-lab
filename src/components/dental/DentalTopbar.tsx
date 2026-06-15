import { Bell, ChevronRight, LogOut, MessageSquare, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useDental } from "@/contexts/DentalContext";

export function DentalTopbar() {
  const navigate = useNavigate();
  const { activeClinic, user } = useDental();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/dental/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-blue-600 text-white">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">GoHub Dental</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
            <span className="text-sm opacity-90">{activeClinic?.name || "Agenda"}</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button className="p-2 hover:bg-white/10 rounded-full" title="Notificacoes">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full" title="Mensagens">
              <MessageSquare className="h-5 w-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full" title="Configuracoes">
              <Settings className="h-5 w-5" />
            </button>
            <button className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center" title={user?.email}>
              <User className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full" title="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
