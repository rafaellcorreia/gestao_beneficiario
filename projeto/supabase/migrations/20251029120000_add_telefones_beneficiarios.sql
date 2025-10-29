-- =====================================================
-- MIGRAÇÃO: Adicionar telefones ao cadastro de beneficiários
-- =====================================================

ALTER TABLE public.beneficiarios
ADD COLUMN IF NOT EXISTS telefone_principal TEXT,
ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;


