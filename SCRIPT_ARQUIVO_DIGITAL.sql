-- =====================================================
-- SCRIPT PARA CRIAR FUNCIONALIDADE ARQUIVO DIGITAL
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. CRIAR TABELA ARQUIVOS_DIGITAIS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arquivos_digitais' AND table_schema = 'public') THEN
        CREATE TABLE public.arquivos_digitais (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          nome TEXT NOT NULL,
          descricao TEXT,
          arquivo_url TEXT NOT NULL,
          tipo_arquivo TEXT NOT NULL,
          tamanho INTEGER,
          ano INTEGER NOT NULL,
          mes INTEGER,
          categoria TEXT,
          tags TEXT[],
          usuario_upload TEXT NOT NULL,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela arquivos_digitais criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela arquivos_digitais já existe, pulando criação';
    END IF;
END $$;

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_ano ON arquivos_digitais(ano);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_mes ON arquivos_digitais(mes);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_categoria ON arquivos_digitais(categoria);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_tipo ON arquivos_digitais(tipo_arquivo);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_criado_em ON arquivos_digitais(criado_em);

-- 3. HABILITAR RLS
ALTER TABLE public.arquivos_digitais ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS RLS
DROP POLICY IF EXISTS "Todos podem ler arquivos digitais" ON public.arquivos_digitais;
CREATE POLICY "Todos podem ler arquivos digitais"
ON public.arquivos_digitais
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir arquivos digitais" ON public.arquivos_digitais;
CREATE POLICY "Autenticados podem inserir arquivos digitais"
ON public.arquivos_digitais
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados podem atualizar arquivos digitais" ON public.arquivos_digitais;
CREATE POLICY "Autenticados podem atualizar arquivos digitais"
ON public.arquivos_digitais
FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados podem deletar arquivos digitais" ON public.arquivos_digitais;
CREATE POLICY "Autenticados podem deletar arquivos digitais"
ON public.arquivos_digitais
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 5. CRIAR STORAGE BUCKET PARA ARQUIVOS DIGITAIS
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('arquivos-digitais', 'arquivos-digitais', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  updated_at = now();

-- 6. CRIAR POLÍTICAS DE STORAGE PARA ARQUIVOS DIGITAIS
DROP POLICY IF EXISTS "Arquivos digitais - INSERT" ON storage.objects;
CREATE POLICY "Arquivos digitais - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'arquivos-digitais');

DROP POLICY IF EXISTS "Arquivos digitais - SELECT" ON storage.objects;
CREATE POLICY "Arquivos digitais - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'arquivos-digitais');

DROP POLICY IF EXISTS "Arquivos digitais - UPDATE" ON storage.objects;
CREATE POLICY "Arquivos digitais - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'arquivos-digitais');

DROP POLICY IF EXISTS "Arquivos digitais - DELETE" ON storage.objects;
CREATE POLICY "Arquivos digitais - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'arquivos-digitais');

-- 7. CRIAR FUNÇÃO PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_arquivos_digitais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. CRIAR TRIGGER PARA updated_at
DROP TRIGGER IF EXISTS update_arquivos_digitais_updated_at ON arquivos_digitais;
CREATE TRIGGER update_arquivos_digitais_updated_at
    BEFORE UPDATE ON arquivos_digitais
    FOR EACH ROW
    EXECUTE FUNCTION update_arquivos_digitais_updated_at();

-- 9. CRIAR VIEW PARA ESTATÍSTICAS POR ANO
CREATE OR REPLACE VIEW estatisticas_arquivos_por_ano AS
SELECT 
    ano,
    COUNT(*) as total_arquivos,
    COUNT(DISTINCT categoria) as categorias_diferentes,
    SUM(tamanho) as tamanho_total_bytes,
    ROUND(SUM(tamanho) / 1024.0 / 1024.0, 2) as tamanho_total_mb
FROM arquivos_digitais
GROUP BY ano
ORDER BY ano DESC;

-- 10. CRIAR FUNÇÃO PARA BUSCAR ARQUIVOS POR ANO
CREATE OR REPLACE FUNCTION buscar_arquivos_por_ano(ano_busca INTEGER)
RETURNS TABLE (
    id UUID,
    nome TEXT,
    descricao TEXT,
    arquivo_url TEXT,
    tipo_arquivo TEXT,
    tamanho INTEGER,
    ano INTEGER,
    mes INTEGER,
    categoria TEXT,
    tags TEXT[],
    usuario_upload TEXT,
    criado_em TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        ad.id,
        ad.nome,
        ad.descricao,
        ad.arquivo_url,
        ad.tipo_arquivo,
        ad.tamanho,
        ad.ano,
        ad.mes,
        ad.categoria,
        ad.tags,
        ad.usuario_upload,
        ad.criado_em
    FROM arquivos_digitais ad
    WHERE ad.ano = ano_busca
    ORDER BY ad.criado_em DESC;
$$;

-- 11. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE arquivos_digitais IS 'Tabela para armazenar arquivos digitais do sistema com filtro por ano';
COMMENT ON COLUMN arquivos_digitais.ano IS 'Ano do arquivo para filtragem';
COMMENT ON COLUMN arquivos_digitais.mes IS 'Mês do arquivo (opcional)';
COMMENT ON COLUMN arquivos_digitais.categoria IS 'Categoria do arquivo (ex: relatorios, documentos, imagens)';
COMMENT ON COLUMN arquivos_digitais.tags IS 'Tags para busca e organização';
COMMENT ON COLUMN arquivos_digitais.tamanho IS 'Tamanho do arquivo em bytes';

-- 12. VERIFICAÇÃO FINAL
SELECT 'Funcionalidade Arquivo Digital criada com sucesso!' as status;

-- Verificar tabela criada
SELECT 
  'Tabela criada:' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'arquivos_digitais' 
  AND table_schema = 'public';

-- Verificar bucket criado
SELECT 
  'Bucket criado:' as info,
  id as bucket_name,
  name as display_name,
  public as is_public
FROM storage.buckets
WHERE id = 'arquivos-digitais';

