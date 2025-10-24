-- Security fixes for beneficiarios and observacoes tables
-- Issue #1: Fix NULL user_id in beneficiarios
-- Issue #2: Fix overpermissive observacoes RLS policies

-- ========================================
-- PART 1: FIX BENEFICIARIOS TABLE
-- ========================================

-- First, check if there are any NULL user_id records and handle them
-- We'll assign them to the first admin user found, or fail if no admin exists
DO $$
DECLARE
  first_admin_id uuid;
  null_count integer;
BEGIN
  -- Count NULL user_id records
  SELECT COUNT(*) INTO null_count 
  FROM beneficiarios 
  WHERE user_id IS NULL;
  
  IF null_count > 0 THEN
    -- Find first admin user
    SELECT user_id INTO first_admin_id
    FROM user_roles
    WHERE role = 'admin'::user_role
    LIMIT 1;
    
    IF first_admin_id IS NULL THEN
      RAISE EXCEPTION 'Cannot fix NULL user_id records: No admin user found in system. Please create an admin user first.';
    END IF;
    
    -- Assign NULL records to first admin
    UPDATE beneficiarios
    SET user_id = first_admin_id,
        atualizado_por = 'Sistema - Correção de Segurança'
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Fixed % beneficiario records with NULL user_id, assigned to admin %', null_count, first_admin_id;
  ELSE
    RAISE NOTICE 'No NULL user_id records found - proceeding with constraint changes';
  END IF;
END $$;

-- Make user_id NOT NULL
ALTER TABLE beneficiarios 
  ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to auth.users (not profiles!)
-- This ensures referential integrity and cascade deletes
ALTER TABLE beneficiarios
  ADD CONSTRAINT fk_beneficiarios_user 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

COMMENT ON COLUMN beneficiarios.user_id IS 'Owner of this beneficiario record - NOT NULL, references auth.users with cascade delete';

-- ========================================
-- PART 2: FIX OBSERVACOES RLS POLICIES
-- ========================================

-- Drop the overpermissive existing policies
DROP POLICY IF EXISTS "Usuários autenticados podem ler observações" ON public.observacoes;
DROP POLICY IF EXISTS "Operadores podem inserir observações" ON public.observacoes;
DROP POLICY IF EXISTS "Operadores podem atualizar observações" ON public.observacoes;
DROP POLICY IF EXISTS "Gestores podem deletar observações" ON public.observacoes;

-- Create new restrictive policies that check beneficiario ownership
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

-- Add documentation
COMMENT ON TABLE public.observacoes IS 'Observation records with RLS - users can only access observations for beneficiarios they own, unless they are admin';

-- ========================================
-- VERIFICATION QUERIES (for logging)
-- ========================================

-- Log final state
DO $$
DECLARE
  null_count integer;
  policy_count integer;
BEGIN
  -- Verify no NULL user_id remains
  SELECT COUNT(*) INTO null_count 
  FROM beneficiarios 
  WHERE user_id IS NULL;
  
  -- Count observacoes policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'observacoes';
  
  RAISE NOTICE 'VERIFICATION: beneficiarios with NULL user_id = %, observacoes policies = %', null_count, policy_count;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'FAILED: Still have % records with NULL user_id', null_count;
  END IF;
END $$;