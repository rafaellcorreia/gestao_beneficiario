-- =====================================================
-- MIGRAÇÃO: Garantir que colunas de telefone existam
-- Esta migração verifica e adiciona as colunas se não existirem
-- =====================================================

-- Verificar e adicionar telefone_principal se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'beneficiarios' 
        AND column_name = 'telefone_principal'
    ) THEN
        ALTER TABLE public.beneficiarios
        ADD COLUMN telefone_principal TEXT;
        
        RAISE NOTICE 'Coluna telefone_principal adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna telefone_principal já existe';
    END IF;
END $$;

-- Verificar e adicionar telefone_secundario se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'beneficiarios' 
        AND column_name = 'telefone_secundario'
    ) THEN
        ALTER TABLE public.beneficiarios
        ADD COLUMN telefone_secundario TEXT;
        
        RAISE NOTICE 'Coluna telefone_secundario adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna telefone_secundario já existe';
    END IF;
END $$;

-- Comentários nas colunas
COMMENT ON COLUMN public.beneficiarios.telefone_principal IS 'Telefone principal do beneficiário no formato (XX) XXXXX-XXXX';
COMMENT ON COLUMN public.beneficiarios.telefone_secundario IS 'Telefone secundário do beneficiário no formato (XX) XXXXX-XXXX';

