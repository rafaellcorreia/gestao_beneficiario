-- =====================================================
-- MIGRAÇÃO: FUNCIONÁRIOS → BENEFICIÁRIOS
-- Sistema de Controle dos Beneficiários
-- =====================================================

-- 1. Renomear tabelas (manter compatibilidade)
ALTER TABLE funcionarios RENAME TO beneficiarios;
ALTER TABLE frequencias RENAME COLUMN funcionario_id TO beneficiario_id;
ALTER TABLE observacoes RENAME COLUMN funcionario_id TO beneficiario_id;

-- 2. Adicionar novos campos aos beneficiários
ALTER TABLE beneficiarios
ADD COLUMN local_servico TEXT,
ADD COLUMN atributos JSONB DEFAULT '{}'::jsonb,
ADD COLUMN slogan_nucleo TEXT;

-- 3. Atualizar enum de status (adicionar novos status)
ALTER TABLE beneficiarios
DROP CONSTRAINT IF EXISTS beneficiarios_status_vida_check;

ALTER TABLE beneficiarios
ADD CONSTRAINT beneficiarios_status_vida_check 
CHECK (status_vida IN ('Vivo', 'Morto', 'Preso', 'Enfermo', 'Licença Maternidade', 'Devolvido', 'Concludente', 'Aguardando Sentença'));

-- 4. Criar tabela de locais de serviço
CREATE TABLE IF NOT EXISTS locais_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  endereco TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE locais_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ler locais de serviço"
ON locais_servico FOR SELECT
USING (true);

CREATE POLICY "Autenticados podem inserir locais"
ON locais_servico FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Criar tabela de armamentos
CREATE TABLE IF NOT EXISTS armamentos (
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

ALTER TABLE armamentos ENABLE ROW LEVEL SECURITY;

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

-- 6. Adicionar campo de múltiplos anexos em frequências
ALTER TABLE frequencias
ADD COLUMN anexos JSONB DEFAULT '[]'::jsonb;

-- 7. Criar enum de perfis de usuário
CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'operador', 'leitor');

-- 8. Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  role user_role DEFAULT 'leitor',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Todos podem ver perfis (para auditoria)"
ON user_profiles FOR SELECT
USING (true);

-- 9. Criar função para verificar role do usuário (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- 10. Criar função para verificar se usuário tem permissão mínima
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = _user_id
      AND (
        (role = 'admin') OR
        (_min_role = 'leitor') OR
        (role = 'gestor' AND _min_role IN ('gestor', 'operador', 'leitor')) OR
        (role = 'operador' AND _min_role IN ('operador', 'leitor'))
      )
  )
$$;

-- 11. Criar trigger para auto-criar perfil ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    'leitor'::user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Criar trigger para atualizar updated_at em locais_servico
CREATE TRIGGER update_locais_servico_updated_at
  BEFORE UPDATE ON locais_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Criar trigger para atualizar updated_at em armamentos
CREATE TRIGGER update_armamentos_updated_at
  BEFORE UPDATE ON armamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Criar trigger para atualizar updated_at em user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Atualizar RLS policies dos beneficiários (manter permissivo temporariamente)
-- Nota: Após implementar auth, atualizar para verificar roles

-- 16. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_beneficiarios_status ON beneficiarios(status_vida);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_local_servico ON beneficiarios(local_servico);
CREATE INDEX IF NOT EXISTS idx_frequencias_beneficiario ON frequencias(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_observacoes_beneficiario ON observacoes(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_armamentos_beneficiario ON armamentos(beneficiario_id);

-- 17. Criar storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('beneficiarios-fotos', 'beneficiarios-fotos', false),
  ('frequencias-anexos', 'frequencias-anexos', false),
  ('armamentos-docs', 'armamentos-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 18. Criar políticas de storage
CREATE POLICY "Autenticados podem fazer upload de fotos de beneficiários"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficiarios-fotos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver fotos de beneficiários"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Autenticados podem fazer upload de anexos de frequências"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'frequencias-anexos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver anexos de frequências"
ON storage.objects FOR SELECT
USING (bucket_id = 'frequencias-anexos');

CREATE POLICY "Autenticados podem fazer upload de docs de armamentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'armamentos-docs'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Todos podem ver docs de armamentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'armamentos-docs');

-- 19. Inserir alguns locais de serviço padrão
INSERT INTO locais_servico (nome, endereco) VALUES
  ('Sede Principal', 'A definir'),
  ('Posto 1', 'A definir'),
  ('Posto 2', 'A definir')
ON CONFLICT (nome) DO NOTHING;