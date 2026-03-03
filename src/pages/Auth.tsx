import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardCheck, Sparkles } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeRT, setNomeRT] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/");
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nomeRT) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome_rt: nomeRT
        }
      }
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cadastro realizado com sucesso!");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado com sucesso!");
    }
  };

  return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
    {/* Brand Visual Identity - Premium Composition */}
    <div className="flex flex-col items-center mb-10">
      <div className="relative flex items-center justify-center w-20 h-20 mb-5 group">
        {/* Sombra de Brilho Dinâmica */}
        <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full group-hover:opacity-30 transition-opacity duration-500"></div>

        {/* Container do Ícone (Glassmorphism look) */}
        <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-blue-700 rounded-[1.25rem] shadow-xl shadow-primary/30 border border-white/20">
          <ClipboardCheck className="w-8 h-8 text-white drop-shadow-md" strokeWidth={2.5} />
        </div>

        {/* Elemento Extra (Notificação de Sucesso/Brilho) */}
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-teal-400 border-[2.5px] border-slate-50 dark:border-slate-950 rounded-full flex items-center justify-center shadow-md z-10 hover:scale-110 transition-transform cursor-default">
          <Sparkles className="w-[10px] h-[10px] text-teal-950 fill-teal-950" />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
        RT<span className="text-primary font-light">Expert</span>
      </h1>

      <p className="mt-1.5 font-bold text-[0.65rem] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] relative flex items-center gap-2">
        <span className="w-4 h-px bg-slate-300 dark:bg-slate-700"></span>
        Gestão Inteligente
        <span className="w-4 h-px bg-slate-300 dark:bg-slate-700"></span>
      </p>
    </div>

    <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
      <Tabs defaultValue="login" className="w-full">
        <CardHeader className="p-6 pb-2">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white transition-all font-semibold">Login</TabsTrigger>
            <TabsTrigger value="cadastro" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white transition-all font-semibold">Novo Cadastro</TabsTrigger>
          </TabsList>
        </CardHeader>

        <TabsContent value="login" className="mt-0 outline-none">
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4 p-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-login" className="text-xs font-bold text-slate-500 uppercase ml-1">Email Profissional</Label>
                <Input id="email-login" type="email" placeholder="nome@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} required
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-primary focus-visible:border-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password-login" className="text-xs font-bold text-slate-500 uppercase">Senha</Label>
                  <a href="#" className="text-xs font-semibold text-primary hover:underline">Esqueceu a senha?</a>
                </div>
                <Input id="password-login" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-primary focus-visible:border-primary" />
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-sm transition-all" disabled={loading}>
                {loading ? "Autenticando..." : "Entrar no Sistema"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="cadastro" className="mt-0 outline-none">
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4 p-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nome-rt" className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</Label>
                <Input id="nome-rt" type="text" placeholder="Nome do Responsável Técnico" value={nomeRT} onChange={e => setNomeRT(e.target.value)} required
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-primary focus-visible:border-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-signup" className="text-xs font-bold text-slate-500 uppercase ml-1">Email de Acesso</Label>
                <Input id="email-signup" type="email" placeholder="nome@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} required
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-primary focus-visible:border-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup" className="text-xs font-bold text-slate-500 uppercase ml-1">Crie uma Senha</Label>
                <Input id="password-signup" type="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-primary focus-visible:border-primary" />
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button type="submit" className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold rounded-xl shadow-sm transition-all" disabled={loading}>
                {loading ? "Criando Conta..." : "Criar Minha Conta"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>

    <p className="mt-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
      © {new Date().getFullYear()} RT-Checklist. Gestão Simplificada.
    </p>
  </div>;
};

export default Auth;