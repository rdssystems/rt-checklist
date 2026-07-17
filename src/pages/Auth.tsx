import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeRT, setNomeRT] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
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
    if (password !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (!aceitouTermos) {
      toast.error("É necessário aceitar os Termos de Uso e a Política de Privacidade");
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
          terms_accepted_at: new Date().toISOString()
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

  return (
    <div className="blueprint-grid relative flex min-h-screen w-full items-center justify-center bg-[#0E2A47] px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0E2A47]/0 via-[#0E2A47]/10 to-[#0E2A47]/80" />

      <div className="relative z-10 w-full max-w-md">
          <Card className="rounded-none border-white/20 bg-white shadow-2xl hover:shadow-2xl">
            <div className="stamp-in absolute -top-8 -right-4 z-20 flex h-24 w-24 items-center justify-center sm:-right-8">
              <svg viewBox="0 0 100 100" className="absolute h-full w-full">
                <path id="stampRing" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
                <text fill="#0E2A47" fontSize="7.4" letterSpacing="1.5" className="font-plex-mono">
                  <textPath href="#stampRing" startOffset="0%">
                    RT EXPERT • GESTÃO INTELIGENTE •
                  </textPath>
                </text>
              </svg>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0E2A47] bg-white">
                <img src="/logo.png" alt="RT Expert" className="h-9 w-9 object-contain" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 px-6 pt-10">
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-[#0E2A47]">
                RT Expert
              </h2>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="px-6 pb-0 pt-6">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-[#0E2A47]/15 bg-transparent p-0">
                  <TabsTrigger
                    value="login"
                    className="rounded-none border-b-2 border-transparent pb-3 font-plex-mono text-sm uppercase tracking-wider text-[#5A6B7E] data-[state=active]:border-[#0E2A47] data-[state=active]:bg-transparent data-[state=active]:text-[#0E2A47] data-[state=active]:shadow-none"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="cadastro"
                    className="rounded-none border-b-2 border-transparent pb-3 font-plex-mono text-sm uppercase tracking-wider text-[#5A6B7E] data-[state=active]:border-[#0E2A47] data-[state=active]:bg-transparent data-[state=active]:text-[#0E2A47] data-[state=active]:shadow-none"
                  >
                    Novo Cadastro
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="login" className="mt-0 outline-none">
                <form onSubmit={handleSignIn}>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="email-login" className="font-plex-mono text-xs uppercase tracking-wider text-[#5A6B7E]">
                        Email profissional
                      </Label>
                      <Input
                        id="email-login"
                        type="email"
                        placeholder="nome@empresa.com.br"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-none border-[#0E2A47]/25 bg-white font-plex text-base focus-visible:ring-[#0E2A47]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password-login" className="font-plex-mono text-xs uppercase tracking-wider text-[#5A6B7E]">
                          Senha
                        </Label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="cursor-pointer border-none bg-transparent p-0 font-plex text-sm font-semibold text-[#0E2A47] outline-none hover:underline"
                          disabled={isResetting}
                        >
                          {isResetting ? "Enviando..." : "Esqueceu a senha?"}
                        </button>
                      </div>
                      <Input
                        id="password-login"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-none border-[#0E2A47]/25 bg-white font-plex text-base focus-visible:ring-[#0E2A47]"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-none bg-[#0E2A47] font-plex-mono text-base uppercase tracking-wider text-white hover:bg-[#153A5F]"
                      disabled={loading}
                    >
                      {loading ? "Autenticando..." : "Entrar no sistema"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="cadastro" className="mt-0 outline-none">
                <form onSubmit={handleSignUp}>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome-rt" className="font-plex-mono text-xs uppercase tracking-wider text-[#5A6B7E]">
                        Nome completo
                      </Label>
                      <Input
                        id="nome-rt"
                        type="text"
                        placeholder="Nome do Responsável Técnico"
                        value={nomeRT}
                        onChange={e => setNomeRT(e.target.value)}
                        required
                        className="h-12 rounded-none border-[#0E2A47]/25 bg-white font-plex text-base focus-visible:ring-[#0E2A47]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-signup" className="font-plex-mono text-xs uppercase tracking-wider text-[#5A6B7E]">
                        Email de acesso
                      </Label>
                      <Input
                        id="email-signup"
                        type="email"
                        placeholder="nome@empresa.com.br"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-none border-[#0E2A47]/25 bg-white font-plex text-base focus-visible:ring-[#0E2A47]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password-signup" className="font-plex-mono text-xs uppercase tracking-wider text-[#5A6B7E]">
                        Crie uma senha
                      </Label>
                      <Input
                        id="password-signup"
                        type="password"
                        placeholder="Mínimo de 6 caracteres"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-none border-[#0E2A47]/25 bg-white font-plex text-base focus-visible:ring-[#0E2A47]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmar-senha" className="font-plex-mono text-xs uppercase tracking-wider text-[#5A6B7E]">
                        Confirme a senha
                      </Label>
                      <Input
                        id="confirmar-senha"
                        type="password"
                        placeholder="Repita a senha"
                        value={confirmarSenha}
                        onChange={e => setConfirmarSenha(e.target.value)}
                        required
                        className={`h-12 rounded-none bg-white font-plex text-base focus-visible:ring-[#0E2A47] ${
                          confirmarSenha && confirmarSenha !== password
                            ? "border-red-400"
                            : "border-[#0E2A47]/25"
                        }`}
                      />
                      {confirmarSenha && confirmarSenha !== password && (
                        <p className="font-plex text-xs text-red-500">As senhas não coincidem</p>
                      )}
                    </div>
                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aceitouTermos}
                        onChange={e => setAceitouTermos(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0E2A47]"
                      />
                      <span className="font-plex text-xs leading-relaxed text-[#5A6B7E]">
                        Li e aceito os{" "}
                        <a href="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0E2A47] underline">
                          Termos de Uso
                        </a>{" "}
                        e a{" "}
                        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0E2A47] underline">
                          Política de Privacidade
                        </a>{" "}
                        (LGPD)
                      </span>
                    </label>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-none bg-[#0E2A47] font-plex-mono text-base uppercase tracking-wider text-white hover:bg-[#153A5F]"
                      disabled={loading}
                    >
                      {loading ? "Criando conta..." : "Criar minha conta"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-4 px-6 pb-2">
              <div className="h-px flex-1 bg-[#0E2A47]/10" />
              <span className="font-plex-mono text-xs uppercase tracking-widest text-[#5A6B7E]">Ou continue com</span>
              <div className="h-px flex-1 bg-[#0E2A47]/10" />
            </div>

            <div className="p-6 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-none border-[#0E2A47]/25 font-plex text-base font-medium text-[#0E2A47] hover:bg-[#EEF4FB]"
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
                <svg className="h-5 w-5" viewBox="0 0 24 24">
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

          <p className="mt-8 text-center font-plex-mono text-xs uppercase tracking-widest text-[#A9C7E9]">
            © 2025 RT Expert · rDs Systems
          </p>
      </div>
    </div>
  );
};

export default Auth;
