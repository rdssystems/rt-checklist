import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Building2, Image as ImageIcon, User, Mail, ShieldCheck, Save } from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

const Settings = () => {
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [nomeRT, setNomeRT] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      .select("company_name, logo_url, nome_rt, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const profileData = data as any;

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      return;
    }

    if (profileData) {
      setCompanyName(profileData.company_name || "");
      setLogoUrl(profileData.logo_url || "");
      setNomeRT(profileData.nome_rt || "");
      setEmail(profileData.email || "");
      setAvatarUrl(profileData.avatar_url || "");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'avatar') => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingAvatar;
    const bucket = type === 'logo' ? 'logos' : 'avatars'; // avatars bucket needs to be created or use logos

    setUploading(true);

    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, {
        maxWidth: type === 'logo' ? 800 : 400,
        quality: 0.8
      });

      // Get current path to delete if exists
      const currentUrl = type === 'logo' ? logoUrl : avatarUrl;
      if (currentUrl && currentUrl.includes(bucket)) {
        try {
          const oldPath = currentUrl.split('/').slice(-2).join('/');
          await supabase.storage.from(bucket).remove([oldPath]);
        } catch (e) {
          console.error("Erro ao deletar arquivo antigo:", e);
        }
      }

      const fileExt = "jpg"; // We compress to jpeg
      const fileName = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      if (type === 'logo') {
        setLogoUrl(publicUrl);
        toast.success("Logo carregada com sucesso!");
      } else {
        setAvatarUrl(publicUrl);
        toast.success("Foto de perfil atualizada!");
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Erro ao fazer upload da ${type === 'logo' ? 'logo' : 'foto'}`);
    } finally {
      setUploading(false);
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
        nome_rt: nomeRT || null,
        avatar_url: avatarUrl || null,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* USER PROFILE CARD */}
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-6 border-b border-primary/5">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-2 border-white dark:border-slate-700 shadow-md">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                      {nomeRT.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <ImageIcon className="w-5 h-5" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'avatar')}
                    disabled={uploadingAvatar}
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 rounded-full">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <User className="w-5 h-5 text-primary" />
                    Meu Perfil
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 underline-offset-4 decoration-primary/30">
                    Gerencie seus dados pessoais
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="nomeRT" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Responsável Técnico</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="nomeRT"
                    placeholder="Seu nome completo"
                    value={nomeRT}
                    onChange={(e) => setNomeRT(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail de Contato</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    disabled
                    value={email}
                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> E-mail vinculado à conta
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full shadow-lg shadow-primary/20 h-11"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar Dados Pessoais"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* COMPANY CARD */}
          <Card className="border-primary/10 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-6 border-b border-primary/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="w-5 h-5 text-primary" />
                Negócio / Empresa
              </CardTitle>
              <CardDescription>
                Informações que aparecerão nos relatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6 flex-1">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Empresa</Label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="companyName"
                    placeholder="Nome que será impresso nos PDFs"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logotipo Oficial</Label>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className={`size-32 rounded-xl border-2 border-dashed flex items-center justify-center bg-slate-50 dark:bg-slate-800 ${logoUrl ? 'border-primary/30' : 'border-slate-300'}`}>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="max-h-24 max-w-24 object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <Button
                      variant="outline"
                      className="w-full h-11 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                      onClick={() => document.getElementById('logoFile')?.click()}
                      disabled={uploadingLogo}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingLogo ? "Compactando e Enviando..." : "Mudar Logotipo"}
                    </Button>
                    <input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                    <p className="text-[10px] text-muted-foreground text-center sm:text-left">
                      Compressão automática ativada ⚡ <br />
                      Ideal para cabeçalhos de PDF.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-auto pt-6">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  variant="secondary"
                  className="w-full border shadow-sm h-11"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
