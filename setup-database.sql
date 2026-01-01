-- =====================================================
-- BEATLIFE CONTENT STUDIO - SETUP DATABASE
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. TABELA EMPRESAS
CREATE TABLE IF NOT EXISTS empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA PLANEJAMENTO DE CONTEÚDOS
CREATE TABLE IF NOT EXISTS planejamento_conteudos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'carrossel',
    status VARCHAR(50) DEFAULT 'planejado',
    data_publicacao DATE,
    ordem INTEGER DEFAULT 0,
    slides JSONB DEFAULT '[]',
    prompts_imagem JSONB DEFAULT '[]',
    prompts_video JSONB DEFAULT '[]',
    legenda TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA CONTEÚDOS PRONTOS (BIBLIOTECA)
CREATE TABLE IF NOT EXISTS conteudos_prontos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'carrossel',
    data_publicacao DATE,
    thumbnail_url TEXT,
    midia_urls JSONB DEFAULT '[]',
    legenda TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DEMANDAS (KANBAN)
CREATE TABLE IF NOT EXISTS demandas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) DEFAULT 'backlog',
    prioridade VARCHAR(50) DEFAULT 'normal',
    solicitante VARCHAR(255),
    data_limite DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA ANOTAÇÕES
CREATE TABLE IF NOT EXISTS anotacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    texto TEXT,
    categoria VARCHAR(50) DEFAULT 'geral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA BRIEFINGS
CREATE TABLE IF NOT EXISTS briefings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    titulo_reuniao VARCHAR(255) NOT NULL,
    data_reuniao DATE,
    participantes JSONB DEFAULT '[]',
    pauta TEXT,
    resumo TEXT,
    proximos_passos TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INSERIR EMPRESA INICIAL
-- =====================================================
INSERT INTO empresas (nome, slug)
VALUES ('The Beat Life Club', 'beatlife')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudos_prontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE ACESSO (permitir acesso anônimo para demo)
-- =====================================================
CREATE POLICY "Permitir leitura pública" ON empresas FOR SELECT USING (true);
CREATE POLICY "Permitir tudo em empresas" ON empresas FOR ALL USING (true);

CREATE POLICY "Permitir tudo em planejamento" ON planejamento_conteudos FOR ALL USING (true);
CREATE POLICY "Permitir tudo em conteudos_prontos" ON conteudos_prontos FOR ALL USING (true);
CREATE POLICY "Permitir tudo em demandas" ON demandas FOR ALL USING (true);
CREATE POLICY "Permitir tudo em anotacoes" ON anotacoes FOR ALL USING (true);
CREATE POLICY "Permitir tudo em briefings" ON briefings FOR ALL USING (true);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_planejamento_empresa ON planejamento_conteudos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_ano_mes ON planejamento_conteudos(ano, mes);
CREATE INDEX IF NOT EXISTS idx_demandas_empresa ON demandas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_demandas_status ON demandas(status);
CREATE INDEX IF NOT EXISTS idx_anotacoes_empresa ON anotacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_briefings_empresa ON briefings(empresa_id);

-- =====================================================
-- PRONTO! Agora o app deve funcionar
-- =====================================================
