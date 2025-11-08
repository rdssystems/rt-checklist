import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileCheck, Building2, Save } from "lucide-react";
import { toast } from "sonner";

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

interface Modelo {
  id: string;
  nome_modelo: string;
  estrutura_json: {
    secoes: Array<{
      id: string;
      titulo: string;
      itens: Array<{
        id: string;
        tipo: "titulo" | "texto" | "sim_nao_na" | "observacao" | "foto";
        label: string;
      }>;
    }>;
  };
}

const AplicarChecklist = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClientes();
    fetchModelos();
  }, []);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, razao_social, nome_fantasia, cnpj, rua, bairro, cidade, estado, responsavel_legal")
      .order("razao_social");

    if (!error && data) {
      setClientes(data);
    }
  };

  const fetchModelos = async () => {
    const { data, error } = await supabase
      .from("modelos_checklist")
      .select("*")
      .order("nome_modelo");

    if (!error && data) {
      setModelos(data as unknown as Modelo[]);
    }
  };

  const clienteAtual = clientes.find((c) => c.id === clienteSelecionado);
  const modeloAtual = modelos.find((m) => m.id === modeloSelecionado);

  const handleResposta = (itemId: string, valor: any) => {
    setRespostas({ ...respostas, [itemId]: valor });
  };

  const handleSalvar = async () => {
    if (!clienteSelecionado || !modeloSelecionado) {
      toast.error("Selecione um cliente e um modelo");
      return;
    }

    setLoading(true);
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
    };

    const { error } = await supabase
      .from("aplicacoes_checklist")
      .insert([dataToSave]);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Checklist aplicado com sucesso!");
      setRespostas({});
      setClienteSelecionado("");
      setModeloSelecionado("");
    }
  };

  return (
    <Layout>
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
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome_fantasia || cliente.razao_social}
                  </SelectItem>
                ))}
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
                {modelos.map((modelo) => (
                  <SelectItem key={modelo.id} value={modelo.id}>
                    {modelo.nome_modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <div>
                  <span className="font-semibold">Razão Social:</span> {clienteAtual.razao_social}
                </div>
                <div>
                  <span className="font-semibold">CNPJ:</span> {clienteAtual.cnpj}
                </div>
                <div>
                  <span className="font-semibold">Endereço:</span>{" "}
                  {[clienteAtual.rua, clienteAtual.bairro, clienteAtual.cidade, clienteAtual.estado]
                    .filter(Boolean)
                    .join(", ") || "Não informado"}
                </div>
                <div>
                  <span className="font-semibold">Responsável Legal:</span>{" "}
                  {clienteAtual.responsavel_legal || "Não informado"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {modeloAtual && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Checklist: {modeloAtual.nome_modelo}
              </h2>
              <Button
                onClick={handleSalvar}
                disabled={loading}
                className="bg-gradient-accent"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Checklist"}
              </Button>
            </div>

            {modeloAtual.estrutura_json.secoes.map((secao) => (
              <Card key={secao.id} className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl">{secao.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {secao.itens.map((item) => (
                    <div key={item.id} className="space-y-2">
                      {item.tipo === "titulo" && (
                        <h3 className="text-lg font-semibold text-primary">{item.label}</h3>
                      )}

                      {item.tipo === "texto" && (
                        <div>
                          <Label className="text-base">{item.label}</Label>
                        </div>
                      )}

                      {item.tipo === "sim_nao_na" && (
                        <div className="space-y-2">
                          <Label className="text-base">{item.label}</Label>
                          <RadioGroup
                            value={respostas[item.id] || ""}
                            onValueChange={(value) => handleResposta(item.id, value)}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="SIM" id={`${item.id}-sim`} />
                              <Label htmlFor={`${item.id}-sim`} className="cursor-pointer">
                                SIM
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NAO" id={`${item.id}-nao`} />
                              <Label htmlFor={`${item.id}-nao`} className="cursor-pointer">
                                NÃO
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="NA" id={`${item.id}-na`} />
                              <Label htmlFor={`${item.id}-na`} className="cursor-pointer">
                                N/A
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {item.tipo === "observacao" && (
                        <div className="space-y-2">
                          <Label className="text-base">{item.label}</Label>
                          <Textarea
                            value={respostas[item.id] || ""}
                            onChange={(e) => handleResposta(item.id, e.target.value)}
                            placeholder="Digite suas observações..."
                            rows={3}
                          />
                        </div>
                      )}

                      {item.tipo === "foto" && (
                        <div className="space-y-2">
                          <Label className="text-base">{item.label}</Label>
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Upload de fotos em breve
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!modeloAtual && (
          <Card className="shadow-md">
            <CardContent className="py-12 text-center">
              <FileCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Selecione um cliente e um modelo de checklist para começar
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AplicarChecklist;
