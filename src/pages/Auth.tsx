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
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

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
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          nome_rt: nomeRT,
          plan_type: 'premium',
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cadastro realizado! Verifique seu e-mail para confirmar a conta.", {
        duration: 8000,
      });
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Digite seu e-mail no campo acima para recuperar a senha");
      return;
    }
    
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    setIsResetting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
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

  return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:to-slate-900 p-4">
    {/* Brand Visual Identity - Premium Composition */}
    <div className="flex flex-col items-center mb-10">
      <div className="relative flex items-center justify-center w-20 h-20 mb-5 group">
        {/* Sombra de Brilho Dinâmica */}
        <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full group-hover:opacity-30 transition-opacity duration-500"></div>

        {/* Container do Ícone - Ampliado e sem bordas brancas */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-6 transition-transform hover:scale-105 duration-300">
          <img src="/logo.png" alt="RT Expert Logo" className="w-full h-full object-contain drop-shadow-2xl" />
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

    <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
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
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer outline-none"
                    disabled={isResetting}
                  >
                    {isResetting ? "Enviando..." : "Esqueceu a senha?"}
                  </button>
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

      {/* Social Login Divider */}
      <div className="px-6 pb-2 flex items-center gap-4">
        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ou continue com</span>
        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
      </div>

      <div className="p-6 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-800 font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/`,
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                }
              }
            });
            if (error) toast.error(error.message);
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>
      </div>
    </Card>

    <p className="mt-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
      © 2025 RT Expert - rDs Systems
    </p>
  </div>;
};

export default Auth;