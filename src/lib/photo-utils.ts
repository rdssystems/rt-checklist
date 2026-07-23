import { supabase } from "@/integrations/supabase/client";

/**
 * Fotos de inspeção ficam em bucket privado (Supabase) ou no Google Drive do cliente (BYOS).
 * Esta função identifica o provedor e retorna a URL pronta para exibição.
 */

const BUCKET = "checklist_fotos";
const MARKER = "/checklist_fotos/";

/** Extrai o caminho dentro do bucket Supabase a partir de URL pública ou assinada. */
export const getPhotoPath = (stored: string): string => {
  const idx = stored.indexOf(MARKER);
  const raw = idx === -1 ? stored : stored.slice(idx + MARKER.length);
  return decodeURIComponent(raw.split("?")[0]);
};

/** Retorna a URL assinada (Supabase) ou a URL do Google Drive diretamente. */
export const getSignedPhotoUrl = async (stored: string, expiresInSeconds = 60 * 60 * 12): Promise<string> => {
  if (!stored) return "";

  // Se a URL já for do Google Drive ou externa, retorna ela mesma
  if (stored.includes("drive.google.com") || stored.includes("googleusercontent.com") || stored.startsWith("http") && !stored.includes("supabase.co")) {
    return stored;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(getPhotoPath(stored), expiresInSeconds);
    if (error || !data?.signedUrl) return stored;
    return data.signedUrl;
  } catch {
    return stored;
  }
};

export const signPhotoUrls = async (urls: string[]): Promise<string[]> =>
  Promise.all(urls.map((u) => getSignedPhotoUrl(u)));
