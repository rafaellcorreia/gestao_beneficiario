-- =====================================================
-- MIGRAÇÃO: ATUALIZAR ESTRUTURA DOS BENEFICIÁRIOS
-- Remover campos desnecessários e adicionar novos campos
-- =====================================================

-- 1. Remover campos que não são mais necessários
ALTER TABLE beneficiarios 
DROP COLUMN IF EXISTS cpf,
DROP COLUMN IF EXISTS rg,
DROP COLUMN IF EXISTS telefone1,
DROP COLUMN IF EXISTS telefone2;

-- 2. Adicionar novos campos obrigatórios
ALTER TABLE beneficiarios
ADD COLUMN IF NOT EXISTS local_lotacao TEXT NOT NULL DEFAULT 'Não informado',
ADD COLUMN IF NOT EXISTS horas_cumpridas INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_restantes INTEGER NOT NULL DEFAULT 0;

-- 3. Adicionar campos para documentos PDF
ALTER TABLE beneficiarios
ADD COLUMN IF NOT EXISTS frequencia_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS documentacao_pdf_url TEXT;

-- 4. Remover campo local_servico se existir (foi substituído por local_lotacao)
ALTER TABLE beneficiarios 
DROP COLUMN IF EXISTS local_servico;

-- 5. Atualizar índices
DROP INDEX IF EXISTS idx_beneficiarios_cpf;
DROP INDEX IF EXISTS idx_beneficiarios_local_servico;

CREATE INDEX IF NOT EXISTS idx_beneficiarios_local_lotacao ON beneficiarios(local_lotacao);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_horas_restantes ON beneficiarios(horas_restantes);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_horas_cumpridas ON beneficiarios(horas_cumpridas);

-- 6. Criar storage bucket para documentos PDF
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('beneficiarios-documentos', 'beneficiarios-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Criar políticas de storage para documentos PDF
CREATE POLICY "Autenticados podem fazer upload de documentos PDF"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficiarios-documentos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver documentos PDF"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Autenticados podem atualizar documentos PDF"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'beneficiarios-documentos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Autenticados podem deletar documentos PDF"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficiarios-documentos' 
  AND auth.uid() IS NOT NULL
);

-- 8. Adicionar comentários para documentação
COMMENT ON COLUMN beneficiarios.local_lotacao IS 'Local de lotação do beneficiário (texto livre)';
COMMENT ON COLUMN beneficiarios.horas_cumpridas IS 'Horas cumpridas pelo beneficiário (editável)';
COMMENT ON COLUMN beneficiarios.horas_restantes IS 'Horas restantes para cumprimento (editável)';
COMMENT ON COLUMN beneficiarios.frequencia_pdf_url IS 'URL do PDF de frequência anexado';
COMMENT ON COLUMN beneficiarios.documentacao_pdf_url IS 'URL do PDF de documentação anexado';

-- 9. Atualizar dados existentes se necessário
-- Definir valores padrão para registros existentes
UPDATE beneficiarios 
SET local_lotacao = 'Não informado'
WHERE local_lotacao IS NULL OR local_lotacao = '';

UPDATE beneficiarios 
SET horas_cumpridas = 0
WHERE horas_cumpridas IS NULL;

UPDATE beneficiarios 
SET horas_restantes = 0
WHERE horas_restantes IS NULL;

-- 10. Verificação final
DO $$
DECLARE
  null_count integer;
BEGIN
  -- Verificar se não há valores NULL nos campos obrigatórios
  SELECT COUNT(*) INTO null_count 
  FROM beneficiarios 
  WHERE local_lotacao IS NULL OR horas_cumpridas IS NULL OR horas_restantes IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % registros ainda têm valores NULL nos campos obrigatórios', null_count;
  END IF;
  
  RAISE NOTICE 'SUCESSO: Estrutura da tabela beneficiarios atualizada com sucesso!';
END $$;

