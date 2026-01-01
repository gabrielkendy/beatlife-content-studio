-- =====================================================
-- BEATLIFE CONTENT STUDIO - ADICIONAR COLUNA MARKDOWN
-- Execute no Supabase SQL Editor
-- =====================================================

-- Adicionar coluna para armazenar conteudo Markdown
ALTER TABLE conteudos_prontos
ADD COLUMN IF NOT EXISTS markdown_content TEXT;

-- Comentario explicativo
COMMENT ON COLUMN conteudos_prontos.markdown_content IS 'Conteudo Markdown para documentos .md';

-- Pronto!
SELECT 'Coluna markdown_content adicionada com sucesso!' as status;
