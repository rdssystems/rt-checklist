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
  const [searchParams] = useSearchParams();
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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Persistence: Load from localStorage on init
  useEffect(() => {
    const savedProgress = localStorage.getItem("checklist_progress");
    if (savedProgress) {
      try {
        const { clienteId, modeloId, respostas: savedRespostas, sectionIndex } = JSON.parse(savedProgress);
        if (clienteId) setClienteSelecionado(clienteId);
        if (modeloId) setModeloSelecionado(modeloId);
        if (savedRespostas) setRespostas(savedRespostas);
        if (sectionIndex !== undefined) setCurrentSectionIndex(sectionIndex);
      } catch (e) {
        console.error("Erro ao carregar progresso salvo:", e);
      }
    }

    // Check for clienteId in URL if no saved progress or to override
    const urlClienteId = searchParams.get("clienteId");
    if (urlClienteId) {
      setClienteSelecionado(urlClienteId);
    }

    setIsLoaded(true);
  }, [searchParams]);

  // Persistence: Save to localStorage when state changes
  useEffect(() => {
    if (!isLoaded) return;
    if (clienteSelecionado || modeloSelecionado || Object.keys(respostas).length > 0) {
      localStorage.setItem("checklist_progress", JSON.stringify({
        clienteId: clienteSelecionado,
        modeloId: modeloSelecionado,
        respostas,
        sectionIndex: currentSectionIndex
      }));
    }
  }, [clienteSelecionado, modeloSelecionado, respostas, currentSectionIndex, isLoaded]);

  const clearProgress = () => {
    localStorage.removeItem("checklist_progress");
    setRespostas({});
    setClienteSelecionado("");
    setModeloSelecionado("");
    setCurrentSectionIndex(0);
  };

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

    setUploadingFields(prev => ({ ...prev, [campoId]: true }));

    try {
      const newUrls = [...(respostas[campoId] || [])];
      const itemsToProcess = files ? Array.from(files) : [singleBlob as Blob];

      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];

        const compressedBlob = await compressImage(item as File | Blob, {
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
      toast.success(itemsToProcess.length > 1 ? 'Fotos carregadas com sucesso!' : 'Foto carregada com sucesso!');
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
      clearProgress();
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
                  }}
                  options={modelos.map(modelo => ({
                    value: modelo.id,
                    label: modelo.nome_modelo
                  }))}
                  placeholder="Buscar checklist..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>
            </div>
            
            {(clienteSelecionado || modeloSelecionado) && (
              <Button variant="ghost" size="sm" onClick={clearProgress} className="text-red-500 hover:text-red-600 self-end">
                <X className="w-4 h-4 mr-1" /> Limpar
              </Button>
            )}
          </div>

          {clienteAtual && (
            <div className="space-y-4">
              <Card className="shadow-sm border-0 sm:border overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/50 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-semibold text-slate-500">Razão Social:</span> {clienteAtual.razao_social}</div>
                    <div><span className="font-semibold text-slate-500">CNPJ:</span> {formatCNPJ(clienteAtual.cnpj)}</div>
                    <div><span className="font-semibold text-slate-500">Endereço:</span> {[clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado].filter(Boolean).join(", ") || "Não informado"}</div>
                    <div><span className="font-semibold text-slate-500">Responsável:</span> {clienteAtual.responsavel_legal || "Não informado"}</div>
                  </div>
                </CardContent>
              </Card>

              {modeloAtual && (
                <div className="space-y-4">
                  <Card className="shadow-md border-0 sm:border overflow-hidden">
                    <CardHeader className="p-4 border-b">
                      <CardTitle className="text-lg">Checklist: {modeloAtual.nome_modelo}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {!isReviewMode ? (() => {
                        const secoes = modeloAtual.estrutura_json?.secoes || [];
                        const activeSecao = secoes[currentSectionIndex];
                        
                        if (!activeSecao) return null;

                        return (
                          <div key={activeSecao.id} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-primary/5 p-3 rounded-lg flex items-center justify-between border border-primary/10">
                              <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-tight">Seção {currentSectionIndex + 1} de {secoes.length}</p>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeSecao.titulo}</h3>
                              </div>
                              <div className="h-2 w-20 md:w-32 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-500" 
                                  style={{ width: `${((currentSectionIndex + 1) / secoes.length) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            {activeSecao.descricao && <p className="text-sm text-muted-foreground px-1">{activeSecao.descricao}</p>}
                            
                            <div className="space-y-4">
                              {activeSecao.campos?.map(campo => (
                                <div key={campo.id} className="space-y-3 p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                  {campo.tipo === "titulo" && <h4 className="text-lg font-semibold text-primary">{campo.label}</h4>}
                                  {campo.tipo === "descricao" && <p className="text-muted-foreground italic text-sm">{campo.label}</p>}

                                  {campo.tipo === "texto" && (
                                    <div className="space-y-1.5">
                                      <Label className="text-sm font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                                      <Input value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Sua resposta..." />
                                    </div>
                                  )}

                                  {campo.tipo === "sim_nao_na" && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                                      <RadioGroup value={respostas[campo.id] || ""} onValueChange={val => handleResposta(campo.id, val)} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {["Sim", "Não", "N.A"].map(opt => (
                                          <div key={opt} className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-primary transition-colors cursor-pointer">
                                            <RadioGroupItem value={opt} id={`${campo.id}-${opt}`} />
                                            <Label htmlFor={`${campo.id}-${opt}`} className="cursor-pointer flex-1 font-medium text-sm">{opt}</Label>
                                          </div>
                                        ))}
                                      </RadioGroup>
                                    </div>
                                  )}

                                  {campo.tipo === "multipla_escolha" && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-semibold">{campo.label} {campo.obrigatorio && "*"}</Label>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                            <img src={url} alt="Evidência" className="w-full h-full object-cover" />
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
                            </div>

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
                              
                              {currentSectionIndex < (secoes.length - 1) ? (
                                <Button className="flex-1 sm:flex-none" onClick={() => {
                                  setCurrentSectionIndex(prev => prev + 1);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}>
                                  Próxima <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              ) : (
                                <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90" onClick={() => {
                                  setIsReviewMode(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}>
                                  Revisar <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="space-y-6">
                          <Button variant="outline" size="sm" onClick={() => setIsReviewMode(false)}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 border-b">
                                <tr>
                                  <th className="p-2 text-left w-8">#</th>
                                  <th className="p-2 text-left">Pergunta</th>
                                  <th className="p-2 text-left">Resposta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const secoes = modeloAtual.estrutura_json?.secoes || [];
                                  let gIdx = 1;
                                  return secoes.flatMap(secao => [
                                    <tr key={secao.id} className="bg-slate-100/50"><td colSpan={3} className="p-2 font-bold text-primary text-xs">{secao.titulo}</td></tr>,
                                    ...secao.campos.map((campo: any) => {
                                      if (campo.tipo === "titulo" || campo.tipo === "descricao") return null;
                                      const resp = respostas[campo.id];
                                      return (
                                        <tr key={campo.id} className="border-b">
                                          <td className="p-2 text-slate-400 text-[10px]">{gIdx++}</td>
                                          <td className="p-2 text-xs font-medium">{campo.label}</td>
                                          <td className="p-2">
                                            {campo.tipo === "foto" ? (
                                              <div className="flex flex-wrap gap-1">
                                                {resp?.map((u: string, i: number) => (
                                                  <img key={i} src={u} className="w-8 h-8 object-cover rounded border" alt="" />
                                                ))}
                                                {(!resp || resp.length === 0) && "---"}
                                              </div>
                                            ) : (
                                              <div className="text-xs">
                                                {Array.isArray(resp) ? resp.join(", ") : (resp || "---")}
                                                {respostas[`${campo.id}_outros_text`] && <span className="text-primary italic ml-1">({respostas[`${campo.id}_outros_text`]})</span>}
                                                {respostas[`${campo.id}_observacao`] && <div className="text-[10px] text-muted-foreground mt-0.5">Obs: {respostas[`${campo.id}_observacao`]}</div>}
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ]);
                                })()}
                              </tbody>
                            </table>
                          </div>

                          <div className="bg-primary/5 p-4 rounded-xl space-y-4 border border-primary/10">
                            <div className="space-y-1.5">
                              <Label className="font-bold text-sm">Parecer Conclusivo</Label>
                              <Textarea value={parecerConclusivo} onChange={e => setParecerConclusivo(e.target.value)} rows={3} className="text-sm" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="font-bold text-sm">Próxima Inspeção</Label>
                                <Input type="date" value={dataProximaInspecao} onChange={e => setDataProximaInspecao(e.target.value)} className="text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="font-bold text-sm">Responsável</Label>
                                <Input value={nomeRT} disabled className="bg-slate-100 text-sm" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-primary/10">
                              <SignatureCanvas label="Responsável Técnico" onSave={setAssinaturaRT} signatureData={assinaturaRT} />
                              <div className="space-y-2">
                                <SignatureCanvas label="Cliente" onSave={setAssinaturaCliente} signatureData={assinaturaCliente} />
                                <Input placeholder="Nome completo" value={nomeClienteAssinatura} onChange={e => setNomeClienteAssinatura(e.target.value)} className="h-8 text-xs" />
                              </div>
                              <div className="space-y-2">
                                <SignatureCanvas label="Testemunha" onSave={setAssinaturaTestemunha} signatureData={assinaturaTestemunha} />
                                <Input placeholder="Nome completo" value={nomeTestemunhaAssinatura} onChange={e => setNomeTestemunhaAssinatura(e.target.value)} className="h-8 text-xs" />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 justify-end pt-4">
                            <Button onClick={gerarPDF} variant="outline" size="sm" className="flex-1 sm:flex-none"><FileDown className="mr-1.5 h-4 w-4" />PDF</Button>
                            <Button onClick={handleSalvar} disabled={loading} size="sm" className="flex-1 sm:flex-none"><Save className="mr-1.5 h-4 w-4" />{loading ? "Salvando..." : "Salvar"}</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default AplicarChecklist;