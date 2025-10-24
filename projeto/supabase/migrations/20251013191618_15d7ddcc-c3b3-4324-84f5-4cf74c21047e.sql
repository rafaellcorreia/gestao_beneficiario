-- =====================================================
-- FIX RLS: Add user_id to beneficiarios & update policies
-- =====================================================

-- 1. Add user_id column to track record ownership
ALTER TABLE beneficiarios
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX idx_beneficiarios_user_id ON beneficiarios(user_id);

-- 3. Drop existing RLS policies
DROP POLICY IF EXISTS "Usuários autenticados podem ler beneficiários" ON beneficiarios;
DROP POLICY IF EXISTS "Operadores podem inserir beneficiários" ON beneficiarios;
DROP POLICY IF EXISTS "Operadores podem atualizar beneficiários" ON beneficiarios;
DROP POLICY IF EXISTS "Gestores podem deletar beneficiários" ON beneficiarios;

-- 4. Create new ownership-based RLS policies

-- SELECT: Users can read their own records OR admins can read all
CREATE POLICY "Users can read own beneficiarios or admins can read all"
ON beneficiarios FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::user_role)
  OR public.has_min_role(auth.uid(), 'gestor'::user_role)
);

-- INSERT: Authenticated users can insert their own records
CREATE POLICY "Users can insert own beneficiarios"
ON beneficiarios FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: Users can update their own records OR admins/gestores can update all
CREATE POLICY "Users can update own beneficiarios or admins can update all"
ON beneficiarios FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::user_role)
  OR public.has_min_role(auth.uid(), 'gestor'::user_role)
);

-- DELETE: Users can delete their own records OR admins/gestores can delete all
CREATE POLICY "Users can delete own beneficiarios or admins can delete all"
ON beneficiarios FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::user_role)
  OR public.has_min_role(auth.uid(), 'gestor'::user_role)
);

-- 5. Add comment for documentation
COMMENT ON COLUMN beneficiarios.user_id IS 'References the user who owns this beneficiary record. Required for RLS ownership policies.';