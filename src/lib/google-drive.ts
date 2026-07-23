import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo de integração com a API v3 do Google Drive para upload de fotos no modo BYOS.
 * Requer o escopo https://www.googleapis.com/auth/drive.file habilitado no OAuth.
 */

async function refreshGoogleToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch('/api/google-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      console.error("Falha ao renovar token do Google:", data);
      return null;
    }
    return data.access_token;
  } catch (error) {
    console.error("Erro ao renovar token do Google:", error);
    return null;
  }
}

export async function getValidGoogleToken(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('google_access_token, google_token_expiry')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.google_access_token) return null;

  const expiry = profile.google_token_expiry ? new Date(profile.google_token_expiry) : null;
  if (!expiry || expiry.getTime() < Date.now() + 2 * 60 * 1000) {
    return await refreshGoogleToken();
  }

  return profile.google_access_token;
}

/** Localiza ou cria uma pasta no Google Drive */
export async function ensureDriveFolder(accessToken: string, folderName: string, parentId?: string): Promise<string | null> {
  try {
    const q = parentId 
      ? `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      : `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Criar nova pasta
    const body: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) body.parents = [parentId];

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const createData = await createRes.json();
    return createData.id || null;
  } catch (error) {
    console.error("Erro ao verificar/criar pasta no Google Drive:", error);
    return null;
  }
}

/** Faz upload multipart de um Blob de imagem para o Google Drive */
export async function uploadPhotoToDrive(accessToken: string, parentFolderId: string, imageBlob: Blob, fileName: string): Promise<{ fileId: string; viewUrl: string } | null> {
  try {
    const metadata = {
      name: fileName,
      parents: [parentFolderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', imageBlob);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.id) {
      console.error("Erro no upload para o Google Drive:", uploadData);
      return null;
    }

    // Tornar o arquivo legível para exibição via thumbnail/link no app
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    const viewUrl = `https://drive.google.com/thumbnail?id=${uploadData.id}&sz=w1024`;
    return { fileId: uploadData.id, viewUrl };
  } catch (error) {
    console.error("Erro ao fazer upload da foto para o Google Drive:", error);
    return null;
  }
}
