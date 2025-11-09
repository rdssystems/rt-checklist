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
import { Plus, Trash2, MoveUp, MoveDown, ClipboardList, Save, GripVertical, Copy } from "lucide-react";
import { toast } from "sonner";

interface FieldItem {
  id: string;
  tipo: "titulo" | "descricao" | "sim_nao_na" | "observacao" | "foto" | "multipla_escolha" | "data" | "outros";
  label: string;
  opcoes?: string[];
}

interface Secao {
  id: string;
  campos: FieldItem[];
}

interface Modelo {
  id: string;
  nome_modelo: string;
  estrutura_json: { campos: FieldItem[] };
  created_at: string;
}

const ChecklistDesigner = () => {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [campos, setCampos] = useState<FieldItem[]>([]);
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

  const addCampo = (tipo: FieldItem["tipo"]) => {
    const novoCampo: FieldItem = {
      id: crypto.randomUUID(),
      tipo,
      label: "",
      opcoes: tipo === "multipla_escolha" ? ["Opção 1"] : undefined,
    };
    setCampos([...campos, novoCampo]);
  };

  const removeCampo = (campoId: string) => {
    setCampos(campos.filter((c) => c.id !== campoId));
  };

  const duplicateCampo = (campoId: string) => {
    const campo = campos.find((c) => c.id === campoId);
    if (campo) {
      const novoCampo = { ...campo, id: crypto.randomUUID() };
      const index = campos.findIndex((c) => c.id === campoId);
      const novosCampos = [...campos];
      novosCampos.splice(index + 1, 0, novoCampo);
      setCampos(novosCampos);
    }
  };

  const updateCampoLabel = (campoId: string, label: string) => {
    setCampos(campos.map((c) => (c.id === campoId ? { ...c, label } : c)));
  };

  const updateCampoTipo = (campoId: string, tipo: FieldItem["tipo"]) => {
    setCampos(
      campos.map((c) =>
        c.id === campoId
          ? {
              ...c,
              tipo,
              opcoes: tipo === "multipla_escolha" ? ["Opção 1"] : undefined,
            }
          : c
      )
    );
  };

  const moveCampo = (campoId: string, direction: "up" | "down") => {
    const index = campos.findIndex((c) => c.id === campoId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === campos.length - 1)
    ) {
      return;
    }

    const novosCampos = [...campos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [novosCampos[index], novosCampos[targetIndex]] = [
      novosCampos[targetIndex],
      novosCampos[index],
    ];
    setCampos(novosCampos);
  };

  const addOpcao = (campoId: string) => {
    setCampos(
      campos.map((c) =>
        c.id === campoId && c.opcoes
          ? { ...c, opcoes: [...c.opcoes, `Opção ${c.opcoes.length + 1}`] }
          : c
      )
    );
  };

  const removeOpcao = (campoId: string, opcaoIndex: number) => {
    setCampos(
      campos.map((c) =>
        c.id === campoId && c.opcoes
          ? { ...c, opcoes: c.opcoes.filter((_, i) => i !== opcaoIndex) }
          : c
      )
    );
  };

  const updateOpcao = (campoId: string, opcaoIndex: number, valor: string) => {
    setCampos(
      campos.map((c) =>
        c.id === campoId && c.opcoes
          ? {
              ...c,
              opcoes: c.opcoes.map((o, i) => (i === opcaoIndex ? valor : o)),
            }
          : c
      )
    );
  };

  const handleSave = async () => {
    if (!nomeModelo.trim()) {
      toast.error("Digite um nome para o modelo");
      return;
    }

    if (campos.length === 0) {
      toast.error("Adicione pelo menos um campo");
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
      estrutura_json: { campos },
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
      setCampos([]);
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
      setCampos(modelo.estrutura_json?.campos || []);
    } else {
      setEditingId(null);
      setNomeModelo("");
      setCampos([]);
    }
    setDialogOpen(true);
  };

  const getTipoLabel = (tipo: FieldItem["tipo"]) => {
    const labels = {
      titulo: "Título",
      descricao: "Descrição",
      sim_nao_na: "SIM/NÃO/NA",
      observacao: "Observação",
      foto: "Foto/Anexo",
      multipla_escolha: "Múltipla Escolha",
      data: "Data",
      outros: "Outros",
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
                  Construa seu formulário no estilo Google Forms
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
                    className="text-lg"
                  />
                </div>

                <div className="space-y-3">
                  {campos.map((campo, index) => (
                    <Card key={campo.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex gap-3">
                          <div className="flex flex-col gap-1 pt-2">
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-2">
                              <Input
                                value={campo.label}
                                onChange={(e) => updateCampoLabel(campo.id, e.target.value)}
                                placeholder={
                                  campo.tipo === "titulo"
                                    ? "Título da seção"
                                    : campo.tipo === "descricao"
                                    ? "Texto descritivo"
                                    : "Digite sua pergunta"
                                }
                                className={campo.tipo === "titulo" ? "text-xl font-semibold" : ""}
                              />
                              <Select
                                value={campo.tipo}
                                onValueChange={(value) =>
                                  updateCampoTipo(campo.id, value as FieldItem["tipo"])
                                }
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="titulo">Título</SelectItem>
                                  <SelectItem value="descricao">Descrição</SelectItem>
                                  <SelectItem value="sim_nao_na">SIM/NÃO/NA</SelectItem>
                                  <SelectItem value="observacao">Observação</SelectItem>
                                  <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                                  <SelectItem value="data">Data</SelectItem>
                                  <SelectItem value="outros">Outros</SelectItem>
                                  <SelectItem value="foto">Foto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {campo.tipo === "multipla_escolha" && campo.opcoes && (
                              <div className="pl-4 space-y-2">
                                {campo.opcoes.map((opcao, opcaoIndex) => (
                                  <div key={opcaoIndex} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                                    <Input
                                      value={opcao}
                                      onChange={(e) =>
                                        updateOpcao(campo.id, opcaoIndex, e.target.value)
                                      }
                                      placeholder={`Opção ${opcaoIndex + 1}`}
                                      className="flex-1"
                                    />
                                    {campo.opcoes && campo.opcoes.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeOpcao(campo.id, opcaoIndex)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addOpcao(campo.id)}
                                  className="ml-6"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Adicionar opção
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-1 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveCampo(campo.id, "up")}
                            disabled={index === 0}
                            title="Mover para cima"
                          >
                            <MoveUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveCampo(campo.id, "down")}
                            disabled={index === campos.length - 1}
                            title="Mover para baixo"
                          >
                            <MoveDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateCampo(campo.id)}
                            title="Duplicar"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCampo(campo.id)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {campos.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      Nenhum campo adicionado. Use os botões abaixo para começar.
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("titulo")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nova Seção
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("descricao")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Descrição
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("sim_nao_na")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      SIM/NÃO/NA
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("observacao")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Observação
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("multipla_escolha")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Múltipla Escolha
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("data")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Data
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("outros")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Outros
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCampo("foto")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Foto
                    </Button>
                  </div>
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
                    <TableHead>Campos</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => (
                    <TableRow key={modelo.id}>
                      <TableCell className="font-medium">{modelo.nome_modelo}</TableCell>
                      <TableCell>{modelo.estrutura_json?.campos?.length || 0} campos</TableCell>
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
