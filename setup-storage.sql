-- =====================================================
-- BEATLIFE CONTENT STUDIO - CONFIGURAR STORAGE
-- Execute no Supabase SQL Editor para habilitar uploads
-- =====================================================

-- 1. CRIAR BUCKET DE MÍDIA
-- Vá em Storage > New Bucket e crie:
-- Nome: media
-- Public: SIM (marcar como público)

-- 2. OU EXECUTE ESTE SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

-- 3. POLÍTICAS DE ACESSO AO STORAGE
-- Permitir leitura pública
CREATE POLICY "Permitir leitura pública de mídia"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Permitir upload para todos (demo - em produção use auth.uid())
CREATE POLICY "Permitir upload de mídia"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media');

-- Permitir atualização
CREATE POLICY "Permitir atualização de mídia"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media');

-- Permitir exclusão
CREATE POLICY "Permitir exclusão de mídia"
ON storage.objects FOR DELETE
USING (bucket_id = 'media');

-- =====================================================
-- PRONTO! Agora o upload deve funcionar
-- =====================================================
