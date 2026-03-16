import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Building2, Image as ImageIcon, User, Mail, ShieldCheck, Save, Calendar, CheckCircle2 } from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import { useGoogleLogin } from '@react-oauth/google';
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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("company_name, logo_url, nome_rt, email, avatar_url, google_access_token")
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
      setGoogleConnected(!!profileData.google_access_token);
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
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase Storage Error:', uploadError);
        throw uploadError;
      }

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

  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true);
      try {
        const { code } = codeResponse;
        
        // Agora enviamos esse 'code' para uma função que vai trocar pelo token permanente
        // Por enquanto, vamos salvar o log para você ver
        console.log("Código de autorização recebido:", code);
        
        // Aqui chamaremos a Edge Function no futuro. 
        // Para manter funcionando agora, vamos apenas avisar que o código foi capturado
        toast.info("Autorização recebida! Salvando acesso permanente...");
        
        // Enviar o código para nossa API na Vercel
        const response = await fetch('/api/google-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code, 
            userId,
            redirectUri: window.location.origin 
          }),
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || "Erro na API de autenticação");

        setGoogleConnected(true);
        toast.success("Google Agenda conectado com acesso permanente!");
      } catch (error: any) {
        console.error("Erro ao processar acesso permanente:", error);
        toast.error("Erro ao habilitar acesso permanente: " + error.message);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error("Falha na autenticação com o Google");
    },
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
    // @ts-ignore
    prompt: 'consent',
  });

  const disconnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          // @ts-ignore
          google_access_token: null,
          // @ts-ignore
          google_refresh_token: null,
          // @ts-ignore
          google_token_expiry: null
        })
        .eq("id", userId);

      if (error) throw error;
      setGoogleConnected(false);
      toast.success("Google Agenda desconectado");
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setGoogleLoading(false);
    }
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

        {/* GOOGLE CALENDAR INTEGRATION */}
        <Card className="mt-6 border-amber-500/20 shadow-sm overflow-hidden bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Sincronização com Google Agenda
              </CardTitle>
              <CardDescription>
                Crie automaticamente seus compromissos no Google Calendar
              </CardDescription>
            </div>
            {googleConnected && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold ring-1 ring-green-600/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CONECTADO
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <div className="rounded-lg bg-amber-500/5 p-4 border border-amber-500/10">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">Como funciona?</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Sempre que você gerar um agendamento no sistema (manualmente ou via Checklist), 
                    nós enviaremos instantaneamente para a sua agenda principal do Google. 
                    Você receberá lembretes no celular e no e-mail conforme configurado no seu Google.
                  </p>
                </div>
                
                <ul className="space-y-3">
                  {[
                    "Sincronização instantânea de novas visitas",
                    "Acesso offline via aplicativo do Google",
                    "Compartilhamento fácil com sua equipe"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="w-full md:w-auto flex flex-col items-center gap-4 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 mb-2">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
                    alt="Google Calendar" 
                    className="w-10 h-10"
                  />
                </div>
                
                {googleConnected ? (
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-64 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-11"
                    onClick={disconnectGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? "Desconectando..." : "Desconectar Conta Google"}
                  </Button>
                ) : (
                  <Button 
                    className="w-full sm:w-64 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm h-11 flex items-center justify-center gap-3"
                    onClick={() => handleGoogleLogin()}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      "Conectando..."
                    ) : (
                      <>
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="G" />
                        Conectar Google Agenda
                      </>
                    )}
                  </Button>
                )}
                
                <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
                  {googleConnected 
                    ? "Sua conta já está sincronizada com nosso sistema."
                    : "Você será redirecionado para a página de autorização segura do Google."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
