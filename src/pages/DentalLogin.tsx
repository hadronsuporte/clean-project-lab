import { useEffect, useState } from "react";
import { Activity, Eye, EyeOff, Lock, Mail, Stethoscope, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function DentalLogin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirect = params.get("redirect") || "/dental";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate(redirect, { replace: true });
      }
    });
  }, [navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Informe seu nome.");
        if (!clinicName.trim()) throw new Error("Informe o nome da clinica.");

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim(),
              dental_clinic_name: clinicName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session?.user) {
          await supabase.rpc("bootstrap_my_dental_clinic" as any, { p_name: clinicName.trim() } as any);
          toast.success("Conta criada com sucesso.");
          navigate("/dental", { replace: true });
        } else {
          toast.success("Conta criada. Verifique seu e-mail para confirmar o acesso.");
          setMode("login");
        }

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      navigate(redirect, { replace: true });
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("Invalid login credentials")) {
        toast.error("E-mail ou senha incorretos.");
      } else if (message.includes("Password should be at least")) {
        toast.error("A senha precisa ter pelo menos 6 caracteres.");
      } else if (message.includes("already registered")) {
        toast.error("Este e-mail ja esta cadastrado.");
      } else {
        toast.error(message || "Nao foi possivel entrar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef6ff] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">
        <section className="hidden lg:flex min-h-[640px] bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 text-white p-10 flex-col justify-between">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-white text-blue-700 flex items-center justify-center shadow-lg mb-8">
              <Stethoscope className="h-7 w-7" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-100 mb-4">GoHub Dental</p>
            <h1 className="text-5xl font-bold leading-tight max-w-md">
              Gestao da clinica em uma tela simples.
            </h1>
            <p className="text-blue-50 mt-5 max-w-sm">
              Agenda, pacientes, financeiro e equipe em um ambiente desktop pensado para clinicas.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["Agenda", "Pacientes", "Financeiro"].map((item) => (
              <div key={item} className="rounded-xl bg-white/15 border border-white/20 p-4 backdrop-blur">
                <Activity className="h-5 w-5 mb-3 text-blue-100" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <div className="lg:hidden h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-5">
              <Stethoscope className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              {mode === "login" ? "Entrar no Dental" : "Criar acesso Dental"}
            </h2>
            <p className="text-slate-500 mt-2">
              {mode === "login"
                ? "Acesse para gerenciar agenda e pacientes."
                : "Crie seu acesso e sua primeira clinica dental."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="relative">
                  <UserRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    className="h-12 pl-10 bg-white border-slate-300 text-slate-900"
                    required
                  />
                </div>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    value={clinicName}
                    onChange={(event) => setClinicName(event.target.value)}
                    placeholder="Nome da clinica"
                    className="h-12 pl-10 bg-white border-slate-300 text-slate-900"
                    required
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail"
                className="h-12 pl-10 bg-white border-slate-300 text-slate-900"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha"
                className="h-12 pl-10 pr-10 bg-white border-slate-300 text-slate-900"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode((current) => (current === "login" ? "signup" : "login"))}
            className="mt-6 text-sm text-slate-600 hover:text-blue-700"
          >
            {mode === "login" ? "Ainda nao tenho conta Dental" : "Ja tenho conta Dental"}
          </button>
        </section>
      </div>
    </main>
  );
}
