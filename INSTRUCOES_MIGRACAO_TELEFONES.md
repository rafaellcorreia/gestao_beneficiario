# Instruções para Aplicar Migração de Telefones

## Problema
As colunas `telefone_principal` e `telefone_secundario` não existem na tabela `beneficiarios` no banco de dados do Supabase.

## Solução

### Opção 1: Aplicar migração via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Cole o seguinte SQL e execute:

```sql
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

-- Adicionar comentários nas colunas
COMMENT ON COLUMN public.beneficiarios.telefone_principal IS 'Telefone principal do beneficiário no formato (XX) XXXXX-XXXX';
COMMENT ON COLUMN public.beneficiarios.telefone_secundario IS 'Telefone secundário do beneficiário no formato (XX) XXXXX-XXXX';
```

5. Clique em **Run** para executar
6. Verifique se as mensagens de sucesso aparecem

### Opção 2: Aplicar migração via CLI do Supabase

Se você estiver usando o Supabase CLI localmente:

```bash
# Aplicar migrações pendentes
supabase db push

# Ou aplicar migração específica
supabase migration up
```

### Opção 3: Executar SQL diretamente

Se você tem acesso direto ao banco de dados PostgreSQL:

```sql
ALTER TABLE public.beneficiarios
ADD COLUMN IF NOT EXISTS telefone_principal TEXT,
ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;
```

## Verificação

Após aplicar a migração, verifique se as colunas foram criadas:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'beneficiarios' 
  AND column_name IN ('telefone_principal', 'telefone_secundario');
```

Você deve ver duas linhas retornadas, uma para cada coluna.

## Nota

O código foi atualizado para funcionar mesmo sem essas colunas (inserindo sem os campos de telefone), mas para usar a funcionalidade completa de telefones, você precisa aplicar a migração.

Após aplicar a migração, os campos de telefone serão salvos corretamente quando você cadastrar novos beneficiários.

