import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, Building2, Save, FileDown, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
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
  useEffect(() => {
    fetchClientes();
    fetchModelos();
    fetchNomeRT();
  }, []);

  useEffect(() => {
    if (clienteAtual) {
      setNomeClienteAssinatura(clienteAtual.responsavel_legal || "");
    }
  }, [clienteSelecionado, clientes]);

  const fetchNomeRT = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from("profiles").select("nome_rt, logo_url, company_name").eq("id", user.id).single();
      if (data) {
        setNomeRT(data.nome_rt);
        setLogoUrl(data.logo_url || "");
        setCompanyName(data.company_name || "");
      }
    }
  };
  const fetchClientes = async () => {
    const {
      data,
      error
    } = await supabase.from("clientes").select("id, razao_social, nome_fantasia, cnpj, rua, bairro, cidade, estado, responsavel_legal").order("razao_social");
    if (!error && data) {
      setClientes(data);
    }
  };
  const fetchModelos = async () => {
    const {
      data,
      error
    } = await supabase.from("modelos_checklist").select("*").order("nome_modelo");
    if (!error && data) {
      setModelos(data as unknown as Modelo[]);
    }
  };
  const clienteAtual = clientes.find(c => c.id === clienteSelecionado);
  const modeloAtual = modelos.find(m => m.id === modeloSelecionado);
  const handleResposta = (itemId: string, valor: any) => {
    setRespostas({
      ...respostas,
      [itemId]: valor
    });
  };
  const gerarPDF = async () => {
    if (!clienteAtual || !modeloAtual) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // Reduced margin from 20 to 15 for better space usage
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

    // HEADER
    // Add logo if available
    if (logoUrl) {
      try {
        pdf.addImage(logoUrl, "PNG", margin, yPos, logoWidth, logoHeight);
      } catch (e) {
        console.error("Error adding logo:", e);
      }
    }

    // Company name and date on the right
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    if (companyName) {
      pdf.text(companyName, pageWidth - margin, yPos, { align: "right" });
    }
    pdf.text(new Date().toLocaleDateString("pt-BR"), pageWidth - margin, yPos + 5, { align: "right" });

    yPos += 12; // Reduced gap from 20 to 12

    // Title - centered and bold
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Relatório de Inspeção", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    // Subtitle - category/checklist name
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(modeloAtual.nome_modelo, pageWidth / 2, yPos, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    yPos += 10;

    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // CLIENT INFO BOX
    pdf.setFillColor(245, 245, 245);
    const boxHeight = clienteAtual.responsavel_legal ? 28 : 22;
    pdf.rect(margin, yPos, contentWidth, boxHeight, "F");

    yPos += 6;
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
      yPos += 5;
    }

    yPos += 8;

    // RESPONSES SECTION - TABLE FORMAT
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
        // Draw Section Title first
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

        // Immediately draw table header for this section
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
        // Description in table
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
        // If it's a question but header wasn't drawn (fallback)
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

        // Question rows in table
        const resposta = respostas[campo.id];
        const outrosText = respostas[`${campo.id}_outros_text`];
        let respostaText = "---";

        if (Array.isArray(resposta)) {
          respostaText = resposta.join(", ");
          if (outrosText) {
            respostaText += ` (${outrosText})`;
          }
        } else if (resposta !== undefined && resposta !== null && resposta !== "") {
          respostaText = String(resposta);
        }

        // Draw table borders
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);

        // Calculate row height based on content
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        const perguntaLines = pdf.splitTextToSize(campo.label, 96);
        const respostaLines = pdf.splitTextToSize(respostaText, contentWidth - 116);
        const rowHeight = Math.max(perguntaLines.length, respostaLines.length) * 4 + 3;

        // Draw cells
        const col1W = 12;
        const col2W = 100;
        const col3W = contentWidth - 112;

        pdf.rect(margin, yPos, col1W, rowHeight); // Item number column
        pdf.rect(margin + col1W, yPos, col2W, rowHeight); // Question column
        pdf.rect(margin + col1W + col2W, yPos, col3W, rowHeight); // Answer column

        // Fill item number
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(String(itemNumber), margin + 6, yPos + 4, { align: "center" });

        // Fill question
        pdf.setFont("helvetica", "normal");
        pdf.text(perguntaLines, margin + 14, yPos + 3);

        // Fill answer
        pdf.text(respostaLines, margin + 114, yPos + 3);

        yPos += rowHeight;
        itemNumber++;
      }
    });

    // Conclusive opinion
    if (parecerConclusivo) {
      if (yPos > pageHeight - 50) {
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
      yPos += (4 * parecerLines.length) + 8; // Exactly spaces out the text + 2 lines
    }

    // Next inspection date
    if (dataProximaInspecao) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Próxima Inspeção:", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date(dataProximaInspecao).toLocaleDateString("pt-BR"), margin + 40, yPos);
      yPos += 8;
    }

    // Inspector name
    if (nomeRT) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Responsável pela Inspeção:", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(nomeRT, margin + 60, yPos);
      yPos += 15;
    }

    // SIGNATURES - Side by side in 3 columns strictly placed at the bottom
    if (assinaturaRT || assinaturaCliente || assinaturaTestemunha) {
      if (yPos > pageHeight - 80) {
        pdf.addPage();
      }
      // Force Y position to be exactly near the bottom
      yPos = pageHeight - 35;

      const signatureWidth = 50;
      const signatureHeight = 20;
      const spacing = (contentWidth - (signatureWidth * 3)) / 2;

      let xPos = margin;

      // RT Signature
      if (assinaturaRT) {
        pdf.addImage(assinaturaRT, "PNG", xPos, yPos - signatureHeight, signatureWidth, signatureHeight);
      }
      pdf.line(xPos, yPos + 2, xPos + signatureWidth, yPos + 2);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(nomeRT, xPos + signatureWidth / 2, yPos + 7, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Responsável Técnico", xPos + signatureWidth / 2, yPos + 11, { align: "center" });
      xPos += signatureWidth + spacing;

      // Client Signature
      if (assinaturaCliente) {
        pdf.addImage(assinaturaCliente, "PNG", xPos, yPos - signatureHeight, signatureWidth, signatureHeight);
      }
      pdf.line(xPos, yPos + 2, xPos + signatureWidth, yPos + 2);
      pdf.setFont("helvetica", "bold");
      pdf.text(nomeClienteAssinatura || "Dono/Gerente", xPos + signatureWidth / 2, yPos + 7, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Dono do Estabelecimento", xPos + signatureWidth / 2, yPos + 11, { align: "center" });
      xPos += signatureWidth + spacing;

      // Witness Signature
      if (assinaturaTestemunha) {
        pdf.addImage(assinaturaTestemunha, "PNG", xPos, yPos - signatureHeight, signatureWidth, signatureHeight);
      }
      pdf.line(xPos, yPos + 2, xPos + signatureWidth, yPos + 2);
      pdf.setFont("helvetica", "bold");
      pdf.text(nomeTestemunhaAssinatura || "", xPos + signatureWidth / 2, yPos + 7, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Testemunha", xPos + signatureWidth / 2, yPos + 11, { align: "center" });

      // We push yPos ahead just in case, though it is the bottom of the page
      yPos += signatureHeight + 15;
    }

    // WATERMARK BRANDED FOOTER - Adds to all pages
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      const footerY = pageHeight - 12;

      // Separator Line
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.1);
      pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

      // "Gerado automaticamente por"
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado automaticamente por", pageWidth / 2, footerY - 4, { align: "center" });

      // RT Expert Branding
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      const rtWidth = pdf.getTextWidth("RT ");
      const expertWidth = pdf.getTextWidth("Expert");
      const totalWidth = rtWidth + expertWidth;
      const startX = (pageWidth - totalWidth) / 2;

      pdf.text("RT ", startX, footerY);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(59, 130, 246); // Stitch Blue
      pdf.text("Expert", startX + rtWidth, footerY);

      // Subtitle
      pdf.setFontSize(5);
      pdf.setTextColor(160, 160, 160);
      pdf.setFont("helvetica", "normal");
      pdf.text("GESTÃO INTELIGENTE", pageWidth / 2, footerY + 3.5, { align: "center" });

      // Page number
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
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
    const {
      error
    } = await supabase.from("aplicacoes_checklist").insert([dataToSave]);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
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

  return <Layout>
    <div className="p-6 md:p-8 space-y-8">

      {/* Header and Selectors arranged horizontally on large screens */}
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

      {clienteAtual && <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Cliente<Building2 className="w-5 h-5 text-primary" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Razão Social:</span> {clienteAtual.razao_social}
            </div>
            <div>
              <span className="font-semibold">CNPJ:</span> {clienteAtual.cnpj}
            </div>
            <div>
              <span className="font-semibold">Endereço:</span>{" "}
              {[clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado].filter(Boolean).join(", ") || "Não informado"}
            </div>
            <div>
              <span className="font-semibold">Responsável Legal:</span>{" "}
              {clienteAtual.responsavel_legal || "Não informado"}
            </div>
          </div>
        </CardContent>
      </Card>}

      {modeloAtual && <div className="space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Checklist: {modeloAtual.nome_modelo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Auto migrate between old 'campos' array and new 'secoes' array format */}
            {!isReviewMode && (() => {
              const secoes = modeloAtual.estrutura_json?.secoes ||
                (modeloAtual.estrutura_json?.campos ? [{ id: 'default', titulo: '', campos: modeloAtual.estrutura_json.campos }] : []);

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
                        {campo.tipo === "descricao" && <p className="text-muted-foreground">{campo.label}</p>}

                        {campo.tipo === "texto" && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <Input
                            value={respostas[campo.id] || ""}
                            onChange={e => handleResposta(campo.id, e.target.value)}
                            placeholder={campo.placeholder || "Digite sua resposta..."}
                          />
                        </div>}

                        {campo.tipo === "sim_nao_na" && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <RadioGroup value={respostas[campo.id] || ""} onValueChange={value => handleResposta(campo.id, value)}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="SIM" id={`${campo.id}-sim`} />
                              <Label htmlFor={`${campo.id}-sim`} className="cursor-pointer">SIM</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NAO" id={`${campo.id}-nao`} />
                              <Label htmlFor={`${campo.id}-nao`} className="cursor-pointer">NÃO</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NA" id={`${campo.id}-na`} />
                              <Label htmlFor={`${campo.id}-na`} className="cursor-pointer">N/A</Label>
                            </div>
                          </RadioGroup>
                        </div>}

                        {campo.tipo === "observacao" && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <Textarea value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Digite suas observações..." rows={3} />
                        </div>}

                        {campo.tipo === "outros" && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <Input value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Especifique..." />
                        </div>}

                        {campo.tipo === "data" && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <Input type="date" value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} className="w-fit" />
                        </div>}

                        {campo.tipo === "multipla_escolha" && campo.opcoes && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <div className="space-y-2 mt-2">
                            {campo.opcoes.map((opcao, index) => {
                              const isOutros = opcao.toLowerCase().includes("outros") || opcao.toLowerCase().includes("especificar");
                              return (
                                <div key={index}>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${campo.id}-${index}`}
                                      checked={respostas[campo.id]?.includes(opcao) || false}
                                      onCheckedChange={checked => {
                                        const current = respostas[campo.id] || [];
                                        if (checked) {
                                          handleResposta(campo.id, [...current, opcao]);
                                        } else {
                                          handleResposta(campo.id, current.filter((v: string) => v !== opcao));
                                          if (isOutros) {
                                            handleResposta(`${campo.id}_outros_text`, "");
                                          }
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`${campo.id}-${index}`} className="cursor-pointer">{opcao}</Label>
                                  </div>
                                  {isOutros && respostas[campo.id]?.includes(opcao) && (
                                    <div className="ml-6 mt-2">
                                      <Input
                                        placeholder="Especifique..."
                                        value={respostas[`${campo.id}_outros_text`] || ""}
                                        onChange={(e) => handleResposta(`${campo.id}_outros_text`, e.target.value)}
                                        className="w-full"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>}

                        {campo.tipo === "foto" && <div className="space-y-2">
                          <Label className="text-base font-semibold">{campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}</Label>
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-white dark:bg-slate-950">
                            <p className="text-sm text-muted-foreground">Upload de fotos (Em breve)</p>
                          </div>
                        </div>}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}

            {!isReviewMode && (
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => setIsReviewMode(true)}
                  className="w-full md:w-auto bg-primary text-white"
                  size="lg"
                >
                  Finalizar e ir para assinaturas
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {isReviewMode && (
              <div className="space-y-8 animate-in fade-in duration-500 fade-in-0">
                <Button variant="outline" onClick={() => setIsReviewMode(false)} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para edição
                </Button>

                <Card className="shadow-none border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-6">
                    <div>
                      <CardTitle className="text-xl font-bold uppercase tracking-wider text-primary">Relatório de Inspeção</CardTitle>
                      <CardDescription className="text-sm mt-1">Checklist de Vistoria Oficial</CardDescription>
                    </div>
                    {logoUrl && (
                      <div className="mt-4 sm:mt-0 flex flex-col sm:items-end">
                        <img src={logoUrl} alt="Logo da Empresa" className="h-12 w-auto object-contain rounded-md bg-white border p-1" />
                        {companyName && <span className="text-xs text-muted-foreground mt-2 font-medium">{companyName}</span>}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3 text-left font-semibold w-12 text-slate-500">Item</th>
                            <th className="p-3 text-left font-semibold text-slate-500">Pergunta</th>
                            <th className="p-3 text-left font-semibold w-1/3 text-slate-500">Resposta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const secoes = modeloAtual.estrutura_json?.secoes ||
                              (modeloAtual.estrutura_json?.campos ? [{ id: 'default', titulo: '', campos: modeloAtual.estrutura_json.campos }] : []);

                            let itemIndex = 1;

                            return secoes.flatMap((secao: any) => [
                              secao.titulo ? (
                                <tr key={`sec-${secao.id}`} className="bg-slate-50 dark:bg-slate-900">
                                  <td colSpan={3} className="p-3 font-bold text-primary border-b border-slate-200 dark:border-slate-800">
                                    {secao.titulo}
                                  </td>
                                </tr>
                              ) : null,
                              ...secao.campos.map((campo: any) => {
                                if (campo.tipo === "titulo") {
                                  return (
                                    <tr key={campo.id} className="bg-slate-50 dark:bg-slate-900">
                                      <td colSpan={3} className="p-2 font-bold text-primary border-b border-slate-200/50 dark:border-slate-800/50">
                                        {campo.label}
                                      </td>
                                    </tr>
                                  );
                                }
                                if (campo.tipo === "descricao") {
                                  return (
                                    <tr key={campo.id}>
                                      <td colSpan={3} className="p-2 text-xs italic text-muted-foreground border-b border-slate-200/50 dark:border-slate-800/50">
                                        {campo.label}
                                      </td>
                                    </tr>
                                  );
                                }

                                const resposta = respostas[campo.id];
                                const outrosText = respostas[`${campo.id}_outros_text`];
                                let respostaText = "---";

                                if (Array.isArray(resposta) && resposta.length > 0) {
                                  respostaText = resposta.join(", ");
                                  if (outrosText && respostaText.includes("Outros")) {
                                    respostaText = respostaText.replace("Outros", `Outros (${outrosText})`);
                                  } else if (outrosText) {
                                    respostaText += ` (${outrosText})`;
                                  }
                                } else if (resposta !== undefined && resposta !== null && resposta !== "") {
                                  respostaText = String(resposta);
                                }

                                const currentIdx = itemIndex++;

                                return (
                                  <tr key={campo.id} className="border-b border-slate-200 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="p-3 text-center font-semibold text-slate-500">{currentIdx}</td>
                                    <td className="p-3">{campo.label}</td>
                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                                      {respostaText}
                                    </td>
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

                <Card className="shadow-none border-2 border-primary/20 bg-primary/5 dark:bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">Conclusão e Parecer (Obrigatório)</CardTitle>
                    <CardDescription>O painel de avaliação e assinaturas para fechamento.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="parecer" className="font-bold">Parecer Conclusivo</Label>
                      <Textarea id="parecer" value={parecerConclusivo} onChange={e => setParecerConclusivo(e.target.value)} placeholder="Descreva o resultado da inspeção..." rows={4} className="mt-1.5 focus-visible:ring-primary" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="proxima-data" className="font-bold">Data da Próxima Inspeção Recomendada</Label>
                        <Input id="proxima-data" type="date" value={dataProximaInspecao} onChange={e => setDataProximaInspecao(e.target.value)} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="font-bold">Responsável Pela Inspeção</Label>
                        <Input value={nomeRT} disabled className="mt-1.5 bg-muted font-medium" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-primary/10">
                      <div className="space-y-4">
                        <SignatureCanvas label="Assinatura do RT (Exigida)" onSave={setAssinaturaRT} signatureData={assinaturaRT} />
                        <div className="bg-muted p-2 rounded border border-dashed text-center">
                          <span className="text-[10px] uppercase text-muted-foreground block mb-0.5 font-bold">Assinando como:</span>
                          <span className="text-sm font-bold text-primary">{nomeRT}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <SignatureCanvas label="Assinatura do Cliente (Exigida)" onSave={setAssinaturaCliente} signatureData={assinaturaCliente} />
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nome do Responsável/Gerente</Label>
                          <Input
                            value={nomeClienteAssinatura}
                            onChange={e => setNomeClienteAssinatura(e.target.value)}
                            placeholder="Nome de quem está assinando"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <SignatureCanvas label="Assinatura da Testemunha" onSave={setAssinaturaTestemunha} signatureData={assinaturaTestemunha} />
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nome da Testemunha (Opcional)</Label>
                          <Input
                            value={nomeTestemunhaAssinatura}
                            onChange={e => setNomeTestemunhaAssinatura(e.target.value)}
                            placeholder="Nome completo da testemunha"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button onClick={handleSalvar} disabled={loading} className="flex-1 bg-primary text-white" size="lg">
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? "Salvando Definitivo..." : "Deferir e Salvar Oficialmente"}
                  </Button>
                  <Button onClick={gerarPDF} variant="outline" className="flex-1" size="lg">
                    <FileDown className="w-5 h-5 mr-2" />
                    Gerar Cópia PDF Agora
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>}

      {!modeloAtual && <Card className="shadow-md">
        <CardContent className="py-12 text-center">
          <FileCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Selecione um cliente e um modelo de checklist para começar
          </p>
        </CardContent>
      </Card>}
    </div>
  </Layout>;
};
export default AplicarChecklist;