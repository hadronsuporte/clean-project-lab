import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import {
  Car,
  HeartPulse,
  Lock,
  Mail,
  Phone,
  Scissors,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    const redirectUser = async (profileData: any) => {
      localStorage.removeItem("force_barber_panel");

      const role = String(profileData.role || "client").toLowerCase();

      if (role === "superadmin") {
        navigate("/super-admin", { replace: true });
      } else if (role === "owner" || role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "barber") {
        navigate("/barber-dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    if (!loading && user && profile) {
      redirectUser(profile);
    }
  }, [user, profile, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              phone: whatsapp,
              role: "client",
            },
          },
        });

        if (authError) throw authError;

        toast.success("Conta criada com sucesso!");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const { data: panelData } = await supabase.rpc("get_my_app_panels");

        if (panelData) {
          const role = String(panelData.role || "client").toLowerCase();

          localStorage.removeItem("force_barber_panel");

          if (role === "superadmin") {
            navigate("/super-admin", { replace: true });
          } else if (role === "owner" || role === "admin") {
            navigate("/admin", { replace: true });
          } else if (role === "barber") {
            navigate("/barber-dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (error: any) {
      let friendlyMessage = "Ocorreu um erro. Por favor, tente novamente.";
      const message = error.message || "";

      if (message.includes("Invalid login credentials")) {
        friendlyMessage = "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
      } else if (message.includes("Email not confirmed")) {
        friendlyMessage = "Por favor, confirme seu e-mail para acessar a conta.";
      } else if (message.includes("User already registered")) {
        friendlyMessage = "Este e-mail ja esta em uso. Tente fazer login ou use outro e-mail.";
      } else if (message.includes("Password should be at least")) {
        friendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
      } else if (message.includes("rate limit")) {
        friendlyMessage = "Muitas tentativas. Por favor, aguarde um momento antes de tentar novamente.";
      }

      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const isApp = Capacitor.isNativePlatform();
      const redirectTo = isApp
        ? "com.gohubbrasil.app://auth/callback"
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: isApp,
        },
      });

      if (error) throw error;

      if (isApp) {
        if (!data?.url) {
          throw new Error("Nao foi possivel iniciar o login com Google");
        }

        await Browser.open({ url: data.url, windowName: "_self" });
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const serviceHighlights = [
    { icon: Scissors, label: "Barba" },
    { icon: Sparkles, label: "Beleza" },
    { icon: Car, label: "Auto" },
    { icon: HeartPulse, label: "Saude" },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fc] font-sans text-slate-950">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col">
        <div className="absolute inset-x-0 top-0 h-[410px] overflow-hidden rounded-b-[38px] bg-gradient-to-br from-[#22005d] via-[#1c32a0] to-[#0aa7ff]">
          <div className="absolute -left-16 top-12 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -right-20 top-24 h-56 w-56 rounded-full bg-[#00d1ff]/25" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-6 pb-6 pt-10">
          <div className="flex items-center justify-between">
            <img
              src="/Logo-GoHub.png"
              alt="GoHub"
              className="h-12 w-auto rounded-2xl bg-white px-3 py-2 shadow-lg"
            />
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              agenda local
            </span>
          </div>

          <div className="mt-10 max-w-[300px] text-white">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-100">GoHub Brasil</p>
            <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight">
              Encontre servicos perto de voce
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Barbearias, beleza, clinicas e servicos locais em uma unica agenda.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-4 gap-2">
            {serviceHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-2xl bg-white/95 px-2 py-3 text-center shadow-lg">
                  <Icon className="mx-auto h-5 w-5 text-[#22005d]" />
                  <span className="mt-2 block text-[10px] font-extrabold text-slate-700">{item.label}</span>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAuth} className="mt-7 space-y-3 rounded-[28px] bg-white p-5 shadow-2xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {isSignUp ? "Criar conta" : "Entrar"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isSignUp ? "Comece a usar o GoHub agora." : "Acesse sua agenda e seus servicos."}
              </p>
            </div>

            <div className="space-y-2">
              {isSignUp && (
                <>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Nome completo"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-slate-950 placeholder:text-slate-400 focus-visible:ring-[#119cff]"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="WhatsApp"
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-slate-950 placeholder:text-slate-400 focus-visible:ring-[#119cff]"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="E-mail"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-slate-950 placeholder:text-slate-400 focus-visible:ring-[#119cff]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Senha"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-slate-950 placeholder:text-slate-400 focus-visible:ring-[#119cff]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl bg-[#119cff] py-6 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 hover:bg-[#0b80d0]"
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs font-semibold text-slate-500"
              >
                Esqueceu a senha?
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-semibold text-slate-500"
              >
                {isSignUp ? (
                  <>
                    Ja tem conta? <span className="text-[#119cff]">Entrar</span>
                  </>
                ) : (
                  <>
                    Novo aqui? <span className="text-[#119cff]">Cadastrar</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative pt-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-semibold">
                <span className="bg-white px-3 text-slate-400">ou continue com</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-slate-200 bg-white py-6 font-bold text-slate-700 transition-all hover:bg-slate-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
