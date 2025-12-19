-- Fix foreign key constraint on beneficiarios.user_id
-- Should reference user_profiles(id) instead of auth.users(id)

-- Drop the incorrect FK constraint if it exists
ALTER TABLE beneficiarios
DROP CONSTRAINT IF EXISTS fk_beneficiarios_user;

-- Verify no NULL user_id values exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM beneficiarios WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Found NULL user_id values in beneficiarios table. Please assign valid user_id values before proceeding.';
  END IF;
END $$;

-- Ensure user_id is NOT NULL
ALTER TABLE beneficiarios
  ALTER COLUMN user_id SET NOT NULL;

-- Add correct FK constraint to user_profiles(id)
ALTER TABLE beneficiarios
  ADD CONSTRAINT fk_beneficiarios_user_profiles 
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(id) 
  ON DELETE CASCADE;