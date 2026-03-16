-- Adiciona campos de plano e assinatura à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_id text;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.plan_type IS 'Tipo do plano: free ou premium';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Data de encerramento do período de teste de 7 dias';
