import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap, ShieldCheck, Map, Calendar, FileText, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { getPlanStatus, type PlanStatus } from "@/lib/plan-limits";

const Upgrade = () => {
  const navigate = useNavigate();
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getPlanStatus().then(status => {
      setPlanStatus(status);
      setLoading(false);
    });
  }, []);

  const handleSubscription = async (type: 'RECURRING' | 'SINGLE') => {
    setPaying(true);
    try {
      const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para assinar");
        navigate("/auth");
        return;
      }

      const response = await fetch('/api/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.nome_rt || 'Cliente RT Expert'
        }),
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || "Erro ao processar pagamento");

      // Redirecionar para o checkout do Asaas
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao iniciar checkout: " + error.message);
    } finally {
      setPaying(false);
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
      description: "Cadastre clientes em segundos apenas digitando o CNPJ. Dados puxados direto da base oficial."
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
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-12 pb-20">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-primary" />
            Escolha a Excelência
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plano <span className="text-primary italic">RT Expert</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A ferramenta definitiva para o Responsável Técnico que busca produtividade, 
            organização e profissionalismo em cada inspeção.
          </p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-6">
          {/* Opção Recorrente */}
          <Card className={cn(
            "relative overflow-hidden border-2 transition-all group",
            planStatus?.planType === 'premium' ? "border-emerald-500/20 bg-emerald-50/5" : "border-primary shadow-xl shadow-primary/10"
          )}>
            {planStatus?.planType !== 'premium' && (
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse">
                Melhor Valor
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Assinatura Expert</CardTitle>
              <CardDescription>Plano Recorrente Mensal</CardDescription>
            </CardHeader>
            
            <CardContent className="text-center py-6">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-slate-500">R$</span>
                <span className="text-6xl font-black tracking-tight text-slate-900 dark:text-white">80</span>
                <span className="text-xl font-medium text-slate-500">/mês</span>
              </div>
              <p className="mt-4 text-sm text-slate-500 font-medium">
                No cartão de crédito. <br />
                Acesso imediato e renovação automática.
              </p>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pb-10">
              {planStatus?.planType === 'premium' ? (
                <div className="w-full h-14 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/20 rounded-xl flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Check className="w-6 h-6" />
                  Plano Ativo
                </div>
              ) : (
                <Button 
                  className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/25 group"
                  onClick={() => handleSubscription('RECURRING')}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="animate-spin w-6 h-6" /> : (
                    <>
                      Assinar Agora (R$ 80)
                      <Zap className="ml-2 w-5 h-5 fill-white group-hover:scale-125 transition-transform" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Opção Avulsa */}
          <Card className="relative overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Acesso 30 Dias</CardTitle>
              <CardDescription>Pagamento Único via PIX</CardDescription>
            </CardHeader>
            
            <CardContent className="text-center py-6">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-slate-500">R$</span>
                <span className="text-6xl font-black tracking-tight text-slate-900 dark:text-white">99</span>
                <span className="text-xl font-medium text-slate-500">,90</span>
              </div>
              <p className="mt-4 text-sm text-slate-500 font-medium">
                Sem compromisso mensal. <br />
                Liberação instantânea após o PIX.
              </p>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pb-10">
              {planStatus?.planType === 'premium' ? (
                <div className="w-full h-14 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-3 text-slate-400 font-bold opacity-50">
                   Você já é Expert
                </div>
              ) : (
                <Button 
                  variant="outline"
                  className="w-full h-14 text-lg font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  onClick={() => handleSubscription('SINGLE')}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="animate-spin w-5 h-5" /> : "Comprar Mês (R$ 99,90)"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="text-center pt-8">
           <button 
             onClick={() => navigate("/")}
             className="text-sm text-slate-500 hover:text-primary font-medium transition-colors"
           >
             Ir para o Dashboard
           </button>
        </div>
      </div>
    </Layout>
  );
};

export default Upgrade;
