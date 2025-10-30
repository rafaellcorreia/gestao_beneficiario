-- =====================================================
-- MIGRATION: Create telefones table linked to beneficiarios
-- Includes enum, table, indexes, triggers, RLS and policies
-- =====================================================

-- 1) (Optional) Enum for phone type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_telefone') THEN
    CREATE TYPE tipo_telefone AS ENUM ('principal', 'secundario', 'outro');
  END IF;
END $$;

-- 2) Create telefones table
CREATE TABLE IF NOT EXISTS public.telefones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id uuid NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  tipo tipo_telefone NOT NULL DEFAULT 'outro',
  numero text NOT NULL,
  observacao text,
  principal boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_telefones_beneficiario_id ON public.telefones (beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_telefones_principal ON public.telefones (beneficiario_id, principal) WHERE principal = true;

-- 4) Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_telefones_updated_at ON public.telefones;
CREATE TRIGGER trg_telefones_updated_at
BEFORE UPDATE ON public.telefones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5) (Optional) Enforce single principal per beneficiario via trigger
CREATE OR REPLACE FUNCTION enforce_single_principal_telefone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.principal IS TRUE THEN
    UPDATE public.telefones
      SET principal = false
      WHERE beneficiario_id = NEW.beneficiario_id
        AND id <> COALESCE(NEW.id, gen_random_uuid())
        AND principal = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_telefones_single_principal ON public.telefones;
CREATE TRIGGER trg_telefones_single_principal
BEFORE INSERT OR UPDATE ON public.telefones
FOR EACH ROW EXECUTE FUNCTION enforce_single_principal_telefone();

-- 6) Enable RLS
ALTER TABLE public.telefones ENABLE ROW LEVEL SECURITY;

-- 7) RLS Policies (based on beneficiarios.user_id and existing role helpers)
DROP POLICY IF EXISTS "Users can read own telefones or admins can read all" ON public.telefones;
CREATE POLICY "Users can read own telefones or admins can read all"
ON public.telefones FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.beneficiarios b
    WHERE b.id = telefones.beneficiario_id
      AND (
        b.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR public.has_min_role(auth.uid(), 'gestor'::user_role)
      )
  )
);

DROP POLICY IF EXISTS "Users can insert own telefones" ON public.telefones;
CREATE POLICY "Users can insert own telefones"
ON public.telefones FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.beneficiarios b
    WHERE b.id = beneficiario_id
      AND b.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own telefones or admins can update all" ON public.telefones;
CREATE POLICY "Users can update own telefones or admins can update all"
ON public.telefones FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.beneficiarios b
    WHERE b.id = telefones.beneficiario_id
      AND (
        b.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR public.has_min_role(auth.uid(), 'gestor'::user_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.beneficiarios b
    WHERE b.id = beneficiario_id
      AND (
        b.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR public.has_min_role(auth.uid(), 'gestor'::user_role)
      )
  )
);

DROP POLICY IF EXISTS "Users can delete own telefones or admins can delete all" ON public.telefones;
CREATE POLICY "Users can delete own telefones or admins can delete all"
ON public.telefones FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.beneficiarios b
    WHERE b.id = telefones.beneficiario_id
      AND (
        b.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR public.has_min_role(auth.uid(), 'gestor'::user_role)
      )
  )
);

-- 8) Final check
SELECT 'telefones migration applied' AS status;


