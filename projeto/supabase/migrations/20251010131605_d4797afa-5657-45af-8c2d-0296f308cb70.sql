-- Criar tabela de funcionários
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  rg TEXT,
  telefone1 TEXT NOT NULL,
  telefone2 TEXT,
  foto_url TEXT NOT NULL,
  numero_processo TEXT NOT NULL,
  data_recebimento DATE NOT NULL,
  status_vida TEXT NOT NULL CHECK (status_vida IN ('Vivo', 'Morto', 'Preso', 'Enfermo')),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por TEXT,
  atualizado_por TEXT
);

-- Criar tabela de frequências
CREATE TABLE IF NOT EXISTS public.frequencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario TEXT
);

-- Criar tabela de observações
CREATE TABLE IF NOT EXISTS public.observacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  texto TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS temporárias (permitir tudo para desenvolvimento)
-- Em produção, adicionar autenticação e políticas mais restritivas
CREATE POLICY "Permitir leitura de funcionários" 
  ON public.funcionarios FOR SELECT 
  USING (true);

CREATE POLICY "Permitir inserção de funcionários" 
  ON public.funcionarios FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de funcionários" 
  ON public.funcionarios FOR UPDATE 
  USING (true);

CREATE POLICY "Permitir exclusão de funcionários" 
  ON public.funcionarios FOR DELETE 
  USING (true);

CREATE POLICY "Permitir leitura de frequências" 
  ON public.frequencias FOR SELECT 
  USING (true);

CREATE POLICY "Permitir inserção de frequências" 
  ON public.frequencias FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de observações" 
  ON public.observacoes FOR SELECT 
  USING (true);

CREATE POLICY "Permitir inserção de observações" 
  ON public.observacoes FOR INSERT 
  WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_funcionarios_cpf ON public.funcionarios(cpf);
CREATE INDEX idx_funcionarios_numero_processo ON public.funcionarios(numero_processo);
CREATE INDEX idx_funcionarios_data_recebimento ON public.funcionarios(data_recebimento);
CREATE INDEX idx_frequencias_funcionario_id ON public.frequencias(funcionario_id);
CREATE INDEX idx_frequencias_timestamp ON public.frequencias(timestamp);
CREATE INDEX idx_observacoes_funcionario_id ON public.observacoes(funcionario_id);

-- Função para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para atualizar automaticamente o campo atualizado_em
CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();