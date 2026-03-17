import { useEffect, useState } from "react";
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
import { FileCheck, Building2, Save, FileDown, ArrowRight, ArrowLeft, Camera, X, Image as ImageIconLucide, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import jsPDF from "jspdf";
import Select from "react-select";

interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  responsavel_legal: string | null;
}

interface CampoChecklist {
  id: string;
  tipo: "titulo" | "descricao" | "sim_nao_na" | "observacao" | "foto" | "multipla_escolha" | "data" | "outros";
  label: string;
  opcoes?: string[];
  obrigatorio?: boolean;
  tem_observacao?: boolean;
}

interface Modelo {
  id: string;
  nome_modelo: string;
  estrutura_json: {
    campos?: CampoChecklist[];
    secoes?: any[];
  };
}

const AplicarChecklist = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [assinaturaRT, setAssinaturaRT] = useState<string>("");
  const [assinaturaCliente, setAssinaturaCliente] = useState<string>("");
  const [assinaturaTestemunha, setAssinaturaTestemunha] = useState<string>("");
  const [parecerConclusivo, setParecerConclusivo] = useState<string>("");
  const [dataProximaInspecao, setDataProximaInspecao] = useState<string>("");
  const [nomeRT, setNomeRT] = useState<string>("");
  const [nomeClienteAssinatura, setNomeClienteAssinatura] = useState<string>("");
  const [nomeTestemunhaAssinatura, setNomeTestemunhaAssinatura] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchClientes();
    fetchModelos();
    fetchNomeRT();
  }, []);

  const clienteAtual = clientes.find(c => c.id === clienteSelecionado);
  const modeloAtual = modelos.find(m => m.id === modeloSelecionado);

  useEffect(() => {
    if (clienteAtual) {
      setNomeClienteAssinatura(clienteAtual.responsavel_legal || "");
    }
  }, [clienteSelecionado, clientes]);

  const fetchNomeRT = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("nome_rt, logo_url, company_name").eq("id", user.id).single();
      if (data) {
        setNomeRT(data.nome_rt);
        setLogoUrl(data.logo_url || "");
        setCompanyName(data.company_name || "");
      }
    }
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase.from("clientes").select("id, razao_social, nome_fantasia, cnpj, rua, bairro, cidade, estado, responsavel_legal").order("razao_social");
    if (!error && data) {
      setClientes(data);
    }
  };

  const fetchModelos = async () => {
    const { data, error } = await supabase.from("modelos_checklist").select("*").order("nome_modelo");
    if (!error && data) {
      setModelos(data as unknown as Modelo[]);
    }
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const handleResposta = (itemId: string, valor: any) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: valor
    }));
  };

  const handleImageUpload = async (campoId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const { data: { user } } = await supabase.auth.getUser();
    if (!files || files.length === 0 || !user) return;

    setUploadingFields(prev => ({ ...prev, [campoId]: true }));

    try {
      const newUrls = [...(respostas[campoId] || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const compressedBlob = await compressImage(file, {
          maxWidth: 1024,
          quality: 0.7
        });

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
      }

      handleResposta(campoId, newUrls);
      toast.success(`${files.length > 1 ? 'Fotos carregadas' : 'Foto carregada'} com sucesso!`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setUploadingFields(prev => ({ ...prev, [campoId]: false }));
    }
  };

  const removeImage = (campoId: string, urlToRemove: string) => {
    const currentUrls = respostas[campoId] || [];
    handleResposta(campoId, currentUrls.filter((url: string) => url !== urlToRemove));

    try {
      const parts = urlToRemove.split('/');
      const fileName = parts.pop();
      const campoFolder = parts.pop();
      const userFolder = parts.pop();
      const path = `${userFolder}/${campoFolder}/${fileName}`;
      supabase.storage.from('checklist_fotos').remove([path]);
    } catch (e) {
      console.error("Erro ao deletar arquivo do storage:", e);
    }
  };

  const gerarPDF = async () => {
    if (!clienteAtual || !modeloAtual) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    let logoWidth = 30;
    let logoHeight = 15;
    if (logoUrl) {
      try {
        const img = new window.Image();
        img.crossOrigin = "Anonymous";
        img.src = logoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const ratio = img.width / img.height;
        logoHeight = 15;
        logoWidth = 15 * ratio;
        if (logoWidth > 40) {
          logoWidth = 40;
          logoHeight = 40 / ratio;
        }
      } catch (e) {
        console.error("Error loading logo dimensions:", e);
      }
    }

    if (logoUrl) {
      try {
        pdf.addImage(logoUrl, "PNG", margin, yPos, logoWidth, logoHeight);
      } catch (e) {
        console.error("Error adding logo:", e);
      }
    }

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    if (companyName) {
      pdf.text(companyName, pageWidth - margin, yPos, { align: "right" });
    }
    pdf.text(new Date().toLocaleDateString("pt-BR"), pageWidth - margin, yPos + 5, { align: "right" });

    yPos += 12;

    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Relatório de Inspeção", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(modeloAtual.nome_modelo, pageWidth / 2, yPos, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    yPos += 8;

    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    pdf.setFillColor(245, 245, 245);
    const boxHeight = clienteAtual.responsavel_legal ? 24 : 18;
    pdf.rect(margin, yPos, contentWidth, boxHeight, "F");

    yPos += 5;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Razão Social:", margin + 3, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(clienteAtual.razao_social, margin + 35, yPos);
    yPos += 5;

    pdf.setFont("helvetica", "bold");
    pdf.text("CNPJ:", margin + 3, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(clienteAtual.cnpj, margin + 35, yPos);
    yPos += 5;

    const endereco = [clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado].filter(Boolean).join(", ");
    if (endereco) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Endereço:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      const enderecoLines = pdf.splitTextToSize(endereco, contentWidth - 38);
      pdf.text(enderecoLines, margin + 35, yPos);
      yPos += 5 * enderecoLines.length;
    }

    if (clienteAtual.responsavel_legal) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Responsável Legal:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(clienteAtual.responsavel_legal, margin + 48, yPos);
      yPos += 4;
    }

    yPos += 6;

    const secoes = modeloAtual.estrutura_json?.secoes ||
      (modeloAtual.estrutura_json?.campos ? [{ id: 'default', titulo: '', campos: modeloAtual.estrutura_json.campos }] : []);

    const campos = secoes.flatMap((secao: any) => {
      const result = [];
      if (secao.titulo) {
        result.push({ tipo: "titulo", label: secao.titulo, id: `sec-${secao.id}` });
      }
      return result.concat(secao.campos || []);
    });

    let itemNumber = 1;
    let headerDrawnForSection = false;

    campos.forEach((campo: any) => {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
        headerDrawnForSection = false;
      }

      if (campo.tipo === "titulo") {
        pdf.setFillColor(245, 245, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        const titleHeight = 8;
        pdf.rect(margin, yPos, contentWidth, titleHeight, "FD");
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(40, 40, 180);
        pdf.text(campo.label, margin + 2, yPos + 5);
        pdf.setTextColor(0, 0, 0);
        yPos += titleHeight;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, yPos, contentWidth, 8, "FD");
        pdf.text("ITEM", margin + 2, yPos + 5);
        pdf.text("PERGUNTA", margin + 14, yPos + 5);
        pdf.text("RESPOSTA", margin + 114, yPos + 5);
        yPos += 8;
        headerDrawnForSection = true;
      } else if (campo.tipo === "descricao") {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(100, 100, 100);
        const descLines = pdf.splitTextToSize(campo.label, contentWidth - 4);
        const descHeight = descLines.length * 4 + 2;
        pdf.rect(margin, yPos, contentWidth, descHeight, "FD");
        pdf.text(descLines, margin + 2, yPos + 3);
        pdf.setTextColor(0, 0, 0);
        yPos += descHeight;
      } else {
        if (!headerDrawnForSection) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setFillColor(230, 230, 230);
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.1);
          pdf.rect(margin, yPos, contentWidth, 8, "FD");
          pdf.text("ITEM", margin + 2, yPos + 5);
          pdf.text("PERGUNTA", margin + 14, yPos + 5);
          pdf.text("RESPOSTA", margin + 114, yPos + 5);
          yPos += 8;
          headerDrawnForSection = true;
        }

        const resposta = respostas[campo.id];
        const outrosText = respostas[`${campo.id}_outros_text`];
        let respostaText = "---";

        if (campo.tipo === "foto" && Array.isArray(resposta) && resposta.length > 0) {
          respostaText = `${resposta.length} foto(s) anexada(s)`;
        } else if (Array.isArray(resposta)) {
          respostaText = resposta.join(", ");
          if (outrosText) {
            respostaText += ` (${outrosText})`;
          }
        } else if (resposta !== undefined && resposta !== null && resposta !== "") {
          respostaText = String(resposta);
        }

        const observacao = respostas[`${campo.id}_observacao`];
        if (observacao) {
          respostaText += `\nObs: ${observacao}`;
        }

        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        const perguntaLines = pdf.splitTextToSize(campo.label, 96);
        const respostaLines = pdf.splitTextToSize(respostaText, contentWidth - 116);
        const rowHeight = Math.max(perguntaLines.length, respostaLines.length) * 4 + 3;

        const col1W = 12;
        const col2W = 100;
        const col3W = contentWidth - 112;

        pdf.rect(margin, yPos, col1W, rowHeight);
        pdf.rect(margin + col1W, yPos, col2W, rowHeight);
        pdf.rect(margin + col1W + col2W, yPos, col3W, rowHeight);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(String(itemNumber), margin + 6, yPos + 4, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.text(perguntaLines, margin + 14, yPos + 3);

        if (campo.tipo === "foto" && Array.isArray(resposta) && resposta.length > 0) {
          pdf.setTextColor(0, 100, 0);
          pdf.setFont("helvetica", "bold");
          pdf.text(respostaText, margin + 114, yPos + 3);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont("helvetica", "normal");
        } else {
          pdf.text(respostaLines, margin + 114, yPos + 3);
        }

        yPos += rowHeight;
        itemNumber++;
      }
    });

    const allPhotos: { url: string, label: string }[] = [];
    campos.forEach((campo: any) => {
      if (campo.tipo === "foto" && Array.isArray(respostas[campo.id])) {
        respostas[campo.id].forEach((url: string) => {
          allPhotos.push({ url, label: campo.label });
        });
      }
    });

    if (allPhotos.length > 0) {
      pdf.addPage();
      yPos = margin;
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Arquivo Fotográfico", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      const cols = 4;
      const spacing = 4;
      const imgWidth = (contentWidth - (spacing * (cols - 1))) / cols;
      const imgHeight = imgWidth * 0.75;

      for (let i = 0; i < allPhotos.length; i += cols) {
        if (yPos + imgHeight + 15 > pageHeight - 30) {
          pdf.addPage();
          yPos = margin;
        }

        for (let j = 0; j < cols && (i + j) < allPhotos.length; j++) {
          const photo = allPhotos[i + j];
          const xPos = margin + (j * (imgWidth + spacing));

          try {
            pdf.addImage(photo.url, "JPEG", xPos, yPos, imgWidth, imgHeight);
            pdf.setFontSize(6);
            pdf.setFont("helvetica", "italic");
            pdf.text(`${i + j + 1}`, xPos + (imgWidth / 2), yPos + imgHeight + 3, { align: "center" });
          } catch (e) {
            console.error("Error adding photo to PDF:", e);
          }
        }
        yPos += imgHeight + 8;
      }
      yPos += 5;
    }

    if (parecerConclusivo) {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
      yPos += 5;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Parecer Conclusivo:", margin, yPos);
      yPos += 6;
      pdf.setFont("helvetica", "normal");
      const parecerLines = pdf.splitTextToSize(parecerConclusivo, contentWidth);
      pdf.text(parecerLines, margin, yPos);
      yPos += (4 * parecerLines.length) + 8;
    }

    if (dataProximaInspecao) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Próxima Inspeção:", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date(dataProximaInspecao).toLocaleDateString("pt-BR"), margin + 40, yPos);
      yPos += 8;
    }

    if (nomeRT) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Responsável pela Inspeção:", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(nomeRT, margin + 48, yPos);
      yPos += 12;
    }

    if (assinaturaRT || assinaturaCliente || assinaturaTestemunha) {
      if (yPos > pageHeight - 65) {
        pdf.addPage();
        yPos = margin + 10;
      } else {
        yPos += 12;
      }

      const signatureWidth = 50;
      const signatureHeight = 18;
      const spacing = (contentWidth - (signatureWidth * 3)) / 2;

      let xPos = margin;

      if (assinaturaRT) {
        pdf.addImage(assinaturaRT, "PNG", xPos, yPos, signatureWidth, signatureHeight);
      }
      pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(nomeRT, xPos + signatureWidth / 2, yPos + signatureHeight + 6, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Responsável Técnico", xPos + signatureWidth / 2, yPos + signatureHeight + 10, { align: "center" });
      
      xPos += signatureWidth + spacing;

      if (assinaturaCliente) {
        pdf.addImage(assinaturaCliente, "PNG", xPos, yPos, signatureWidth, signatureHeight);
      }
      pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
      pdf.setFont("helvetica", "bold");
      pdf.text(nomeClienteAssinatura || "Dono/Gerente", xPos + signatureWidth / 2, yPos + signatureHeight + 6, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Dono do Estabelecimento", xPos + signatureWidth / 2, yPos + signatureHeight + 10, { align: "center" });
      
      xPos += signatureWidth + spacing;

      if (assinaturaTestemunha || nomeTestemunhaAssinatura) {
        if (assinaturaTestemunha) {
          pdf.addImage(assinaturaTestemunha, "PNG", xPos, yPos, signatureWidth, signatureHeight);
        }
        pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
        pdf.setFont("helvetica", "bold");
        pdf.text(nomeTestemunhaAssinatura || "", xPos + signatureWidth / 2, yPos + signatureHeight + 6, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text("Testemunha", xPos + signatureWidth / 2, yPos + signatureHeight + 10, { align: "center" });
      }
      
      yPos += signatureHeight + 15;
    }

    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      const footerY = pageHeight - 12;
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.1);
      pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado automaticamente por", pageWidth / 2, footerY - 4, { align: "center" });
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      const rtWidth = pdf.getTextWidth("RT ");
      const expertWidth = pdf.getTextWidth("Expert");
      const totalWidth = rtWidth + expertWidth;
      const startX = (pageWidth - totalWidth) / 2;
      pdf.text("RT ", startX, footerY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(59, 130, 246);
      pdf.text("Expert", startX + rtWidth, footerY);
      pdf.setFontSize(5);
      pdf.setTextColor(160, 160, 160);
      pdf.setFont("helvetica", "normal");
      pdf.text("GESTÃO INTELIGENTE", pageWidth / 2, footerY + 3.5, { align: "center" });
      pdf.setFontSize(6);
      pdf.setTextColor(180, 180, 180);
      pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin, footerY + 3.5, { align: "right" });
    }

    pdf.save(`relatorio_${clienteAtual.razao_social}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF gerado com sucesso!");
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

    // Import dinâmico da lógica de limites
    const { checkChecklistLimit } = await import("@/lib/plan-limits");
    const { canCreate, total } = await checkChecklistLimit();
    
    if (!canCreate) {
      toast.error("Limite mensal atingido!", {
        description: `Você já utilizou seus 5 checklists mensais do plano gratuito (${total}/5). Faça upgrade para ilimitado.`,
        duration: 6000
      });
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }
    const dataToSave: any = {
      tenant_id: user.id,
      cliente_id: clienteSelecionado,
      modelo_id: modeloSelecionado,
      respostas_json: respostas,
      assinatura_rt: assinaturaRT,
      assinatura_cliente: assinaturaCliente,
      assinatura_testemunha: assinaturaTestemunha,
      parecer_conclusivo: parecerConclusivo,
      data_proxima_inspecao: dataProximaInspecao || null,
      responsavel_inspecao: nomeRT,
      nome_cliente_assinatura: nomeClienteAssinatura,
      nome_testemunha_assinatura: nomeTestemunhaAssinatura
    };
    const { error } = await supabase.from("aplicacoes_checklist").insert([dataToSave]);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Automação: Criar agendamento se houver data de próxima inspeção
      if (dataProximaInspecao) {
        try {
          // Precisamos pegar o ID do checklist que acabou de ser inserido
          // Como o insert não retornou data (padrão do postgrest as vezes), 
          // em uma aplicação real faríamos select("*") no insert ou uma busca logo após.
          // Para garantir o fluxo, vamos inserir o agendamento sem o checklist_origem_id
          // se não o tivermos agora, ou forçar o retorno.
          // @ts-ignore
          const { error: agendamentoError } = await (supabase as any)
            .from("agendamentos")
            .insert([{
              tenant_id: user.id,
              cliente_id: clienteSelecionado,
              data_visita: new Date(dataProximaInspecao).toISOString(),
              descricao: `Visita agendada via checklist: ${modeloAtual?.nome_modelo || ""}`,
              status: 'pendente'
            }]);
          
          if (agendamentoError) {
            console.error("Erro ao criar agendamento automático:", agendamentoError);
          } else {
            // Sincronizar com Google se possível
            const cliente = clientes.find(c => c.id === clienteSelecionado);
            syncToGoogleCalendar({
              tenant_id: user.id,
              cliente_nome: cliente?.nome_fantasia || cliente?.razao_social || 'Cliente',
              data_visita: new Date(dataProximaInspecao).toISOString(),
              descricao: `Visita agendada via checklist: ${modeloAtual?.nome_modelo || ""}`
            });
            toast.success("Visita agendada automaticamente na agenda!");
          }
        } catch (e) {
          console.error("Erro na automação de agenda:", e);
        }
      }

      toast.success("Checklist aplicado com sucesso!");
      setRespostas({});
      setClienteSelecionado("");
      setModeloSelecionado("");
      setAssinaturaRT("");
      setAssinaturaCliente("");
      setAssinaturaTestemunha("");
      setParecerConclusivo("");
      setDataProximaInspecao("");
      setIsReviewMode(false);
    }
  };

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderRadius: '0.75rem',
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--primary))' : 'none',
      padding: '0.15rem',
      backgroundColor: 'hsl(var(--background))',
      '&:hover': {
        borderColor: 'hsl(var(--primary))'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--muted))' : 'transparent',
      color: state.isSelected ? 'white' : 'inherit',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'hsl(var(--primary))',
      }
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      zIndex: 50,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-1">Fazer Inspeção</h1>
            <p className="text-muted-foreground text-sm">Selecione o alvo da vistoria abaixo</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 flex-[2] w-full xl:max-w-3xl">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Cliente / Estabelecimento</Label>
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
                classNamePrefix="react-select"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Modelo de Vistoria</Label>
              <Select
                value={modelos.find(m => m.id === modeloSelecionado) ? { value: modeloSelecionado, label: modelos.find(m => m.id === modeloSelecionado)!.nome_modelo } : null}
                onChange={(option) => setModeloSelecionado(option?.value || "")}
                options={modelos.map(modelo => ({
                  value: modelo.id,
                  label: modelo.nome_modelo
                }))}
                placeholder="Buscar checklist..."
                isClearable
                styles={customSelectStyles}
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </div>

        {clienteAtual && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold">Razão Social:</span> {clienteAtual.razao_social}</div>
                <div><span className="font-semibold">CNPJ:</span> {formatCNPJ(clienteAtual.cnpj)}</div>
                <div><span className="font-semibold">Endereço:</span> {[clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado].filter(Boolean).join(", ") || "Não informado"}</div>
                <div><span className="font-semibold">Responsável Legal:</span> {clienteAtual.responsavel_legal || "Não informado"}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {modeloAtual && (
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Checklist: {modeloAtual.nome_modelo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {!isReviewMode && (() => {
                  const secoes = modeloAtual.estrutura_json?.secoes || [];
                  return secoes.map(secao => (
                    <div key={secao.id} className="space-y-6">
                      {secao.titulo && (
                        <div className="border-b border-border pb-2">
                          <h3 className="text-xl font-bold text-primary">{secao.titulo}</h3>
                          {secao.descricao && <p className="text-sm text-muted-foreground mt-1">{secao.descricao}</p>}
                        </div>
                      )}
                      <div className="space-y-6 pl-2">
                        {secao.campos?.map(campo => (
                          <div key={campo.id} className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            {campo.tipo === "titulo" && <h4 className="text-lg font-semibold text-primary">{campo.label}</h4>}
                            {campo.tipo === "descricao" && <p className="text-muted-foreground italic">{campo.label}</p>}

                            {campo.tipo === "texto" && (
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                                <Input value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Sua resposta..." />
                              </div>
                            )}

                            {campo.tipo === "sim_nao_na" && (
                              <div className="space-y-3">
                                <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                                <RadioGroup value={respostas[campo.id] || ""} onValueChange={val => handleResposta(campo.id, val)} className="flex flex-wrap gap-4">
                                  {["Sim", "Não", "N.A"].map(opt => (
                                    <div key={opt} className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2 rounded-md border border-slate-200">
                                      <RadioGroupItem value={opt} id={`${campo.id}-${opt}`} />
                                      <Label htmlFor={`${campo.id}-${opt}`} className="cursor-pointer">{opt}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                            )}

                            {campo.tipo === "multipla_escolha" && (
                              <div className="space-y-3">
                                <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {campo.opcoes?.map((opcao, idx) => {
                                    const isOutros = opcao === "Outros";
                                    return (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2 rounded-md border border-slate-200">
                                          <Checkbox
                                            id={`${campo.id}-${idx}`}
                                            checked={respostas[campo.id]?.includes(opcao) || false}
                                            onCheckedChange={checked => {
                                              const current = respostas[campo.id] || [];
                                              if (checked) handleResposta(campo.id, [...current, opcao]);
                                              else handleResposta(campo.id, current.filter((v: string) => v !== opcao));
                                            }}
                                          />
                                          <Label htmlFor={`${campo.id}-${idx}`} className="cursor-pointer">{opcao}</Label>
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
                                  <div className="mt-2 space-y-1.5 pt-2 border-t border-dashed border-slate-200">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Observações Adicionais</Label>
                                    <Textarea
                                      placeholder="Descreva observações sobre este item..."
                                      value={respostas[`${campo.id}_observacao`] || ""}
                                      onChange={e => handleResposta(`${campo.id}_observacao`, e.target.value)}
                                      className="min-h-[80px]"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {campo.tipo === "foto" && (
                              <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                  <Camera className="w-4 h-4 text-primary" /> {campo.label} {campo.obrigatorio && "*"}
                                </Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                                  {respostas[campo.id]?.map((url: string, idx: number) => (
                                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border">
                                      <img src={url} alt="Evidência" className="w-full h-full object-cover" />
                                      <button onClick={() => removeImage(campo.id, url)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                                    </div>
                                  ))}
                                  <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer ${uploadingFields[campo.id] ? 'bg-slate-100 animate-pulse' : 'hover:bg-primary/5'}`}>
                                    {uploadingFields[campo.id] ? <Loader2 className="animate-spin text-primary" /> : (
                                      <>
                                        <ImageIconLucide className="text-slate-400 w-5 h-5 mb-1" />
                                        <span className="text-[10px] text-slate-500">Galeria</span>
                                      </>
                                    )}
                                    <input type="file" multiple accept="image/*" className="hidden" disabled={uploadingFields[campo.id]} onChange={e => handleImageUpload(campo.id, e)} />
                                  </label>
                                  <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer ${uploadingFields[campo.id] ? 'bg-slate-100 animate-pulse' : 'hover:bg-primary/5'}`}>
                                    {uploadingFields[campo.id] ? <Loader2 className="animate-spin text-primary" /> : (
                                      <>
                                        <Camera className="text-primary w-5 h-5 mb-1" />
                                        <span className="text-[10px] text-primary font-bold">Câmera</span>
                                      </>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploadingFields[campo.id]} onChange={e => handleImageUpload(campo.id, e)} />
                                  </label>
                                </div>
                              </div>
                            )}

                            {campo.tipo === "observacao" && (
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">{campo.label}</Label>
                                <Textarea value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Detalhes adicionais..." />
                              </div>
                            )}

                            {campo.tipo === "data" && (
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">{campo.label}</Label>
                                <Input type="date" value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}

                {isReviewMode && (
                  <div className="space-y-8">
                    <Button variant="outline" onClick={() => setIsReviewMode(false)}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <Card>
                      <CardHeader className="border-b">
                        <CardTitle className="uppercase text-primary">Relatório de Inspeção</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="p-3 text-left w-12">Item</th>
                              <th className="p-3 text-left">Pergunta</th>
                              <th className="p-3 text-left w-1/3">Resposta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const secoes = modeloAtual.estrutura_json?.secoes || [];
                              let idx = 1;
                              return secoes.flatMap(secao => [
                                secao.titulo && (
                                  <tr key={secao.id} className="bg-slate-100/50"><td colSpan={3} className="p-3 font-bold text-primary">{secao.titulo}</td></tr>
                                ),
                                ...secao.campos.map(campo => {
                                  if (campo.tipo === "titulo" || campo.tipo === "descricao") return null;
                                  const resp = respostas[campo.id];
                                  return (
                                    <tr key={campo.id} className="border-b">
                                      <td className="p-3 text-center text-slate-400">{idx++}</td>
                                      <td className="p-3">{campo.label}</td>
                                      <td className="p-3">
                                        {campo.tipo === "foto" ? (
                                          <div className="grid grid-cols-4 gap-1 w-full max-w-[200px]">
                                            {resp?.map((u, i) => (
                                              <div key={i} className="relative aspect-square">
                                                <img src={u} className="w-full h-full object-cover rounded border" />
                                                <span className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-0.5 rounded-tl">{i + 1}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          Array.isArray(resp) ? resp.join(", ") : (resp || "---")
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })
                              ]);
                            })()}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                          <Label className="font-bold">Parecer Conclusivo</Label>
                          <Textarea value={parecerConclusivo} onChange={e => setParecerConclusivo(e.target.value)} rows={4} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="font-bold">Próxima Inspeção</Label>
                            <Input type="date" value={dataProximaInspecao} onChange={e => setDataProximaInspecao(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold">Responsável</Label>
                            <Input value={nomeRT} disabled />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                          <div className="space-y-2">
                            <SignatureCanvas label="Assinatura Responsável Técnico" onSave={setAssinaturaRT} signatureData={assinaturaRT} />
                            <Input value={nomeRT} disabled className="bg-slate-50" />
                          </div>
                          <div className="space-y-2">
                            <SignatureCanvas label="Assinatura Cliente" onSave={setAssinaturaCliente} signatureData={assinaturaCliente} />
                            <Input placeholder="Nome do Cliente" value={nomeClienteAssinatura} onChange={e => setNomeClienteAssinatura(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <SignatureCanvas label="Assinatura Testemunha" onSave={setAssinaturaTestemunha} signatureData={assinaturaTestemunha} />
                            <Input placeholder="Nome da Testemunha" value={nomeTestemunhaAssinatura} onChange={e => setNomeTestemunhaAssinatura(e.target.value)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex gap-4 justify-end">
                      <Button onClick={gerarPDF} variant="outline"><FileDown className="mr-2 h-4 w-4" />Gerar PDF</Button>
                      <Button onClick={handleSalvar} disabled={loading}><Save className="mr-2 h-4 w-4" />{loading ? "Salvando..." : "Salvar no Sistema"}</Button>
                    </div>
                  </div>
                )}

                {!isReviewMode && (
                  <div className="pt-4 flex justify-end">
                    <Button onClick={() => setIsReviewMode(true)} size="lg">Ir para Revisão<ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AplicarChecklist;