-- Add latitude and longitude to clientes table for map functionality
ALTER TABLE public.clientes 
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;

-- Add signature and inspection result fields to aplicacoes_checklist
ALTER TABLE public.aplicacoes_checklist
ADD COLUMN assinatura_rt TEXT,
ADD COLUMN assinatura_cliente TEXT,
ADD COLUMN parecer_conclusivo TEXT,
ADD COLUMN data_proxima_inspecao DATE,
ADD COLUMN responsavel_inspecao TEXT;