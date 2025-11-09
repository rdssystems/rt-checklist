import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, Building2, Save, FileDown } from "lucide-react";
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
    campos: CampoChecklist[];
  };
}
const AplicarChecklist = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [assinaturaRT, setAssinaturaRT] = useState<string>("");
  const [assinaturaCliente, setAssinaturaCliente] = useState<string>("");
  const [parecerConclusivo, setParecerConclusivo] = useState<string>("");
  const [dataProximaInspecao, setDataProximaInspecao] = useState<string>("");
  const [nomeRT, setNomeRT] = useState<string>("");
  useEffect(() => {
    fetchClientes();
    fetchModelos();
    fetchNomeRT();
  }, []);
  const fetchNomeRT = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from("profiles").select("nome_rt").eq("id", user.id).single();
      if (data) {
        setNomeRT(data.nome_rt);
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
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Header
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Relatório de Inspeção Sanitária", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // Checklist name (removed "Modelo:")
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    pdf.text(modeloAtual.nome_modelo, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Client info with better formatting
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Razão Social:", margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(clienteAtual.razao_social, margin + 35, yPos);
    yPos += 6;

    pdf.setFont("helvetica", "bold");
    pdf.text("CNPJ:", margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(clienteAtual.cnpj, margin + 35, yPos);
    yPos += 6;

    const endereco = [clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado].filter(Boolean).join(", ");
    if (endereco) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Endereço:", margin, yPos);
      pdf.setFont("helvetica", "normal");
      const enderecoLines = pdf.splitTextToSize(endereco, contentWidth - 35);
      pdf.text(enderecoLines, margin + 35, yPos);
      yPos += 6 * enderecoLines.length;
    }

    if (clienteAtual.responsavel_legal) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Responsável Legal:", margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(clienteAtual.responsavel_legal, margin + 45, yPos);
      yPos += 10;
    }

    // Responses section with column organization
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Respostas:", margin, yPos);
    yPos += 8;

    (modeloAtual.estrutura_json?.campos || []).forEach((campo, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFontSize(9);
      
      if (campo.tipo === "titulo") {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        const tituloLines = pdf.splitTextToSize(campo.label, contentWidth);
        pdf.text(tituloLines, margin, yPos);
        yPos += 6 * tituloLines.length + 2;
        pdf.setFontSize(9);
      } else if (campo.tipo === "descricao") {
        pdf.setFont("helvetica", "italic");
        const descLines = pdf.splitTextToSize(campo.label, contentWidth - 5);
        pdf.text(descLines, margin + 5, yPos);
        yPos += 5 * descLines.length + 2;
      } else {
        pdf.setFont("helvetica", "bold");
        const perguntaLines = pdf.splitTextToSize(`${index + 1}. ${campo.label}`, contentWidth - 10);
        pdf.text(perguntaLines, margin + 5, yPos);
        yPos += 5 * perguntaLines.length;

        const resposta = respostas[campo.id];
        pdf.setFont("helvetica", "normal");
        const respostaText = resposta !== undefined ? String(resposta) : "Não respondido";
        const respostaLines = pdf.splitTextToSize(`R: ${respostaText}`, contentWidth - 10);
        pdf.text(respostaLines, margin + 5, yPos);
        yPos += 5 * respostaLines.length + 3;
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
      yPos += 6 * parecerLines.length + 5;
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

    // Signatures
    if (assinaturaRT || assinaturaCliente) {
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = margin;
      }

      if (assinaturaRT) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Assinatura do RT:", margin, yPos);
        yPos += 5;
        pdf.addImage(assinaturaRT, "PNG", margin, yPos, 60, 20);
        yPos += 30;
      }

      if (assinaturaCliente) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Assinatura do Representante:", margin, yPos);
        yPos += 5;
        pdf.addImage(assinaturaCliente, "PNG", margin, yPos, 60, 20);
      }
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
      parecer_conclusivo: parecerConclusivo,
      data_proxima_inspecao: dataProximaInspecao || null,
      responsavel_inspecao: nomeRT
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
      setParecerConclusivo("");
      setDataProximaInspecao("");
    }
  };
  return <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Fazer Inspeção</h1>
          <p className="text-muted-foreground">Preencha o checklist para um cliente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Selecione o Cliente</Label>
            <Select
              value={clientes.find(c => c.id === clienteSelecionado) ? { value: clienteSelecionado, label: clientes.find(c => c.id === clienteSelecionado)!.nome_fantasia || clientes.find(c => c.id === clienteSelecionado)!.razao_social } : null}
              onChange={(option) => setClienteSelecionado(option?.value || "")}
              options={clientes.map(cliente => ({
                value: cliente.id,
                label: cliente.nome_fantasia || cliente.razao_social
              }))}
              placeholder="Digite para buscar..."
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          <div>
            <Label>Selecione o Modelo de Checklist</Label>
            <Select
              value={modelos.find(m => m.id === modeloSelecionado) ? { value: modeloSelecionado, label: modelos.find(m => m.id === modeloSelecionado)!.nome_modelo } : null}
              onChange={(option) => setModeloSelecionado(option?.value || "")}
              options={modelos.map(modelo => ({
                value: modelo.id,
                label: modelo.nome_modelo
              }))}
              placeholder="Digite para buscar..."
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
            />
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
              <CardContent className="space-y-6">
                {(modeloAtual.estrutura_json?.campos || []).map(campo => <div key={campo.id} className="space-y-2">
                    {campo.tipo === "titulo" && <h3 className="text-lg font-semibold text-primary mt-4">{campo.label}</h3>}

                    {campo.tipo === "descricao" && <p className="text-muted-foreground">{campo.label}</p>}

                    {campo.tipo === "sim_nao_na" && <div className="space-y-2">
                        <Label className="text-base">{campo.label}</Label>
                        <RadioGroup value={respostas[campo.id] || ""} onValueChange={value => handleResposta(campo.id, value)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="SIM" id={`${campo.id}-sim`} />
                            <Label htmlFor={`${campo.id}-sim`} className="cursor-pointer">
                              SIM
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="NAO" id={`${campo.id}-nao`} />
                            <Label htmlFor={`${campo.id}-nao`} className="cursor-pointer">
                              NÃO
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="NA" id={`${campo.id}-na`} />
                            <Label htmlFor={`${campo.id}-na`} className="cursor-pointer">
                              N/A
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>}

                    {campo.tipo === "observacao" && <div className="space-y-2">
                        <Label className="text-base">{campo.label}</Label>
                        <Textarea value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Digite suas observações..." rows={3} />
                      </div>}

                    {campo.tipo === "outros" && <div className="space-y-2">
                        <Label className="text-base">{campo.label}</Label>
                        <Input value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} placeholder="Digite aqui..." />
                      </div>}

                    {campo.tipo === "data" && <div className="space-y-2">
                        <Label className="text-base">{campo.label}</Label>
                        <Input type="date" value={respostas[campo.id] || ""} onChange={e => handleResposta(campo.id, e.target.value)} />
                      </div>}

                    {campo.tipo === "multipla_escolha" && campo.opcoes && <div className="space-y-2">
                        <Label className="text-base">{campo.label}</Label>
                        <div className="space-y-2">
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
                                        // Clear the text field if unchecking "Outros"
                                        if (isOutros) {
                                          handleResposta(`${campo.id}_outros_text`, "");
                                        }
                                      }
                                    }} 
                                  />
                                  <Label htmlFor={`${campo.id}-${index}`} className="cursor-pointer">
                                    {opcao}
                                  </Label>
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
                        <Label className="text-base">{campo.label}</Label>
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                          <p className="text-sm text-muted-foreground">Upload de fotos em breve</p>
                        </div>
                      </div>}
                  </div>)}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Serviço de Assinatura e Resultado da Inspeção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="parecer">Parecer Conclusivo</Label>
                  <Textarea id="parecer" value={parecerConclusivo} onChange={e => setParecerConclusivo(e.target.value)} placeholder="Descreva o resultado da inspeção..." rows={4} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="proxima-data">Data da Próxima Inspeção Recomendada</Label>
                  <Input id="proxima-data" type="date" value={dataProximaInspecao} onChange={e => setDataProximaInspecao(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Responsável Pela Inspeção</Label>
                  <Input value={nomeRT} disabled className="mt-1 bg-muted" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <SignatureCanvas label="Assinatura do RT (Obrigatória)" onSave={setAssinaturaRT} signatureData={assinaturaRT} />
                  <SignatureCanvas label="Assinatura do Representante do Cliente (Obrigatória)" onSave={setAssinaturaCliente} signatureData={assinaturaCliente} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={handleSalvar} disabled={loading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Checklist"}
              </Button>
              <Button onClick={gerarPDF} variant="outline" className="flex-1">
                <FileDown className="w-4 h-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
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