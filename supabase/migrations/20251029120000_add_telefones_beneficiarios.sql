-- =====================================================
-- MIGRAÇÃO: Adicionar telefones ao cadastro de beneficiários
-- =====================================================

ALTER TABLE public.beneficiarios
ADD COLUMN IF NOT EXISTS telefone_principal TEXT,
ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;

-- Índices opcionais (se necessário para buscas futuras)
-- CREATE INDEX IF NOT EXISTS idx_beneficiarios_telefone_principal ON public.beneficiarios(telefone_principal);
-- CREATE INDEX IF NOT EXISTS idx_beneficiarios_telefone_secundario ON public.beneficiarios(telefone_secundario);


