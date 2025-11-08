import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
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

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (formData.rua && formData.cidade && formData.estado) {
      const endereco = `${formData.rua}, ${formData.bairro || ""}, ${formData.cidade}, ${formData.estado}, Brasil`;
      const coords = await geocodeAddress(endereco);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Clientes</h1>
            <p className="text-muted-foreground">Gerencie as empresas cadastradas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="bg-gradient-primary">
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
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary">
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                    <TableHead>Cidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                      <TableCell>{cliente.cnpj}</TableCell>
                      <TableCell>{cliente.cidade || "-"}</TableCell>
                      <TableCell>{cliente.telefone || "-"}</TableCell>
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
