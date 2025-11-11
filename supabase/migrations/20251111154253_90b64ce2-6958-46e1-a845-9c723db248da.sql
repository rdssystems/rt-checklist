-- Add witness signature field to aplicacoes_checklist
ALTER TABLE aplicacoes_checklist 
ADD COLUMN IF NOT EXISTS assinatura_testemunha text;