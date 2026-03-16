-- Corrige políticas de armazenamento com nomes únicos e sintaxe correta do Postgres
-- SELECT e DELETE exigem a cláusula USING em vez de WITH CHECK

-- 1. Limpeza de políticas existentes nos três buckets
DO $$
BEGIN
    -- Avatars
    DROP POLICY IF EXISTS "avatars_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_delete_policy" ON storage.objects;
    
    -- Checklist Fotos
    DROP POLICY IF EXISTS "checklist_fotos_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "checklist_fotos_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "checklist_fotos_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "checklist_fotos_delete_policy" ON storage.objects;

    -- Logos
    DROP POLICY IF EXISTS "logos_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "logos_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "logos_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "logos_delete_policy" ON storage.objects;
    
    -- Antigos nomes genéricos se existirem
    DROP POLICY IF EXISTS "Logos são publicamente acessíveis" ON storage.objects;
    DROP POLICY IF EXISTS "Usuários podem fazer upload do próprio logo" ON storage.objects;
    DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios logos" ON storage.objects;
    DROP POLICY IF EXISTS "Usuários podem deletar seus próprios logos" ON storage.objects;
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
END $$;

-- 2. Recriação correta do bucket AVATARS
CREATE POLICY "avatars_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 3. Recriação correta do bucket CHECKLIST_FOTOS
CREATE POLICY "checklist_fotos_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'checklist_fotos');
CREATE POLICY "checklist_fotos_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
CREATE POLICY "checklist_fotos_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
CREATE POLICY "checklist_fotos_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');

-- 4. Recriação correta do bucket LOGOS (Com trava de segurança por pasta de usuário)
CREATE POLICY "logos_select_policy" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_insert_policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_update_policy" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_delete_policy" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
