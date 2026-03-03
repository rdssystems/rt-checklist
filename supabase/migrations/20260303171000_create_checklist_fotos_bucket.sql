-- Criação do bucket para fotos dos checklists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist_fotos', 'checklist_fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket de checklist_fotos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'checklist_fotos');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE WITH CHECK (bucket_id = 'checklist_fotos' AND auth.role() = 'authenticated');
