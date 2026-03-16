-- Adicionar coluna para CPF/CNPJ do usuário (Responsável Técnico)
-- Necessário para emissão de notas fiscais e processamento de pagamentos no Asaas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_cnpj text;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.cpf_cnpj IS 'CPF ou CNPJ do Responsável Técnico para faturamento da assinatura';
