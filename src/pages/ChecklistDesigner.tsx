import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ClipboardList, Save, Edit3, Settings, ArrowLeft, BoxSelect, ToggleLeft, CalendarDays, List, ImageIcon, Type, Copy, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toTitleCase, toSentenceCase } from "@/lib/text-utils";
import { checkModelosLimit } from "@/lib/plan-limits";
import { toast } from "sonner";

// Breakpoint em que o editor troca das 3 colunas fixas para o layout mobile (toolbar + sheet)
const useIsCompact = () => {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setCompact(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return compact;
};

type FieldType = "texto" | "sim_nao_na" | "observacao" | "foto" | "multipla_escolha" | "data" | "outros";

interface FieldItem {
  id: string;
  tipo: FieldType;
  label: string;
  placeholder?: string;
  obrigatorio?: boolean;
  opcoes?: string[];
  tem_observacao?: boolean;
}

interface Secao {
  id: string;
  titulo: string;
  descricao?: string;
  campos: FieldItem[];
}

interface Modelo {
  id: string;
  nome_modelo: string;
  estrutura_json: { secoes?: Secao[]; campos?: FieldItem[]; descricao?: string };
  created_at: string;
}

const ChecklistDesigner = () => {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [editingMode, setEditingMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeModelo, setNomeModelo] = useState("");
  const [descricaoModelo, setDescricaoModelo] = useState("");
  const [secoes, setSecoes] = useState<Secao[]>([]);

  // Selection
  const [activeSecaoId, setActiveSecaoId] = useState<string | null>(null);
  const [activeCampoId, setActiveCampoId] = useState<string | null>(null);

  // Drag and Drop States
  const [draggedCampo, setDraggedCampo] = useState<{ secaoId: string; index: number } | null>(null);
  const [draggedSecaoIndex, setDraggedSecaoIndex] = useState<number | null>(null);

  // Confirmation dialogs
  const [deleteModeloId, setDeleteModeloId] = useState<string | null>(null);
  const [deleteSecaoId, setDeleteSecaoId] = useState<string | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  useEffect(() => {
    fetchModelos();
  }, []);

  const fetchModelos = async () => {
    const { data, error } = await supabase
      .from("modelos_checklist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar modelos");
    } else {
      setModelos((data as unknown as Modelo[]) || []);
    }
  };

  const openEditor = (modelo?: Modelo) => {
    if (modelo) {
      setEditingId(modelo.id);
      setNomeModelo(modelo.nome_modelo);
      setDescricaoModelo(modelo.estrutura_json.descricao || "");

      const json = modelo.estrutura_json;
      if (json.secoes && json.secoes.length > 0) {
        setSecoes(json.secoes);
        setActiveSecaoId(json.secoes[0].id);
      } else if (json.campos && json.campos.length > 0) {
        const newSecao = {
          id: crypto.randomUUID(),
          titulo: "Seção Geral",
          campos: json.campos as FieldItem[]
        };
        setSecoes([newSecao]);
        setActiveSecaoId(newSecao.id);
      } else {
        const id = crypto.randomUUID();
        setSecoes([{ id, titulo: "Nova Seção", campos: [] }]);
        setActiveSecaoId(id);
      }
    } else {
      setEditingId(null);
      setNomeModelo("Novo Modelo de Inspeção");
      setDescricaoModelo("");
      const id = crypto.randomUUID();
      setSecoes([{ id, titulo: "Nova Seção", campos: [] }]);
      setActiveSecaoId(id);
    }
    setEditingMode(true);
  };

  const addSecao = () => {
    const novaSecao: Secao = { id: crypto.randomUUID(), titulo: "Nova Seção", campos: [] };
    setSecoes([...secoes, novaSecao]);
    setActiveSecaoId(novaSecao.id);
    setActiveCampoId(null);
  };

  const removeSecao = (id: string) => {
    if (secoes.length === 1) {
      toast.error("O modelo deve ter pelo menos uma seção.");
      return;
    }
    const newSecoes = secoes.filter(s => s.id !== id);
    setSecoes(newSecoes);
    if (activeSecaoId === id) setActiveSecaoId(newSecoes[0].id);
  };

  const moveSecao = (secaoId: string, direction: 'up' | 'down') => {
    const index = secoes.findIndex(s => s.id === secaoId);
    if (index === -1) return;

    const newSecoes = [...secoes];
    if (direction === 'up' && index > 0) {
      [newSecoes[index], newSecoes[index - 1]] = [newSecoes[index - 1], newSecoes[index]];
    } else if (direction === 'down' && index < newSecoes.length - 1) {
      [newSecoes[index], newSecoes[index + 1]] = [newSecoes[index + 1], newSecoes[index]];
    }
    setSecoes(newSecoes);
  };

  const duplicarSecao = (secaoId: string) => {
    const index = secoes.findIndex(s => s.id === secaoId);
    if (index === -1) return;

    const secaoOriginal = secoes[index];
    const novaSecao: Secao = {
      id: crypto.randomUUID(),
      titulo: `${secaoOriginal.titulo} (Cópia)`,
      campos: secaoOriginal.campos.map(c => ({ ...c, id: crypto.randomUUID() }))
    };

    const newSecoes = [...secoes];
    newSecoes.splice(index + 1, 0, novaSecao);
    setSecoes(newSecoes);
    setActiveSecaoId(novaSecao.id);
    toast.success("Seção duplicada!");
  };

  const addCampo = (tipo: FieldType) => {
    if (!activeSecaoId) {
      toast.error("Selecione ou clique em uma seção primeiro!");
      return;
    }
    const novoCampo: FieldItem = {
      id: crypto.randomUUID(),
      tipo,
      label: "Nova Pergunta",
      placeholder: "Digite a resposta...",
      obrigatorio: false,
      opcoes: tipo === "multipla_escolha" ? ["Opção 1"] : undefined,
    };

    setSecoes(secoes.map(s => {
      if (s.id === activeSecaoId) {
        return { ...s, campos: [...s.campos, novoCampo] };
      }
      return s;
    }));
    setActiveCampoId(novoCampo.id);
  };

  const removeCampo = (secaoId: string, campoId: string) => {
    setSecoes(secoes.map(s => {
      if (s.id === secaoId) {
        return { ...s, campos: s.campos.filter(c => c.id !== campoId) };
      }
      return s;
    }));
    if (activeCampoId === campoId) setActiveCampoId(null);
  };

  const moveCampo = (secaoId: string, campoId: string, direction: 'up' | 'down') => {
    setSecoes(secoes.map(s => {
      if (s.id === secaoId) {
        const index = s.campos.findIndex(c => c.id === campoId);
        if (index === -1) return s;

        const newCampos = [...s.campos];
        if (direction === 'up' && index > 0) {
          [newCampos[index], newCampos[index - 1]] = [newCampos[index - 1], newCampos[index]];
        } else if (direction === 'down' && index < newCampos.length - 1) {
          [newCampos[index], newCampos[index + 1]] = [newCampos[index + 1], newCampos[index]];
        }
        return { ...s, campos: newCampos };
      }
      return s;
    }));
  };

  const duplicarCampo = (secaoId: string, campoId: string) => {
    setSecoes(secoes.map(s => {
      if (s.id === secaoId) {
        const index = s.campos.findIndex(c => c.id === campoId);
        if (index === -1) return s;

        const campoOriginal = s.campos[index];
        const novoCampo = {
          ...campoOriginal,
          id: crypto.randomUUID(),
          label: `${campoOriginal.label} (Cópia)`
        };

        const newCampos = [...s.campos];
        newCampos.splice(index + 1, 0, novoCampo);
        return { ...s, campos: newCampos };
      }
      return s;
    }));
    toast.success("Campo duplicado!");
  };

  const updateCampo = (campoId: string, updates: Partial<FieldItem>) => {
    setSecoes(secoes.map(s => ({
      ...s,
      campos: s.campos.map(c => c.id === campoId ? { ...c, ...updates } : c)
    })));
  };

  // Drag and drop handlers
  const handleDropCampo = (targetSecaoId: string, targetIndex: number) => {
    if (!draggedCampo) return;
    const { secaoId: sourceSecaoId, index: sourceIndex } = draggedCampo;

    setSecoes(prevSecoes => {
      const nextSecoes = prevSecoes.map(s => ({ ...s, campos: [...s.campos] }));
      const sourceSecao = nextSecoes.find(s => s.id === sourceSecaoId);
      const targetSecao = nextSecoes.find(s => s.id === targetSecaoId);

      if (!sourceSecao || !targetSecao) return prevSecoes;

      const [movedItem] = sourceSecao.campos.splice(sourceIndex, 1);
      targetSecao.campos.splice(targetIndex, 0, movedItem);

      return nextSecoes;
    });

    setDraggedCampo(null);
  };

  const handleDropSecao = (targetIndex: number) => {
    if (draggedSecaoIndex === null || draggedSecaoIndex === targetIndex) return;

    setSecoes(prev => {
      const next = [...prev];
      const [movedSecao] = next.splice(draggedSecaoIndex, 1);
      next.splice(targetIndex, 0, movedSecao);
      return next;
    });

    setDraggedSecaoIndex(null);
  };

  const getActiveField = () => {
    if (!activeCampoId) return null;
    for (const s of secoes) {
      const found = s.campos.find(c => c.id === activeCampoId);
      if (found) return found;
    }
    return null;
  };

  const handleSave = async () => {
    if (!nomeModelo.trim()) {
      toast.error("Digite um nome para o modelo no cabeçalho.");
      return;
    }

    if (!editingId) {
      const { canCreate, limite } = await checkModelosLimit();
      if (!canCreate) {
        toast.error(`Limite de ${limite} modelos no plano Free atingido.`, {
          description: "Assine o plano Expert para criar modelos ilimitados.",
        });
        return;
      }
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }

    const secoesNormalizadas = secoes.map((s) => ({
      ...s,
      titulo: toTitleCase(s.titulo),
      campos: s.campos.map((c) => ({
        ...c,
        label: toSentenceCase(c.label),
        opcoes: c.opcoes?.map((op) => toSentenceCase(op)),
      })),
    }));

    const dataToSave: any = {
      nome_modelo: toTitleCase(nomeModelo),
      estrutura_json: { secoes: secoesNormalizadas, descricao: toSentenceCase(descricaoModelo) },
      tenant_id: user.id,
    };

    const { error } = editingId
      ? await supabase.from("modelos_checklist").update(dataToSave).eq("id", editingId)
      : await supabase.from("modelos_checklist").insert([dataToSave]);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Modelo atualizado!" : "Modelo criado com sucesso!");
      setEditingMode(false);
      fetchModelos();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("modelos_checklist").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir modelo");
    } else {
      toast.success("Modelo excluído!");
      fetchModelos();
    }
  };

  const handleExit = () => {
    setExitConfirmOpen(true);
  };

  const activeField = getActiveField();

  const renderFieldProperties = (field: FieldItem) => (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Título da Pergunta (Label)</label>
        <textarea
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary outline-none p-3"
          rows={3}
          value={field.label}
          onChange={(e) => updateCampo(field.id, { label: e.target.value })}
        />
      </div>

      {(field.tipo === "texto" || field.tipo === "outros") && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Texto de Placeholder</label>
          <input
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary outline-none p-3"
            type="text"
            value={field.placeholder || ""}
            onChange={(e) => updateCampo(field.id, { placeholder: e.target.value })}
          />
        </div>
      )}

      {field.tipo === "multipla_escolha" && (
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Opções de Resposta</label>
          {field.opcoes?.map((op, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 text-sm p-2 outline-none"
                value={op}
                onChange={(e) => {
                  const newOps = [...(field.opcoes || [])];
                  newOps[idx] = e.target.value;
                  updateCampo(field.id, { opcoes: newOps });
                }}
              />
              <button
                onClick={() => {
                  const newOps = field.opcoes?.filter((_, i) => i !== idx);
                  updateCampo(field.id, { opcoes: newOps });
                }}
                className="p-2 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newOps = [...(field.opcoes || []), `Nova Opção ${(field.opcoes?.length || 0) + 1}`];
              updateCampo(field.id, { opcoes: newOps });
            }}
            className="text-xs font-bold text-primary flex items-center gap-1 mt-2"
          >
            <Plus className="w-3 h-3" /> Adicionar Opção
          </button>
        </div>
      )}

      <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Resposta Obrigatória</label>
          <button
            onClick={() => updateCampo(field.id, { obrigatorio: !field.obrigatorio })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.obrigatorio ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.obrigatorio ? "translate-x-6" : "translate-x-1"}`}></span>
          </button>
        </div>

        {field.tipo === "multipla_escolha" && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Habilitar Observação</label>
            <button
              onClick={() => updateCampo(field.id, { tem_observacao: !field.tem_observacao })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.tem_observacao ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.tem_observacao ? "translate-x-6" : "translate-x-1"}`}></span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!editingMode) {
    return (
      <Layout>
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Construtor de Modelos</h1>
              <p className="text-muted-foreground">Gerencie seus templates de checklist</p>
            </div>
            <Button onClick={() => openEditor()} className="bg-primary hover:bg-primary/90 text-white shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Novo Modelo
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Meus Modelos</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead>Nome do Modelo</TableHead>
                    <TableHead>Seções / Campos</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => {
                    const totalSecoes = modelo.estrutura_json?.secoes?.length || 0;
                    const totalCampos = modelo.estrutura_json?.secoes?.reduce((acc, s) => acc + s.campos.length, 0)
                      || modelo.estrutura_json?.campos?.length || 0;

                    return (
                      <TableRow key={modelo.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-white">{modelo.nome_modelo}</TableCell>
                        <TableCell>{totalSecoes} seções ( {totalCampos} campos )</TableCell>
                        <TableCell>{new Date(modelo.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditor(modelo)} className="text-slate-600 hover:text-primary">
                            <Edit3 className="w-4 h-4 mr-2" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteModeloId(modelo.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {modelos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 dark:text-slate-400 py-12">
                        Nenhum modelo criado ainda. Clique em "Novo Modelo" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <ConfirmDialog
            open={!!deleteModeloId}
            onOpenChange={(open) => { if (!open) setDeleteModeloId(null); }}
            title="Excluir modelo?"
            description="Esta ação não pode ser desfeita. O modelo de checklist será removido permanentemente."
            confirmLabel="Excluir"
            destructive
            onConfirm={() => {
              if (deleteModeloId) handleDelete(deleteModeloId);
              setDeleteModeloId(null);
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Studio Header */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 md:px-6 py-3 shrink-0 z-10">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={handleExit} className="shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Button>
          <div className="text-primary hidden sm:flex items-center justify-center p-2 bg-primary/10 rounded-lg shrink-0">
            <BoxSelect className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-slate-900 dark:text-white text-base md:text-lg font-bold leading-tight tracking-tight truncate">RT-Expert Form Builder</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate">Studio / {editingId ? "Editando Modelo" : "Novo Modelo"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Button variant="outline" className="hidden md:inline-flex text-slate-700 dark:text-slate-300" onClick={handleExit}>
            Descartar / Sair
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
            <Save className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{loading ? "Salvando..." : "Salvar e Publicar"}</span>
            <span className="md:hidden ml-2">{loading ? "Salvando..." : "Salvar"}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Components */}
        <aside className="hidden md:flex md:w-56 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 lg:p-6 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-1">Componentes</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Clique para adicionar à seção ativa ou arraste para reposicionar</p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => addCampo("texto")} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group text-left">
              <Type className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Texto (Curto/Longo)</p>
            </button>

            <button onClick={() => addCampo("sim_nao_na")} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group text-left">
              <ToggleLeft className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">SIM / NÃO / N.A</p>
            </button>

            <button onClick={() => addCampo("multipla_escolha")} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group text-left">
              <List className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Múltipla Escolha</p>
            </button>

            <button onClick={() => addCampo("data")} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group text-left">
              <CalendarDays className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Data</p>
            </button>

            <button onClick={() => addCampo("foto")} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group text-left">
              <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Upload de Foto</p>
            </button>

            <button onClick={() => addCampo("observacao")} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group text-left">
              <Edit3 className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Caixa de Observação</p>
            </button>

            <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>

            <button onClick={addSecao} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-primary font-bold">
              <Plus className="w-4 h-4" />
              Criar Nova Seção
            </button>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-[800px] mx-auto pb-24">

            {/* Form Header Info */}
            <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-t-4 border-t-primary">
              <input
                className="bg-transparent border-none text-2xl md:text-3xl font-bold p-0 focus:ring-0 text-slate-900 dark:text-white w-full outline-none mb-2"
                placeholder="Título do Formulário"
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
              />
              <input
                className="bg-transparent border-none text-slate-500 dark:text-slate-400 p-0 focus:ring-0 text-sm w-full outline-none"
                placeholder="Adicione uma breve descrição para quem for responder..."
                value={descricaoModelo}
                onChange={(e) => setDescricaoModelo(e.target.value)}
              />
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {secoes.map((secao, secaoIdx) => (
                <div
                  key={secao.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedSecaoIndex(secaoIdx);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDropSecao(secaoIdx);
                  }}
                  className={`relative p-6 rounded-xl transition-all duration-200 ${activeSecaoId === secao.id
                    ? "bg-white/90 dark:bg-slate-900/90 border-2 border-primary shadow-md"
                    : "bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  onClick={() => setActiveSecaoId(secao.id)}
                >

                  {/* Section Controls Header (Move Up/Down, Duplicate, Delete) */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                      <input
                        className="bg-transparent border-none text-xl font-bold p-0 focus:ring-0 text-slate-900 dark:text-white w-full outline-none"
                        placeholder="Título da Seção"
                        value={secao.titulo}
                        onChange={(e) => {
                          setSecoes(secoes.map(s => s.id === secao.id ? { ...s, titulo: e.target.value } : s));
                        }}
                      />
                    </div>

                    {/* Section Action Toolbar */}
                    <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
                      <button
                        title="Mover Seção para Cima"
                        onClick={(e) => { e.stopPropagation(); moveSecao(secao.id, 'up'); }}
                        disabled={secaoIdx === 0}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary disabled:opacity-30 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        title="Mover Seção para Baixo"
                        onClick={(e) => { e.stopPropagation(); moveSecao(secao.id, 'down'); }}
                        disabled={secaoIdx === secoes.length - 1}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary disabled:opacity-30 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        title="Duplicar Seção"
                        onClick={(e) => { e.stopPropagation(); duplicarSecao(secao.id); }}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        title="Excluir Seção"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (secoes.length === 1) {
                            toast.error("O modelo deve ter pelo menos uma seção.");
                            return;
                          }
                          setDeleteSecaoId(secao.id);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-600 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fields in Section */}
                  <div
                    className="space-y-4 min-h-[50px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDropCampo(secao.id, secao.campos.length);
                    }}
                  >
                    {secao.campos.map((campo, campoIdx) => {
                      const isActive = activeCampoId === campo.id;
                      return (
                        <div
                          key={campo.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData("text/plain", "");
                            setDraggedCampo({ secaoId: secao.id, index: campoIdx });
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleDropCampo(secao.id, campoIdx);
                          }}
                          className={`relative group p-4 md:p-5 bg-white dark:bg-slate-900 rounded-lg border transition-all ${isActive ? "border-primary shadow-md ring-1 ring-primary" : "border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSecaoId(secao.id);
                            setActiveCampoId(campo.id);
                          }}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <label className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex-1">
                                  {campo.label || "Pergunta sem título"}
                                </label>
                              </div>

                              {/* Field Action Buttons (Always Visible on Header) */}
                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
                                {campo.obrigatorio && (
                                  <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-bold mr-1">OBRIGATÓRIO</span>
                                )}
                                <button
                                  title="Mover para cima"
                                  onClick={(e) => { e.stopPropagation(); moveCampo(secao.id, campo.id, 'up'); }}
                                  disabled={campoIdx === 0}
                                  className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  title="Mover para baixo"
                                  onClick={(e) => { e.stopPropagation(); moveCampo(secao.id, campo.id, 'down'); }}
                                  disabled={campoIdx === secao.campos.length - 1}
                                  className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                                <button
                                  title="Duplicar pergunta"
                                  onClick={(e) => { e.stopPropagation(); duplicarCampo(secao.id, campo.id); }}
                                  className="p-1 text-slate-400 hover:text-primary"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  title="Excluir pergunta"
                                  onClick={(e) => { e.stopPropagation(); removeCampo(secao.id, campo.id); }}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Field Preview based on Type */}
                            <div className="opacity-70 pointer-events-none mt-1">
                              {campo.tipo === "texto" && (
                                <Input placeholder={campo.placeholder || "Resposta em texto..."} readOnly className="bg-slate-50" />
                              )}
                              {campo.tipo === "sim_nao_na" && (
                                <div className="flex gap-3">
                                  <div className="flex-1 py-2 px-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm">Sim</div>
                                  <div className="flex-1 py-2 px-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm">Não</div>
                                  <div className="flex-1 py-2 px-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm">N/A</div>
                                </div>
                              )}
                              {campo.tipo === "multipla_escolha" && (
                                <div className="space-y-2">
                                  {campo.opcoes?.map((op, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded-md border border-slate-300"></div>
                                      <span className="text-sm text-slate-600">{op}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(campo.tipo === "observacao" || campo.tipo === "outros") && (
                                <div className="h-16 rounded-lg border border-slate-200 bg-slate-50 w-full p-2 text-sm text-slate-400">
                                  Área reservada para observações longas...
                                </div>
                              )}
                              {campo.tipo === "data" && (
                                <Input type="date" readOnly className="bg-slate-50 w-full max-w-[200px]" />
                              )}
                              {campo.tipo === "foto" && (
                                <div className="border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50">
                                  <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                                  <span className="text-sm text-slate-500">Câmera / Upload de Imagem</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {secao.campos.length === 0 && (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                        <span className="text-sm font-medium">Seção vazia. Adicione componentes ou arraste perguntas para cá.</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>

        {/* Right Sidebar: Properties */}
        <aside className="hidden lg:flex w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col overflow-y-auto">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider">Propriedades</h3>
              <Settings className="w-4 h-4 text-slate-400" />
            </div>

            {!activeField && (
              <div className="p-6 space-y-6">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3">
                  <Settings className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-slate-900 dark:text-white text-xs font-bold uppercase">Configurações Gerais</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">Propriedades do Modelo</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome do Formulário</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary outline-none p-3"
                    value={nomeModelo}
                    onChange={(e) => setNomeModelo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Descrição (Opcional)</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary outline-none p-3"
                    rows={3}
                    value={descricaoModelo}
                    onChange={(e) => setDescricaoModelo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeField && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-slate-900 dark:text-white text-xs font-bold uppercase">Configurando Componente</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">{activeField.tipo}</p>
                </div>
              </div>
            )}
          </div>

          {activeField && (
            <div className="p-6">
              {renderFieldProperties(activeField)}
            </div>
          )}
        </aside>

      </div>

      {/* Mobile: bottom toolbar with components */}
      <div className="md:hidden shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-2 z-20">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { tipo: "texto" as FieldType, icon: Type, label: "Texto" },
            { tipo: "sim_nao_na" as FieldType, icon: ToggleLeft, label: "Sim/Não" },
            { tipo: "multipla_escolha" as FieldType, icon: List, label: "Escolha" },
            { tipo: "data" as FieldType, icon: CalendarDays, label: "Data" },
            { tipo: "foto" as FieldType, icon: ImageIcon, label: "Foto" },
            { tipo: "observacao" as FieldType, icon: Edit3, label: "Obs." },
          ].map(({ tipo, icon: Icon, label }) => (
            <button
              key={tipo}
              onClick={() => addCampo(tipo)}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={exitConfirmOpen}
        onOpenChange={setExitConfirmOpen}
        title="Sair do editor?"
        description="As alterações não salvas serão descartadas."
        confirmLabel="Sair sem salvar"
        destructive
        onConfirm={() => {
          setExitConfirmOpen(false);
          setEditingMode(false);
        }}
      />

      <ConfirmDialog
        open={!!deleteSecaoId}
        onOpenChange={(open) => { if (!open) setDeleteSecaoId(null); }}
        title="Excluir seção?"
        description="Esta ação removerá a seção e todos os campos contidos nela."
        confirmLabel="Excluir Seção"
        destructive
        onConfirm={() => {
          if (deleteSecaoId) removeSecao(deleteSecaoId);
          setDeleteSecaoId(null);
        }}
      />
    </div>
  );
};

export default ChecklistDesigner;
