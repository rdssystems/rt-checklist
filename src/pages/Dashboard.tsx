import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, FileCheck, TrendingUp, Filter, Plus, Map } from "lucide-react";
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

  return (
    <Layout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Geral</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Visão geral operacional e conformidade da empresa em tempo real.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm outline-none">
              <Filter className="w-4 h-4" />
              Filtrar Período
            </button>
            <Link to="/aplicar-checklist" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20 outline-none">
              <Plus className="w-4 h-4" />
              Nova Vistoria
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-lg transition-colors group-hover:bg-primary group-hover:text-white">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total de Clientes</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.clientes}</h3>
            <p className="text-slate-400 text-xs mt-2">Empresas cadastradas no sistema</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Modelos de Checklist</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.modelos}</h3>
            <p className="text-slate-400 text-xs mt-2">Templates criados e disponíveis</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Checklists Aplicados</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.aplicacoes}</h3>
            <p className="text-slate-400 text-xs mt-2">Inspeções já realizadas</p>
          </div>
        </div>

        {/* Resources & Next Steps - Following Stitch Design Patterns */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Próximos Passos</h4>
                <p className="text-sm text-slate-500">Mantenha seu fluxo de trabalho organizado</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:bg-primary/5 hover:border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-sm text-slate-900 dark:text-slate-100">Cadastre mais clientes</h5>
                  <p className="text-xs text-slate-500 mt-1">Vá na aba Clientes para adicionar novas empresas ao seu portfólio.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:bg-emerald-500/5 hover:border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-sm text-slate-900 dark:text-slate-100">Crie Modelos Inteligentes</h5>
                  <p className="text-xs text-slate-500 mt-1">Utilize o Criador de Checklists para padronizar suas vistorias.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Recursos do RT-Expert</h4>
                <p className="text-sm text-slate-500">Ferramentas ao seu dispor</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md dark:bg-blue-900/30">
                    <FileCheck className="w-4 h-4" />
                  </span>
                  Inspeções Offline e Assinatura Digital
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md dark:bg-indigo-900/30">
                    <Users className="w-4 h-4" />
                  </span>
                  Controle CRM dos Estabelecimentos
                </div>
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <span className="bg-purple-100 text-purple-600 p-1.5 rounded-md dark:bg-purple-900/30">
                    <Map className="w-4 h-4" />
                  </span>
                  Geolocalização das Fiscalizações
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
