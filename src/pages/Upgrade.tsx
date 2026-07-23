import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap, ShieldCheck, Map, Calendar, FileText, Smartphone, Loader2, HardDrive, Cloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useState, useEffect } from "react";
import { getPlanStatus, type PlanStatus, type PlanTier } from "@/lib/plan-limits";
import { supabase } from "@/integrations/supabase/client";

const Upgrade = () => {
  const navigate = useNavigate();
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showCpfDialog, setShowCpfDialog] = useState(false);
  const [tempCpf, setTempCpf] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState<{ type: 'RECURRING' | 'SINGLE'; planTier: PlanTier } | null>(null);
  const [savingCpf, setSavingCpf] = useState(false);

  useEffect(() => {
    getPlanStatus().then(status => {
      setPlanStatus(status);
      setLoading(false);
    });
  }, []);

  const handleSubscription = async (type: 'RECURRING' | 'SINGLE', planTier: PlanTier = 'cloud') => {
    setPaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para assinar");
        navigate("/auth");
        return;
      }

      const { data: profile } = await (supabase
        .from("profiles")
        .select("cpf_cnpj, nome_rt")
        .eq("id", user.id)
        .single() as any);
      
      if (!profile?.cpf_cnpj) {
        setPendingCheckout({ type, planTier });
        setShowCpfDialog(true);
        setPaying(false);
        return;
      }

      await executeCheckout(type, planTier, user.id, user.email, profile.nome_rt, profile.cpf_cnpj);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao iniciar checkout: " + error.message);
      setPaying(false);
    }
  };

  const executeCheckout = async (
    type: 'RECURRING' | 'SINGLE',
    planTier: PlanTier,
    userId: string,
    email: string | undefined,
    name: string | null,
    cpfCnpj: string
  ) => {
    try {
      const response = await fetch('/api/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type,
          planTier,
          userId,
          email,
          name: name || 'Cliente RT Expert',
          cpfCnpj
        }),
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || "Erro ao processar pagamento");

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      toast.error(error.message);
      setPaying(false);
    }
  };

  const handleCpfSubmit = async () => {
    if (!tempCpf || tempCpf.length < 11) {
      toast.error("Informe um CPF ou CNPJ válido");
      return;
    }

    setSavingCpf(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await (supabase
        .from("profiles")
        .update({ cpf_cnpj: tempCpf } as any)
        .eq("id", user.id) as any);

      if (error) throw error;

      toast.success("Documento salvo com sucesso!");
      setShowCpfDialog(false);
      
      if (pendingCheckout) {
        setPaying(true);
        const { data: profile } = await (supabase
          .from("profiles")
          .select("nome_rt")
          .eq("id", user.id)
          .single() as any);
          
        await executeCheckout(
          pendingCheckout.type,
          pendingCheckout.planTier,
          user.id,
          user.email,
          profile?.nome_rt,
          tempCpf
        );
      }
    } catch (error: any) {
      toast.error("Erro ao salvar documento: " + error.message);
    } finally {
      setSavingCpf(false);
    }
  };

  const features = [
    {
      icon: <FileText className="w-5 h-5 text-emerald-500" />,
      title: "Checklists Ilimitados",
      description: "Sem travas mensais. Aplique quantos checklists precisar para todos os seus clientes."
    },
    {
      icon: <Map className="w-5 h-5 text-blue-500" />,
      title: "Mapa de Logística",
      description: "Visualize a geolocalização dos seus clientes e otimize suas rotas de visita."
    },
    {
      icon: <Calendar className="w-5 h-5 text-amber-500" />,
      title: "Sincronização com Google",
      description: "Agendamentos automáticos na sua Google Agenda com lembretes no celular."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-indigo-500" />,
      title: "Consulta Automática de CNPJ",
      description: "Cadastre clientes em segundos apenas digitando o CNPJ direto da base oficial."
    },
    {
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      title: "Relatórios Personalizados",
      description: "Remova a marca d'água e utilize o logotipo da sua empresa em todos os PDFs."
    },
    {
      icon: <Smartphone className="w-5 h-5 text-teal-500" />,
      title: "Suporte Prioritário",
      description: "Atendimento direto via WhatsApp para resolver qualquer dúvida ou problema rapidamente."
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-12 pb-20">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-primary" />
            Escolha o Plano Ideal para seu Negócio
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Planos <span className="text-primary italic">RT Expert</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Aumente a produtividade da sua consultoria com laudos em campo, integração Google e escolha o tipo de armazenamento perfeito.
          </p>
        </div>

        {/* Grid de Recursos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow bg-white dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-2">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Seleção de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-6">
          
          {/* Plano DRIVE (BYOS) */}
          <Card className={cn(
            "relative overflow-hidden border-2 transition-all group flex flex-col justify-between",
            planStatus?.planTier === 'drive' ? "border-emerald-500/30 bg-emerald-50/10" : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
          )}>
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
              Mais Econômico
            </div>

            <div>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full w-fit mb-2">
                  <HardDrive className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Expert DRIVE</CardTitle>
                <CardDescription>Use seu Próprio Google Drive (BYOS)</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center py-4">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">59</span>
                  <span className="text-xl font-medium text-slate-500">,90/mês</span>
                </div>
                <ul className="mt-6 text-xs text-left space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Fotos salvas no <strong>seu Google Drive</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Fotos <strong>Ilimitadas</strong> por vistoria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Checklists e Clientes ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Busca CNPJ + Agenda + Laudos PDF</span>
                  </li>
                </ul>
              </CardContent>
            </div>
            
            <CardFooter className="pt-4 pb-6">
              {planStatus?.planTier === 'drive' && planStatus.isPremium ? (
                <div className="w-full h-12 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <Check className="w-5 h-5" /> Plano Ativo
                </div>
              ) : (
                <Button 
                  className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleSubscription('RECURRING', 'drive')}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="animate-spin w-5 h-5" /> : "Assinar DRIVE (R$ 59,90)"}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Plano CLOUD */}
          <Card className={cn(
            "relative overflow-hidden border-2 transition-all group flex flex-col justify-between shadow-xl shadow-primary/10",
            planStatus?.planTier === 'cloud' ? "border-primary bg-primary/5" : "border-primary"
          )}>
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse">
              Mais Popular
            </div>

            <div>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto p-3 bg-primary/10 text-primary rounded-full w-fit mb-2">
                  <Cloud className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Expert CLOUD</CardTitle>
                <CardDescription>Tudo no Servidor RT Expert</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center py-4">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">89</span>
                  <span className="text-xl font-medium text-slate-500">,90/mês</span>
                </div>
                <ul className="mt-6 text-xs text-left space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span><strong>15 GB de Nuvem</strong> RT Expert Inclusos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Até <strong>15 Fotos</strong> por vistoria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Praticidade total sem precisar conectar Drive</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Busca CNPJ + Agenda + Laudos PDF</span>
                  </li>
                </ul>
              </CardContent>
            </div>
            
            <CardFooter className="pt-4 pb-6">
              {planStatus?.planTier === 'cloud' && planStatus.isPremium ? (
                <div className="w-full h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center gap-2 text-primary font-bold text-sm">
                  <Check className="w-5 h-5" /> Plano Ativo
                </div>
              ) : (
                <Button 
                  className="w-full h-12 font-bold shadow-lg shadow-primary/20"
                  onClick={() => handleSubscription('RECURRING', 'cloud')}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      Assinar CLOUD (R$ 89,90)
                      <Zap className="ml-1.5 w-4 h-4 fill-white" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Plano ENTERPRISE */}
          <Card className={cn(
            "relative overflow-hidden border-2 transition-all group flex flex-col justify-between",
            planStatus?.planTier === 'enterprise' ? "border-purple-500/30 bg-purple-50/10" : "border-slate-200 dark:border-slate-800 hover:border-purple-500/50"
          )}>
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
              Grandes Equipes
            </div>

            <div>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-full w-fit mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Enterprise</CardTitle>
                <CardDescription>Capacidade Máxima & Prioridade</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center py-4">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-slate-500">R$</span>
                  <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">149</span>
                  <span className="text-xl font-medium text-slate-500">,90/mês</span>
                </div>
                <ul className="mt-6 text-xs text-left space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span><strong>50 GB de Nuvem</strong> RT Expert Inclusos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Fotos <strong>Ilimitadas</strong> por vistoria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Suporte Prioritário VIP no WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Todos os recursos liberados</span>
                  </li>
                </ul>
              </CardContent>
            </div>
            
            <CardFooter className="pt-4 pb-6">
              {planStatus?.planTier === 'enterprise' && planStatus.isPremium ? (
                <div className="w-full h-12 bg-purple-50 dark:bg-purple-900/20 border border-purple-500/20 rounded-xl flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                  <Check className="w-5 h-5" /> Plano Ativo
                </div>
              ) : (
                <Button 
                  className="w-full h-12 font-bold bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => handleSubscription('RECURRING', 'enterprise')}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="animate-spin w-5 h-5" /> : "Assinar Enterprise (R$ 149,90)"}
                </Button>
              )}
            </CardFooter>
          </Card>

        </div>

        {/* Opção Avulsa PIX */}
        <div className="max-w-xl mx-auto pt-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Acesso Avulso por 30 Dias (PIX)</h3>
              <p className="text-xs text-slate-500">Sem renovação recorrente. Pagamento único de R$ 99,90.</p>
            </div>
            <Button 
              variant="outline"
              onClick={() => handleSubscription('SINGLE', 'cloud')}
              disabled={paying}
              className="shrink-0 font-bold border-slate-300 dark:border-slate-700"
            >
              Pagar no PIX (R$ 99,90)
            </Button>
          </Card>
        </div>

        <div className="text-center pt-4">
           <button 
             onClick={() => navigate("/")}
             className="text-sm text-slate-500 hover:text-primary font-medium transition-colors"
           >
             Ir para o Dashboard
           </button>
        </div>
      </div>

      {/* Dialog para solicitar CPF/CNPJ */}
      <Dialog open={showCpfDialog} onOpenChange={setShowCpfDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Informe seu CPF ou CNPJ</DialogTitle>
            <DialogDescription>
              Necessário para processar o pagamento e emitir sua nota fiscal no Asaas. Esse dado será salvo no seu perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj_dialog">Documento (apenas números)</Label>
              <Input
                id="cpf_cnpj_dialog"
                placeholder="Ex: 00000000000"
                value={tempCpf}
                onChange={(e) => setTempCpf(e.target.value.replace(/\D/g, ""))}
                maxLength={14}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCpfDialog(false)}
              disabled={savingCpf}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCpfSubmit}
              disabled={savingCpf || !tempCpf}
            >
              {savingCpf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : "Confirmar e Pagar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Upgrade;
