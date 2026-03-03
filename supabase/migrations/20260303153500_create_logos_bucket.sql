-- Criação do Bucket "logos" caso ele não exista
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies de Acesso para o Storage "logos"
CREATE POLICY "Logos são publicamente acessíveis" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Usuários podem fazer upload do próprio logo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem atualizar seus próprios logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar seus próprios logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
