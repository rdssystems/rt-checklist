import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, Building2, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import jsPDF from "jspdf";
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
  tipo: "titulo" | "descricao" | "sim_nao_na" | "observacao" | "foto" | "multipla_escolha";
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
    let yPos = 20;
    pdf.setFontSize(16);
    pdf.text("Relatório de Inspeção Sanitária", 105, yPos, {
      align: "center"
    });
    yPos += 15;
    pdf.setFontSize(12);
    pdf.text(`Modelo: ${modeloAtual.nome_modelo}`, 20, yPos);
    yPos += 10;
    pdf.setFontSize(10);
    pdf.text(`Razão Social: ${clienteAtual.razao_social}`, 20, yPos);
    yPos += 6;
    pdf.text(`CNPJ: ${clienteAtual.cnpj}`, 20, yPos);
    yPos += 6;
    const endereco = [clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado].filter(Boolean).join(", ");
    pdf.text(`Endereço: ${endereco}`, 20, yPos);
    yPos += 6;
    pdf.text(`Responsável Legal: ${clienteAtual.responsavel_legal || "N/A"}`, 20, yPos);
    yPos += 12;
    pdf.text("Respostas:", 20, yPos);
    yPos += 8;
    (modeloAtual.estrutura_json?.campos || []).forEach(campo => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      if (campo.tipo === "titulo") {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(campo.label, 20, yPos);
        yPos += 8;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
      } else if (campo.tipo === "descricao") {
        pdf.text(campo.label, 20, yPos);
        yPos += 6;
      } else {
        const resposta = respostas[campo.id];
        pdf.text(`${campo.label}: ${resposta || "Não respondido"}`, 20, yPos);
        yPos += 6;
      }
    });
    if (parecerConclusivo) {
      yPos += 6;
      pdf.setFont("helvetica", "bold");
      pdf.text("Parecer Conclusivo:", 20, yPos);
      yPos += 6;
      pdf.setFont("helvetica", "normal");
      const linhas = pdf.splitTextToSize(parecerConclusivo, 170);
      pdf.text(linhas, 20, yPos);
      yPos += linhas.length * 6 + 6;
    }
    if (dataProximaInspecao) {
      pdf.text(`Data da Próxima Inspeção: ${dataProximaInspecao}`, 20, yPos);
      yPos += 10;
    }
    if (nomeRT) {
      pdf.text(`Responsável pela Inspeção: ${nomeRT}`, 20, yPos);
      yPos += 10;
    }
    if (assinaturaRT) {
      if (yPos > 240) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text("Assinatura do RT:", 20, yPos);
      yPos += 6;
      pdf.addImage(assinaturaRT, "PNG", 20, yPos, 60, 20);
      yPos += 26;
    }
    if (assinaturaCliente) {
      if (yPos > 240) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text("Assinatura do Representante:", 20, yPos);
      yPos += 6;
      pdf.addImage(assinaturaCliente, "PNG", 20, yPos, 60, 20);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Aplicar Checklist</h1>
          <p className="text-muted-foreground">Preencha o checklist para um cliente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Selecione o Cliente</Label>
            <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(cliente => <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome_fantasia || cliente.razao_social}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Selecione o Modelo de Checklist</Label>
            <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um modelo" />
              </SelectTrigger>
              <SelectContent>
                {modelos.map(modelo => <SelectItem key={modelo.id} value={modelo.id}>
                    {modelo.nome_modelo}
                  </SelectItem>)}
              </SelectContent>
            </Select>
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

                    {campo.tipo === "multipla_escolha" && campo.opcoes && <div className="space-y-2">
                        <Label className="text-base">{campo.label}</Label>
                        <div className="space-y-2">
                          {campo.opcoes.map((opcao, index) => <div key={index} className="flex items-center space-x-2">
                              <Checkbox id={`${campo.id}-${index}`} checked={respostas[campo.id]?.includes(opcao) || false} onCheckedChange={checked => {
                      const current = respostas[campo.id] || [];
                      if (checked) {
                        handleResposta(campo.id, [...current, opcao]);
                      } else {
                        handleResposta(campo.id, current.filter((v: string) => v !== opcao));
                      }
                    }} />
                              <Label htmlFor={`${campo.id}-${index}`} className="cursor-pointer">
                                {opcao}
                              </Label>
                            </div>)}
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