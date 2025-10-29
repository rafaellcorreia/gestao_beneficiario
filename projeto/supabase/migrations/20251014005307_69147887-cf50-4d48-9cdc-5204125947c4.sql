-- Fix RLS policies on armamentos table
-- Restrict access to users who own the linked beneficiario or have gestor/admin roles

-- Drop existing overpermissive policies
DROP POLICY IF EXISTS "Usuários autenticados podem ler armamentos" ON armamentos;
DROP POLICY IF EXISTS "Gestores podem inserir armamentos" ON armamentos;
DROP POLICY IF EXISTS "Gestores podem atualizar armamentos" ON armamentos;
DROP POLICY IF EXISTS "Gestores podem deletar armamentos" ON armamentos;

-- SELECT: Users can read armamentos for their beneficiarios or gestores/admins can read all
CREATE POLICY "Users can read armamentos for their beneficiarios or gestores can read all"
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
CREATE POLICY "Gestores can insert armamentos for their beneficiarios"
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
CREATE POLICY "Gestores can update armamentos for their beneficiarios"
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
CREATE POLICY "Gestores can delete armamentos for their beneficiarios"
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