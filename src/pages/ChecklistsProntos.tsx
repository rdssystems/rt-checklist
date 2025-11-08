import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck, Download, Calendar, User, Building2 } from "lucide-react";
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

  const generatePDF = async (checklist: ChecklistPronto) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Relatório de Inspeção Sanitária", pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Checklist name
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(checklist.modelos_checklist.nome_modelo, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Client info section
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Razão Social: ", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(checklist.clientes.razao_social, margin + 30, yPos);
      yPos += 6;

      pdf.setFont("helvetica", "bold");
      pdf.text("CNPJ: ", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(checklist.clientes.cnpj, margin + 30, yPos);
      yPos += 6;

      const endereco = `${checklist.clientes.rua}, ${checklist.clientes.bairro}, ${checklist.clientes.cidade}, ${checklist.clientes.estado}`;
      pdf.setFont("helvetica", "bold");
      pdf.text("Endereço: ", margin, yPos);
      pdf.setFont("helvetica", "normal");
      const enderecoLines = pdf.splitTextToSize(endereco, contentWidth - 30);
      pdf.text(enderecoLines, margin + 30, yPos);
      yPos += 6 * enderecoLines.length;

      pdf.setFont("helvetica", "bold");
      pdf.text("Responsável Legal: ", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(checklist.clientes.responsavel_legal, margin + 45, yPos);
      yPos += 10;

      // Responses section
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Respostas:", margin, yPos);
      yPos += 8;

      const campos = checklist.modelos_checklist.estrutura_json?.campos || [];
      const respostas = checklist.respostas_json || {};

      campos.forEach((campo: any, index: number) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        const perguntaLines = pdf.splitTextToSize(`${index + 1}. ${campo.label}`, contentWidth - 10);
        pdf.text(perguntaLines, margin + 5, yPos);
        yPos += 5 * perguntaLines.length;

        pdf.setFont("helvetica", "normal");
        const resposta = respostas[campo.id] || "Não respondido";
        const respostaText = typeof resposta === "object" ? JSON.stringify(resposta) : String(resposta);
        const respostaLines = pdf.splitTextToSize(`R: ${respostaText}`, contentWidth - 10);
        pdf.text(respostaLines, margin + 5, yPos);
        yPos += 5 * respostaLines.length + 3;
      });

      // Inspector info
      if (checklist.responsavel_inspecao) {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = margin;
        }
        yPos += 5;
        pdf.setFont("helvetica", "bold");
        pdf.text("Responsável pela Inspeção: ", margin, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(checklist.responsavel_inspecao, margin + 60, yPos);
        yPos += 10;
      }

      // Signatures
      if (checklist.assinatura_rt || checklist.assinatura_cliente) {
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = margin;
        }

        if (checklist.assinatura_rt) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Assinatura do RT:", margin, yPos);
          yPos += 5;
          pdf.addImage(checklist.assinatura_rt, "PNG", margin, yPos, 60, 20);
          yPos += 30;
        }

        if (checklist.assinatura_cliente) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Assinatura do Representante:", margin, yPos);
          yPos += 5;
          pdf.addImage(checklist.assinatura_cliente, "PNG", margin, yPos, 60, 20);
        }
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
            Checklists Prontos
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize e baixe os checklists já aplicados
          </p>
        </div>

        {checklists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileCheck className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum checklist aplicado ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Acesse "Fazer Inspeção" para aplicar um checklist
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {checklists.map((checklist) => (
              <Card key={checklist.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{checklist.modelos_checklist.nome_modelo}</span>
                    <Button onClick={() => generatePDF(checklist)} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </Button>
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
      </div>
    </Layout>
  );
};

export default ChecklistsProntos;
