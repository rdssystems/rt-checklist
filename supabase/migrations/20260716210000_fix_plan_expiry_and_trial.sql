-- Correções do sistema de planos:
-- 1. plan_expires_at: validade do plano pago avulso (assinatura recorrente fica NULL).
--    Regra: premium ativo = plan_type premium/expert E (sem expiração OU expiração futura), OU trial ativo.
-- 2. handle_new_user: passa a conceder o trial de 7 dias prometido no cadastro
--    (antes o trigger ignorava e o perfil nascia free sem trial).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
COMMENT ON COLUMN public.profiles.plan_expires_at IS 'Validade do plano pago avulso; NULL = sem expiração (assinatura recorrente ativa)';

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_rt, email, plan_type, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_rt', 'Novo RT'),
    NEW.email,
    'free',
    now() + interval '7 days'
  );
  RETURN NEW;
END;
$$;
