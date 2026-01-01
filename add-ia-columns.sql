-- =====================================================
-- BEATLIFE CONTENT STUDIO v5.0 - COLUNAS ASSISTENTE IA
-- Execute no Supabase SQL Editor
-- =====================================================

-- Adicionar coluna para identificar origem da demanda
ALTER TABLE demandas
ADD COLUMN IF NOT EXISTS criado_via VARCHAR(20) DEFAULT 'manual';

-- Adicionar coluna para armazenar briefing da IA
ALTER TABLE demandas
ADD COLUMN IF NOT EXISTS briefing_ia JSONB;

-- Comentarios explicativos
COMMENT ON COLUMN demandas.criado_via IS 'Origem da demanda: manual ou ia';
COMMENT ON COLUMN demandas.briefing_ia IS 'Dados do briefing gerado pelo Assistente IA';

-- Pronto!
SELECT 'Colunas do Assistente IA adicionadas com sucesso!' as status;
