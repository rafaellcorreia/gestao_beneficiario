-- =====================================================
-- SCRIPT COMPLETO PARA CRIAR TODAS AS TABELAS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. CRIAR TABELA BENEFICIARIOS (se não existir)
CREATE TABLE IF NOT EXISTS public.beneficiarios (
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

-- 2. CRIAR TABELA OBSERVAÇÕES (se não existir)
CREATE TABLE IF NOT EXISTS public.observacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  texto TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  editavel BOOLEAN DEFAULT true,
  anexo_url TEXT
);

-- 3. CRIAR TABELA FREQUÊNCIAS (se não existir)
CREATE TABLE IF NOT EXISTS public.frequencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario TEXT,
  anexos JSONB DEFAULT '[]'::jsonb
);

-- 4. CRIAR TABELA LOCAIS DE SERVIÇO (se não existir)
CREATE TABLE IF NOT EXISTS public.locais_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  endereco TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CRIAR TABELA ARMAMENTOS (se não existir)
CREATE TABLE IF NOT EXISTS public.armamentos (
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

-- 6. CRIAR TABELA DOCUMENTOS PDF (se não existir)
CREATE TABLE IF NOT EXISTS public.documentos_pdf (
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

-- 7. CRIAR ENUM DE ROLES (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'operador', 'leitor');
    END IF;
END $$;

-- 8. CRIAR TABELA USER_PROFILES (se não existir)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  role user_role DEFAULT 'leitor',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. CRIAR TABELA USER_ROLES (se não existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

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

-- Criar função has_role (se não existir)
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

-- Criar função has_min_role (se não existir)
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
-- CRIAR POLÍTICAS RLS PARA BENEFICIARIOS
-- =====================================================

-- Políticas para beneficiarios (se não existirem)
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

-- =====================================================
-- CRIAR POLÍTICAS RLS PARA OBSERVAÇÕES
-- =====================================================

CREATE POLICY "Users can read observacoes for their beneficiarios or admins can read all"
ON public.observacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = observacoes.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Operadores can insert observacoes for their beneficiarios"
ON public.observacoes
FOR INSERT
WITH CHECK (
  has_min_role(auth.uid(), 'operador'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = observacoes.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Operadores can update observacoes for their beneficiarios"
ON public.observacoes
FOR UPDATE
USING (
  has_min_role(auth.uid(), 'operador'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = observacoes.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Gestores can delete observacoes for their beneficiarios"
ON public.observacoes
FOR DELETE
USING (
  has_min_role(auth.uid(), 'gestor'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = observacoes.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- =====================================================
-- CRIAR POLÍTICAS RLS PARA FREQUÊNCIAS
-- =====================================================

CREATE POLICY "Users can read only frequencias for their own beneficiarios or admins can read all"
ON public.frequencias
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = frequencias.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Operadores can insert frequencias only for beneficiarios they own"
ON public.frequencias
FOR INSERT
WITH CHECK (
  has_min_role(auth.uid(), 'operador'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = frequencias.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Operadores can update frequencias only for beneficiarios they own"
ON public.frequencias
FOR UPDATE
USING (
  has_min_role(auth.uid(), 'operador'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = frequencias.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Gestores can delete frequencias only for beneficiarios they own"
ON public.frequencias
FOR DELETE
USING (
  has_min_role(auth.uid(), 'gestor'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.beneficiarios
    WHERE beneficiarios.id = frequencias.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- =====================================================
-- CRIAR POLÍTICAS RLS PARA OUTRAS TABELAS
-- =====================================================

-- Locais de serviço
CREATE POLICY "Todos podem ler locais de serviço"
ON locais_servico FOR SELECT
USING (true);

CREATE POLICY "Autenticados podem inserir locais"
ON locais_servico FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Armamentos
CREATE POLICY "Todos podem ler armamentos"
ON armamentos FOR SELECT
USING (true);

CREATE POLICY "Autenticados podem inserir armamentos"
ON armamentos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar armamentos"
ON armamentos FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar armamentos"
ON armamentos FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Documentos PDF
CREATE POLICY "Todos podem ler documentos PDF" ON documentos_pdf
    FOR SELECT USING (true);

CREATE POLICY "Autenticados podem inserir documentos PDF" ON documentos_pdf
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar documentos PDF" ON documentos_pdf
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem excluir documentos PDF" ON documentos_pdf
    FOR DELETE USING (auth.role() = 'authenticated');

-- User profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Todos podem ver perfis (para auditoria)"
ON user_profiles FOR SELECT
USING (true);

-- User roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- =====================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_beneficiarios_user_id ON beneficiarios(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_local_lotacao ON beneficiarios(local_lotacao);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_horas_restantes ON beneficiarios(horas_restantes);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_horas_cumpridas ON beneficiarios(horas_cumpridas);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_beneficiario_id ON documentos_pdf(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_tipo ON documentos_pdf(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_data_anexacao ON documentos_pdf(data_anexacao);

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
CREATE POLICY "Fotos beneficiarios - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Fotos beneficiarios - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Fotos beneficiarios - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Fotos beneficiarios - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'beneficiarios-fotos');

-- Políticas para documentos
CREATE POLICY "Documentos beneficiarios - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Documentos beneficiarios - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Documentos beneficiarios - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Documentos beneficiarios - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'beneficiarios-documentos');

-- =====================================================
-- CRIAR FUNÇÃO DE TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para updated_at
CREATE TRIGGER update_beneficiarios_updated_at
    BEFORE UPDATE ON beneficiarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_pdf_updated_at
    BEFORE UPDATE ON documentos_pdf
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observacoes_updated_at
    BEFORE UPDATE ON observacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'Todas as tabelas e políticas criadas com sucesso!' as status;

-- Verificar tabelas criadas
SELECT 
  'Tabelas criadas:' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('beneficiarios', 'observacoes', 'frequencias', 'locais_servico', 'armamentos', 'documentos_pdf', 'user_profiles', 'user_roles')
ORDER BY table_name;
