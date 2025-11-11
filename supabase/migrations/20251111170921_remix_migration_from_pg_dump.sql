--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: aplicacoes_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aplicacoes_checklist (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    modelo_id uuid NOT NULL,
    data_aplicacao timestamp with time zone DEFAULT now(),
    respostas_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    assinatura_rt text,
    assinatura_cliente text,
    parecer_conclusivo text,
    data_proxima_inspecao date,
    responsavel_inspecao text,
    assinatura_testemunha text
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    razao_social text NOT NULL,
    nome_fantasia text,
    cnpj text NOT NULL,
    cep text,
    rua text,
    bairro text,
    cidade text,
    estado text,
    telefone text,
    email_cliente text,
    responsavel_legal text,
    cpf_responsavel text,
    data_cadastro timestamp with time zone DEFAULT now(),
    latitude numeric,
    longitude numeric
);


--
-- Name: modelos_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_checklist (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    nome_modelo text NOT NULL,
    estrutura_json jsonb DEFAULT '{"secoes": []}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome_rt text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    company_name text,
    logo_url text
);


--
-- Name: aplicacoes_checklist aplicacoes_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacoes_checklist
    ADD CONSTRAINT aplicacoes_checklist_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_tenant_id_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_tenant_id_cnpj_key UNIQUE (tenant_id, cnpj);


--
-- Name: clientes clientes_tenant_id_razao_social_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_tenant_id_razao_social_key UNIQUE (tenant_id, razao_social);


--
-- Name: modelos_checklist modelos_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_checklist
    ADD CONSTRAINT modelos_checklist_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: modelos_checklist update_modelos_checklist_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_modelos_checklist_updated_at BEFORE UPDATE ON public.modelos_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: aplicacoes_checklist aplicacoes_checklist_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacoes_checklist
    ADD CONSTRAINT aplicacoes_checklist_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: aplicacoes_checklist aplicacoes_checklist_modelo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacoes_checklist
    ADD CONSTRAINT aplicacoes_checklist_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES public.modelos_checklist(id) ON DELETE CASCADE;


--
-- Name: aplicacoes_checklist aplicacoes_checklist_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicacoes_checklist
    ADD CONSTRAINT aplicacoes_checklist_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clientes clientes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: modelos_checklist modelos_checklist_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_checklist
    ADD CONSTRAINT modelos_checklist_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: aplicacoes_checklist Users can delete own checklist applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own checklist applications" ON public.aplicacoes_checklist FOR DELETE USING ((auth.uid() = tenant_id));


--
-- Name: modelos_checklist Users can delete own checklist models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own checklist models" ON public.modelos_checklist FOR DELETE USING ((auth.uid() = tenant_id));


--
-- Name: clientes Users can delete own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own clients" ON public.clientes FOR DELETE USING ((auth.uid() = tenant_id));


--
-- Name: aplicacoes_checklist Users can insert own checklist applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own checklist applications" ON public.aplicacoes_checklist FOR INSERT WITH CHECK ((auth.uid() = tenant_id));


--
-- Name: modelos_checklist Users can insert own checklist models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own checklist models" ON public.modelos_checklist FOR INSERT WITH CHECK ((auth.uid() = tenant_id));


--
-- Name: clientes Users can insert own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own clients" ON public.clientes FOR INSERT WITH CHECK ((auth.uid() = tenant_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: aplicacoes_checklist Users can update own checklist applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own checklist applications" ON public.aplicacoes_checklist FOR UPDATE USING ((auth.uid() = tenant_id));


--
-- Name: modelos_checklist Users can update own checklist models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own checklist models" ON public.modelos_checklist FOR UPDATE USING ((auth.uid() = tenant_id));


--
-- Name: clientes Users can update own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own clients" ON public.clientes FOR UPDATE USING ((auth.uid() = tenant_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: aplicacoes_checklist Users can view own checklist applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own checklist applications" ON public.aplicacoes_checklist FOR SELECT USING ((auth.uid() = tenant_id));


--
-- Name: modelos_checklist Users can view own checklist models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own checklist models" ON public.modelos_checklist FOR SELECT USING ((auth.uid() = tenant_id));


--
-- Name: clientes Users can view own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own clients" ON public.clientes FOR SELECT USING ((auth.uid() = tenant_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: aplicacoes_checklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aplicacoes_checklist ENABLE ROW LEVEL SECURITY;

--
-- Name: clientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

--
-- Name: modelos_checklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modelos_checklist ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


