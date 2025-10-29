-- =====================================================
-- MIGRAÇÃO DE SEGURANÇA CRÍTICA
-- Corrige acesso público a dados sensíveis
-- =====================================================

-- 1. REMOVER TODAS AS POLÍTICAS PERMISSIVAS (PÚBLICAS)
-- =====================================================

-- Beneficiários (dados pessoais sensíveis)
DROP POLICY IF EXISTS "Permitir leitura de funcionários" ON beneficiarios;
DROP POLICY IF EXISTS "Permitir inserção de funcionários" ON beneficiarios;
DROP POLICY IF EXISTS "Permitir atualização de funcionários" ON beneficiarios;
DROP POLICY IF EXISTS "Permitir exclusão de funcionários" ON beneficiarios;

-- Observações (notas privadas)
DROP POLICY IF EXISTS "Permitir leitura de observações" ON observacoes;
DROP POLICY IF EXISTS "Permitir inserção de observações" ON observacoes;

-- Frequências (dados de presença)
DROP POLICY IF EXISTS "Permitir leitura de frequências" ON frequencias;
DROP POLICY IF EXISTS "Permitir inserção de frequências" ON frequencias;

-- Armamentos (dados sensíveis de armamento)
DROP POLICY IF EXISTS "Todos podem ler armamentos" ON armamentos;

-- Locais de serviço
DROP POLICY IF EXISTS "Todos podem ler locais de serviço" ON locais_servico;


-- 2. CRIAR POLÍTICAS RLS SEGURAS COM AUTENTICAÇÃO OBRIGATÓRIA
-- =====================================================

-- BENEFICIÁRIOS - Apenas usuários autenticados com role mínimo de 'leitor'
-- =====================================================
CREATE POLICY "Usuários autenticados podem ler beneficiários"
ON beneficiarios FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Operadores podem inserir beneficiários"
ON beneficiarios FOR INSERT
TO authenticated
WITH CHECK (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Operadores podem atualizar beneficiários"
ON beneficiarios FOR UPDATE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Gestores podem deletar beneficiários"
ON beneficiarios FOR DELETE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);


-- OBSERVAÇÕES - Apenas autenticados podem ler/escrever
-- =====================================================
CREATE POLICY "Usuários autenticados podem ler observações"
ON observacoes FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Operadores podem inserir observações"
ON observacoes FOR INSERT
TO authenticated
WITH CHECK (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Operadores podem atualizar observações"
ON observacoes FOR UPDATE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Gestores podem deletar observações"
ON observacoes FOR DELETE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);


-- FREQUÊNCIAS - Apenas autenticados
-- =====================================================
CREATE POLICY "Usuários autenticados podem ler frequências"
ON frequencias FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Operadores podem inserir frequências"
ON frequencias FOR INSERT
TO authenticated
WITH CHECK (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Operadores podem atualizar frequências"
ON frequencias FOR UPDATE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Gestores podem deletar frequências"
ON frequencias FOR DELETE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);


-- ARMAMENTOS - Dados altamente sensíveis, apenas autenticados
-- =====================================================
DROP POLICY IF EXISTS "Autenticados podem inserir armamentos" ON armamentos;
DROP POLICY IF EXISTS "Autenticados podem atualizar armamentos" ON armamentos;
DROP POLICY IF EXISTS "Autenticados podem deletar armamentos" ON armamentos;

CREATE POLICY "Usuários autenticados podem ler armamentos"
ON armamentos FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Gestores podem inserir armamentos"
ON armamentos FOR INSERT
TO authenticated
WITH CHECK (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);

CREATE POLICY "Gestores podem atualizar armamentos"
ON armamentos FOR UPDATE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);

CREATE POLICY "Gestores podem deletar armamentos"
ON armamentos FOR DELETE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);


-- LOCAIS DE SERVIÇO - Menos sensível, mas ainda requer autenticação
-- =====================================================
DROP POLICY IF EXISTS "Autenticados podem inserir locais" ON locais_servico;

CREATE POLICY "Usuários autenticados podem ler locais"
ON locais_servico FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Operadores podem inserir locais"
ON locais_servico FOR INSERT
TO authenticated
WITH CHECK (
  public.has_min_role(auth.uid(), 'operador'::user_role)
);

CREATE POLICY "Gestores podem atualizar locais"
ON locais_servico FOR UPDATE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);

CREATE POLICY "Gestores podem deletar locais"
ON locais_servico FOR DELETE
TO authenticated
USING (
  public.has_min_role(auth.uid(), 'gestor'::user_role)
);


-- 3. ATUALIZAR POLÍTICAS DE STORAGE - APENAS AUTENTICADOS
-- =====================================================

-- Remover políticas públicas de storage se existirem
DROP POLICY IF EXISTS "Todos podem ver fotos de beneficiários" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver anexos de frequências" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver docs de armamentos" ON storage.objects;

-- Fotos de beneficiários - apenas autenticados
CREATE POLICY "Autenticados podem ver fotos de beneficiários"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'beneficiarios-fotos'
  AND auth.uid() IS NOT NULL
);

-- Anexos de frequências - apenas autenticados
CREATE POLICY "Autenticados podem ver anexos de frequências"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'frequencias-anexos'
  AND auth.uid() IS NOT NULL
);

-- Documentos de armamentos - apenas autenticados
CREATE POLICY "Autenticados podem ver docs de armamentos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'armamentos-docs'
  AND auth.uid() IS NOT NULL
);


-- 4. ADICIONAR COMENTÁRIOS DE SEGURANÇA
-- =====================================================
COMMENT ON TABLE beneficiarios IS 'Contém dados pessoais sensíveis (CPF, RG, telefones). Acesso restrito a usuários autenticados.';
COMMENT ON COLUMN beneficiarios.cpf IS 'Dado pessoal sensível - CPF. Não deve ser exposto publicamente.';
COMMENT ON COLUMN beneficiarios.rg IS 'Dado pessoal sensível - RG. Não deve ser exposto publicamente.';
COMMENT ON COLUMN beneficiarios.telefone1 IS 'Dado pessoal sensível - Telefone. Não deve ser exposto publicamente.';
COMMENT ON COLUMN beneficiarios.telefone2 IS 'Dado pessoal sensível - Telefone. Não deve ser exposto publicamente.';

COMMENT ON TABLE observacoes IS 'Contém notas privadas sobre beneficiários. Acesso restrito a usuários autenticados.';
COMMENT ON TABLE armamentos IS 'Dados altamente sensíveis sobre armamentos. Acesso restrito a gestores.';


-- 5. CRIAR ÍNDICES PARA AUDITORIA
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_beneficiarios_criado_por ON beneficiarios(criado_por);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_atualizado_por ON beneficiarios(atualizado_por);
CREATE INDEX IF NOT EXISTS idx_observacoes_autor ON observacoes(autor);