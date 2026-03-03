-- Adiciona colunas para os nomes por extenso nas assinaturas
ALTER TABLE public.aplicacoes_checklist 
ADD COLUMN IF NOT EXISTS nome_cliente_assinatura text,
ADD COLUMN IF NOT EXISTS nome_testemunha_assinatura text;
