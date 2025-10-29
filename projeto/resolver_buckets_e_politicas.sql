-- =====================================================
-- SCRIPT PARA RESOLVER BUCKETS E POLÍTICAS DE STORAGE
-- Execute este script no painel do Supabase SQL Editor
-- =====================================================

-- 1. Criar buckets de storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('beneficiarios-fotos', 'beneficiarios-fotos', true),
  ('beneficiarios-documentos', 'beneficiarios-documentos', true)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  updated_at = now();

-- 2. Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Upload fotos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar fotos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar fotos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Deletar fotos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Upload documentos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar documentos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar documentos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Deletar documentos beneficiarios" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver fotos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver documentos" ON storage.objects;

-- 3. Criar políticas permissivas para fotos (públicas)
CREATE POLICY "Fotos beneficiarios - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Fotos beneficiarios - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Fotos beneficiarios - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'beneficiarios-fotos');

CREATE POLICY "Fotos beneficiarios - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'beneficiarios-fotos');

-- 4. Criar políticas permissivas para documentos (públicos)
CREATE POLICY "Documentos beneficiarios - INSERT"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Documentos beneficiarios - SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Documentos beneficiarios - UPDATE"
ON storage.objects FOR UPDATE
USING (bucket_id = 'beneficiarios-documentos');

CREATE POLICY "Documentos beneficiarios - DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'beneficiarios-documentos');

-- 5. Verificar buckets criados
SELECT 
  'Buckets configurados:' as info,
  id as bucket_name,
  name as display_name,
  public as is_public,
  created_at
FROM storage.buckets
WHERE id IN ('beneficiarios-fotos', 'beneficiarios-documentos')
ORDER BY created_at;

-- 6. Verificar políticas criadas
SELECT 
  'Políticas de storage:' as info,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname LIKE '%beneficiarios%' OR policyname LIKE '%Fotos%' OR policyname LIKE '%Documentos%')
ORDER BY policyname;

