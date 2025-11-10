-- =====================================================
-- GARANTIR QUE A TABELA documentos_pdf EXISTA E ESTEJA CONFIGURADA CORRETAMENTE
-- =====================================================

-- 1. Criar tabela documentos_pdf se não existir
CREATE TABLE IF NOT EXISTS public.documentos_pdf (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    url TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('frequencia', 'documentacao')),
    data_anexacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_beneficiario_id ON public.documentos_pdf(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_tipo ON public.documentos_pdf(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_data_anexacao ON public.documentos_pdf(data_anexacao DESC);

-- 3. Garantir que a coluna data_anexacao existe (caso a tabela já exista sem ela)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos_pdf' 
        AND column_name = 'data_anexacao'
    ) THEN
        ALTER TABLE public.documentos_pdf 
        ADD COLUMN data_anexacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Atualizar registros existentes com data atual
        UPDATE public.documentos_pdf 
        SET data_anexacao = COALESCE(criado_em, NOW())
        WHERE data_anexacao IS NULL;
    END IF;
END $$;

-- 4. Habilitar RLS
ALTER TABLE public.documentos_pdf ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas
DROP POLICY IF EXISTS "Todos podem ler documentos PDF" ON public.documentos_pdf;
DROP POLICY IF EXISTS "Autenticados podem inserir documentos PDF" ON public.documentos_pdf;
DROP POLICY IF EXISTS "Autenticados podem atualizar documentos PDF" ON public.documentos_pdf;
DROP POLICY IF EXISTS "Autenticados podem excluir documentos PDF" ON public.documentos_pdf;

-- 6. Criar políticas RLS permissivas para documentos_pdf
-- SELECT: Qualquer usuário autenticado pode ler qualquer documento
CREATE POLICY "Authenticated users can read any documento PDF"
ON public.documentos_pdf
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Qualquer usuário autenticado pode inserir documentos
CREATE POLICY "Authenticated users can insert any documento PDF"
ON public.documentos_pdf
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Qualquer usuário autenticado pode atualizar documentos
CREATE POLICY "Authenticated users can update any documento PDF"
ON public.documentos_pdf
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Qualquer usuário autenticado pode excluir documentos
CREATE POLICY "Authenticated users can delete any documento PDF"
ON public.documentos_pdf
FOR DELETE
TO authenticated
USING (true);

-- 7. Garantir que o bucket de storage existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('beneficiarios-documentos', 'beneficiarios-documentos', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf'];

-- 8. Políticas de storage para o bucket beneficiarios-documentos
-- Remover políticas antigas
DROP POLICY IF EXISTS "Autenticados podem fazer upload de documentos PDF" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver documentos PDF" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem atualizar documentos PDF" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem deletar documentos PDF" ON storage.objects;

-- SELECT: Qualquer um pode ver os documentos (bucket público)
CREATE POLICY "Anyone can view documentos PDF"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-documentos');

-- INSERT: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload documentos PDF"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beneficiarios-documentos');

-- UPDATE: Usuários autenticados podem atualizar
CREATE POLICY "Authenticated users can update documentos PDF"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'beneficiarios-documentos');

-- DELETE: Usuários autenticados podem deletar
CREATE POLICY "Authenticated users can delete documentos PDF"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beneficiarios-documentos');

-- 9. Verificar se há documentos sem data_anexacao e corrigir
UPDATE public.documentos_pdf 
SET data_anexacao = COALESCE(criado_em, NOW())
WHERE data_anexacao IS NULL;

