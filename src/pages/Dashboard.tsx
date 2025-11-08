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
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gestão</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.gradient} p-2 rounded-lg`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Bem-vindo ao Sistema
            </CardTitle>
            <CardDescription>
              Gerencie seus clientes e checklists de forma eficiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Primeiros Passos</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Cadastre seus clientes na seção "Clientes"</li>
                  <li>• Crie modelos de checklist personalizados</li>
                  <li>• Aplique checklists durante inspeções</li>
                  <li>• Acompanhe o histórico de aplicações</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
