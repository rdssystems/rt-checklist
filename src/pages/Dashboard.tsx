import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, FileCheck, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clientes: 0,
    modelos: 0,
    aplicacoes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [clientes, modelos, aplicacoes] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact" }),
        supabase.from("modelos_checklist").select("id", { count: "exact" }),
        supabase.from("aplicacoes_checklist").select("id", { count: "exact" }),
      ]);

      setStats({
        clientes: clientes.count || 0,
        modelos: modelos.count || 0,
        aplicacoes: aplicacoes.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats.clientes,
      icon: Users,
      description: "Empresas cadastradas",
      gradient: "bg-gradient-primary",
    },
    {
      title: "Modelos de Checklist",
      value: stats.modelos,
      icon: ClipboardList,
      description: "Templates criados",
      gradient: "bg-gradient-accent",
    },
    {
      title: "Checklists Aplicados",
      value: stats.aplicacoes,
      icon: FileCheck,
      description: "Inspeções realizadas",
      gradient: "bg-primary",
    },
  ];

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-8 fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Visão geral do sistema de gestão</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="overflow-hidden border-0 shadow-lg hover-lift"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`h-1 ${stat.gradient}`} />
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.gradient} p-3 rounded-xl shadow-md`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-4xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Welcome Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-primary h-2" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-primary-light rounded-xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              Bem-vindo ao Sistema
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Gerencie seus clientes e checklists de forma eficiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-5 bg-gradient-subtle rounded-xl border border-border/50">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    Primeiros Passos
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                      <span className="text-muted-foreground">Cadastre seus clientes na seção "Clientes"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                      <span className="text-muted-foreground">Crie modelos de checklist personalizados</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                      <span className="text-muted-foreground">Aplique checklists durante inspeções</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                      <span className="text-muted-foreground">Acompanhe o histórico de aplicações</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-5 bg-accent-light/30 rounded-xl border border-accent/20">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-accent-foreground">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    Dica Rápida
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use o mapa de clientes para visualizar geograficamente suas vistorias e planejar suas rotas de inspeção.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
