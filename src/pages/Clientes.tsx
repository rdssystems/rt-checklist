import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cep: string | null;
  rua: string | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Cliente>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
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
        const endereco = `${formData.rua}, ${formData.bairro || ""}, ${formData.cidade}, ${formData.estado}, Brasil`;
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
        const endereco = `${cliente.rua}, ${cliente.bairro || ""}, ${cliente.cidade}, ${cliente.estado}, Brasil`;
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

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Clientes</h1>
            <p className="text-muted-foreground text-sm">Gerencie as empresas cadastradas</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGeocodeAll}
              disabled={loading}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <MapPin className="w-4 h-4 mr-2 sm:hidden" />
              <MapPin className="w-4 h-4 mr-2 hidden sm:block" />
              <span className="sm:hidden">Coordenadas</span>
              <span className="hidden sm:inline">{loading ? "Atualizando..." : "Atualizar Coordenadas"}</span>
            </Button>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
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
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj || ""}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, cep: value });
                        if (value.replace(/\D/g, "").length === 8) {
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
                      value={formData.cpf_responsavel || ""}
                      onChange={(e) => setFormData({ ...formData, cpf_responsavel: e.target.value })}
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
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Lista de Clientes
            </CardTitle>
            <CardDescription>Total: {clientes.length} clientes cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                      <TableCell>{cliente.cnpj}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(cliente)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cliente.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
