import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Plus, Filter, User, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { syncToGoogleCalendar } from "@/lib/google-calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Agendamento {
  id: string;
  data_visita: string;
  status: 'pendente' | 'concluido' | 'cancelado';
  descricao: string;
  cliente: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  };
}

interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const Visitas = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visitas, setVisitas] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form states
  const [selectedCliente, setSelectedCliente] = useState("");
  const [dataVisita, setDataVisita] = useState("");
  const [horaVisita, setHoraVisita] = useState("09:00");
  const [descricao, setDescricao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchVisitas();
    fetchClientes();
  }, [currentDate]);

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, razao_social, nome_fantasia').order('razao_social');
    if (data) setClientes(data);
  };

  const fetchVisitas = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes!cliente_id(id, razao_social, nome_fantasia)
        `)
        .gte('data_visita', monthStart.toISOString())
        .lte('data_visita', monthEnd.toISOString());

      if (error) throw error;
      setVisitas((data as any[]) || []);
    } catch (error: any) {
      console.error("Erro ao buscar visitas:", error);
      toast.error("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  };

  const handleAgendar = async () => {
    if (!selectedCliente || !dataVisita) {
      toast.error("Preencha cliente e data");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fullDate = new Date(`${dataVisita}T${horaVisita}:00`);

      const { error } = await (supabase as any)
        .from('agendamentos')
        .insert([{
          tenant_id: user.id,
          cliente_id: selectedCliente,
          data_visita: fullDate.toISOString(),
          descricao: descricao || "Visita técnica agendada manualmente",
          status: 'pendente'
        }]);

      if (error) throw error;

      // Sincronizar com Google
      const clienteNome = clientes.find(c => c.id === selectedCliente)?.nome_fantasia || 
                         clientes.find(c => c.id === selectedCliente)?.razao_social || 'Cliente';
      
      syncToGoogleCalendar({
        tenant_id: user.id,
        cliente_nome: clienteNome,
        data_visita: fullDate.toISOString(),
        descricao: descricao || "Visita técnica agendada manualmente"
      });

      toast.success("Visita agendada com sucesso!");
      setOpen(false);
      resetForm();
      fetchVisitas();
    } catch (error: any) {
      toast.error("Erro ao agendar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCliente("");
    setDataVisita("");
    setHoraVisita("09:00");
    setDescricao("");
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Visita marcarda como ${newStatus}`);
      fetchVisitas();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'cancelado': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gerencie seus compromissos e inspeções agendadas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filtros</Button>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Agendar Visita</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                  <DialogDescription>
                    Preencha os dados da visita técnica para o cliente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cliente">Cliente</Label>
                    <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_fantasia || c.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Data</Label>
                      <Input id="date" type="date" value={dataVisita} onChange={e => setDataVisita(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time">Hora</Label>
                      <Input id="time" type="time" value={horaVisita} onChange={e => setHoraVisita(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">Observações</Label>
                    <Input id="desc" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Entrega de laudo, inspeção anual..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAgendar} disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Confirmar Agendamento"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendário Lateral */}
          <Card className="lg:col-span-1 shadow-sm h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                    <CalendarIcon className="w-4 h-4 rotate-180" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                    <CalendarIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(day => {
                  const dayVisitas = visitas.filter(v => isSameDay(new Date(v.data_visita), day));
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setCurrentDate(day)}
                      className={cn(
                        "h-10 rounded-lg flex flex-col items-center justify-center relative transition-all hover:bg-primary/5",
                        isToday(day) ? "bg-primary text-white font-bold" : "text-foreground",
                        dayVisitas.length > 0 && !isToday(day) && "bg-slate-100 dark:bg-slate-800",
                        isSameDay(currentDate, day) && !isToday(day) && "ring-2 ring-primary"
                      )}
                    >
                      <span className="text-sm">{format(day, "d")}</span>
                      {dayVisitas.length > 0 && (
                        <span className={cn(
                          "absolute bottom-1.5 w-1 h-1 rounded-full",
                          isToday(day) ? "bg-white" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Lista de Compromissos */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <CalendarDays className="w-5 h-5 text-primary" /> 
              Visitas em {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando agendamentos...</div>
            ) : visitas.filter(v => isSameDay(new Date(v.data_visita), currentDate)).length === 0 ? (
              <Card className="border-dashed shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p>Nenhuma visita para este dia.</p>
                  <Button variant="link" className="mt-2" onClick={() => setOpen(true)}>Agendar agora</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {visitas
                  .filter(v => isSameDay(new Date(v.data_visita), currentDate))
                  .sort((a, b) => new Date(a.data_visita).getTime() - new Date(b.data_visita).getTime())
                  .map(visita => (
                  <Card key={visita.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <div className="flex items-stretch h-full">
                      <div className={cn(
                        "w-1.5",
                        visita.status === 'concluido' ? "bg-green-500" : 
                        visita.status === 'cancelado' ? "bg-red-500" : "bg-amber-500"
                      )} />
                      <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(visita.status)}
                            <span className="font-bold text-lg text-slate-800 dark:text-white">
                              {visita.cliente?.nome_fantasia || visita.cliente?.razao_social}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(new Date(visita.data_visita), "HH:mm")} - {visita.descricao}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {visita.status === 'pendente' && (
                            <>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => navigate(`/aplicar-checklist?clienteId=${visita.cliente.id}`)}
                              >
                                Iniciar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500"
                                onClick={() => updateStatus(visita.id, 'cancelado')}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                          {visita.status !== 'pendente' && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus(visita.id, 'pendente')}>
                              Reabrir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Visitas;
