-- =====================================================
-- SCRIPT SEGURO PARA CRIAR TABELAS
-- Verifica se já existem antes de criar
-- =====================================================

-- 1. CRIAR ENUM DE ROLES (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'operador', 'leitor');
        RAISE NOTICE 'Tipo user_role criado com sucesso';
    ELSE
        RAISE NOTICE 'Tipo user_role já existe, pulando criação';
    END IF;
END $$;

-- 2. CRIAR TABELA BENEFICIARIOS (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'beneficiarios' AND table_schema = 'public') THEN
        CREATE TABLE public.beneficiarios (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          nome TEXT NOT NULL,
          foto_url TEXT NOT NULL,
          numero_processo TEXT NOT NULL,
          data_recebimento DATE NOT NULL,
          status_vida TEXT NOT NULL CHECK (status_vida IN ('Vivo', 'Morto', 'Preso', 'Enfermo', 'Licença Maternidade', 'Devolvido', 'Concludente', 'Aguardando Sentença')),
          local_lotacao TEXT NOT NULL DEFAULT 'Não informado',
          horas_cumpridas INTEGER NOT NULL DEFAULT 0,
          horas_restantes INTEGER NOT NULL DEFAULT 0,
          frequencia_pdf_url TEXT,
          documentacao_pdf_url TEXT,
          atributos JSONB DEFAULT '{}'::jsonb,
          slogan_nucleo TEXT,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          criado_por TEXT,
          atualizado_por TEXT
        );
        RAISE NOTICE 'Tabela beneficiarios criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela beneficiarios já existe, pulando criação';
    END IF;
END $$;

-- 3. CRIAR TABELA OBSERVAÇÕES (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'observacoes' AND table_schema = 'public') THEN
        CREATE TABLE public.observacoes (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
          autor TEXT NOT NULL,
          texto TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          editavel BOOLEAN DEFAULT true,
          anexo_url TEXT
        );
        RAISE NOTICE 'Tabela observacoes criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela observacoes já existe, pulando criação';
    END IF;
END $$;

-- 4. CRIAR TABELA FREQUÊNCIAS (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'frequencias' AND table_schema = 'public') THEN
        CREATE TABLE public.frequencias (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
          foto_url TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          usuario TEXT,
          anexos JSONB DEFAULT '[]'::jsonb
        );
        RAISE NOTICE 'Tabela frequencias criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela frequencias já existe, pulando criação';
    END IF;
END $$;

-- 5. CRIAR TABELA LOCAIS DE SERVIÇO (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locais_servico' AND table_schema = 'public') THEN
        CREATE TABLE public.locais_servico (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL UNIQUE,
          endereco TEXT,
          observacoes TEXT,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        RAISE NOTICE 'Tabela locais_servico criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela locais_servico já existe, pulando criação';
    END IF;
END $$;

-- 6. CRIAR TABELA ARMAMENTOS (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'armamentos' AND table_schema = 'public') THEN
        CREATE TABLE public.armamentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          beneficiario_id UUID REFERENCES beneficiarios(id) ON DELETE CASCADE NOT NULL,
          tipo TEXT NOT NULL,
          quantidade INTEGER DEFAULT 1,
          storage_path TEXT,
          url TEXT,
          observacoes TEXT,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        RAISE NOTICE 'Tabela armamentos criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela armamentos já existe, pulando criação';
    END IF;
END $$;

-- 7. CRIAR TABELA DOCUMENTOS PDF (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_pdf' AND table_schema = 'public') THEN
        CREATE TABLE public.documentos_pdf (
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
        RAISE NOTICE 'Tabela documentos_pdf criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela documentos_pdf já existe, pulando criação';
    END IF;
END $$;

-- 8. CRIAR TABELA USER_PROFILES (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        CREATE TABLE public.user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT,
          nome TEXT,
          role user_role DEFAULT 'leitor',
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        RAISE NOTICE 'Tabela user_profiles criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela user_profiles já existe, pulando criação';
    END IF;
END $$;

-- 9. CRIAR TABELA USER_ROLES (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        CREATE TABLE public.user_roles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          role user_role NOT NULL,
          granted_by uuid REFERENCES auth.users(id),
          granted_at timestamptz DEFAULT now(),
          UNIQUE(user_id, role)
        );
        RAISE NOTICE 'Tabela user_roles criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela user_roles já existe, pulando criação';
    END IF;
END $$;

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

-- Habilitar RLS nas tabelas existentes
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.armamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_pdf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CRIAR FUNÇÕES DE VERIFICAÇÃO DE ROLES
-- =====================================================

-- Criar função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar função has_min_role
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        (role = 'admin') OR
        (role = 'gestor' AND _min_role IN ('gestor', 'operador', 'leitor')) OR
        (role = 'operador' AND _min_role IN ('operador', 'leitor')) OR
        (role = 'leitor' AND _min_role = 'leitor')
      )
  )
$$;

-- =====================================================
-- CRIAR POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Políticas para beneficiarios
DROP POLICY IF EXISTS "Users can read only their own beneficiarios or admins can read all" ON public.beneficiarios;
CREATE POLICY "Users can read only their own beneficiarios or admins can read all"
ON public.beneficiarios
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

DROP POLICY IF EXISTS "Users can insert own beneficiarios" ON public.beneficiarios;
CREATE POLICY "Users can insert own beneficiarios"
ON public.beneficiarios
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update only their own beneficiarios or admins can update all" ON public.beneficiarios;
CREATE POLICY "Users can update only their own beneficiarios or admins can update all"
ON public.beneficiarios
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

DROP POLICY IF EXISTS "Users can delete only their own beneficiarios or admins can delete all" ON public.beneficiarios;
CREATE POLICY "Users can delete only their own beneficiarios or admins can delete all"
ON public.beneficiarios
FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Políticas básicas para observações
DROP POLICY IF EXISTS "Todos podem ler observacoes" ON public.observacoes;
CREATE POLICY "Todos podem ler observacoes" ON observacoes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir observacoes" ON public.observacoes;
CREATE POLICY "Autenticados podem inserir observacoes" ON observacoes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados podem atualizar observacoes" ON public.observacoes;
CREATE POLICY "Autenticados podem atualizar observacoes" ON observacoes
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados podem excluir observacoes" ON public.observacoes;
CREATE POLICY "Autenticados podem excluir observacoes" ON observacoes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas básicas para frequências
DROP POLICY IF EXISTS "Todos podem ler frequencias" ON public.frequencias;
CREATE POLICY "Todos podem ler frequencias" ON frequencias
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir frequencias" ON public.frequencias;
CREATE POLICY "Autenticados podem inserir frequencias" ON frequencias
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados podem atualizar frequencias" ON public.frequencias;
CREATE POLICY "Autenticados podem atualizar frequencias" ON frequencias
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados podem excluir frequencias" ON public.frequencias;
CREATE POLICY "Autenticados podem excluir frequencias" ON frequencias
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas básicas para outras tabelas
DROP POLICY IF EXISTS "Todos podem ler locais de serviço" ON locais_servico;
CREATE POLICY "Todos podem ler locais de serviço"
ON locais_servico FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir locais" ON locais_servico;
CREATE POLICY "Autenticados podem inserir locais"
ON locais_servico FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para armamentos
DROP POLICY IF EXISTS "Todos podem ler armamentos" ON armamentos;
CREATE POLICY "Todos podem ler armamentos"
ON armamentos FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir armamentos" ON armamentos;
CREATE POLICY "Autenticados podem inserir armamentos"
ON armamentos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados podem atualizar armamentos" ON armamentos;
CREATE POLICY "Autenticados podem atualizar armamentos"
ON armamentos FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados podem deletar armamentos" ON armamentos;
CREATE POLICY "Autenticados podem deletar armamentos"
ON armamentos FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Políticas para documentos PDF
DROP POLICY IF EXISTS "Todos podem ler documentos PDF" ON documentos_pdf;
CREATE POLICY "Todos podem ler documentos PDF" ON documentos_pdf
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir documentos PDF" ON documentos_pdf;
CREATE POLICY "Autenticados podem inserir documentos PDF" ON documentos_pdf
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados podem atualizar documentos PDF" ON documentos_pdf;
CREATE POLICY "Autenticados podem atualizar documentos PDF" ON documentos_pdf
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Autenticados podem excluir documentos PDF" ON documentos_pdf;
CREATE POLICY "Autenticados podem excluir documentos PDF" ON documentos_pdf
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para user_profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Todos podem ver perfis (para auditoria)" ON user_profiles;
CREATE POLICY "Todos podem ver perfis (para auditoria)"
ON user_profiles FOR SELECT
USING (true);

-- Políticas para user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- =====================================================
-- CRIAR STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('beneficiarios-fotos', 'beneficiarios-fotos', true),
  ('beneficiarios-documentos', 'beneficiarios-documentos', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  updated_at = now();

-- =====================================================
-- CRIAR POLÍTICAS DE STORAGE
-- =====================================================

-- Políticas para fotos
DROP POLICY IF EXISTS "Fotos beneficiarios - INSERT" ON storage.objects;
CREATE POLICY "Fotos beneficiarios - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'beneficiarios-fotos');

DROP POLICY IF EXISTS "Fotos beneficiarios - SELECT" ON storage.objects;
CREATE POLICY "Fotos beneficiarios - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-fotos');

DROP POLICY IF EXISTS "Fotos beneficiarios - UPDATE" ON storage.objects;
CREATE POLICY "Fotos beneficiarios - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'beneficiarios-fotos');

DROP POLICY IF EXISTS "Fotos beneficiarios - DELETE" ON storage.objects;
CREATE POLICY "Fotos beneficiarios - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'beneficiarios-fotos');

-- Políticas para documentos
DROP POLICY IF EXISTS "Documentos beneficiarios - INSERT" ON storage.objects;
CREATE POLICY "Documentos beneficiarios - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'beneficiarios-documentos');

DROP POLICY IF EXISTS "Documentos beneficiarios - SELECT" ON storage.objects;
CREATE POLICY "Documentos beneficiarios - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-documentos');

DROP POLICY IF EXISTS "Documentos beneficiarios - UPDATE" ON storage.objects;
CREATE POLICY "Documentos beneficiarios - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'beneficiarios-documentos');

DROP POLICY IF EXISTS "Documentos beneficiarios - DELETE" ON storage.objects;
CREATE POLICY "Documentos beneficiarios - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'beneficiarios-documentos');

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'Script executado com sucesso! Todas as tabelas foram criadas ou verificadas.' as status;

-- 10. CRIAR TABELA ARQUIVOS_DIGITAIS (se não existir)
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

-- 11. HABILITAR RLS NA TABELA ARQUIVOS_DIGITAIS
ALTER TABLE public.arquivos_digitais ENABLE ROW LEVEL SECURITY;

-- 12. CRIAR POLÍTICAS RLS PARA ARQUIVOS_DIGITAIS
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

-- 13. CRIAR STORAGE BUCKET PARA ARQUIVOS DIGITAIS
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('arquivos-digitais', 'arquivos-digitais', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  updated_at = now();

-- 14. CRIAR POLÍTICAS DE STORAGE PARA ARQUIVOS DIGITAIS
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

-- 15. CRIAR ÍNDICES PARA ARQUIVOS_DIGITAIS
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_ano ON arquivos_digitais(ano);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_mes ON arquivos_digitais(mes);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_categoria ON arquivos_digitais(categoria);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_tipo ON arquivos_digitais(tipo_arquivo);
CREATE INDEX IF NOT EXISTS idx_arquivos_digitais_criado_em ON arquivos_digitais(criado_em);

-- 16. CRIAR TRIGGER PARA updated_at
DROP TRIGGER IF EXISTS update_arquivos_digitais_updated_at ON arquivos_digitais;
CREATE TRIGGER update_arquivos_digitais_updated_at
    BEFORE UPDATE ON arquivos_digitais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar tabelas criadas
SELECT 
  'Tabelas disponíveis:' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('beneficiarios', 'observacoes', 'frequencias', 'locais_servico', 'armamentos', 'documentos_pdf', 'user_profiles', 'user_roles', 'arquivos_digitais')
ORDER BY table_name;
