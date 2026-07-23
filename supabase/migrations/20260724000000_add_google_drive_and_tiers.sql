-- Adiciona suporte a novos níveis de planos (free, drive, cloud, enterprise)
-- e integração com armazenamento BYOS no Google Drive do usuário.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'supabase';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_drive_folder_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.plan_tier IS 'Nível do plano: free, drive, cloud, enterprise';
COMMENT ON COLUMN public.profiles.storage_provider IS 'Provedor de armazenamento de mídia: supabase ou google_drive';
COMMENT ON COLUMN public.profiles.google_drive_folder_id IS 'ID da pasta raiz RT-Expert criada no Google Drive do cliente';
COMMENT ON COLUMN public.profiles.storage_used_bytes IS 'Espaço total consumido no Supabase Storage em bytes';
