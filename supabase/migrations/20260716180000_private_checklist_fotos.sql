-- LGPD (Art. 46): torna o bucket de fotos de inspeção privado.
-- O acesso passa a ser feito somente por URLs assinadas temporárias,
-- e cada usuário só enxerga/gerencia arquivos da própria pasta (userId/...).

UPDATE storage.buckets SET public = false WHERE id = 'checklist_fotos';

DROP POLICY IF EXISTS "checklist_fotos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_delete_policy" ON storage.objects;

CREATE POLICY "checklist_fotos_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'checklist_fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "checklist_fotos_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checklist_fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "checklist_fotos_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'checklist_fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "checklist_fotos_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'checklist_fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
