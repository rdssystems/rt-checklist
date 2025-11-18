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
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-card rounded-3xl p-10 border border-border/40 shadow-lg">
          <h1 className="text-3xl font-medium mb-3 text-foreground">Bem-vindo ao Checklist RT</h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Sistema completo para gerenciar checklists de Vigilância Sanitária.
            Mantenha seus clientes organizados e em conformidade.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                Total de Clientes
              </CardTitle>
              <Users className="h-5 w-5 text-primary/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-foreground">{stats.clientes}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Empresas cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                Modelos de Checklist
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-accent/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-foreground">{stats.modelos}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Templates criados
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                Checklists Aplicados
              </CardTitle>
              <FileCheck className="h-5 w-5 text-warning/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-foreground">{stats.aplicacoes}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Inspeções realizadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Card */}
        <Card className="border-border/40 shadow-md overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2.5 bg-primary-light rounded-2xl">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              Bem-vindo ao Sistema
            </CardTitle>
            <CardDescription className="text-sm mt-2">
              Gerencie seus clientes e checklists de forma eficiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-5 bg-secondary/30 rounded-2xl border border-border/40">
                  <h3 className="font-medium mb-2 text-foreground">Próximos Passos</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Cadastre seus clientes na aba "Clientes"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Crie modelos de checklist personalizados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Realize inspeções e gere relatórios PDF</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-accent-light/30 rounded-2xl border border-border/40">
                  <h3 className="font-medium mb-2 text-foreground">Recursos Disponíveis</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span>Designer de checklists flexível</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span>Assinaturas digitais integradas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span>Visualização no mapa de clientes</span>
                    </li>
                  </ul>
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
