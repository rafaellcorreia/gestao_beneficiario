-- Fix beneficiarios table RLS policies
-- Remove gestor access to all records, keep only owner or admin

DROP POLICY IF EXISTS "Users can read own beneficiarios or admins can read all" ON public.beneficiarios;
DROP POLICY IF EXISTS "Users can update own beneficiarios or admins can update all" ON public.beneficiarios;
DROP POLICY IF EXISTS "Users can delete own beneficiarios or admins can delete all" ON public.beneficiarios;

-- Create new restrictive policies for beneficiarios
CREATE POLICY "Users can read only their own beneficiarios or admins can read all"
ON public.beneficiarios
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Users can update only their own beneficiarios or admins can update all"
ON public.beneficiarios
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Users can delete only their own beneficiarios or admins can delete all"
ON public.beneficiarios
FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Fix frequencias table RLS policies
-- Restrict access to only frequencias linked to user's own beneficiarios

DROP POLICY IF EXISTS "Usuários autenticados podem ler frequências" ON public.frequencias;
DROP POLICY IF EXISTS "Operadores podem inserir frequências" ON public.frequencias;
DROP POLICY IF EXISTS "Operadores podem atualizar frequências" ON public.frequencias;
DROP POLICY IF EXISTS "Gestores podem deletar frequências" ON public.frequencias;

-- Create new restrictive policies for frequencias
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

-- Add comments to document the security model
COMMENT ON TABLE public.beneficiarios IS 'Beneficiary records with RLS - users can only access their own records unless they have admin role';
COMMENT ON TABLE public.frequencias IS 'Attendance records with RLS - users can only access frequencias linked to their own beneficiarios unless they have admin role';