-- =====================================================
-- FIX: Permitir que qualquer usuário autenticado possa deletar qualquer beneficiário
-- =====================================================

-- Remover política restritiva de DELETE
DROP POLICY IF EXISTS "Users can delete only their own beneficiarios or admins can delete all" ON public.beneficiarios;
DROP POLICY IF EXISTS "Users can delete own beneficiarios or admins can delete all" ON public.beneficiarios;
DROP POLICY IF EXISTS "Gestores podem deletar beneficiários" ON public.beneficiarios;

-- Criar política permissiva: qualquer usuário autenticado pode deletar qualquer beneficiário
CREATE POLICY "Authenticated users can delete any beneficiario"
ON public.beneficiarios
FOR DELETE
TO authenticated
USING (true);

-- Também atualizar políticas de UPDATE para permitir edição de qualquer beneficiário
DROP POLICY IF EXISTS "Users can update only their own beneficiarios or admins can update all" ON public.beneficiarios;
DROP POLICY IF EXISTS "Users can update own beneficiarios or admins can update all" ON public.beneficiarios;

CREATE POLICY "Authenticated users can update any beneficiario"
ON public.beneficiarios
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Manter política de SELECT para que todos possam ler
DROP POLICY IF EXISTS "Users can read only their own beneficiarios or admins can read all" ON public.beneficiarios;
DROP POLICY IF EXISTS "Users can read own beneficiarios or admins can read all" ON public.beneficiarios;

CREATE POLICY "Authenticated users can read any beneficiario"
ON public.beneficiarios
FOR SELECT
TO authenticated
USING (true);

