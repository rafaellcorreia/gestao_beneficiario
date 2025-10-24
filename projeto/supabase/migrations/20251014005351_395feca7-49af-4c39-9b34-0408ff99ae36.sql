-- Fix RLS policies on armamentos table - handle truncated policy names
-- Drop all existing policies using their exact names

DROP POLICY IF EXISTS "Users can read armamentos for their beneficiarios or gestores c" ON armamentos;
DROP POLICY IF EXISTS "Gestores can insert armamentos for their beneficiarios" ON armamentos;
DROP POLICY IF EXISTS "Gestores can update armamentos for their beneficiarios" ON armamentos;
DROP POLICY IF EXISTS "Gestores can delete armamentos for their beneficiarios" ON armamentos;

-- SELECT: Users can read armamentos for their beneficiarios or gestores/admins can read all
CREATE POLICY "armamentos_select_policy"
ON armamentos
FOR SELECT
USING (
  has_min_role(auth.uid(), 'gestor'::user_role) OR
  EXISTS (
    SELECT 1 FROM beneficiarios
    WHERE beneficiarios.id = armamentos.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- INSERT: Gestores can insert armamentos for beneficiarios they own or admins for all
CREATE POLICY "armamentos_insert_policy"
ON armamentos
FOR INSERT
WITH CHECK (
  has_min_role(auth.uid(), 'gestor'::user_role) AND
  EXISTS (
    SELECT 1 FROM beneficiarios
    WHERE beneficiarios.id = beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- UPDATE: Gestores can update armamentos for beneficiarios they own or admins for all
CREATE POLICY "armamentos_update_policy"
ON armamentos
FOR UPDATE
USING (
  has_min_role(auth.uid(), 'gestor'::user_role) AND
  EXISTS (
    SELECT 1 FROM beneficiarios
    WHERE beneficiarios.id = armamentos.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
)
WITH CHECK (
  has_min_role(auth.uid(), 'gestor'::user_role) AND
  EXISTS (
    SELECT 1 FROM beneficiarios
    WHERE beneficiarios.id = beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- DELETE: Gestores can delete armamentos for beneficiarios they own or admins for all
CREATE POLICY "armamentos_delete_policy"
ON armamentos
FOR DELETE
USING (
  has_min_role(auth.uid(), 'gestor'::user_role) AND
  EXISTS (
    SELECT 1 FROM beneficiarios
    WHERE beneficiarios.id = armamentos.beneficiario_id
    AND (beneficiarios.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);