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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "checklist" | "empresa">("all");
  const [viewingChecklist, setViewingChecklist] = useState<ChecklistPronto | null>(null);

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
      setChecklists(data || []);
    }
    setLoading(false);
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
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    if (filterType === "checklist") {
      return checklist.modelos_checklist.nome_modelo.toLowerCase().includes(searchLower);
    } else if (filterType === "empresa") {
      return checklist.clientes.razao_social.toLowerCase().includes(searchLower);
    } else {
      return (
        checklist.modelos_checklist.nome_modelo.toLowerCase().includes(searchLower) ||
        checklist.clientes.razao_social.toLowerCase().includes(searchLower)
      );
    }
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
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // HEADER
      // Add logo if available
      if (logoUrl) {
        try {
          pdf.addImage(logoUrl, "PNG", margin, yPos, 30, 15);
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
      
      yPos += 20;

      // Title - centered and bold
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Relatório de Inspeção Sanitária", pageWidth / 2, yPos, { align: "center" });
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
      const campos = checklist.modelos_checklist.estrutura_json?.campos || [];
      const respostas = checklist.respostas_json || {};

      // Table header
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPos, contentWidth, 8, "F");
      pdf.text("ITEM", margin + 2, yPos + 5);
      pdf.text("PERGUNTA", margin + 15, yPos + 5);
      pdf.text("RESPOSTA", pageWidth - margin - 50, yPos + 5);
      yPos += 10;

      let itemNumber = 1;
      campos.forEach((campo: any) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
          // Repeat table header
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setFillColor(230, 230, 230);
          pdf.rect(margin, yPos, contentWidth, 8, "F");
          pdf.text("ITEM", margin + 2, yPos + 5);
          pdf.text("PERGUNTA", margin + 15, yPos + 5);
          pdf.text("RESPOSTA", pageWidth - margin - 50, yPos + 5);
          yPos += 10;
        }

        if (campo.tipo === "titulo") {
          // Section headers in table
          pdf.setFillColor(245, 245, 255);
          const titleHeight = 8;
          pdf.rect(margin, yPos, contentWidth, titleHeight, "F");
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(40, 40, 180);
          pdf.text(campo.label, margin + 2, yPos + 5);
          pdf.setTextColor(0, 0, 0);
          yPos += titleHeight + 2;
        } else if (campo.tipo === "descricao") {
          // Description in table
          pdf.setFillColor(250, 250, 250);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(100, 100, 100);
          const descLines = pdf.splitTextToSize(campo.label, contentWidth - 4);
          const descHeight = descLines.length * 4 + 2;
          pdf.rect(margin, yPos, contentWidth, descHeight, "F");
          pdf.text(descLines, margin + 2, yPos + 3);
          pdf.setTextColor(0, 0, 0);
          yPos += descHeight + 1;
        } else {
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
          const perguntaLines = pdf.splitTextToSize(campo.label, 95);
          const respostaLines = pdf.splitTextToSize(respostaText, 48);
          const rowHeight = Math.max(perguntaLines.length, respostaLines.length) * 4 + 3;

          // Draw cells
          pdf.rect(margin, yPos, 12, rowHeight); // Item number column
          pdf.rect(margin + 12, yPos, 95, rowHeight); // Question column
          pdf.rect(margin + 107, yPos, 63, rowHeight); // Answer column

          // Fill item number
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text(String(itemNumber), margin + 6, yPos + 4, { align: "center" });

          // Fill question
          pdf.setFont("helvetica", "normal");
          pdf.text(perguntaLines, margin + 14, yPos + 3);

          // Fill answer
          pdf.text(respostaLines, margin + 109, yPos + 3);

          yPos += rowHeight;
          itemNumber++;
        }
      });

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
        yPos += 6 * parecerLines.length + 5;
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

      // SIGNATURES - Side by side
      if (checklist.assinatura_rt || checklist.assinatura_cliente) {
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = margin;
        }

        const signatureWidth = 60;
        const signatureHeight = 20;
        const spacing = (contentWidth - (signatureWidth * 3)) / 2;
        
        let xPos = margin;
        
        // RT Signature
        if (checklist.assinatura_rt) {
          pdf.addImage(checklist.assinatura_rt, "PNG", xPos, yPos, signatureWidth, signatureHeight);
          pdf.setDrawColor(0, 0, 0);
          pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.text("Responsável Técnico", xPos + signatureWidth / 2, yPos + signatureHeight + 7, { align: "center" });
          xPos += signatureWidth + spacing;
        }
        
        // Client Signature
        if (checklist.assinatura_cliente) {
          pdf.addImage(checklist.assinatura_cliente, "PNG", xPos, yPos, signatureWidth, signatureHeight);
          pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
          pdf.text("Dono do Estabelecimento", xPos + signatureWidth / 2, yPos + signatureHeight + 7, { align: "center" });
          xPos += signatureWidth + spacing;
        }
        
        // Witness placeholder (optional - only show if both signatures exist)
        if (checklist.assinatura_rt && checklist.assinatura_cliente) {
          pdf.line(xPos, yPos + signatureHeight, xPos + signatureWidth, yPos + signatureHeight);
          pdf.text("Testemunha", xPos + signatureWidth / 2, yPos + signatureHeight + 5, { align: "center" });
        }
        
        yPos += signatureHeight + 15;
      }

      // FOOTER
      yPos = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(120, 120, 120);
      const footerText = companyName ? `${companyName} | RT-Checklist` : "RT-Checklist";
      pdf.text(footerText, pageWidth / 2, yPos, { align: "center" });
      pdf.setFontSize(7);
      pdf.text(`Gerado automaticamente em ${format(new Date(), "dd/MM/yyyy")} às ${format(new Date(), "HH:mm")}`, 
        pageWidth / 2, yPos + 4, { align: "center" });

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
            Checklists Prontos
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize e baixe os checklists já aplicados
          </p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar checklists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              size="sm"
            >
              Todos
            </Button>
            <Button
              variant={filterType === "checklist" ? "default" : "outline"}
              onClick={() => setFilterType("checklist")}
              size="sm"
            >
              Por Checklist
            </Button>
            <Button
              variant={filterType === "empresa" ? "default" : "outline"}
              onClick={() => setFilterType("empresa")}
              size="sm"
            >
              Por Empresa
            </Button>
          </div>
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
              <Card key={checklist.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{checklist.modelos_checklist.nome_modelo}</span>
                    <div className="flex gap-2">
                      <Button onClick={() => setViewingChecklist(checklist)} size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button onClick={() => generatePDF(checklist)} size="sm" variant="default">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar PDF
                      </Button>
                      <Button 
                        onClick={() => handleDelete(checklist.id)} 
                        size="sm" 
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>{checklist.clientes.razao_social}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(checklist.data_aplicacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {checklist.responsavel_inspecao && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{checklist.responsavel_inspecao}</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={viewingChecklist !== null} onOpenChange={() => setViewingChecklist(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingChecklist?.modelos_checklist.nome_modelo}</DialogTitle>
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
                          {viewingChecklist.modelos_checklist.estrutura_json?.campos.map((campo: any, index: number) => {
                            if (campo.tipo === "titulo") {
                              return (
                                <tr key={campo.id} className="bg-accent/50">
                                  <td colSpan={3} className="p-2 font-bold text-primary">
                                    {campo.label}
                                  </td>
                                </tr>
                              );
                            }
                            if (campo.tipo === "descricao") {
                              return (
                                <tr key={campo.id} className="bg-muted/30">
                                  <td colSpan={3} className="p-2 text-xs italic text-muted-foreground">
                                    {campo.label}
                                  </td>
                                </tr>
                              );
                            }

                            const resposta = viewingChecklist.respostas_json?.[campo.id];
                            const outrosText = viewingChecklist.respostas_json?.[`${campo.id}_outros_text`];
                            let respostaText = "---";
                            
                            if (Array.isArray(resposta)) {
                              respostaText = resposta.join(", ");
                              if (outrosText) {
                                respostaText += ` (${outrosText})`;
                              }
                            } else if (resposta !== undefined && resposta !== null && resposta !== "") {
                              respostaText = String(resposta);
                            }

                            return (
                              <tr key={campo.id} className="border-t">
                                <td className="p-2 text-center font-semibold">{index + 1}</td>
                                <td className="p-2">{campo.label}</td>
                                <td className="p-2">{respostaText}</td>
                              </tr>
                            );
                          })}
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
