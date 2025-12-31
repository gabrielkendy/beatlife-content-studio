-- =====================================================
-- BEATLIFE CONTENT STUDIO - DATABASE SCHEMA
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. TABELA EMPRESAS
CREATE TABLE IF NOT EXISTS empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    cores JSONB DEFAULT '{"primaria": "#0c1f32", "secundaria": "#cba052", "accent": "#0a3a1e"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA PLANEJAMENTO DE CONTEÚDOS
CREATE TABLE IF NOT EXISTS planejamento_conteudos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    data_publicacao DATE,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('carrossel', 'reels', 'static', 'stories')),
    badge VARCHAR(100),
    descricao TEXT,
    slides JSONB DEFAULT '[]',
    prompts_imagem JSONB DEFAULT '[]',
    prompts_video JSONB DEFAULT '[]',
    legenda TEXT,
    status VARCHAR(50) DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_producao', 'pronto', 'publicado')),
    ordem INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA CONTEÚDOS PRONTOS (BIBLIOTECA)
CREATE TABLE IF NOT EXISTS conteudos_prontos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('carrossel', 'reels', 'static', 'stories')),
    midia_urls JSONB DEFAULT '[]',
    thumbnail_url TEXT,
    legenda TEXT,
    data_publicacao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DEMANDAS
CREATE TABLE IF NOT EXISTS demandas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) DEFAULT 'backlog' CHECK (status IN ('backlog', 'em_andamento', 'revisao', 'concluido')),
    prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('urgente', 'alta', 'normal', 'baixa')),
    solicitante VARCHAR(255),
    data_limite DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA ANOTAÇÕES
CREATE TABLE IF NOT EXISTS anotacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    texto TEXT,
    categoria VARCHAR(50) DEFAULT 'geral' CHECK (categoria IN ('geral', 'estrategia', 'conteudo', 'cliente', 'tecnico')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA BRIEFINGS
CREATE TABLE IF NOT EXISTS briefings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo_reuniao VARCHAR(255) NOT NULL,
    resumo TEXT,
    participantes TEXT[],
    pauta TEXT,
    decisoes TEXT,
    proximos_passos TEXT,
    data_reuniao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_planejamento_empresa_mes ON planejamento_conteudos(empresa_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_conteudos_empresa ON conteudos_prontos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_demandas_empresa_status ON demandas(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_anotacoes_empresa ON anotacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_briefings_empresa ON briefings(empresa_id);

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS
DROP TRIGGER IF EXISTS update_planejamento_updated_at ON planejamento_conteudos;
CREATE TRIGGER update_planejamento_updated_at
    BEFORE UPDATE ON planejamento_conteudos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_demandas_updated_at ON demandas;
CREATE TRIGGER update_demandas_updated_at
    BEFORE UPDATE ON demandas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_anotacoes_updated_at ON anotacoes;
CREATE TRIGGER update_anotacoes_updated_at
    BEFORE UPDATE ON anotacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) - POLÍTICAS PÚBLICAS
-- Para permitir acesso via anon key
-- =====================================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudos_prontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (leitura pública)
CREATE POLICY "Permitir leitura pública" ON empresas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON planejamento_conteudos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON conteudos_prontos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON demandas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON anotacoes FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON briefings FOR SELECT USING (true);

-- Políticas de INSERT (escrita pública)
CREATE POLICY "Permitir inserção pública" ON empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserção pública" ON planejamento_conteudos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserção pública" ON conteudos_prontos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserção pública" ON demandas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserção pública" ON anotacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserção pública" ON briefings FOR INSERT WITH CHECK (true);

-- Políticas de UPDATE (atualização pública)
CREATE POLICY "Permitir atualização pública" ON empresas FOR UPDATE USING (true);
CREATE POLICY "Permitir atualização pública" ON planejamento_conteudos FOR UPDATE USING (true);
CREATE POLICY "Permitir atualização pública" ON conteudos_prontos FOR UPDATE USING (true);
CREATE POLICY "Permitir atualização pública" ON demandas FOR UPDATE USING (true);
CREATE POLICY "Permitir atualização pública" ON anotacoes FOR UPDATE USING (true);
CREATE POLICY "Permitir atualização pública" ON briefings FOR UPDATE USING (true);

-- Políticas de DELETE (exclusão pública)
CREATE POLICY "Permitir exclusão pública" ON empresas FOR DELETE USING (true);
CREATE POLICY "Permitir exclusão pública" ON planejamento_conteudos FOR DELETE USING (true);
CREATE POLICY "Permitir exclusão pública" ON conteudos_prontos FOR DELETE USING (true);
CREATE POLICY "Permitir exclusão pública" ON demandas FOR DELETE USING (true);
CREATE POLICY "Permitir exclusão pública" ON anotacoes FOR DELETE USING (true);
CREATE POLICY "Permitir exclusão pública" ON briefings FOR DELETE USING (true);

-- =====================================================
-- DADOS INICIAIS - BEAT LIFE CLUB
-- =====================================================
INSERT INTO empresas (nome, slug, logo_url, cores) VALUES (
    'The Beat Life Club',
    'beatlife',
    NULL,
    '{"primaria": "#0c1f32", "secundaria": "#cba052", "accent": "#0a3a1e", "branco": "#ffffff"}'
);

-- Pegar o ID da empresa inserida para os próximos inserts
DO $$
DECLARE
    empresa_id UUID;
BEGIN
    SELECT id INTO empresa_id FROM empresas WHERE slug = 'beatlife';
    
    -- Inserir conteúdo de exemplo (Geração Ozempic)
    INSERT INTO planejamento_conteudos (
        empresa_id, mes, ano, data_publicacao, titulo, tipo, badge, descricao,
        slides, prompts_imagem, prompts_video, legenda, status, ordem
    ) VALUES (
        empresa_id,
        1, -- Janeiro
        2025,
        '2025-01-15',
        'A Geração Ozempic',
        'carrossel',
        'Polêmico ★★★★★',
        'Riscos do uso indiscriminado de GLP-1s sem acompanhamento adequado',
        '[
            {"numero": 1, "tipo": "HOOK", "texto": "Você conhece alguém usando Ozempic?\n\nLeia isso antes de considerar."},
            {"numero": 2, "tipo": "CONTEXTO", "texto": "1 em cada 8 americanos já usou GLP-1s.\n\nNo Brasil, busca por Ozempic cresceu 300% em 2 anos.\n\nVirou solução mágica."},
            {"numero": 3, "tipo": "REVELAÇÃO", "texto": "O que ninguém conta:\n\n25-39% do peso perdido vem de MÚSCULO.\n\nVocê não está só perdendo gordura.\nEstá perdendo o que te protege."},
            {"numero": 4, "tipo": "PROBLEMA", "texto": "80% voltam ao peso em 1 ano após parar.\n\nMas o músculo não volta na mesma velocidade.\n\nResultado: pior composição corporal que antes."},
            {"numero": 5, "tipo": "QUANDO FAZ SENTIDO", "texto": "Quando Ozempic FAZ sentido:\n\n• Diabetes tipo 2 diagnosticado\n• IMC acima de 35\n• Sob supervisão médica rigorosa\n• COM treino de força junto"},
            {"numero": 6, "tipo": "ALTERNATIVA", "texto": "A alternativa que funciona para sempre:\n\nTreino de força + Proteína adequada\n= Perda de gordura COM preservação muscular.\n\nSem efeito rebote. Sem dependência."},
            {"numero": 7, "tipo": "CTA", "texto": "Não existe atalho para saúde de verdade.\n\nExiste método.\n\n☆ THE BEAT LIFE CLUB"}
        ]'::jsonb,
        '[
            {"slide": 1, "label": "Hook", "prompt": "Extreme close-up of an Ozempic injection pen resting diagonally on a polished dark marble surface..."},
            {"slide": 2, "label": "Contexto", "prompt": "Cinematic wide shot of crowded urban street from elevated position..."}
        ]'::jsonb,
        '[
            {"slide": 5, "label": "Quando faz sentido", "prompt": "Premium private medical consultation room..."},
            {"slide": 6, "label": "Alternativa", "prompt": "Executive performing powerful deadlift in premium private gym..."},
            {"slide": 7, "label": "CTA / Logo", "prompt": "The Beat Life Club star logo formation and reveal..."}
        ]'::jsonb,
        'Você conhece alguém usando Ozempic?

Leia antes de considerar:

→ 25-39% do peso perdido vem de MÚSCULO
→ 80% voltam ao peso em 1 ano
→ Músculo perdido não volta na mesma velocidade

Quando FAZ sentido:
• Diabetes tipo 2 diagnosticado
• IMC acima de 35
• Com supervisão médica rigorosa
• COM treino de força junto

A alternativa que funciona para sempre:
Treino de força + Proteína adequada.

Não existe atalho.
Existe método.

#ozempic #glp1 #emagrecimento #perdadepeso #saude #fitness #musculo #treinodeforma #nutricao #longevidade #wellness #bemestar #executivo #performance #thebeatclub #thebeatlifeclub #belohorizonte #bhfitness',
        'planejado',
        1
    );
END $$;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
