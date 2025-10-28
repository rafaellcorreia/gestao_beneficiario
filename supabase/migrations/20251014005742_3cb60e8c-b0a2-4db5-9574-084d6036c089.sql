-- Check for armamentos without valid beneficiario_id
-- This will fail if there are orphaned records, protecting data integrity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM armamentos WHERE beneficiario_id IS NULL) THEN
    RAISE EXCEPTION 'Found armamentos records with NULL beneficiario_id. Please fix data before adding constraint.';
  END IF;
END $$;

-- Add foreign key constraint to armamentos table
ALTER TABLE armamentos
  ADD CONSTRAINT fk_armamentos_beneficiarios 
  FOREIGN KEY (beneficiario_id)
  REFERENCES beneficiarios(id) 
  ON DELETE CASCADE;