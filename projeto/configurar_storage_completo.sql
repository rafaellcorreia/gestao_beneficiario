-- =====================================================
-- SCRIPT COMPLETO PARA CONFIGURAR STORAGE
-- Execute este script no painel do Supabase SQL Editor
-- =====================================================

-- 1. Criar buckets de storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('beneficiarios-fotos', 'beneficiarios-fotos', false),
  ('beneficiarios-documentos', 'beneficiarios-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Remover políticas de storage existentes (para evitar conflitos)
DROP POLICY IF EXISTS "Upload fotos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar fotos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Upload documentos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar documentos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver fotos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver documentos" ON storage.objects;

-- 3. Criar políticas de storage para fotos
CREATE POLICY "Upload fotos beneficiarios"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficiarios-fotos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Visualizar fotos beneficiarios"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Atualizar fotos beneficiarios"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'beneficiarios-fotos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Deletar fotos beneficiarios"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficiarios-fotos' 
  AND auth.uid() IS NOT NULL
);

-- 4. Criar políticas de storage para documentos
CREATE POLICY "Upload documentos beneficiarios"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficiarios-documentos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Visualizar documentos beneficiarios"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Atualizar documentos beneficiarios"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'beneficiarios-documentos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Deletar documentos beneficiarios"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficiarios-documentos'
  AND auth.uid() IS NOT NULL
);

-- 5. Verificar buckets criados
SELECT 
  'Buckets criados:' as info,
  id as bucket_name,
  name as display_name,
  public as is_public,
  created_at
FROM storage.buckets
WHERE id IN ('beneficiarios-fotos', 'beneficiarios-documentos')
ORDER BY created_at;

-- 6. Verificar políticas criadas
SELECT 
  'Políticas de storage criadas:' as info,
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%beneficiarios%'
ORDER BY policyname;

