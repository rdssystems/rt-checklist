import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { syncToGoogleCalendar } from "@/lib/google-calendar";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, Building2, Save, FileDown, ArrowRight, ArrowLeft, Camera, X, Image as ImageIconLucide, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";
import { toTitleCase, toSentenceCase } from "@/lib/text-utils";
import SignedPhoto from "@/components/SignedPhoto";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { gerarPDFInspecao } from "@/lib/pdf-generator";
import customSelectStyles from "@/components/select-styles";
import Select from "react-select";
import type { Cliente } from "@/types";

interface CampoChecklist {
  id: string;
  tipo: "titulo" | "descricao" | "sim_nao_na" | "observacao" | "foto" | "multipla_escolha" | "data" | "texto" | "outros";
  label: string;
  opcoes?: string[];
  obrigatorio?: boolean;
  tem_observacao?: boolean;
}

interface SecaoChecklist {
  id: string;
  titulo: string;
  descricao?: string;
  campos: CampoChecklist[];
}

interface ModeloChecklist {
  id: string;
  nome_modelo: string;
  estrutura_json: { secoes?: SecaoChecklist[]; campos?: CampoChecklist[]; descricao?: string };
}

interface PhotoProgress {
  current: number;
  total: number;
  step: 'compressing' | 'uploading';
  percentage: number;
}

const PROGRESS_STORAGE_KEY = "rt_checklist_aplicar_progress";

interface SavedChecklistProgress {
  clienteSelecionado: string;
  modeloSelecionado: string;
  respostas: Record<string, any>;
  currentSectionIndex: number;
  parecerConclusivo: string;
  dataProximaInspecao: string;
  nomeRT: string;
  nomeClienteAssinatura: string;
  nomeTestemunhaAssinatura: string;
}

const AplicarChecklist = () => {
  const [searchParams] = useSearchParams();
  const clienteIdUrl = searchParams.get("clienteId");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [photoProgressMap, setPhotoProgressMap] = useState<Record<string, PhotoProgress>>({});
  
  // Stepper e Revisão
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Assinaturas e Dados Finais
  const [assinaturaRT, setAssinaturaRT] = useState("");
  const [assinaturaCliente, setAssinaturaCliente] = useState("");
  const [assinaturaTestemunha, setAssinaturaTestemunha] = useState("");
  const [parecerConclusivo, setParecerConclusivo] = useState("");
  const [dataProximaInspecao, setDataProximaInspecao] = useState("");
  const [nomeRT, setNomeRT] = useState("");
  const [nomeClienteAssinatura, setNomeClienteAssinatura] = useState("");
  const [nomeTestemunhaAssinatura, setNomeTestemunhaAssinatura] = useState("");

  const [loading, setLoading] = useState(false);
  const [restoredToastShown, setRestoredToastShown] = useState(false);

  // Saving Modal State
  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [savingStepText, setSavingStepText] = useState("");
  const [savingPercent, setSavingPercent] = useState(0);

  useEffect(() => {
    fetchClientes();
    fetchModelos();
  }, []);

  useEffect(() => {
    if (clienteIdUrl && clientes.length > 0) {
      const clienteExists = clientes.some(c => c.id === clienteIdUrl);
      if (clienteExists) {
        setClienteSelecionado(clienteIdUrl);
      }
    }
  }, [clienteIdUrl, clientes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return;
      const parsed: SavedChecklistProgress = JSON.parse(raw);
      if (parsed) {
        setClienteSelecionado(parsed.clienteSelecionado || "");
        setModeloSelecionado(parsed.modeloSelecionado || "");
        setRespostas(parsed.respostas || {});
        setCurrentSectionIndex(typeof parsed.currentSectionIndex === "number" ? parsed.currentSectionIndex : 0);
        setParecerConclusivo(parsed.parecerConclusivo || "");
        setDataProximaInspecao(parsed.dataProximaInspecao || "");
        setNomeRT(parsed.nomeRT || "");
        setNomeClienteAssinatura(parsed.nomeClienteAssinatura || "");
        setNomeTestemunhaAssinatura(parsed.nomeTestemunhaAssinatura || "");

        if (!restoredToastShown) {
          toast.info("Progresso do checklist restaurado automaticamente.");
          setRestoredToastShown(true);
        }
      }
    } catch {
      // ignora parse error
    }
  }, [restoredToastShown]);

  useEffect(() => {
    const hasData =
      clienteSelecionado ||
      modeloSelecionado ||
      Object.keys(respostas).length > 0 ||
      parecerConclusivo ||
      dataProximaInspecao;

    if (!hasData) {
      localStorage.removeItem(PROGRESS_STORAGE_KEY);
      return;
    }

    const payload: SavedChecklistProgress = {
      clienteSelecionado,
      modeloSelecionado,
      respostas,
      currentSectionIndex,
      parecerConclusivo,
      dataProximaInspecao,
      nomeRT,
      nomeClienteAssinatura,
      nomeTestemunhaAssinatura,
    };

    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // quota/storage indisponível
    }
  }, [
    clienteSelecionado,
    modeloSelecionado,
    respostas,
    currentSectionIndex,
    parecerConclusivo,
    dataProximaInspecao,
    nomeRT,
    nomeClienteAssinatura,
    nomeTestemunhaAssinatura,
  ]);

  const clearProgress = () => {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    setRespostas({});
    setClienteSelecionado("");
    setModeloSelecionado("");
    setCurrentSectionIndex(0);
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("razao_social");
    setClientes(data || []);
  };

  const fetchModelos = async () => {
    const { data } = await supabase.from("modelos_checklist").select("*").order("nome_modelo");
    setModelos((data as unknown as ModeloChecklist[]) || []);
  };

  const handleResposta = (campoId: string, valor: any) => {
    setRespostas((prev) => ({ ...prev, [campoId]: valor }));
  };

  const modeloAtual = modelos.find(m => m.id === modeloSelecionado);

  const secoesDoModelo: SecaoChecklist[] = modeloAtual?.estrutura_json?.secoes || (
    modeloAtual?.estrutura_json?.campos ? [{ id: "geral", titulo: "Geral", campos: modeloAtual.estrutura_json.campos }] : []
  );

  const contarFotosDoChecklist = () => {
    let total = 0;
    for (const val of Object.values(respostas)) {
      if (Array.isArray(val)) {
        total += val.filter((item) => typeof item === "string" && (item.startsWith("http") || item.startsWith("photos/"))).length;
      }
    }
    return total;
  };

  const handleImageUpload = async (campoId: string, eventOrBlob: React.ChangeEvent<HTMLInputElement> | Blob) => {
    let files: FileList | null = null;
    let singleBlob: Blob | null = null;

    if ('target' in eventOrBlob) {
      files = eventOrBlob.target.files;
    } else {
      singleBlob = eventOrBlob;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if ((!files || files.length === 0) && !singleBlob) return;
    if (!user) return;

    const { getPlanStatus, getLimitsFor } = await import("@/lib/plan-limits");
    const planStatus = await getPlanStatus();
    const limits = getLimitsFor(planStatus);
    const maxFotos = limits.fotosPorChecklist;
    const fotosAtuais = contarFotosDoChecklist();
    const slotsRestantes = maxFotos - fotosAtuais;

    if (slotsRestantes <= 0) {
      toast.error(
        planStatus.isPremium
          ? `Limite de ${maxFotos} fotos por checklist atingido.`
          : `Limite de ${maxFotos} fotos por checklist no plano Free. Faça upgrade para anexar até 10.`
      );
      return;
    }

    setUploadingFields(prev => ({ ...prev, [campoId]: true }));

    try {
      const newUrls = [...(respostas[campoId] || [])];
      let itemsToProcess = files ? Array.from(files) : [singleBlob as Blob];

      if (itemsToProcess.length > slotsRestantes) {
        itemsToProcess = itemsToProcess.slice(0, slotsRestantes);
        toast.warning(`Apenas ${slotsRestantes} foto(s) adicionada(s) — limite de ${maxFotos} por checklist.`);
      }

      const isDriveStorage = planStatus.storageProvider === "google_drive";
      let driveToken: string | null = null;
      let driveFolderId: string | null = null;

      if (isDriveStorage) {
        const { getValidGoogleToken, ensureDriveFolder } = await import("@/lib/google-drive");
        driveToken = await getValidGoogleToken();
        if (driveToken) {
          driveFolderId = await ensureDriveFolder(driveToken, "RT-Expert Inspeções");
        }
      }

      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];

        setPhotoProgressMap(prev => ({
          ...prev,
          [campoId]: {
            current: i + 1,
            total: itemsToProcess.length,
            step: 'compressing',
            percentage: Math.round((i / itemsToProcess.length) * 100) + 15
          }
        }));

        const compressedBlob = await compressImage(item as File | Blob, {
          maxWidth: limits.fotoMaxWidth,
          quality: limits.fotoQuality
        });

        setPhotoProgressMap(prev => ({
          ...prev,
          [campoId]: {
            current: i + 1,
            total: itemsToProcess.length,
            step: 'uploading',
            percentage: Math.round(((i + 0.6) / itemsToProcess.length) * 100)
          }
        }));

        if (isDriveStorage && driveToken && driveFolderId) {
          const { uploadPhotoToDrive } = await import("@/lib/google-drive");
          const fileName = `vistoria_${Date.now()}_${i + 1}.jpg`;
          const driveResult = await uploadPhotoToDrive(driveToken, driveFolderId, compressedBlob, fileName);
          
          if (driveResult?.viewUrl) {
            newUrls.push(driveResult.viewUrl);
            setPhotoProgressMap(prev => ({
              ...prev,
              [campoId]: {
                current: i + 1,
                total: itemsToProcess.length,
                step: 'uploading',
                percentage: Math.round(((i + 1) / itemsToProcess.length) * 100)
              }
            }));
            continue;
          }
        }

        // Fallback ou padrão Supabase Storage
        const fileExt = "jpg";
        const fileName = `${user.id}/${campoId}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('checklist_fotos')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('checklist_fotos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);

        setPhotoProgressMap(prev => ({
          ...prev,
          [campoId]: {
            current: i + 1,
            total: itemsToProcess.length,
            step: 'uploading',
            percentage: Math.round(((i + 1) / itemsToProcess.length) * 100)
          }
        }));
      }

      handleResposta(campoId, newUrls);
      toast.success(itemsToProcess.length > 1 ? 'Fotos anexadas com sucesso!' : 'Foto anexada com sucesso!');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setUploadingFields(prev => ({ ...prev, [campoId]: false }));
      setPhotoProgressMap(prev => {
        const next = { ...prev };
        delete next[campoId];
        return next;
      });
    }
  };

  const removeImage = (campoId: string, urlToRemove: string) => {
    const current = respostas[campoId] || [];
    handleResposta(campoId, current.filter((u: string) => u !== urlToRemove));
  };

  const validarSecaoAtual = () => {
    const secaoAtual = secoesDoModelo[currentSectionIndex];
    if (!secaoAtual) return true;

    for (const campo of secaoAtual.campos) {
      if (campo.obrigatorio) {
        const val = respostas[campo.id];
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`O campo "${campo.label}" é obrigatório.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleProximo = () => {
    if (!validarSecaoAtual()) return;
    if (currentSectionIndex < secoesDoModelo.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsReviewMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSalvar = async () => {
    if (!clienteSelecionado || !modeloSelecionado) {
      toast.error("Selecione um cliente e um modelo");
      return;
    }
    if (!assinaturaRT || !assinaturaCliente) {
      toast.error("As assinaturas são obrigatórias");
      return;
    }
    
    setLoading(true);
    setSavingModalOpen(true);
    setSavingStepText("Verificando permissões e limites do plano...");
    setSavingPercent(15);

    const { checkChecklistLimit } = await import("@/lib/plan-limits");
    const { canCreate, total, limite } = await checkChecklistLimit();

    if (!canCreate) {
      setSavingModalOpen(false);
      setLoading(false);
      toast.error("Limite mensal atingido!", {
        description: `Você já utilizou seus ${limite} checklists mensais do plano gratuito (${total}/${limite}). Faça upgrade para ilimitado.`,
        duration: 6000
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingModalOpen(false);
      setLoading(false);
      toast.error("Usuário não autenticado");
      return;
    }

    setSavingStepText("Gravando respostas do laudo e assinaturas...");
    setSavingPercent(45);

    const dataToSave: any = {
      tenant_id: user.id,
      cliente_id: clienteSelecionado,
      modelo_id: modeloSelecionado,
      respostas_json: respostas,
      assinatura_rt: assinaturaRT,
      assinatura_cliente: assinaturaCliente,
      assinatura_testemunha: assinaturaTestemunha,
      parecer_conclusivo: toSentenceCase(parecerConclusivo),
      data_proxima_inspecao: dataProximaInspecao || null,
      responsavel_inspecao: toTitleCase(nomeRT),
      nome_cliente_assinatura: toTitleCase(nomeClienteAssinatura),
      nome_testemunha_assinatura: toTitleCase(nomeTestemunhaAssinatura)
    };

    const { error } = await supabase.from("aplicacoes_checklist").insert([dataToSave]);
    
    if (error) {
      setSavingModalOpen(false);
      setLoading(false);
      toast.error(error.message);
      return;
    }

    setSavingStepText("Sincronizando agendamento da próxima inspeção...");
    setSavingPercent(85);

    if (dataProximaInspecao) {
      try {
        const { error: agendamentoError } = await (supabase as any)
          .from("agendamentos")
          .insert([{
            tenant_id: user.id,
            cliente_id: clienteSelecionado,
            data_visita: new Date(dataProximaInspecao).toISOString(),
            descricao: `Visita agendada via checklist: ${modeloAtual?.nome_modelo || ""}`,
            status: 'pendente'
          }]);
        
        if (!agendamentoError) {
          const cliente = clientes.find(c => c.id === clienteSelecionado);
          syncToGoogleCalendar({
            tenant_id: user.id,
            cliente_nome: cliente?.nome_fantasia || cliente?.razao_social || 'Cliente',
            data_visita: new Date(dataProximaInspecao).toISOString(),
            descricao: `Visita agendada via checklist: ${modeloAtual?.nome_modelo || ""}`
          });
        }
      } catch (e) {
        console.error("Erro na automação de agenda:", e);
      }
    }

    setSavingStepText("Vistoria salva com sucesso!");
    setSavingPercent(100);
    setLoading(false);

    setTimeout(() => {
      setSavingModalOpen(false);
      toast.success("Checklist aplicado com sucesso!");
      clearProgress();
      setAssinaturaRT("");
      setAssinaturaCliente("");
      setAssinaturaTestemunha("");
      setParecerConclusivo("");
      setDataProximaInspecao("");
      setIsReviewMode(false);
    }, 600);
  };

  return (
    <>
      <Layout>
        <div className="p-2 sm:p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Header Card */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Fazer Inspeção</h1>
              <p className="text-muted-foreground text-sm">Selecione o alvo da vistoria abaixo</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-[2] w-full">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cliente</Label>
                <Select
                  value={clientes.find(c => c.id === clienteSelecionado) ? { value: clienteSelecionado, label: clientes.find(c => c.id === clienteSelecionado)!.nome_fantasia || clientes.find(c => c.id === clienteSelecionado)!.razao_social } : null}
                  onChange={(option) => setClienteSelecionado(option?.value || "")}
                  options={clientes.map(cliente => ({
                    value: cliente.id,
                    label: cliente.nome_fantasia || cliente.razao_social
                  }))}
                  placeholder="Buscar cliente..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div className="flex-1 space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Modelo</Label>
                <Select
                  value={modelos.find(m => m.id === modeloSelecionado) ? { value: modeloSelecionado, label: modelos.find(m => m.id === modeloSelecionado)!.nome_modelo } : null}
                  onChange={(option) => {
                    setModeloSelecionado(option?.value || "");
                    setCurrentSectionIndex(0);
                    setIsReviewMode(false);
                  }}
                  options={modelos.map(modelo => ({
                    value: modelo.id,
                    label: modelo.nome_modelo
                  }))}
                  placeholder="Buscar modelo..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>
            </div>
          </div>

          {/* Stepper Progress Header */}
          {modeloAtual && secoesDoModelo.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>{isReviewMode ? "Revisão e Finalização" : `Seção ${currentSectionIndex + 1} de ${secoesDoModelo.length}`}</span>
                <span>{isReviewMode ? "100%" : `${Math.round(((currentSectionIndex + 1) / secoesDoModelo.length) * 100)}%`}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: isReviewMode ? "100%" : `${((currentSectionIndex + 1) / secoesDoModelo.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Render Active Section or Review Mode */}
          {modeloAtual && secoesDoModelo.length > 0 && !isReviewMode && (
            <Card className="shadow-md border-slate-200 dark:border-slate-800">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="text-xl text-primary font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full"></div>
                  {secoesDoModelo[currentSectionIndex].titulo}
                </CardTitle>
                {secoesDoModelo[currentSectionIndex].descricao && (
                  <CardDescription>{secoesDoModelo[currentSectionIndex].descricao}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-6">
                {secoesDoModelo[currentSectionIndex].campos.map((campo) => (
                  <div key={campo.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3">
                    {campo.tipo === "texto" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                        <Input
                          value={respostas[campo.id] || ""}
                          onChange={e => handleResposta(campo.id, e.target.value)}
                          placeholder="Digite a resposta..."
                        />
                      </div>
                    )}

                    {campo.tipo === "sim_nao_na" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                        <RadioGroup
                          value={respostas[campo.id] || ""}
                          onValueChange={v => handleResposta(campo.id, v)}
                          className="flex flex-wrap gap-2"
                        >
                          {["SIM", "NAO", "NA"].map(opt => (
                            <div key={opt} className="flex-1 min-w-[80px]">
                              <RadioGroupItem value={opt} id={`${campo.id}-${opt}`} className="peer sr-only" />
                              <Label
                                htmlFor={`${campo.id}-${opt}`}
                                className="flex items-center justify-center py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary cursor-pointer transition-all text-xs font-bold text-center"
                              >
                                {opt === "NAO" ? "NÃO" : opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    {campo.tipo === "multipla_escolha" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                        <div className="space-y-2">
                          {campo.opcoes?.map((opcao: string, idx: number) => {
                            const isOutros = opcao === "Outros";
                            return (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-primary transition-colors cursor-pointer">
                                  <Checkbox
                                    id={`${campo.id}-${idx}`}
                                    checked={respostas[campo.id]?.includes(opcao) || false}
                                    onCheckedChange={checked => {
                                      const current = respostas[campo.id] || [];
                                      if (checked) handleResposta(campo.id, [...current, opcao]);
                                      else handleResposta(campo.id, current.filter((v: string) => v !== opcao));
                                    }}
                                  />
                                  <Label htmlFor={`${campo.id}-${idx}`} className="cursor-pointer flex-1 font-medium text-sm">{opcao}</Label>
                                </div>
                                {isOutros && respostas[campo.id]?.includes("Outros") && (
                                  <Input
                                    className="ml-6 w-[calc(100%-1.5rem)]"
                                    placeholder="Especifique..."
                                    value={respostas[`${campo.id}_outros_text`] || ""}
                                    onChange={e => handleResposta(`${campo.id}_outros_text`, e.target.value)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {campo.tem_observacao && (
                          <div className="mt-2 space-y-1 pt-2 border-t border-dashed border-slate-200">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase px-1">Observações do Item</Label>
                            <Textarea
                              placeholder="Descreva..."
                              value={respostas[`${campo.id}_observacao`] || ""}
                              onChange={e => handleResposta(`${campo.id}_observacao`, e.target.value)}
                              className="min-h-[60px] text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {campo.tipo === "foto" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Camera className="w-4 h-4 text-primary" /> {campo.label} {campo.obrigatorio && "*"}
                        </Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {respostas[campo.id]?.map((url: string, idx: number) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                              <SignedPhoto stored={url} alt="Evidência" className="w-full h-full object-cover" />
                              <button onClick={() => removeImage(campo.id, url)} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg shadow-sm">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer ${uploadingFields[campo.id] ? 'bg-slate-100 animate-pulse' : 'hover:bg-primary/5'}`}>
                            <ImageIconLucide className="text-slate-400 w-5 h-5 mb-1" />
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Galeria</span>
                            <input type="file" multiple accept="image/*" className="hidden" disabled={uploadingFields[campo.id]} onChange={e => handleImageUpload(campo.id, e)} />
                          </label>
                          <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer bg-primary/5 border-primary/30 ${uploadingFields[campo.id] ? 'animate-pulse' : 'hover:bg-primary/10'}`}>
                            <Camera className="text-primary w-5 h-5 mb-1" />
                            <span className="text-[10px] text-primary uppercase font-bold">Câmera</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploadingFields[campo.id]} onChange={e => handleImageUpload(campo.id, e)} />
                          </label>
                        </div>

                        {/* Photo Upload Progress Bar */}
                        {photoProgressMap[campo.id] && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
                              <span className="flex items-center gap-1.5 font-bold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                {photoProgressMap[campo.id].step === 'compressing'
                                  ? `Otimizando foto ${photoProgressMap[campo.id].current} de ${photoProgressMap[campo.id].total}...`
                                  : `Enviando foto ${photoProgressMap[campo.id].current} de ${photoProgressMap[campo.id].total} para a nuvem...`}
                              </span>
                              <span className="font-extrabold">{photoProgressMap[campo.id].percentage}%</span>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${photoProgressMap[campo.id].percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {campo.tipo === "observacao" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">{campo.label}</Label>
                        <Textarea value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Detalhes..." />
                      </div>
                    )}

                    {campo.tipo === "data" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">{campo.label}</Label>
                        <Input type="date" value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}

                {/* Stepper Navigation */}
                <div className="pt-4 flex justify-between border-t mt-4 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentSectionIndex(prev => Math.max(0, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentSectionIndex === 0}
                    className="flex-1 sm:flex-none"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleProximo}
                    className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white font-bold"
                  >
                    {currentSectionIndex === secoesDoModelo.length - 1 ? "Revisar e Assinar" : "Próxima Seção"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review and Signatures Mode */}
          {isReviewMode && (
            <div className="space-y-6">
              <Card className="shadow-md border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <CardTitle className="text-xl text-primary font-bold">Parecer Conclusivo & Próxima Visita</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Parecer Técnico Conclusivo</Label>
                    <Textarea
                      placeholder="Escreva as considerações finais sobre as condições do estabelecimento..."
                      value={parecerConclusivo}
                      onChange={e => setParecerConclusivo(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Data da Próxima Inspeção (Agendamento Automático)</Label>
                    <Input
                      type="date"
                      value={dataProximaInspecao}
                      onChange={e => setDataProximaInspecao(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Signatures */}
              <Card className="shadow-md border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <CardTitle className="text-xl text-primary font-bold">Assinaturas Digitais</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* RT Signature */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">Responsável Técnico *</Label>
                      <Input
                        placeholder="Nome Completo do RT"
                        value={nomeRT}
                        onChange={e => setNomeRT(e.target.value)}
                        className="mb-2"
                      />
                      <SignatureCanvas onSave={setAssinaturaRT} />
                    </div>

                    {/* Client Signature */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">Representante do Cliente *</Label>
                      <Input
                        placeholder="Nome Completo do Responsável"
                        value={nomeClienteAssinatura}
                        onChange={e => setNomeClienteAssinatura(e.target.value)}
                        className="mb-2"
                      />
                      <SignatureCanvas onSave={setAssinaturaCliente} />
                    </div>

                    {/* Witness Signature */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">Testemunha (Opcional)</Label>
                      <Input
                        placeholder="Nome da Testemunha"
                        value={nomeTestemunhaAssinatura}
                        onChange={e => setNomeTestemunhaAssinatura(e.target.value)}
                        className="mb-2"
                      />
                      <SignatureCanvas onSave={setAssinaturaTestemunha} />
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row justify-between gap-3 border-t">
                    <Button variant="outline" onClick={() => setIsReviewMode(false)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Checklist
                    </Button>
                    <Button onClick={handleSalvar} disabled={loading} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md">
                      <Save className="mr-2 h-5 w-5" /> Finalizar e Salvar Inspeção
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Layout>

      {/* Saving Progress Modal */}
      {savingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              {savingPercent === 100 ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
              ) : (
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                {savingPercent === 100 ? "Vistoria Finalizada!" : "Salvando Vistoria..."}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {savingStepText}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Progresso</span>
                <span className="text-primary">{savingPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${savingPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AplicarChecklist;