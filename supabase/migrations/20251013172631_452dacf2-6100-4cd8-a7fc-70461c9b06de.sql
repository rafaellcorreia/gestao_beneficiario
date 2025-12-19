-- =====================================================
-- SECURITY FIX: Authentication & Role Architecture
-- =====================================================

-- 1. CREATE SEPARATE USER_ROLES TABLE (Security Best Practice)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Only admins can grant roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));


-- 2. MIGRATE EXISTING ROLES FROM user_profiles TO user_roles
-- =====================================================
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, role, id 
FROM public.user_profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;


-- 3. UPDATE SECURITY DEFINER FUNCTIONS TO USE user_roles TABLE
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _min_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        (role = 'admin') OR
        (_min_role = 'leitor') OR
        (role = 'gestor' AND _min_role IN ('gestor', 'operador', 'leitor')) OR
        (role = 'operador' AND _min_role IN ('operador', 'leitor'))
      )
  )
$$;


-- 4. FIX USER_PROFILES PUBLIC EXPOSURE
-- =====================================================
-- Remove dangerous public policy
DROP POLICY IF EXISTS "Todos podem ver perfis (para auditoria)" ON public.user_profiles;

-- Admin-only policy for viewing all profiles (audit purposes)
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));


-- 5. UPDATE handle_new_user TRIGGER TO ASSIGN DEFAULT ROLE
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.user_profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  
  -- Assign default 'leitor' role in user_roles table
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.id, 'leitor'::user_role, NEW.id);
  
  RETURN NEW;
END;
$$;


-- 6. ADD COMMENTS FOR SECURITY DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from profiles to prevent privilege escalation. Only admins can modify.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles without triggering RLS recursion.';
COMMENT ON FUNCTION public.has_min_role IS 'Security definer function to check minimum role level without triggering RLS recursion.';