import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Building2 } from "lucide-react";

const Settings = () => {
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);
    
    const { data, error } = await supabase
      .from("profiles")
      .select("company_name, logo_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      return;
    }

    if (data) {
      setCompanyName(data.company_name || "");
      setLogoUrl(data.logo_url || "");
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("Usuário não encontrado");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: companyName || null,
        logo_url: logoUrl || null,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    } else {
      toast.success("Configurações salvas com sucesso!");
      // Reload page to update sidebar
      window.location.reload();
    }

    setLoading(false);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Personalize as informações da sua empresa
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações da Empresa
            </CardTitle>
            <CardDescription>
              Configure o nome e logotipo que aparecerão no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                placeholder="Digite o nome da sua empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL do Logotipo</Label>
              <Input
                id="logoUrl"
                placeholder="https://exemplo.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cole o link direto da imagem do seu logotipo
              </p>
              {logoUrl && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Prévia do Logotipo:</p>
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-w-[200px] max-h-[100px] object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.alt = "URL inválida";
                    }}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
