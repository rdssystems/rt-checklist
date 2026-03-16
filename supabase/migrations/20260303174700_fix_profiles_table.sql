-- Script para ajustar a tabela profiles e garantir que o salvamento funcione
-- 1. Garante que a coluna avatar_url existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Ajusta a coluna nome_rt para permitir nulo ou ter um valor padrão 
-- (Evita erro ao tentar salvar campo vazio se ele estiver como NOT NULL)
ALTER TABLE public.profiles ALTER COLUMN nome_rt DROP NOT NULL;

-- 3. Garante que as políticas de RLS estão corretas
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);
