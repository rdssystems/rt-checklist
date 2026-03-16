import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, FileCheck, TrendingUp, Filter, Plus, Map, CalendarDays } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clientes: 0,
    modelos: 0,
    aplicacoes: 0,
    agendamentosMes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();

      const [clientes, modelos, aplicacoes, agendamentos] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact" }),
        supabase.from("modelos_checklist").select("id", { count: "exact" }),
        supabase.from("aplicacoes_checklist").select("id", { count: "exact" }),
        (supabase as any).from("agendamentos")
          .select("id", { count: "exact" })
          .gte("data_visita", start)
          .lte("data_visita", end),
      ]);

      setStats({
        clientes: clientes.count || 0,
        modelos: modelos.count || 0,
        aplicacoes: aplicacoes.count || 0,
        agendamentosMes: agendamentos.count || 0,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-lg transition-colors group-hover:bg-primary group-hover:text-white">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total de Clientes</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.clientes}</h3>
            <p className="text-slate-400 text-xs mt-2">Empresas cadastradas</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Modelos</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.modelos}</h3>
            <p className="text-slate-400 text-xs mt-2">Templates disponíveis</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Checklists</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.aplicacoes}</h3>
            <p className="text-slate-400 text-xs mt-2">Inspeções realizadas</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg transition-colors group-hover:bg-purple-600 group-hover:text-white">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Visitas no Mês</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.agendamentosMes}</h3>
            <p className="text-slate-400 text-xs mt-2">Agendamentos neste mês</p>
          </div>
        </div>

        {/* Resources Section */}
        <div className="grid lg:grid-cols-1 gap-6">
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

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md dark:bg-blue-900/30">
                  <FileCheck className="w-4 h-4" />
                </span>
                <span className="font-medium">Relatórios em tempo real</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/20">
                <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md dark:bg-indigo-900/30">
                  <Users className="w-4 h-4" />
                </span>
                <span className="font-medium">Gestão de CRM</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-50/50 border border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/20">
                <span className="bg-purple-100 text-purple-600 p-1.5 rounded-md dark:bg-purple-900/30">
                  <Map className="w-4 h-4" />
                </span>
                <span className="font-medium">Sincronização Google</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
