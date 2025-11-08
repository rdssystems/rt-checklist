-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_rt TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can only see and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  cep TEXT,
  rua TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  telefone TEXT,
  email_cliente TEXT,
  responsavel_legal TEXT,
  cpf_responsavel TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, cnpj),
  UNIQUE(tenant_id, razao_social)
);

-- Enable RLS on clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Clientes policies: Users can only access their own clients
CREATE POLICY "Users can view own clients"
  ON public.clientes FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own clients"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own clients"
  ON public.clientes FOR DELETE
  USING (auth.uid() = tenant_id);

-- Create modelos_checklist table
CREATE TABLE public.modelos_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome_modelo TEXT NOT NULL,
  estrutura_json JSONB NOT NULL DEFAULT '{"secoes": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on modelos_checklist
ALTER TABLE public.modelos_checklist ENABLE ROW LEVEL SECURITY;

-- Modelos checklist policies
CREATE POLICY "Users can view own checklist models"
  ON public.modelos_checklist FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own checklist models"
  ON public.modelos_checklist FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own checklist models"
  ON public.modelos_checklist FOR UPDATE
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own checklist models"
  ON public.modelos_checklist FOR DELETE
  USING (auth.uid() = tenant_id);

-- Create aplicacoes_checklist table
CREATE TABLE public.aplicacoes_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES public.modelos_checklist(id) ON DELETE CASCADE,
  data_aplicacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respostas_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on aplicacoes_checklist
ALTER TABLE public.aplicacoes_checklist ENABLE ROW LEVEL SECURITY;

-- Aplicacoes checklist policies
CREATE POLICY "Users can view own checklist applications"
  ON public.aplicacoes_checklist FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert own checklist applications"
  ON public.aplicacoes_checklist FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update own checklist applications"
  ON public.aplicacoes_checklist FOR UPDATE
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete own checklist applications"
  ON public.aplicacoes_checklist FOR DELETE
  USING (auth.uid() = tenant_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_rt, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_rt', 'Novo RT'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for modelos_checklist updated_at
CREATE TRIGGER update_modelos_checklist_updated_at
  BEFORE UPDATE ON public.modelos_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();