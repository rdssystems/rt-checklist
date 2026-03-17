import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2, MapPin, Info, Eye } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cep: string | null;
  rua: string | null;
  numero?: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email_cliente: string | null;
  responsavel_legal: string | null;
  cpf_responsavel: string | null;
  latitude: number | null;
  longitude: number | null;
}

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Cliente>>({});
  const [loading, setLoading] = useState(false);
  const [geocodeConfirmOpen, setGeocodeConfirmOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("plan_type, trial_ends_at").eq("id", user.id).single();
      if (profile) {
        const now = new Date();
        const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
        setIsPremium(profile.plan_type === 'premium' || (trialEnds ? trialEnds > now : false));
      }
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("razao_social");

    if (error) {
      toast.error("Erro ao carregar clientes");
    } else {
      setClientes(data || []);
    }
  };

  const fetchCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          rua: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        }));
        toast.success("Endereço encontrado!");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    }
  };

  const fetchCNPJ = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    if (!isPremium) {
      toast.error("Consulta automática de CNPJ disponível apenas no plano Premium", {
        description: "Assine o RT Expert para automatizar seus cadastros."
      });
      return;
    }

    setLoading(true);
    try {
      console.log(`Buscando CNPJ: ${cleanCNPJ}`);
      // Tentando v2 que costuma ser mais completa
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v2/${cleanCNPJ}`);
      
      if (!response.ok) {
        // Se v2 falhar, tenta v1 como fallback
        const responseV1 = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
        if (!responseV1.ok) {
          throw new Error("CNPJ não encontrado nas bases de dados da BrasilAPI");
        }
        const dataV1 = await responseV1.json();
        processCNPJData(dataV1);
        return;
      }

      const data = await response.json();
      processCNPJData(data);
    } catch (error: any) {
      console.error("Erro ao buscar CNPJ:", error);
      toast.error(error.message || "Erro ao buscar CNPJ. Verifique sua conexão ou tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, "");
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return cleaned.replace(/^(\d{3})(\d+)/, "$1.$2");
    if (cleaned.length <= 9) return cleaned.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
    return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, "$1.$2.$3-$4");
  };

  const formatTelefone = (tel: string | null) => {
    if (!tel) return "-";
    const cleaned = tel.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }
    return tel;
  };

  const processCNPJData = (data: any) => {
    setFormData((prev) => ({
      ...prev,
      razao_social: data.razao_social || prev.razao_social,
      nome_fantasia: data.nome_fantasia || data.razao_social || prev.nome_fantasia,
      cep: data.cep || prev.cep,
      rua: data.logradouro || prev.rua,
      numero: data.numero || prev.numero,
      bairro: data.bairro || prev.bairro,
      cidade: data.municipio || prev.cidade,
      estado: data.uf || prev.estado,
      telefone: data.ddd_telefone_1 || prev.telefone,
      email_cliente: data.email || prev.email_cliente,
    }));
    toast.success("Dados da empresa carregados!");
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao geocodificar endereço:", error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.razao_social || !formData.cnpj) {
      toast.error("Razão Social e CNPJ são obrigatórios");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }

    let latitude: number | null = formData.latitude || null;
    let longitude: number | null = formData.longitude || null;

    // Only geocode if coordinates are not provided manually
    if (!latitude || !longitude) {
      if (formData.rua && formData.cidade && formData.estado) {
        const endereco = `${formData.rua}${formData.numero ? `, ${formData.numero}` : ""}, ${formData.bairro || ""}, ${formData.cidade}, ${formData.estado}, Brasil`;
        const coords = await geocodeAddress(endereco);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }
    }

    const dataToSave: any = {
      ...formData,
      tenant_id: user.id,
      razao_social: formData.razao_social!,
      cnpj: formData.cnpj!,
      latitude,
      longitude,
    };

    const { error } = editingId
      ? await supabase.from("clientes").update(dataToSave).eq("id", editingId)
      : await supabase.from("clientes").insert([dataToSave]);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "Cliente atualizado!" : "Cliente cadastrado!");
      setDialogOpen(false);
      setFormData({});
      setEditingId(null);
      fetchClientes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este cliente?")) return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir cliente");
    } else {
      toast.success("Cliente excluído!");
      fetchClientes();
    }
  };

  const handleGeocodeAll = async () => {
    setLoading(true);
    const clientesSemCoordenadas = clientes.filter(c => !c.latitude || !c.longitude);

    if (clientesSemCoordenadas.length === 0) {
      toast.info("Todos os clientes já possuem coordenadas!");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }

    let atualizados = 0;
    for (const cliente of clientesSemCoordenadas) {
      if (cliente.rua && cliente.cidade && cliente.estado) {
        const endereco = `${cliente.rua}${cliente.numero ? `, ${cliente.numero}` : ""}, ${cliente.bairro || ""}, ${cliente.cidade}, ${cliente.estado}, Brasil`;
        const coords = await geocodeAddress(endereco);

        if (coords) {
          const { error } = await supabase
            .from("clientes")
            .update({ latitude: coords.lat, longitude: coords.lng })
            .eq("id", cliente.id)
            .eq("tenant_id", user.id);

          if (!error) {
            atualizados++;
          }
        }

        // Delay para não sobrecarregar a API do Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    toast.success(`${atualizados} de ${clientesSemCoordenadas.length} clientes geocodificados!`);
    setLoading(false);
    fetchClientes();
  };

  const openDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingId(cliente.id);
      setFormData(cliente);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setDialogOpen(true);
  };

  const openViewDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setViewDialogOpen(true);
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Clientes</h1>
            <p className="text-muted-foreground text-sm">Gerencie as empresas cadastradas</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={geocodeConfirmOpen} onOpenChange={setGeocodeConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  disabled={loading}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="sm:hidden">Coordenadas</span>
                  <span className="hidden sm:inline">{loading ? "Atualizando..." : "Atualizar Coordenadas"}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Atualizar Coordenadas
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Tentaremos localizar automaticamente as coordenadas de todos os clientes para que eles apareçam no mapa.
                  </p>
                  <Alert className="bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Dica de Precisão</AlertTitle>
                    <AlertDescription className="text-xs text-amber-700">
                      Se algum cliente não aparecer corretamente após a busca, você deve:
                      <ol className="list-decimal ml-4 mt-2 space-y-1">
                        <li>Ir ao <strong>Google Maps</strong> e copiar as coordenadas do local.</li>
                        <li>Clicar em <strong>Editar</strong> no cliente desejado.</li>
                        <li>Colar as coordenadas no campo correspondente.</li>
                        <li>Salvar e clicar em <strong>Atualizar Coordenadas</strong> novamente.</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGeocodeConfirmOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => {
                      setGeocodeConfirmOpen(false);
                      handleGeocodeAll();
                    }}
                    className="bg-primary text-white"
                  >
                    Iniciar Atualização
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90 text-white flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                  <DialogDescription>Preencha os dados da empresa</DialogDescription>
                </DialogHeader>

                <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle>Busca Automática</AlertTitle>
                  <AlertDescription className="text-xs">
                    Ao digitar os 14 dígitos do CNPJ, tentaremos carregar os dados automaticamente. 
                    <br />
                    <strong>Nota:</strong> CNPJs criados recentemente podem levar alguns dias para constar na base pública.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj ? formData.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 14);
                        setFormData({ ...formData, cnpj: value });
                        if (value.length === 14) {
                          fetchCNPJ(value);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="razao_social">Razão Social *</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social || ""}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia || ""}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      value={formData.cep ? formData.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setFormData({ ...formData, cep: value });
                        if (value.length === 8) {
                          fetchCEP(value);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rua">Rua/Avenida</Label>
                    <Input
                      id="rua"
                      value={formData.rua || ""}
                      onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero || ""}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Ex: 123 ou S/N"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro || ""}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade || ""}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado || ""}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone || ""}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email_cliente">Email</Label>
                    <Input
                      id="email_cliente"
                      type="email"
                      value={formData.email_cliente || ""}
                      onChange={(e) => setFormData({ ...formData, email_cliente: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="responsavel_legal">Responsável Legal</Label>
                    <Input
                      id="responsavel_legal"
                      value={formData.responsavel_legal || ""}
                      onChange={(e) => setFormData({ ...formData, responsavel_legal: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf_responsavel">CPF Responsável</Label>
                    <Input
                      id="cpf_responsavel"
                      placeholder="000.000.000-00"
                      value={formatCPF(formData.cpf_responsavel || "")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setFormData({ ...formData, cpf_responsavel: value });
                      }}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="coordenadas">Coordenadas (Latitude, Longitude)</Label>
                    <Input
                      id="coordenadas"
                      value={
                        formData.latitude && formData.longitude
                          ? `${formData.latitude}, ${formData.longitude}`
                          : ""
                      }
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        const parts = value.split(",").map((p) => p.trim());
                        if (parts.length === 2) {
                          const lat = parseFloat(parts[0]);
                          const lng = parseFloat(parts[1]);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            setFormData({ ...formData, latitude: lat, longitude: lng });
                          }
                        } else if (value === "") {
                          setFormData({ ...formData, latitude: null, longitude: null });
                        }
                      }}
                      placeholder="Ex: -18.9188, -48.2766"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cole as coordenadas do Google Maps ou deixe vazio para geocodificar automaticamente
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Detalhes do Cliente
                  </DialogTitle>
                  <DialogDescription>Informações completas da empresa</DialogDescription>
                </DialogHeader>

                {selectedCliente && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Razão Social</Label>
                      <p className="font-semibold text-lg">{selectedCliente.razao_social}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">CNPJ</Label>
                      <p className="font-medium">{formatCNPJ(selectedCliente.cnpj)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Nome Fantasia</Label>
                      <p className="font-medium">{selectedCliente.nome_fantasia || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Telefone</Label>
                      <p className="font-medium">{formatTelefone(selectedCliente.telefone)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedCliente.email_cliente || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">CEP</Label>
                      <p className="font-medium">{selectedCliente.cep ? selectedCliente.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : "-"}</p>
                    </div>
                    <div className="col-span-2 space-y-1 border-t pt-4">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Endereço
                      </Label>
                      <p className="font-medium">
                        {selectedCliente.rua}{selectedCliente.numero ? `, ${selectedCliente.numero}` : ""}, {selectedCliente.bairro}
                        <br />
                        {selectedCliente.cidade} - {selectedCliente.estado}
                      </p>
                    </div>
                    <div className="space-y-1 border-t pt-4">
                      <Label className="text-muted-foreground">Responsável Legal</Label>
                      <p className="font-medium">{selectedCliente.responsavel_legal || "-"}</p>
                    </div>
                    <div className="space-y-1 border-t pt-4">
                      <Label className="text-muted-foreground">CPF Responsável</Label>
                      <p className="font-medium">
                        {selectedCliente.cpf_responsavel ? selectedCliente.cpf_responsavel.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : "-"}
                      </p>
                    </div>
                    {selectedCliente.latitude && selectedCliente.longitude && (
                      <div className="col-span-2 space-y-1 border-t pt-4">
                        <Label className="text-muted-foreground">Coordenadas Geográficas</Label>
                        <p className="text-sm font-mono">{selectedCliente.latitude}, {selectedCliente.longitude}</p>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Lista de Clientes
            </CardTitle>
            <CardDescription>
              Total: {clientes.length} clientes cadastrados
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 mr-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                  No mapa
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> 
                  Fora do mapa (Edite para enviar as coordenadas manualmente)
                </span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 sm:px-4">Nome / Razão Social</TableHead>
                    <TableHead className="px-2 sm:px-4">CNPJ</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="text-right px-2 sm:px-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium px-2 sm:px-4 max-w-[120px] sm:max-w-none truncate text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`w-2 h-2 shrink-0 rounded-full ${cliente.latitude && cliente.longitude ? 'bg-emerald-500' : 'bg-red-500'}`} 
                            title={cliente.latitude && cliente.longitude ? 'Coordenadas configuradas' : 'Sem coordenadas'}
                          />
                          <span className="truncate">{cliente.nome_fantasia || cliente.razao_social}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 text-[10px] sm:text-sm whitespace-nowrap">
                        {formatCNPJ(cliente.cnpj)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatTelefone(cliente.telefone)}</TableCell>
                      <TableCell className="text-right px-2 sm:px-4 whitespace-nowrap">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9"
                            onClick={() => openViewDialog(cliente)}
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9"
                            onClick={() => openDialog(cliente)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(cliente.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Clientes;
