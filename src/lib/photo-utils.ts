import { supabase } from "@/integrations/supabase/client";

/**
 * Fotos de inspeção ficam em bucket privado (LGPD).
 * O banco armazena URLs no formato antigo (public URL) ou caminhos —
 * estas funções convertem qualquer formato em uma URL assinada temporária.
 */

const BUCKET = "checklist_fotos";
const MARKER = "/checklist_fotos/";

/** Extrai o caminho dentro do bucket a partir de URL pública, URL assinada ou caminho puro. */
export const getPhotoPath = (stored: string): string => {
  const idx = stored.indexOf(MARKER);
  const raw = idx === -1 ? stored : stored.slice(idx + MARKER.length);
  return decodeURIComponent(raw.split("?")[0]);
};

/** URL assinada temporária para exibição/download. Retorna o valor original em caso de falha. */
export const getSignedPhotoUrl = async (stored: string, expiresInSeconds = 60 * 60 * 12): Promise<string> => {
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
