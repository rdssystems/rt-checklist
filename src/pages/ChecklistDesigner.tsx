import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, MoveUp, MoveDown, ClipboardList, Save } from "lucide-react";
import { toast } from "sonner";

interface FieldItem {
  id: string;
  tipo: "titulo" | "texto" | "sim_nao_na" | "observacao" | "foto";
  label: string;
}

interface Secao {
  id: string;
  titulo: string;
  itens: FieldItem[];
}

interface Modelo {
  id: string;
  nome_modelo: string;
  estrutura_json: { secoes: Secao[] };
  created_at: string;
}

const ChecklistDesigner = () => {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const addSecao = () => {
    const novaSecao: Secao = {
      id: crypto.randomUUID(),
      titulo: "Nova Seção",
      itens: [],
    };
    setSecoes([...secoes, novaSecao]);
  };

  const removeSecao = (secaoId: string) => {
    setSecoes(secoes.filter((s) => s.id !== secaoId));
  };

  const updateSecaoTitulo = (secaoId: string, titulo: string) => {
    setSecoes(
      secoes.map((s) => (s.id === secaoId ? { ...s, titulo } : s))
    );
  };

  const addItem = (secaoId: string, tipo: FieldItem["tipo"]) => {
    const novoItem: FieldItem = {
      id: crypto.randomUUID(),
      tipo,
      label: "Novo Item",
    };

    setSecoes(
      secoes.map((s) =>
        s.id === secaoId ? { ...s, itens: [...s.itens, novoItem] } : s
      )
    );
  };

  const removeItem = (secaoId: string, itemId: string) => {
    setSecoes(
      secoes.map((s) =>
        s.id === secaoId
          ? { ...s, itens: s.itens.filter((i) => i.id !== itemId) }
          : s
      )
    );
  };

  const updateItemLabel = (secaoId: string, itemId: string, label: string) => {
    setSecoes(
      secoes.map((s) =>
        s.id === secaoId
          ? {
              ...s,
              itens: s.itens.map((i) => (i.id === itemId ? { ...i, label } : i)),
            }
          : s
      )
    );
  };

  const moveItem = (secaoId: string, itemId: string, direction: "up" | "down") => {
    setSecoes(
      secoes.map((s) => {
        if (s.id !== secaoId) return s;

        const index = s.itens.findIndex((i) => i.id === itemId);
        if (
          (direction === "up" && index === 0) ||
          (direction === "down" && index === s.itens.length - 1)
        ) {
          return s;
        }

        const newItens = [...s.itens];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newItens[index], newItens[targetIndex]] = [
          newItens[targetIndex],
          newItens[index],
        ];

        return { ...s, itens: newItens };
      })
    );
  };

  const handleSave = async () => {
    if (!nomeModelo.trim()) {
      toast.error("Digite um nome para o modelo");
      return;
    }

    if (secoes.length === 0) {
      toast.error("Adicione pelo menos uma seção");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }

    const dataToSave: any = {
      nome_modelo: nomeModelo,
      estrutura_json: { secoes },
      tenant_id: user.id,
    };

    const { error } = editingId
      ? await supabase.from("modelos_checklist").update(dataToSave).eq("id", editingId)
      : await supabase.from("modelos_checklist").insert([dataToSave]);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Modelo atualizado!" : "Modelo criado!");
      setDialogOpen(false);
      setNomeModelo("");
      setSecoes([]);
      setEditingId(null);
      fetchModelos();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este modelo?")) return;

    const { error } = await supabase.from("modelos_checklist").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir modelo");
    } else {
      toast.success("Modelo excluído!");
      fetchModelos();
    }
  };

  const openDialog = (modelo?: Modelo) => {
    if (modelo) {
      setEditingId(modelo.id);
      setNomeModelo(modelo.nome_modelo);
      setSecoes(modelo.estrutura_json.secoes);
    } else {
      setEditingId(null);
      setNomeModelo("");
      setSecoes([]);
    }
    setDialogOpen(true);
  };

  const getTipoLabel = (tipo: FieldItem["tipo"]) => {
    const labels = {
      titulo: "Título",
      texto: "Texto",
      sim_nao_na: "SIM/NÃO/NA",
      observacao: "Observação",
      foto: "Foto/Anexo",
    };
    return labels[tipo];
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Criar Checklist</h1>
            <p className="text-muted-foreground">Crie modelos de checklist personalizados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="bg-gradient-accent">
                <Plus className="w-4 h-4 mr-2" />
                Novo Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Modelo" : "Novo Modelo de Checklist"}</DialogTitle>
                <DialogDescription>
                  Construa seu formulário adicionando seções e campos
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome_modelo">Nome do Modelo *</Label>
                  <Input
                    id="nome_modelo"
                    value={nomeModelo}
                    onChange={(e) => setNomeModelo(e.target.value)}
                    placeholder="Ex: Checklist de Cozinha Industrial"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Seções</h3>
                    <Button variant="outline" size="sm" onClick={addSecao}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Seção
                    </Button>
                  </div>

                  {secoes.map((secao, secaoIdx) => (
                    <Card key={secao.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={secao.titulo}
                            onChange={(e) => updateSecaoTitulo(secao.id, e.target.value)}
                            className="font-semibold"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSecao(secao.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(secao.id, "titulo")}
                          >
                            + Título
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(secao.id, "texto")}
                          >
                            + Texto
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(secao.id, "sim_nao_na")}
                          >
                            + SIM/NÃO/NA
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(secao.id, "observacao")}
                          >
                            + Observação
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(secao.id, "foto")}
                          >
                            + Foto
                          </Button>
                        </div>

                        {secao.itens.length > 0 && (
                          <div className="space-y-2">
                            {secao.itens.map((item, itemIdx) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 p-2 bg-muted rounded"
                              >
                                <span className="text-xs text-muted-foreground w-24">
                                  {getTipoLabel(item.tipo)}
                                </span>
                                <Input
                                  value={item.label}
                                  onChange={(e) =>
                                    updateItemLabel(secao.id, item.id, e.target.value)
                                  }
                                  className="flex-1"
                                  size={1}
                                />
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveItem(secao.id, item.id, "up")}
                                    disabled={itemIdx === 0}
                                  >
                                    <MoveUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveItem(secao.id, item.id, "down")}
                                    disabled={itemIdx === secao.itens.length - 1}
                                  >
                                    <MoveDown className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItem(secao.id, item.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {secoes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma seção adicionada. Clique em "Adicionar Seção" para começar.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="bg-gradient-accent">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar Modelo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-accent" />
              Modelos de Checklist
            </CardTitle>
            <CardDescription>Total: {modelos.length} modelos criados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Modelo</TableHead>
                    <TableHead>Seções</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => (
                    <TableRow key={modelo.id}>
                      <TableCell className="font-medium">{modelo.nome_modelo}</TableCell>
                      <TableCell>{modelo.estrutura_json.secoes.length} seções</TableCell>
                      <TableCell>
                        {new Date(modelo.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(modelo)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(modelo.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {modelos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum modelo criado. Clique em "Novo Modelo" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ChecklistDesigner;
