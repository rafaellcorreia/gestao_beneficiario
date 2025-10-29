-- Script para criar as novas tabelas e funcionalidades
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela para documentos PDF
CREATE TABLE IF NOT EXISTS documentos_pdf (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    beneficiario_id UUID NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    url TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('frequencia', 'documentacao')),
    data_anexacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_beneficiario_id ON documentos_pdf(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_tipo ON documentos_pdf(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_data_anexacao ON documentos_pdf(data_anexacao);

-- 3. Atualizar tabela observacoes se necessário (adicionar coluna editavel se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'observacoes' AND column_name = 'editavel') THEN
        ALTER TABLE observacoes ADD COLUMN editavel BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Criar políticas RLS para documentos_pdf
ALTER TABLE documentos_pdf ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ler)
CREATE POLICY IF NOT EXISTS "Todos podem ler documentos PDF" ON documentos_pdf
    FOR SELECT USING (true);

-- Política para inserção (usuários autenticados podem inserir)
CREATE POLICY IF NOT EXISTS "Autenticados podem inserir documentos PDF" ON documentos_pdf
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para atualização (usuários autenticados podem atualizar)
CREATE POLICY IF NOT EXISTS "Autenticados podem atualizar documentos PDF" ON documentos_pdf
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para exclusão (usuários autenticados podem excluir)
CREATE POLICY IF NOT EXISTS "Autenticados podem excluir documentos PDF" ON documentos_pdf
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Atualizar políticas da tabela observacoes se necessário
-- Verificar se as políticas já existem e criar se não existirem
DO $$ 
BEGIN
    -- Política para leitura
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observacoes' AND policyname = 'Todos podem ler observacoes') THEN
        CREATE POLICY "Todos podem ler observacoes" ON observacoes
            FOR SELECT USING (true);
    END IF;
    
    -- Política para inserção
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observacoes' AND policyname = 'Autenticados podem inserir observacoes') THEN
        CREATE POLICY "Autenticados podem inserir observacoes" ON observacoes
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    -- Política para atualização
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observacoes' AND policyname = 'Autenticados podem atualizar observacoes') THEN
        CREATE POLICY "Autenticados podem atualizar observacoes" ON observacoes
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    -- Política para exclusão
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'observacoes' AND policyname = 'Autenticados podem excluir observacoes') THEN
        CREATE POLICY "Autenticados podem excluir observacoes" ON observacoes
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Criar trigger para atualizar updated_at na tabela documentos_pdf
DROP TRIGGER IF EXISTS update_documentos_pdf_updated_at ON documentos_pdf;
CREATE TRIGGER update_documentos_pdf_updated_at
    BEFORE UPDATE ON documentos_pdf
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Criar trigger para atualizar updated_at na tabela observacoes se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_observacoes_updated_at') THEN
        CREATE TRIGGER update_observacoes_updated_at
            BEFORE UPDATE ON observacoes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 9. Comentários nas tabelas
COMMENT ON TABLE documentos_pdf IS 'Tabela para armazenar documentos PDF anexados aos beneficiários';
COMMENT ON COLUMN documentos_pdf.tipo IS 'Tipo do documento: frequencia ou documentacao';
COMMENT ON COLUMN documentos_pdf.data_anexacao IS 'Data e hora em que o documento foi anexado';

-- 10. Verificar se a tabela observacoes tem a estrutura correta
DO $$ 
BEGIN
    -- Adicionar coluna timestamp se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'observacoes' AND column_name = 'timestamp') THEN
        ALTER TABLE observacoes ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Adicionar coluna anexo_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'observacoes' AND column_name = 'anexo_url') THEN
        ALTER TABLE observacoes ADD COLUMN anexo_url TEXT;
    END IF;
END $$;

-- Mensagem de sucesso
SELECT 'Tabelas e políticas criadas com sucesso!' as status;
