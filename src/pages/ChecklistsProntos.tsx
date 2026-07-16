import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck, Download, Calendar, User, Building2, Trash2, Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarPDFInspecao } from "@/lib/pdf-generator";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ChecklistPronto } from "@/types";

const ChecklistsProntos = () => {
  const [checklists, setChecklists] = useState<ChecklistPronto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "checklist" | "empresa">("all");
  const [viewingChecklist, setViewingChecklist] = useState<ChecklistPronto | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [modelos, setModelos] = useState<{ id: string, nome_modelo: string }[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string, razao_social: string }[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("aplicacoes_checklist")
      .select(`
        *,
        modelos_checklist (nome_modelo, estrutura_json),
        clientes (razao_social, cnpj, rua, bairro, cidade, estado, cep, responsavel_legal)
      `)
      .eq("tenant_id", user.id)
      .order("data_aplicacao", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar checklists");
      console.error(error);
    } else {
      setChecklists((data as any) || []);
    }

    // Also fetch logo
    const { data: profile } = await supabase
      .from("profiles")
      .select("logo_url, company_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      setLogoUrl(profile.logo_url || "");
      setCompanyName(profile.company_name || "");
    }

    setLoading(false);

    // Fetch models and companies for filters
    const { data: modelsData } = await supabase.from("modelos_checklist").select("id, nome_modelo").eq("tenant_id", user.id);
    setModelos(modelsData || []);

    const { data: companiesData } = await supabase.from("clientes").select("id, razao_social").eq("tenant_id", user.id);
    setEmpresas(companiesData || []);
  };

  // Percorre as respostas e coleta os caminhos (dentro do bucket) de todas as fotos referenciadas
  const extractPhotoPaths = (value: unknown, paths: string[] = []): string[] => {
    const marker = "/checklist_fotos/";
    if (typeof value === "string") {
      const idx = value.indexOf(marker);
      if (idx !== -1) paths.push(decodeURIComponent(value.slice(idx + marker.length)));
    } else if (Array.isArray(value)) {
      value.forEach((v) => extractPhotoPaths(v, paths));
    } else if (value && typeof value === "object") {
      Object.values(value).forEach((v) => extractPhotoPaths(v, paths));
    }
    return paths;
  };

  const handleDelete = async (id: string) => {
    const checklist = checklists.find((c) => c.id === id);

    const { error } = await supabase
      .from("aplicacoes_checklist")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir checklist");
      return;
    }

    // Remove as fotos do storage somente após o registro ser excluído com sucesso
    const photoPaths = extractPhotoPaths(checklist?.respostas_json);
    if (photoPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("checklist_fotos")
        .remove(photoPaths);
      if (storageError) {
        console.error("Erro ao apagar fotos do storage:", storageError);
      }
    }

    toast.success("Checklist excluído com sucesso!");
    loadChecklists();
  };

  const filteredChecklists = checklists.filter((checklist) => {
    // Filtro por ID selecionado no Combobox (se houver)
    if (selectedFilterId) {
      if (filterType === "checklist") {
        return checklist.modelo_id === selectedFilterId;
      } else if (filterType === "empresa") {
        return checklist.cliente_id === selectedFilterId;
      }
    }
    return true;
  });

  const generatePDF = async (checklist: ChecklistPronto) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let logoUrl = "";
      let companyName = "";
      let rtCpfCnpj = "";

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("logo_url, company_name, cpf_cnpj")
          .eq("id", user.id)
          .single();

        if (profile) {
          logoUrl = (profile as Record<string, string>).logo_url || "";
          companyName = (profile as Record<string, string>).company_name || "";
          rtCpfCnpj = (profile as Record<string, string>).cpf_cnpj || "";
        }
      }

      await gerarPDFInspecao({
        logoUrl,
        companyName,
        rtCpfCnpj,
        nomeRT: checklist.responsavel_inspecao || undefined,
        dataAplicacao: checklist.data_aplicacao,
        modeloNome: checklist.modelos_checklist?.nome_modelo,
        secoes: checklist.modelos_checklist?.estrutura_json?.secoes || [],
        respostas: checklist.respostas_json || {},
        parecerConclusivo: checklist.parecer_conclusivo,
        dataProximaInspecao: checklist.data_proxima_inspecao,
        responsavelInspecao: checklist.responsavel_inspecao,
        assinaturaRT: checklist.assinatura_rt,
        assinaturaCliente: checklist.assinatura_cliente,
        assinaturaTestemunha: checklist.assinatura_testemunha,
        nomeClienteAssinatura: checklist.nome_cliente_assinatura,
        nomeTestemunhaAssinatura: checklist.nome_testemunha_assinatura,
        cliente: {
          razao_social: checklist.clientes.razao_social,
          cnpj: checklist.clientes.cnpj,
          rua: checklist.clientes.rua,
          bairro: checklist.clientes.bairro,
          cidade: checklist.clientes.cidade,
          estado: checklist.clientes.estado,
          responsavel_legal: checklist.clientes.responsavel_legal,
        },
      });

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCheck className="w-8 h-8" />
            Visitas Feitas
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize e baixe os checklists já aplicados
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => {
                setFilterType("all");
                setSelectedFilterId(null);
              }}
              size="sm"
              className="text-[10px] h-8 px-1"
            >
              Todos
            </Button>
            <Button
              variant={filterType === "checklist" ? "default" : "outline"}
              onClick={() => {
                setFilterType("checklist");
                setSelectedFilterId(null);
              }}
              size="sm"
              className="text-[10px] h-8 px-1"
            >
              Checklist
            </Button>
            <Button
              variant={filterType === "empresa" ? "default" : "outline"}
              onClick={() => {
                setFilterType("empresa");
                setSelectedFilterId(null);
              }}
              size="sm"
              className="text-[10px] h-8 px-1"
            >
              Empresa
            </Button>
          </div>

          {filterType !== "all" && (
            <div className="w-full">
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedFilterId
                      ? (filterType === "checklist" 
                          ? modelos.find((m) => m.id === selectedFilterId)?.nome_modelo 
                          : empresas.find((e) => e.id === selectedFilterId)?.razao_social)
                      : `Selecionar ${filterType === "checklist" ? "checklist" : "empresa"}...`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 PopoverContent">
                  <Command>
                    <CommandInput placeholder={`Pesquisar ${filterType}...`} />
                    <CommandList>
                      <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(filterType === "checklist" ? modelos : empresas).map((item) => (
                          <CommandItem
                            key={item.id}
                            value={filterType === "checklist" ? (item as any).nome_modelo : (item as any).razao_social}
                            onSelect={() => {
                              setSelectedFilterId(item.id);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFilterId === item.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {filterType === "checklist" ? (item as any).nome_modelo : (item as any).razao_social}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {filteredChecklists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileCheck className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {checklists.length === 0 ? "Nenhum checklist aplicado ainda" : "Nenhum resultado encontrado"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Acesse "Fazer Inspeção" para aplicar um checklist
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredChecklists.map((checklist) => (
              <Card key={checklist.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 md:py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-primary truncate">
                      {checklist.modelos_checklist.nome_modelo}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{checklist.clientes.razao_social}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {format(new Date(checklist.data_aplicacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {checklist.responsavel_inspecao && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="italic truncate">Por: {checklist.responsavel_inspecao}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <Button 
                      onClick={() => setViewingChecklist(checklist)} 
                      size="sm" 
                      variant="outline" 
                      className="h-8 md:h-9"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button 
                      onClick={() => generatePDF(checklist)} 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 md:h-9 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      onClick={() => setDeleteId(checklist.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 md:h-9 md:w-9 p-0 text-destructive hover:bg-destructive/10"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={viewingChecklist !== null} onOpenChange={() => setViewingChecklist(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b pb-4 gap-4 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold uppercase tracking-wider text-primary">
                  {viewingChecklist?.modelos_checklist.nome_modelo}
                </DialogTitle>
                <div className="text-sm mt-1 text-muted-foreground">Relatório de Inspeção</div>
              </div>
              {logoUrl && (
                <div className="flex flex-col sm:items-end">
                  <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain rounded-md bg-white border p-1" />
                  {companyName && <span className="text-xs text-muted-foreground mt-2 font-medium">{companyName}</span>}
                </div>
              )}
            </DialogHeader>
            {viewingChecklist && (
              <div className="space-y-4">
                {/* Client Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Razão Social:</strong> {viewingChecklist.clientes.razao_social}</div>
                    <div><strong>CNPJ:</strong> {viewingChecklist.clientes.cnpj}</div>
                    <div><strong>Endereço:</strong> {viewingChecklist.clientes.rua}, {viewingChecklist.clientes.bairro}, {viewingChecklist.clientes.cidade}, {viewingChecklist.clientes.estado}</div>
                    {viewingChecklist.clientes.responsavel_legal && (
                      <div><strong>Responsável Legal:</strong> {viewingChecklist.clientes.responsavel_legal}</div>
                    )}
                  </CardContent>
                </Card>

                {/* Responses Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Respostas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left font-semibold w-12">Item</th>
                            <th className="p-2 text-left font-semibold">Pergunta</th>
                            <th className="p-2 text-left font-semibold w-1/3">Resposta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const secoes = viewingChecklist.modelos_checklist.estrutura_json?.secoes ||
                              (viewingChecklist.modelos_checklist.estrutura_json?.campos ? [{ id: 'default', titulo: '', campos: viewingChecklist.modelos_checklist.estrutura_json.campos }] : []);

                            let itemIndex = 1;

                            return secoes.flatMap((secao: any) => [
                              secao.titulo ? (
                                <tr key={`sec-${secao.id}`} className="bg-accent/50">
                                  <td colSpan={3} className="p-2 font-bold text-primary">
                                    {secao.titulo}
                                  </td>
                                </tr>
                              ) : null,
                              ...(secao.campos || []).map((campo: any) => {
                                if (campo.tipo === "titulo") {
                                  return (
                                    <tr key={campo.id} className="bg-muted/10">
                                      <td colSpan={3} className="p-2 font-bold text-primary">
                                        {campo.label}
                                      </td>
                                    </tr>
                                  );
                                }
                                if (campo.tipo === "descricao") {
                                  return (
                                    <tr key={campo.id} className="bg-muted/5">
                                      <td colSpan={3} className="p-2 text-xs italic text-muted-foreground">
                                        {campo.label}
                                      </td>
                                    </tr>
                                  );
                                }

                                const resposta = viewingChecklist.respostas_json?.[campo.id];
                                const outrosText = viewingChecklist.respostas_json?.[`${campo.id}_outros_text`];
                                let respostaText: React.ReactNode = "---";

                                if (campo.tipo === "foto" && Array.isArray(resposta) && resposta.length > 0) {
                                  respostaText = (
                                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
                                      {resposta.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group">
                                          <img src={url} alt={`Evidência ${idx + 1}`} className="aspect-square w-full object-cover rounded border shadow-sm group-hover:opacity-80 transition-opacity" />
                                          <span className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-1 rounded-tl">{idx + 1}</span>
                                        </a>
                                      ))}
                                    </div>
                                  );
                                } else if (Array.isArray(resposta) && resposta.length > 0) {
                                  let resText = resposta.join(", ");
                                  if (outrosText && resText.includes("Outros")) {
                                    resText = resText.replace("Outros", `Outros (${outrosText})`);
                                  } else if (outrosText) {
                                    resText += ` (${outrosText})`;
                                  }
                                  respostaText = resText;
                                } else if (resposta !== undefined && resposta !== null && resposta !== "") {
                                  respostaText = String(resposta);
                                }

                                return (
                                  <tr key={campo.id} className="border-t">
                                    <td className="p-2 text-center font-semibold align-top">{itemIndex++}</td>
                                    <td className="p-2 align-top">{campo.label}</td>
                                    <td className="p-2 align-top">{respostaText}</td>
                                  </tr>
                                );
                              })
                            ]);
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Info */}
                {(viewingChecklist.parecer_conclusivo || viewingChecklist.data_proxima_inspecao || viewingChecklist.responsavel_inspecao) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informações Adicionais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {viewingChecklist.parecer_conclusivo && (
                        <div><strong>Parecer Conclusivo:</strong> {viewingChecklist.parecer_conclusivo}</div>
                      )}
                      {viewingChecklist.data_proxima_inspecao && (
                        <div><strong>Próxima Inspeção:</strong> {format(new Date(viewingChecklist.data_proxima_inspecao), "dd/MM/yyyy")}</div>
                      )}
                      {viewingChecklist.responsavel_inspecao && (
                        <div><strong>Responsável:</strong> {viewingChecklist.responsavel_inspecao}</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Signatures */}
                {(viewingChecklist.assinatura_rt || viewingChecklist.assinatura_cliente) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Assinaturas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {viewingChecklist.assinatura_rt && (
                          <div className="text-center">
                            <img src={viewingChecklist.assinatura_rt} alt="Assinatura RT" className="border rounded p-2 w-full h-24 object-contain" />
                            <p className="text-sm mt-2">Responsável Técnico</p>
                          </div>
                        )}
                        {viewingChecklist.assinatura_cliente && (
                          <div className="text-center">
                            <img src={viewingChecklist.assinatura_cliente} alt="Assinatura Cliente" className="border rounded p-2 w-full h-24 object-contain" />
                            <p className="text-sm mt-2">Dono do Estabelecimento</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          title="Excluir checklist?"
          description="As fotos anexadas também serão apagadas. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          destructive
          onConfirm={() => {
            if (deleteId) handleDelete(deleteId);
            setDeleteId(null);
          }}
        />
      </div>
    </Layout>
  );
};

export default ChecklistsProntos;
