-- Script Definitivo para criar Buckets e configurar Políticas de Acesso
-- Execute este script no Editor SQL do seu projeto Supabase

-- 1. GARANTIR QUE OS BUCKETS EXISTAM
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist_fotos', 'checklist_fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. LIMPEZA DE POLÍTICAS ANTIGAS (EVITA ERRO DE "ALREADY EXISTS")
DO $$
BEGIN
    -- Limpa políticas de AVATARS
    DROP POLICY IF EXISTS "avatars_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_delete_policy" ON storage.objects;
    
    -- Limpa políticas de CHECKLIST_FOTOS
    DROP POLICY IF EXISTS "checklist_fotos_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "checklist_fotos_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "checklist_fotos_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "checklist_fotos_delete_policy" ON storage.objects;

    -- Limpa políticas de LOGOS
    DROP POLICY IF EXISTS "logos_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "logos_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "logos_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "logos_delete_policy" ON storage.objects;
    
    -- Limpa nomes genéricos que podem estar bloqueando
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
    DROP POLICY IF EXISTS "Logos são publicamente acessíveis" ON storage.objects;
    DROP POLICY IF EXISTS "Usuários podem fazer upload do próprio logo" ON storage.objects;
    DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios logos" ON storage.objects;
    DROP POLICY IF EXISTS "Usuários podem deletar seus próprios logos" ON storage.objects;
END $$;

-- 3. CRIAR NOVAS POLÍTICAS COM SINTAXE CORRETA

-- BUCKET: AVATARS
CREATE POLICY "avatars_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- BUCKET: CHECKLIST_FOTOS
CREATE POLICY "checklist_fotos_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'checklist_fotos');
CREATE POLICY "checklist_fotos_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
CREATE POLICY "checklist_fotos_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
CREATE POLICY "checklist_fotos_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');

-- BUCKET: LOGOS (Focado em segurança por pasta de usuário)
CREATE POLICY "logos_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
