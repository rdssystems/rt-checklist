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
import jsPDF from "jspdf";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ChecklistPronto {
  id: string;
  data_aplicacao: string;
  modelo_id: string;
  cliente_id: string;
  respostas_json: any;
  parecer_conclusivo: string | null;
  data_proxima_inspecao: string | null;
  responsavel_inspecao: string | null;
  assinatura_rt: string | null;
  assinatura_cliente: string | null;
  assinatura_testemunha?: string | null;
  nome_cliente_assinatura: string | null;
  nome_testemunha_assinatura: string | null;
  modelos_checklist: {
    nome_modelo: string;
    estrutura_json: any;
  };
  clientes: {
    razao_social: string;
    cnpj: string;
    rua: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    responsavel_legal: string;
  };
}

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

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este checklist?")) return;

    const { error } = await supabase
      .from("aplicacoes_checklist")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir checklist");
    } else {
      toast.success("Checklist excluído com sucesso!");
      loadChecklists();
    }
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
      // Fetch logo and company name from profile
      const { data: { user } } = await supabase.auth.getUser();
      let logoUrl = "";
      let companyName = "";

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("logo_url, company_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          logoUrl = profile.logo_url || "";
          companyName = profile.company_name || "";
        }
      }

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
      pdf.text(format(new Date(checklist.data_aplicacao), "dd/MM/yyyy"), pageWidth - margin, yPos + 5, { align: "right" });

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
      pdf.text(checklist.modelos_checklist.nome_modelo, pageWidth / 2, yPos, { align: "center" });
      pdf.setTextColor(0, 0, 0);
      yPos += 10;

      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // CLIENT INFO BOX
      pdf.setFillColor(245, 245, 245);
      const boxHeight = checklist.clientes.responsavel_legal ? 28 : 22;
      pdf.rect(margin, yPos, contentWidth, boxHeight, "F");

      yPos += 6;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Razão Social:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(checklist.clientes.razao_social, margin + 35, yPos);
      yPos += 5;

      pdf.setFont("helvetica", "bold");
      pdf.text("CNPJ:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(checklist.clientes.cnpj, margin + 35, yPos);
      yPos += 5;

      const endereco = `${checklist.clientes.rua}, ${checklist.clientes.bairro}, ${checklist.clientes.cidade}, ${checklist.clientes.estado}`;
      pdf.setFont("helvetica", "bold");
      pdf.text("Endereço:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      const enderecoLines = pdf.splitTextToSize(endereco, contentWidth - 38);
      pdf.text(enderecoLines, margin + 35, yPos);
      yPos += 5 * enderecoLines.length;

      if (checklist.clientes.responsavel_legal) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Responsável Legal:", margin + 3, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(checklist.clientes.responsavel_legal, margin + 48, yPos);
        yPos += 5;
      }

      yPos += 8;

      // RESPONSES SECTION - TABLE FORMAT
      const secoes = checklist.modelos_checklist.estrutura_json?.secoes ||
        (checklist.modelos_checklist.estrutura_json?.campos ? [{ id: 'default', titulo: '', campos: checklist.modelos_checklist.estrutura_json.campos }] : []);

      const campos = secoes.flatMap((secao: any) => {
        const result = [];
        if (secao.titulo) {
          result.push({ tipo: "titulo", label: secao.titulo, id: `sec-${secao.id}` });
        }
        return result.concat(secao.campos || []);
      });
      const respostas = checklist.respostas_json || {};

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

      // ADD PHOTOGRAPHIC APPENDIX HERE
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
              const photoLabelLines = pdf.splitTextToSize(`${i + j + 1}`, imgWidth);
              pdf.text(photoLabelLines, xPos + (imgWidth / 2), yPos + imgHeight + 3, { align: "center" });
            } catch (e) {
              console.error("Error adding photo to PDF:", e);
            }
          }
          yPos += imgHeight + 8;
        }
        yPos += 5;
      }

      // Conclusive opinion
      if (checklist.parecer_conclusivo) {
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
        const parecerLines = pdf.splitTextToSize(checklist.parecer_conclusivo, contentWidth);
        pdf.text(parecerLines, margin, yPos);
        yPos += (4 * parecerLines.length) + 8; // Deixa o exato espaço de 2 linhas pro próximo bloco
      }

      // Next inspection date
      if (checklist.data_proxima_inspecao) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Próxima Inspeção:", margin, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(format(new Date(checklist.data_proxima_inspecao), "dd/MM/yyyy"), margin + 40, yPos);
        yPos += 8;
      }

      // Inspector name
      if (checklist.responsavel_inspecao) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Responsável pela Inspeção:", margin, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(checklist.responsavel_inspecao, margin + 60, yPos);
        yPos += 15;
      }

      // SIGNATURES - Side by side perfectly spaced at the absolute bottom
      if (checklist.assinatura_rt || checklist.assinatura_cliente || checklist.assinatura_testemunha) {
        if (yPos > pageHeight - 80) {
          pdf.addPage();
        }
        yPos = pageHeight - 35; // Absolute bottom positioning

        const signatureWidth = 50;
        const signatureHeight = 20;
        const spacing = (contentWidth - (signatureWidth * 3)) / 2;

        let xPos = margin;

        // RT Signature
        if (checklist.assinatura_rt) {
          pdf.addImage(checklist.assinatura_rt, "PNG", xPos, yPos - signatureHeight, signatureWidth, signatureHeight);
        }
        pdf.setDrawColor(0, 0, 0);
        pdf.line(xPos, yPos + 2, xPos + signatureWidth, yPos + 2);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(checklist.responsavel_inspecao || "RT", xPos + signatureWidth / 2, yPos + 7, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text("Responsável Técnico", xPos + signatureWidth / 2, yPos + 11, { align: "center" });
        xPos += signatureWidth + spacing;

        // Client Signature
        if (checklist.assinatura_cliente) {
          pdf.addImage(checklist.assinatura_cliente, "PNG", xPos, yPos - signatureHeight, signatureWidth, signatureHeight);
        }
        pdf.line(xPos, yPos + 2, xPos + signatureWidth, yPos + 2);
        pdf.setFont("helvetica", "bold");
        pdf.text(checklist.nome_cliente_assinatura || "Dono/Gerente", xPos + signatureWidth / 2, yPos + 7, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text("Dono do Estabelecimento", xPos + signatureWidth / 2, yPos + 11, { align: "center" });
        xPos += signatureWidth + spacing;

        // Witness Signature
        if (checklist.assinatura_testemunha) {
          pdf.addImage(checklist.assinatura_testemunha, "PNG", xPos, yPos - signatureHeight, signatureWidth, signatureHeight);
        }
        pdf.line(xPos, yPos + 2, xPos + signatureWidth, yPos + 2);
        pdf.setFont("helvetica", "bold");
        pdf.text(checklist.nome_testemunha_assinatura || "", xPos + signatureWidth / 2, yPos + 7, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text("Testemunha", xPos + signatureWidth / 2, yPos + 11, { align: "center" });

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

      pdf.save(`Checklist_${checklist.clientes.razao_social}_${format(new Date(checklist.data_aplicacao), "dd-MM-yyyy")}.pdf`);
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
                      onClick={() => handleDelete(checklist.id)}
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
      </div>
    </Layout>
  );
};

export default ChecklistsProntos;
