/* =====================================================
   BEATLIFE CONTENT STUDIO - APP.JS v3.1
   REVISÃO: Melhorias de UX, Loading States e Cache
   ===================================================== */

// =====================================================
// INICIALIZAÇÃO SUPABASE
// =====================================================
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// =====================================================
// LOADING STATES E UX
// =====================================================
function showLoading(container, message = 'Carregando...') {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function showSkeleton(container, count = 3) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.innerHTML = Array(count).fill().map(() => `
        <div class="skeleton-card">
            <div class="skeleton-line" style="width: 60%"></div>
            <div class="skeleton-line" style="width: 90%"></div>
            <div class="skeleton-line" style="width: 40%"></div>
        </div>
    `).join('');
}

// =====================================================
// CACHE LOCAL (LOCALSTORAGE)
// =====================================================
const CACHE_KEY = 'beatlife_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

function getCache(key) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const item = cache[key];
        if (item && Date.now() - item.timestamp < CACHE_EXPIRY) {
            return item.data;
        }
        return null;
    } catch {
        return null;
    }
}

function setCache(key, data) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        cache[key] = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Cache error:', e);
    }
}

function clearCache() {
    localStorage.removeItem(CACHE_KEY);
}

// =====================================================
// ESTADO GLOBAL
// =====================================================
let state = {
    empresa: null,
    anoAtual: new Date().getFullYear(),
    mesAtual: new Date().getMonth() + 1,
    mesSelecionado: null,
    filtroStatus: 'todos',
    planejamento: [],
    conteudosProntos: [],
    demandas: [],
    anotacoes: [],
    briefings: []
};

// =====================================================
// CONSTANTES
// =====================================================
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TIPOS_ICONE = {
    'carrossel': '📸',
    'reels': '🎬',
    'static': '🖼️',
    'stories': '📱'
};

const STATUS_CONFIG = {
    'planejado': { label: 'Planejado', cor: '#3b82f6', icon: '📅' },
    'em_producao': { label: 'Em Produção', cor: '#f97316', icon: '🎬' },
    'pronto': { label: 'Pronto', cor: '#22c55e', icon: '✅' },
    'publicado': { label: 'Publicado', cor: '#cba052', icon: '📤' }
};

// =====================================================
// INICIALIZAÇÃO
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Content Studio v3.0 inicializando...');
    
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    
    await carregarEmpresa();
    setupNavegacao();
    setupPlanejamento();
    setupDemandas();
    setupAnotacoes();
    await carregarDados();
    
    console.log('✅ Content Studio pronto!');
});

// =====================================================
// CARREGAR EMPRESA
// =====================================================
async function carregarEmpresa() {
    try {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('slug', 'beatlife')
            .single();
        
        if (error) throw error;
        state.empresa = data;
        document.getElementById('empresaNome').textContent = data.nome;
        console.log('📍 Empresa:', data.nome);
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        showToast('Erro ao conectar com banco de dados', 'error');
    }
}

// =====================================================
// CARREGAR TODOS OS DADOS
// =====================================================
async function carregarDados() {
    if (!state.empresa) return;
    
    await Promise.all([
        carregarPlanejamento(),
        carregarDemandas(),
        carregarAnotacoes(),
        carregarBriefings()
    ]);
    
    atualizarDashboard();
    showToast('Dados carregados!', 'success');
}

async function carregarPlanejamento() {
    try {
        const { data, error } = await supabase
            .from('planejamento_conteudos')
            .select('*')
            .eq('empresa_id', state.empresa.id)
            .eq('ano', state.anoAtual)
            .order('mes').order('data_publicacao').order('ordem');
        
        if (error) throw error;
        state.planejamento = data || [];
        renderizarMeses();
        console.log('📅 Planejamento:', state.planejamento.length, 'conteúdos');
    } catch (error) {
        console.error('Erro ao carregar planejamento:', error);
    }
}

async function carregarDemandas() {
    try {
        const { data, error } = await supabase
            .from('demandas')
            .select('*')
            .eq('empresa_id', state.empresa.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        state.demandas = data || [];
        renderizarKanban();
    } catch (error) {
        console.error('Erro ao carregar demandas:', error);
    }
}

async function carregarAnotacoes() {
    try {
        const { data, error } = await supabase
            .from('anotacoes')
            .select('*')
            .eq('empresa_id', state.empresa.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        state.anotacoes = data || [];
        renderizarAnotacoes();
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function carregarBriefings() {
    try {
        const { data, error } = await supabase
            .from('briefings')
            .select('*')
            .eq('empresa_id', state.empresa.id)
            .order('data_reuniao', { ascending: false });
        
        if (error) throw error;
        state.briefings = data || [];
        renderizarBriefings();
    } catch (error) {
        console.error('Erro:', error);
    }
}


// =====================================================
// NAVEGAÇÃO ENTRE ABAS
// =====================================================
function setupNavegacao() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(`tab-${item.dataset.tab}`).classList.add('active');
            
            if (item.dataset.tab === 'planejamento') {
                document.getElementById('mesesGrid').classList.remove('hidden');
                document.getElementById('mesDetalhe').classList.add('hidden');
            }
        });
    });
}

// =====================================================
// SETUP PLANEJAMENTO
// =====================================================
function setupPlanejamento() {
    document.getElementById('btnPrevYear').addEventListener('click', () => {
        state.anoAtual--;
        document.getElementById('anoAtual').textContent = state.anoAtual;
        carregarPlanejamento();
    });
    
    document.getElementById('btnNextYear').addEventListener('click', () => {
        state.anoAtual++;
        document.getElementById('anoAtual').textContent = state.anoAtual;
        carregarPlanejamento();
    });
    
    document.getElementById('btnVoltarMeses').addEventListener('click', () => {
        document.getElementById('mesesGrid').classList.remove('hidden');
        document.getElementById('mesDetalhe').classList.add('hidden');
        state.mesSelecionado = null;
    });
    
    document.getElementById('btnNovoConteudo').addEventListener('click', abrirModalNovoConteudo);
}

// =====================================================
// RENDERIZAR GRID DE MESES
// =====================================================
function renderizarMeses() {
    const grid = document.getElementById('mesesGrid');
    grid.innerHTML = '';
    
    MESES.forEach((nomeMes, index) => {
        const mes = index + 1;
        const conteudosMes = state.planejamento.filter(c => c.mes === mes);
        
        const stats = {
            total: conteudosMes.length,
            planejado: conteudosMes.filter(c => c.status === 'planejado').length,
            producao: conteudosMes.filter(c => c.status === 'em_producao').length,
            pronto: conteudosMes.filter(c => c.status === 'pronto').length,
            publicado: conteudosMes.filter(c => c.status === 'publicado').length
        };
        
        const totalProgress = stats.total || 1;
        const isMesAtual = mes === state.mesAtual && state.anoAtual === new Date().getFullYear();
        
        const card = document.createElement('div');
        card.className = `mes-card${isMesAtual ? ' mes-atual' : ''}`;
        card.innerHTML = `
            <div class="mes-header">
                <span class="mes-nome">${nomeMes}</span>
                <span class="mes-total">${stats.total}</span>
            </div>
            <div class="mes-stats">
                <div class="mes-stat"><span class="mes-stat-label"><span class="mes-stat-dot planejado"></span>Planejados</span><span class="mes-stat-value">${stats.planejado}</span></div>
                <div class="mes-stat"><span class="mes-stat-label"><span class="mes-stat-dot producao"></span>Em Produção</span><span class="mes-stat-value">${stats.producao}</span></div>
                <div class="mes-stat"><span class="mes-stat-label"><span class="mes-stat-dot pronto"></span>Prontos</span><span class="mes-stat-value">${stats.pronto}</span></div>
                <div class="mes-stat"><span class="mes-stat-label"><span class="mes-stat-dot publicado"></span>Publicados</span><span class="mes-stat-value">${stats.publicado}</span></div>
            </div>
            <div class="mes-progress">
                <div class="mes-progress-segment publicado" style="width: ${(stats.publicado / totalProgress) * 100}%"></div>
                <div class="mes-progress-segment pronto" style="width: ${(stats.pronto / totalProgress) * 100}%"></div>
                <div class="mes-progress-segment producao" style="width: ${(stats.producao / totalProgress) * 100}%"></div>
                <div class="mes-progress-segment planejado" style="width: ${(stats.planejado / totalProgress) * 100}%"></div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            state.mesSelecionado = mes;
            state.filtroStatus = 'todos';
            mostrarDetalhesMes(mes, nomeMes);
        });
        
        grid.appendChild(card);
    });
}

// =====================================================
// MOSTRAR DETALHES DO MÊS
// =====================================================
function mostrarDetalhesMes(mes, nomeMes) {
    document.getElementById('mesesGrid').classList.add('hidden');
    document.getElementById('mesDetalhe').classList.remove('hidden');
    
    const conteudosMes = state.planejamento.filter(c => c.mes === mes);
    const stats = calcularStats(conteudosMes);
    
    document.getElementById('mesTitulo').textContent = `${nomeMes} ${state.anoAtual}`;
    document.getElementById('mesSubtitulo').textContent = `${stats.total} conteúdo${stats.total !== 1 ? 's' : ''} planejado${stats.total !== 1 ? 's' : ''}`;
    
    document.getElementById('mesDetalheStats').innerHTML = `
        <div class="mes-detalhe-stat"><span class="mes-detalhe-stat-value">${stats.planejado}</span><span class="mes-detalhe-stat-label">Planejados</span></div>
        <div class="mes-detalhe-stat"><span class="mes-detalhe-stat-value">${stats.producao}</span><span class="mes-detalhe-stat-label">Produção</span></div>
        <div class="mes-detalhe-stat"><span class="mes-detalhe-stat-value">${stats.pronto}</span><span class="mes-detalhe-stat-label">Prontos</span></div>
        <div class="mes-detalhe-stat"><span class="mes-detalhe-stat-value">${stats.publicado}</span><span class="mes-detalhe-stat-label">Publicados</span></div>
    `;
    
    renderizarFiltros(stats);
    renderizarConteudosMes();
}

function calcularStats(conteudos) {
    return {
        total: conteudos.length,
        planejado: conteudos.filter(c => c.status === 'planejado').length,
        producao: conteudos.filter(c => c.status === 'em_producao').length,
        pronto: conteudos.filter(c => c.status === 'pronto').length,
        publicado: conteudos.filter(c => c.status === 'publicado').length
    };
}

function renderizarFiltros(stats) {
    const container = document.getElementById('filtrosBar');
    container.innerHTML = `
        <button class="filtro-btn ${state.filtroStatus === 'todos' ? 'active' : ''}" data-status="todos">Todos <span class="filtro-count">${stats.total}</span></button>
        <button class="filtro-btn ${state.filtroStatus === 'planejado' ? 'active' : ''}" data-status="planejado">Planejados <span class="filtro-count">${stats.planejado}</span></button>
        <button class="filtro-btn ${state.filtroStatus === 'em_producao' ? 'active' : ''}" data-status="em_producao">Em Produção <span class="filtro-count">${stats.producao}</span></button>
        <button class="filtro-btn ${state.filtroStatus === 'pronto' ? 'active' : ''}" data-status="pronto">Prontos <span class="filtro-count">${stats.pronto}</span></button>
        <button class="filtro-btn ${state.filtroStatus === 'publicado' ? 'active' : ''}" data-status="publicado">Publicados <span class="filtro-count">${stats.publicado}</span></button>
    `;
    
    container.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.filtroStatus = btn.dataset.status;
            container.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarConteudosMes();
        });
    });
}

function renderizarConteudosMes() {
    const lista = document.getElementById('conteudosLista');
    let conteudos = state.planejamento.filter(c => c.mes === state.mesSelecionado);
    
    if (state.filtroStatus !== 'todos') {
        conteudos = conteudos.filter(c => c.status === state.filtroStatus);
    }
    
    if (conteudos.length === 0) {
        lista.innerHTML = '<p class="empty-state">Nenhum conteúdo encontrado para este filtro</p>';
        return;
    }
    
    lista.innerHTML = conteudos.map((c, idx) => `
        <div class="conteudo-card status-${c.status}" data-id="${c.id}">
            <div class="conteudo-num">${String(c.ordem || idx + 1).padStart(2, '0')}</div>
            <div class="conteudo-info">
                <div class="conteudo-titulo"><span class="conteudo-tipo-icon">${TIPOS_ICONE[c.tipo] || '📄'}</span>${c.titulo}</div>
                <div class="conteudo-meta">
                    <span class="conteudo-meta-item">📅 ${c.data_publicacao ? formatarData(c.data_publicacao) : 'Sem data'}</span>
                    <span class="conteudo-meta-item">${c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}</span>
                    ${c.badge ? `<span class="conteudo-meta-item">⭐ ${c.badge}</span>` : ''}
                </div>
            </div>
            <div class="conteudo-badge-container"><span class="conteudo-badge badge-${c.status}">${STATUS_CONFIG[c.status]?.label}</span></div>
            <div class="conteudo-actions">
                <button class="action-btn" onclick="event.stopPropagation(); abrirModalEditarConteudo('${c.id}')" title="Editar">✏️</button>
                <button class="action-btn delete" onclick="event.stopPropagation(); excluirConteudo('${c.id}')" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
    
    lista.querySelectorAll('.conteudo-card').forEach(card => {
        card.addEventListener('click', () => {
            const conteudo = state.planejamento.find(c => c.id === card.dataset.id);
            abrirModalVisualizacao(conteudo);
        });
    });
}


// =====================================================
// MODAL VISUALIZAÇÃO - ESTILO PREMIUM OZEMPIC
// =====================================================
function abrirModalVisualizacao(conteudo) {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    
    const slides = conteudo.slides || [];
    const promptsImagem = conteudo.prompts_imagem || [];
    const promptsVideo = conteudo.prompts_video || [];
    
    modalContent.className = 'modal modal-visualizacao';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="viz-header">
                <div class="viz-header-left">
                    <span class="viz-badge ${conteudo.status}">${STATUS_CONFIG[conteudo.status]?.icon} ${STATUS_CONFIG[conteudo.status]?.label}</span>
                    <h2 class="viz-title">${conteudo.titulo}</h2>
                    ${conteudo.descricao ? `<p class="viz-desc">${conteudo.descricao}</p>` : ''}
                    <div class="viz-meta">
                        <span class="viz-meta-item">${TIPOS_ICONE[conteudo.tipo] || '📄'} <strong>${conteudo.tipo.charAt(0).toUpperCase() + conteudo.tipo.slice(1)}</strong></span>
                        ${conteudo.data_publicacao ? `<span class="viz-meta-item">📅 <strong>${formatarData(conteudo.data_publicacao)}</strong></span>` : ''}
                        ${conteudo.badge ? `<span class="viz-meta-item">⭐ <strong>${conteudo.badge}</strong></span>` : ''}
                    </div>
                </div>
                <div class="viz-stats">
                    <div class="viz-stat"><span class="viz-stat-value">${slides.length}</span><span class="viz-stat-label">Slides</span></div>
                    <div class="viz-stat"><span class="viz-stat-value">${promptsImagem.length}</span><span class="viz-stat-label">Img</span></div>
                    <div class="viz-stat"><span class="viz-stat-value">${promptsVideo.length}</span><span class="viz-stat-label">Vid</span></div>
                </div>
            </div>
            <button class="modal-close" onclick="fecharModal()" style="background: rgba(255,255,255,0.1); color: white; position: absolute; top: 25px; right: 25px;">×</button>
        </div>
        
        <div class="modal-body">
            ${slides.length > 0 ? `
            <section class="viz-section">
                <div class="viz-section-header">
                    <div class="viz-section-icon slides">📝</div>
                    <h3 class="viz-section-title">Conteúdo dos Slides</h3>
                    <span class="viz-section-count">${slides.length} slide${slides.length > 1 ? 's' : ''}</span>
                </div>
                <div class="viz-slides-grid">
                    ${slides.map(s => `
                    <div class="viz-slide-card">
                        <div class="viz-slide-header">
                            <span class="viz-slide-number">${String(s.numero).padStart(2, '0')}</span>
                            <span class="viz-slide-tipo">${s.tipo}</span>
                        </div>
                        <div class="viz-slide-texto">${s.texto}</div>
                    </div>
                    `).join('')}
                </div>
            </section>
            ` : ''}
            
            ${promptsImagem.length > 0 ? `
            <section class="viz-section">
                <div class="viz-section-header">
                    <div class="viz-section-icon imagem">🎨</div>
                    <h3 class="viz-section-title">Prompts de Imagem</h3>
                    <span class="viz-section-count">${promptsImagem.length} prompt${promptsImagem.length > 1 ? 's' : ''}</span>
                </div>
                <div class="viz-prompts-grid">
                    ${promptsImagem.map(p => `
                    <div class="viz-prompt-card imagem">
                        <div class="viz-prompt-header">
                            <span class="viz-prompt-label">${p.label}</span>
                            <span class="viz-prompt-slide">Slide ${p.slide}</span>
                        </div>
                        <div class="viz-prompt-texto">${p.prompt}</div>
                    </div>
                    `).join('')}
                </div>
            </section>
            ` : ''}
            
            ${promptsVideo.length > 0 ? `
            <section class="viz-section">
                <div class="viz-section-header">
                    <div class="viz-section-icon video">🎬</div>
                    <h3 class="viz-section-title">Prompts de Vídeo</h3>
                    <span class="viz-section-count">${promptsVideo.length} prompt${promptsVideo.length > 1 ? 's' : ''}</span>
                </div>
                <div class="viz-prompts-grid">
                    ${promptsVideo.map(p => `
                    <div class="viz-prompt-card video">
                        <div class="viz-prompt-header">
                            <span class="viz-prompt-label">${p.label}</span>
                            <span class="viz-prompt-slide">Slide ${p.slide}</span>
                        </div>
                        <div class="viz-prompt-texto">${p.prompt}</div>
                    </div>
                    `).join('')}
                </div>
            </section>
            ` : ''}
            
            ${conteudo.legenda ? `
            <section class="viz-section">
                <div class="viz-section-header">
                    <div class="viz-section-icon legenda">📱</div>
                    <h3 class="viz-section-title">Legenda Instagram</h3>
                </div>
                <div class="viz-legenda-container">
                    <div class="viz-legenda-actions">
                        <button class="viz-legenda-btn" onclick="copiarLegenda('${conteudo.id}')">📋 Copiar</button>
                    </div>
                    <div class="viz-legenda-texto" id="legenda-${conteudo.id}">${conteudo.legenda}</div>
                </div>
            </section>
            ` : ''}
            
            ${slides.length === 0 && promptsImagem.length === 0 && promptsVideo.length === 0 && !conteudo.legenda ? `
            <div class="viz-empty"><p>Este conteúdo ainda não possui slides, prompts ou legenda.</p><p style="margin-top: 10px;">Clique em "Editar" para adicionar.</p></div>
            ` : ''}
        </div>
        
        <div class="modal-footer">
            <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
            <button class="btn-secondary" onclick="duplicarConteudo('${conteudo.id}')">📋 Duplicar</button>
            <button class="btn-secondary" onclick="alterarStatus('${conteudo.id}')">🔄 Status</button>
            <button class="btn-primary" onclick="abrirModalEditarConteudo('${conteudo.id}')">✏️ Editar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function alterarStatus(id) {
    const conteudo = state.planejamento.find(c => c.id === id);
    if (!conteudo) return;
    
    const statusOrder = ['planejado', 'em_producao', 'pronto', 'publicado'];
    const nextStatus = statusOrder[(statusOrder.indexOf(conteudo.status) + 1) % 4];
    
    try {
        await supabase.from('planejamento_conteudos').update({ status: nextStatus }).eq('id', id);
        conteudo.status = nextStatus;
        renderizarMeses();
        atualizarDashboard();
        if (state.mesSelecionado) {
            renderizarFiltros(calcularStats(state.planejamento.filter(c => c.mes === state.mesSelecionado)));
            renderizarConteudosMes();
        }
        abrirModalVisualizacao(conteudo);
        showToast(`Status: ${STATUS_CONFIG[nextStatus]?.label}`, 'success');
    } catch (error) {
        showToast('Erro ao alterar status', 'error');
    }
}

function copiarLegenda(id) {
    const el = document.getElementById(`legenda-${id}`);
    if (el) {
        navigator.clipboard.writeText(el.textContent).then(() => showToast('Legenda copiada!', 'success'));
    }
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalContent').className = 'modal';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });


// =====================================================
// DASHBOARD
// =====================================================
function atualizarDashboard() {
    const stats = {
        planejados: state.planejamento.filter(c => c.status === 'planejado').length,
        producao: state.planejamento.filter(c => c.status === 'em_producao').length,
        prontos: state.planejamento.filter(c => c.status === 'pronto').length,
        publicados: state.planejamento.filter(c => c.status === 'publicado').length
    };
    
    document.getElementById('statPlanejados').textContent = stats.planejados;
    document.getElementById('statProducao').textContent = stats.producao;
    document.getElementById('statProntos').textContent = stats.prontos;
    document.getElementById('statPublicados').textContent = stats.publicados;
    
    const pendentes = state.demandas.filter(d => d.status !== 'concluido').slice(0, 5);
    const demandasContainer = document.getElementById('demandasPendentes');
    demandasContainer.innerHTML = pendentes.length > 0 
        ? pendentes.map(d => `<div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--cinza-50); border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${d.prioridade === 'urgente' ? 'var(--vermelho)' : d.prioridade === 'alta' ? 'var(--laranja)' : 'var(--azul)'};">
            <span style="flex: 1; font-size: 14px; font-weight: 500;">${d.titulo}</span>
            <span style="font-size: 11px; padding: 3px 8px; background: var(--cinza-200); border-radius: 4px;">${d.status.replace('_', ' ')}</span>
        </div>`).join('')
        : '<p class="empty-state">Nenhuma demanda pendente 🎉</p>';
    
    const hoje = new Date().toISOString().split('T')[0];
    const proximos = state.planejamento
        .filter(c => c.data_publicacao && c.data_publicacao >= hoje && c.status !== 'publicado')
        .sort((a, b) => a.data_publicacao.localeCompare(b.data_publicacao))
        .slice(0, 5);
    
    const proximosContainer = document.getElementById('proximosConteudos');
    proximosContainer.innerHTML = proximos.length > 0
        ? proximos.map(c => `<div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--cinza-50); border-radius: 8px; margin-bottom: 10px;">
            <span style="font-size: 12px; color: var(--gold); font-weight: 600; min-width: 70px;">${formatarData(c.data_publicacao)}</span>
            <span style="flex: 1; font-size: 14px; font-weight: 500;">${c.titulo}</span>
            <span class="conteudo-badge badge-${c.status}" style="font-size: 10px; padding: 3px 8px;">${STATUS_CONFIG[c.status]?.label}</span>
        </div>`).join('')
        : '<p class="empty-state">Nenhum conteúdo agendado</p>';
}

// =====================================================
// MODAIS CRUD CONTEÚDO
// =====================================================
function abrirModalNovoConteudo() {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header"><h2>Novo Conteúdo</h2><button class="modal-close" onclick="fecharModal()">×</button></div>
        <div class="modal-body">
            <form id="formNovoConteudo">
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-input" name="titulo" required></div>
                    <div class="form-group"><label class="form-label">Tipo</label>
                        <select class="form-select" name="tipo"><option value="carrossel">📸 Carrossel</option><option value="reels">🎬 Reels</option><option value="static">🖼️ Static</option><option value="stories">📱 Stories</option></select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Data</label><input type="date" class="form-input" name="data_publicacao"></div>
                    <div class="form-group"><label class="form-label">Badge</label><input type="text" class="form-input" name="badge"></div>
                </div>
                <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-textarea" name="descricao" rows="2"></textarea></div>
                <div class="form-group"><label class="form-label">Legenda</label><textarea class="form-textarea" name="legenda" rows="4"></textarea></div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Status</label>
                        <select class="form-select" name="status"><option value="planejado">📅 Planejado</option><option value="em_producao">🎬 Em Produção</option><option value="pronto">✅ Pronto</option><option value="publicado">📤 Publicado</option></select>
                    </div>
                    <div class="form-group"><label class="form-label">Ordem</label><input type="number" class="form-input" name="ordem" min="1" value="${state.planejamento.filter(c => c.mes === state.mesSelecionado).length + 1}"></div>
                </div>
            </form>
        </div>
        <div class="modal-footer"><button class="btn-secondary" onclick="fecharModal()">Cancelar</button><button class="btn-primary" onclick="salvarNovoConteudo()">💾 Salvar</button></div>
    `;
    modal.classList.remove('hidden');
}

async function salvarNovoConteudo() {
    const form = document.getElementById('formNovoConteudo');
    const formData = new FormData(form);
    const titulo = formData.get('titulo');
    if (!titulo?.trim()) { showToast('Título obrigatório', 'error'); return; }
    
    const dados = {
        empresa_id: state.empresa.id, mes: state.mesSelecionado, ano: state.anoAtual,
        titulo: titulo.trim(), tipo: formData.get('tipo'),
        data_publicacao: formData.get('data_publicacao') || null,
        badge: formData.get('badge') || null, descricao: formData.get('descricao') || null,
        legenda: formData.get('legenda') || null, status: formData.get('status'),
        ordem: parseInt(formData.get('ordem')) || 1, slides: [], prompts_imagem: [], prompts_video: []
    };
    
    try {
        const { data, error } = await supabase.from('planejamento_conteudos').insert([dados]).select();
        if (error) throw error;
        state.planejamento.push(data[0]);
        renderizarMeses();
        renderizarFiltros(calcularStats(state.planejamento.filter(c => c.mes === state.mesSelecionado)));
        renderizarConteudosMes();
        fecharModal();
        showToast('Conteúdo criado!', 'success');
    } catch (error) { showToast('Erro ao salvar', 'error'); }
}

function abrirModalEditarConteudo(id) {
    // Usar o Editor Completo com tabs
    abrirEditorCompleto(id);
}

async function excluirConteudo(id) {
    if (!confirm('Excluir este conteúdo?')) return;
    try {
        await supabase.from('planejamento_conteudos').delete().eq('id', id);
        state.planejamento = state.planejamento.filter(c => c.id !== id);
        renderizarMeses();
        if (state.mesSelecionado) {
            renderizarFiltros(calcularStats(state.planejamento.filter(c => c.mes === state.mesSelecionado)));
            renderizarConteudosMes();
        }
        showToast('Excluído!', 'success');
    } catch (error) { showToast('Erro ao excluir', 'error'); }
}

async function duplicarConteudo(id) {
    const c = state.planejamento.find(x => x.id === id);
    if (!c) return;
    
    const dados = {
        empresa_id: state.empresa.id, mes: c.mes, ano: c.ano,
        titulo: `${c.titulo} (cópia)`, tipo: c.tipo, data_publicacao: null,
        badge: c.badge, descricao: c.descricao, legenda: c.legenda,
        status: 'planejado', ordem: state.planejamento.filter(x => x.mes === c.mes).length + 1,
        slides: c.slides || [], prompts_imagem: c.prompts_imagem || [], prompts_video: c.prompts_video || []
    };
    
    try {
        const { data, error } = await supabase.from('planejamento_conteudos').insert([dados]).select();
        if (error) throw error;
        state.planejamento.push(data[0]);
        renderizarMeses();
        if (state.mesSelecionado) {
            renderizarFiltros(calcularStats(state.planejamento.filter(x => x.mes === state.mesSelecionado)));
            renderizarConteudosMes();
        }
        fecharModal();
        showToast('Duplicado!', 'success');
    } catch (error) { showToast('Erro ao duplicar', 'error'); }
}


// =====================================================
// DEMANDAS - KANBAN
// =====================================================
function setupDemandas() {
    document.getElementById('btnNovaDemanda')?.addEventListener('click', abrirModalNovaDemanda);
}

function renderizarKanban() {
    ['backlog', 'em_andamento', 'revisao', 'concluido'].forEach(status => {
        const coluna = document.querySelector(`.kanban-column[data-status="${status}"]`);
        if (!coluna) return;
        
        const cardsContainer = coluna.querySelector('.column-cards');
        const demandas = state.demandas.filter(d => d.status === status);
        coluna.querySelector('.column-count').textContent = demandas.length;
        
        cardsContainer.innerHTML = demandas.length > 0 
            ? demandas.map(d => `
                <div class="demanda-card ${d.prioridade}" draggable="true" data-id="${d.id}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div class="demanda-titulo">${d.titulo}</div>
                        <span class="prioridade-tag ${d.prioridade}">${d.prioridade}</span>
                    </div>
                    ${d.descricao ? `<div class="demanda-desc">${d.descricao.substring(0, 100)}${d.descricao.length > 100 ? '...' : ''}</div>` : ''}
                    <div class="demanda-footer">
                        <span class="demanda-solicitante">👤 ${d.solicitante || 'N/A'}</span>
                        <span class="demanda-data">${d.data_limite ? '📅 ' + formatarData(d.data_limite) : ''}</span>
                    </div>
                </div>
            `).join('')
            : '<p class="empty-state" style="padding: 30px; font-size: 13px;">Arraste aqui</p>';
    });
    setupDragAndDrop();
}

function setupDragAndDrop() {
    document.querySelectorAll('.demanda-card').forEach(card => {
        card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', card.dataset.id); card.classList.add('dragging'); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('click', () => {
            const demanda = state.demandas.find(d => d.id === card.dataset.id);
            if (demanda) abrirModalEditarDemanda(demanda);
        });
    });
    
    document.querySelectorAll('.column-cards').forEach(column => {
        column.addEventListener('dragover', (e) => { e.preventDefault(); column.classList.add('drag-over'); });
        column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            const id = e.dataTransfer.getData('text/plain');
            const novoStatus = column.parentElement.dataset.status;
            await atualizarStatusDemanda(id, novoStatus);
        });
    });
}

async function atualizarStatusDemanda(id, novoStatus) {
    try {
        await supabase.from('demandas').update({ status: novoStatus }).eq('id', id);
        const d = state.demandas.find(x => x.id === id);
        if (d) d.status = novoStatus;
        renderizarKanban();
        atualizarDashboard();
        showToast('Status atualizado!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

function abrirModalNovaDemanda() {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header"><h2>Nova Demanda</h2><button class="modal-close" onclick="fecharModal()">×</button></div>
        <div class="modal-body">
            <form id="formNovaDemanda">
                <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-input" name="titulo" required></div>
                <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-textarea" name="descricao" rows="3"></textarea></div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Prioridade</label>
                        <select class="form-select" name="prioridade"><option value="normal">🔵 Normal</option><option value="baixa">⚪ Baixa</option><option value="alta">🟠 Alta</option><option value="urgente">🔴 Urgente</option></select>
                    </div>
                    <div class="form-group"><label class="form-label">Data Limite</label><input type="date" class="form-input" name="data_limite"></div>
                </div>
                <div class="form-group"><label class="form-label">Solicitante</label><input type="text" class="form-input" name="solicitante"></div>
            </form>
        </div>
        <div class="modal-footer"><button class="btn-secondary" onclick="fecharModal()">Cancelar</button><button class="btn-primary" onclick="salvarNovaDemanda()">💾 Salvar</button></div>
    `;
    modal.classList.remove('hidden');
}

async function salvarNovaDemanda() {
    const form = document.getElementById('formNovaDemanda');
    const formData = new FormData(form);
    const titulo = formData.get('titulo');
    if (!titulo?.trim()) { showToast('Título obrigatório', 'error'); return; }
    
    const dados = {
        empresa_id: state.empresa.id, titulo: titulo.trim(),
        descricao: formData.get('descricao') || null, prioridade: formData.get('prioridade'),
        data_limite: formData.get('data_limite') || null, solicitante: formData.get('solicitante') || null,
        status: 'backlog'
    };
    
    try {
        const { data, error } = await supabase.from('demandas').insert([dados]).select();
        if (error) throw error;
        state.demandas.unshift(data[0]);
        renderizarKanban();
        atualizarDashboard();
        fecharModal();
        showToast('Demanda criada!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

function abrirModalEditarDemanda(d) {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header"><h2>Editar Demanda</h2><button class="modal-close" onclick="fecharModal()">×</button></div>
        <div class="modal-body">
            <form id="formEditarDemanda">
                <input type="hidden" name="id" value="${d.id}">
                <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-input" name="titulo" required value="${d.titulo}"></div>
                <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-textarea" name="descricao" rows="3">${d.descricao || ''}</textarea></div>
                <div class="form-row-3">
                    <div class="form-group"><label class="form-label">Prioridade</label>
                        <select class="form-select" name="prioridade">
                            <option value="baixa" ${d.prioridade === 'baixa' ? 'selected' : ''}>⚪ Baixa</option>
                            <option value="normal" ${d.prioridade === 'normal' ? 'selected' : ''}>🔵 Normal</option>
                            <option value="alta" ${d.prioridade === 'alta' ? 'selected' : ''}>🟠 Alta</option>
                            <option value="urgente" ${d.prioridade === 'urgente' ? 'selected' : ''}>🔴 Urgente</option>
                        </select>
                    </div>
                    <div class="form-group"><label class="form-label">Status</label>
                        <select class="form-select" name="status">
                            <option value="backlog" ${d.status === 'backlog' ? 'selected' : ''}>📥 Backlog</option>
                            <option value="em_andamento" ${d.status === 'em_andamento' ? 'selected' : ''}>🔄 Andamento</option>
                            <option value="revisao" ${d.status === 'revisao' ? 'selected' : ''}>👀 Revisão</option>
                            <option value="concluido" ${d.status === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                        </select>
                    </div>
                    <div class="form-group"><label class="form-label">Data Limite</label><input type="date" class="form-input" name="data_limite" value="${d.data_limite || ''}"></div>
                </div>
                <div class="form-group"><label class="form-label">Solicitante</label><input type="text" class="form-input" name="solicitante" value="${d.solicitante || ''}"></div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirDemanda('${d.id}')">🗑️</button>
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-primary" onclick="salvarEdicaoDemanda()">💾 Salvar</button>
        </div>
    `;
    modal.classList.remove('hidden');
}

async function salvarEdicaoDemanda() {
    const form = document.getElementById('formEditarDemanda');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const dados = {
        titulo: formData.get('titulo'), descricao: formData.get('descricao') || null,
        prioridade: formData.get('prioridade'), status: formData.get('status'),
        data_limite: formData.get('data_limite') || null, solicitante: formData.get('solicitante') || null
    };
    
    try {
        await supabase.from('demandas').update(dados).eq('id', id);
        const idx = state.demandas.findIndex(x => x.id === id);
        if (idx !== -1) state.demandas[idx] = { ...state.demandas[idx], ...dados };
        renderizarKanban();
        atualizarDashboard();
        fecharModal();
        showToast('Atualizada!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

async function excluirDemanda(id) {
    if (!confirm('Excluir demanda?')) return;
    try {
        await supabase.from('demandas').delete().eq('id', id);
        state.demandas = state.demandas.filter(d => d.id !== id);
        renderizarKanban();
        atualizarDashboard();
        fecharModal();
        showToast('Excluída!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}


// =====================================================
// ANOTAÇÕES E BRIEFINGS
// =====================================================
function setupAnotacoes() {
    document.getElementById('btnNovaAnotacao')?.addEventListener('click', abrirModalNovaAnotacao);
    document.getElementById('btnNovoBriefing')?.addEventListener('click', abrirModalNovoBriefing);
}

function renderizarAnotacoes() {
    const container = document.getElementById('anotacoesLista');
    if (!container) return;
    container.innerHTML = state.anotacoes.length > 0 
        ? state.anotacoes.map(a => `
            <div class="anotacao-card" onclick="abrirAnotacao('${a.id}')">
                <div class="card-titulo">${a.titulo}</div>
                <div class="card-preview">${a.texto || 'Sem conteúdo'}</div>
                <div class="card-meta"><span class="card-categoria">${a.categoria}</span><span>${formatarData(a.created_at)}</span></div>
            </div>
        `).join('')
        : '<p class="empty-state">Nenhuma anotação</p>';
}

function renderizarBriefings() {
    const container = document.getElementById('briefingsLista');
    if (!container) return;
    container.innerHTML = state.briefings.length > 0 
        ? state.briefings.map(b => `
            <div class="briefing-card" onclick="abrirBriefing('${b.id}')">
                <div class="card-titulo">${b.titulo_reuniao}</div>
                <div class="card-preview">${b.resumo || 'Sem resumo'}</div>
                <div class="card-meta"><span>👥 ${b.participantes?.join(', ') || 'N/A'}</span><span>${b.data_reuniao ? formatarData(b.data_reuniao) : ''}</span></div>
            </div>
        `).join('')
        : '<p class="empty-state">Nenhum briefing</p>';
}

function abrirModalNovaAnotacao() {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header"><h2>Nova Anotação</h2><button class="modal-close" onclick="fecharModal()">×</button></div>
        <div class="modal-body">
            <form id="formNovaAnotacao">
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-input" name="titulo" required></div>
                    <div class="form-group"><label class="form-label">Categoria</label>
                        <select class="form-select" name="categoria"><option value="geral">📝 Geral</option><option value="estrategia">🎯 Estratégia</option><option value="conteudo">📱 Conteúdo</option><option value="cliente">👤 Cliente</option><option value="tecnico">⚙️ Técnico</option></select>
                    </div>
                </div>
                <div class="form-group"><label class="form-label">Texto</label><textarea class="form-textarea" name="texto" rows="10"></textarea></div>
            </form>
        </div>
        <div class="modal-footer"><button class="btn-secondary" onclick="fecharModal()">Cancelar</button><button class="btn-primary" onclick="salvarNovaAnotacao()">💾 Salvar</button></div>
    `;
    modal.classList.remove('hidden');
}

async function salvarNovaAnotacao() {
    const form = document.getElementById('formNovaAnotacao');
    const formData = new FormData(form);
    
    const dados = {
        empresa_id: state.empresa.id, titulo: formData.get('titulo'),
        texto: formData.get('texto') || null, categoria: formData.get('categoria')
    };
    
    try {
        const { data, error } = await supabase.from('anotacoes').insert([dados]).select();
        if (error) throw error;
        state.anotacoes.unshift(data[0]);
        renderizarAnotacoes();
        fecharModal();
        showToast('Salva!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

function abrirAnotacao(id) {
    const a = state.anotacoes.find(x => x.id === id);
    if (!a) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header"><div><span class="card-categoria" style="margin-bottom: 8px; display: inline-block;">${a.categoria}</span><h2>${a.titulo}</h2></div><button class="modal-close" onclick="fecharModal()">×</button></div>
        <div class="modal-body"><div style="white-space: pre-wrap; line-height: 1.8;">${a.texto || 'Sem conteúdo'}</div></div>
        <div class="modal-footer"><button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirAnotacao('${id}')">🗑️</button><button class="btn-secondary" onclick="fecharModal()">Fechar</button></div>
    `;
    modal.classList.remove('hidden');
}

async function excluirAnotacao(id) {
    if (!confirm('Excluir?')) return;
    try {
        await supabase.from('anotacoes').delete().eq('id', id);
        state.anotacoes = state.anotacoes.filter(a => a.id !== id);
        renderizarAnotacoes();
        fecharModal();
        showToast('Excluída!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

function abrirModalNovoBriefing() {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header"><h2>Novo Briefing</h2><button class="modal-close" onclick="fecharModal()">×</button></div>
        <div class="modal-body">
            <form id="formNovoBriefing">
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-input" name="titulo_reuniao" required></div>
                    <div class="form-group"><label class="form-label">Data</label><input type="date" class="form-input" name="data_reuniao" value="${new Date().toISOString().split('T')[0]}"></div>
                </div>
                <div class="form-group"><label class="form-label">Participantes (vírgula)</label><input type="text" class="form-input" name="participantes"></div>
                <div class="form-group"><label class="form-label">Pauta</label><textarea class="form-textarea" name="pauta" rows="3"></textarea></div>
                <div class="form-group"><label class="form-label">Resumo / Decisões</label><textarea class="form-textarea" name="resumo" rows="4"></textarea></div>
                <div class="form-group"><label class="form-label">Próximos Passos</label><textarea class="form-textarea" name="proximos_passos" rows="3"></textarea></div>
            </form>
        </div>
        <div class="modal-footer"><button class="btn-secondary" onclick="fecharModal()">Cancelar</button><button class="btn-primary" onclick="salvarNovoBriefing()">💾 Salvar</button></div>
    `;
    modal.classList.remove('hidden');
}

async function salvarNovoBriefing() {
    const form = document.getElementById('formNovoBriefing');
    const formData = new FormData(form);
    const participantesStr = formData.get('participantes');
    
    const dados = {
        empresa_id: state.empresa.id, titulo_reuniao: formData.get('titulo_reuniao'),
        data_reuniao: formData.get('data_reuniao') || null,
        participantes: participantesStr ? participantesStr.split(',').map(p => p.trim()) : [],
        pauta: formData.get('pauta') || null, resumo: formData.get('resumo') || null,
        proximos_passos: formData.get('proximos_passos') || null
    };
    
    try {
        const { data, error } = await supabase.from('briefings').insert([dados]).select();
        if (error) throw error;
        state.briefings.unshift(data[0]);
        renderizarBriefings();
        fecharModal();
        showToast('Salvo!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

function abrirBriefing(id) {
    const b = state.briefings.find(x => x.id === id);
    if (!b) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div><p style="color: var(--cinza-500); font-size: 13px;">${b.data_reuniao ? formatarData(b.data_reuniao) : ''}</p><h2>${b.titulo_reuniao}</h2><p style="color: var(--gold); font-size: 13px; margin-top: 5px;">👥 ${b.participantes?.join(', ') || 'N/A'}</p></div>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            ${b.pauta ? `<div style="margin-bottom: 25px;"><h4 style="color: var(--gold); margin-bottom: 10px;">📋 Pauta</h4><div style="white-space: pre-wrap; line-height: 1.7;">${b.pauta}</div></div>` : ''}
            ${b.resumo ? `<div style="margin-bottom: 25px;"><h4 style="color: var(--gold); margin-bottom: 10px;">📝 Resumo</h4><div style="white-space: pre-wrap; line-height: 1.7;">${b.resumo}</div></div>` : ''}
            ${b.proximos_passos ? `<div><h4 style="color: var(--gold); margin-bottom: 10px;">➡️ Próximos Passos</h4><div style="white-space: pre-wrap; line-height: 1.7;">${b.proximos_passos}</div></div>` : ''}
        </div>
        <div class="modal-footer"><button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirBriefing('${id}')">🗑️</button><button class="btn-secondary" onclick="fecharModal()">Fechar</button></div>
    `;
    modal.classList.remove('hidden');
}

async function excluirBriefing(id) {
    if (!confirm('Excluir?')) return;
    try {
        await supabase.from('briefings').delete().eq('id', id);
        state.briefings = state.briefings.filter(b => b.id !== id);
        renderizarBriefings();
        fecharModal();
        showToast('Excluído!', 'success');
    } catch (error) { showToast('Erro', 'error'); }
}

// =====================================================
// UTILITÁRIOS
// =====================================================
function formatarData(data) {
    if (!data) return '';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideInRight 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 3000);
}

console.log('📦 App.js v3.0 carregado!');


// =====================================================
// FASE 4: EDITOR COMPLETO DE CONTEÚDO COM SLIDES
// =====================================================

function abrirEditorCompleto(id) {
    const c = state.planejamento.find(x => x.id === id);
    if (!c) return;
    
    // Garantir arrays
    c.slides = c.slides || [];
    c.prompts_imagem = c.prompts_imagem || [];
    c.prompts_video = c.prompts_video || [];
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-editor';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div>
                <h2>Editor de Conteúdo</h2>
                <p style="color: var(--cinza-500); font-size: 14px;">${c.titulo}</p>
            </div>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            <!-- TABS -->
            <div class="modal-tabs">
                <button class="modal-tab active" data-tab="info">📋 Informações</button>
                <button class="modal-tab" data-tab="slides">📝 Slides <span style="background: var(--cinza-200); padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 5px;">${c.slides.length}</span></button>
                <button class="modal-tab" data-tab="prompts">🎨 Prompts <span style="background: var(--cinza-200); padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 5px;">${c.prompts_imagem.length + c.prompts_video.length}</span></button>
                <button class="modal-tab" data-tab="legenda">📱 Legenda</button>
            </div>
            
            <form id="formEditorCompleto">
                <input type="hidden" name="id" value="${c.id}">
                
                <!-- TAB: INFO -->
                <div class="modal-tab-content active" data-tab="info">
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-input" name="titulo" required value="${c.titulo}"></div>
                        <div class="form-group"><label class="form-label">Tipo</label>
                            <select class="form-select" name="tipo">
                                <option value="carrossel" ${c.tipo === 'carrossel' ? 'selected' : ''}>📸 Carrossel</option>
                                <option value="reels" ${c.tipo === 'reels' ? 'selected' : ''}>🎬 Reels</option>
                                <option value="static" ${c.tipo === 'static' ? 'selected' : ''}>🖼️ Static</option>
                                <option value="stories" ${c.tipo === 'stories' ? 'selected' : ''}>📱 Stories</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Data Publicação</label><input type="date" class="form-input" name="data_publicacao" value="${c.data_publicacao || ''}"></div>
                        <div class="form-group"><label class="form-label">Badge</label><input type="text" class="form-input" name="badge" value="${c.badge || ''}" placeholder="Ex: Polêmico ★★★★★"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-textarea" name="descricao" rows="3">${c.descricao || ''}</textarea></div>
                    <div class="form-row-3">
                        <div class="form-group"><label class="form-label">Status</label>
                            <select class="form-select" name="status">
                                <option value="planejado" ${c.status === 'planejado' ? 'selected' : ''}>📅 Planejado</option>
                                <option value="em_producao" ${c.status === 'em_producao' ? 'selected' : ''}>🎬 Produção</option>
                                <option value="pronto" ${c.status === 'pronto' ? 'selected' : ''}>✅ Pronto</option>
                                <option value="publicado" ${c.status === 'publicado' ? 'selected' : ''}>📤 Publicado</option>
                            </select>
                        </div>
                        <div class="form-group"><label class="form-label">Mês</label>
                            <select class="form-select" name="mes">${MESES.map((m, i) => `<option value="${i + 1}" ${c.mes === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label class="form-label">Ordem</label><input type="number" class="form-input" name="ordem" min="1" value="${c.ordem || 1}"></div>
                    </div>
                </div>
                
                <!-- TAB: SLIDES -->
                <div class="modal-tab-content" data-tab="slides">
                    <div class="slides-editor">
                        <div class="slides-editor-header">
                            <span class="slides-editor-title">📝 Slides do Conteúdo</span>
                            <button type="button" class="btn-secondary" onclick="adicionarSlide()">+ Adicionar Slide</button>
                        </div>
                        <div id="slidesContainer">
                            ${c.slides.map((s, idx) => renderizarSlideEditor(s, idx)).join('')}
                        </div>
                        <button type="button" class="add-slide-btn" onclick="adicionarSlide()">+ Adicionar Novo Slide</button>
                    </div>
                </div>
                
                <!-- TAB: PROMPTS -->
                <div class="modal-tab-content" data-tab="prompts">
                    <div class="prompts-editor">
                        <!-- Prompts de Imagem -->
                        <div class="accordion-section open">
                            <div class="accordion-header" onclick="toggleAccordion(this)">
                                <span class="accordion-title">🎨 Prompts de Imagem <span class="accordion-count" id="countPromptsImagem">${c.prompts_imagem.length}</span></span>
                                <span class="accordion-arrow">▼</span>
                            </div>
                            <div class="accordion-content">
                                <div id="promptsImagemContainer">
                                    ${c.prompts_imagem.map((p, idx) => renderizarPromptEditor(p, idx, 'imagem')).join('')}
                                </div>
                                <button type="button" class="add-slide-btn" onclick="adicionarPrompt('imagem')">+ Adicionar Prompt de Imagem</button>
                            </div>
                        </div>
                        
                        <!-- Prompts de Vídeo -->
                        <div class="accordion-section">
                            <div class="accordion-header" onclick="toggleAccordion(this)">
                                <span class="accordion-title">🎬 Prompts de Vídeo <span class="accordion-count" id="countPromptsVideo">${c.prompts_video.length}</span></span>
                                <span class="accordion-arrow">▼</span>
                            </div>
                            <div class="accordion-content">
                                <div id="promptsVideoContainer">
                                    ${c.prompts_video.map((p, idx) => renderizarPromptEditor(p, idx, 'video')).join('')}
                                </div>
                                <button type="button" class="add-slide-btn" onclick="adicionarPrompt('video')">+ Adicionar Prompt de Vídeo</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- TAB: LEGENDA -->
                <div class="modal-tab-content" data-tab="legenda">
                    <div class="form-group">
                        <label class="form-label">Legenda Instagram</label>
                        <textarea class="form-textarea" name="legenda" rows="15" placeholder="Escreva a legenda do post com hashtags e emojis...">${c.legenda || ''}</textarea>
                        <p class="form-hint">Dica: Use quebras de linha, emojis e hashtags relevantes para melhor engajamento</p>
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-secondary" onclick="abrirModalVisualizacao(state.planejamento.find(x => x.id === '${c.id}'))">👁️ Visualizar</button>
            <button class="btn-primary" onclick="salvarEditorCompleto()">💾 Salvar Tudo</button>
        </div>
    `;
    
    // Setup tabs
    modalContent.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modalContent.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            modalContent.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            modalContent.querySelector(`.modal-tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
        });
    });
    
    modal.classList.remove('hidden');
}

function renderizarSlideEditor(slide, index) {
    return `
        <div class="slide-item" data-index="${index}">
            <div class="slide-item-header">
                <span class="slide-number-badge">${slide.numero || index + 1}</span>
                <select class="slide-tipo-select" onchange="atualizarSlide(${index}, 'tipo', this.value)">
                    <option value="HOOK" ${slide.tipo === 'HOOK' ? 'selected' : ''}>HOOK</option>
                    <option value="CONTEXTO" ${slide.tipo === 'CONTEXTO' ? 'selected' : ''}>CONTEXTO</option>
                    <option value="PROBLEMA" ${slide.tipo === 'PROBLEMA' ? 'selected' : ''}>PROBLEMA</option>
                    <option value="REVELAÇÃO" ${slide.tipo === 'REVELAÇÃO' ? 'selected' : ''}>REVELAÇÃO</option>
                    <option value="SOLUÇÃO" ${slide.tipo === 'SOLUÇÃO' ? 'selected' : ''}>SOLUÇÃO</option>
                    <option value="BENEFÍCIO" ${slide.tipo === 'BENEFÍCIO' ? 'selected' : ''}>BENEFÍCIO</option>
                    <option value="PROVA" ${slide.tipo === 'PROVA' ? 'selected' : ''}>PROVA</option>
                    <option value="CTA" ${slide.tipo === 'CTA' ? 'selected' : ''}>CTA</option>
                    <option value="OUTRO" ${slide.tipo === 'OUTRO' ? 'selected' : ''}>OUTRO</option>
                </select>
                <div class="slide-actions">
                    <button type="button" class="slide-action-btn" onclick="moverSlide(${index}, -1)" title="Mover para cima">↑</button>
                    <button type="button" class="slide-action-btn" onclick="moverSlide(${index}, 1)" title="Mover para baixo">↓</button>
                    <button type="button" class="slide-action-btn delete" onclick="removerSlide(${index})" title="Remover">×</button>
                </div>
            </div>
            <textarea class="slide-textarea" placeholder="Texto do slide..." onchange="atualizarSlide(${index}, 'texto', this.value)">${slide.texto || ''}</textarea>
        </div>
    `;
}

function renderizarPromptEditor(prompt, index, tipo) {
    return `
        <div class="prompt-item ${tipo}" data-index="${index}" data-tipo="${tipo}">
            <div class="prompt-item-header">
                <input type="number" class="prompt-slide-input" placeholder="Slide" value="${prompt.slide || ''}" onchange="atualizarPrompt('${tipo}', ${index}, 'slide', this.value)">
                <input type="text" class="prompt-label-input" placeholder="Label (ex: Capa, Background...)" value="${prompt.label || ''}" onchange="atualizarPrompt('${tipo}', ${index}, 'label', this.value)">
                <button type="button" class="slide-action-btn delete" onclick="removerPrompt('${tipo}', ${index})">×</button>
            </div>
            <textarea class="prompt-textarea" placeholder="Prompt completo para geração de ${tipo === 'imagem' ? 'imagem' : 'vídeo'}..." onchange="atualizarPrompt('${tipo}', ${index}, 'prompt', this.value)">${prompt.prompt || ''}</textarea>
        </div>
    `;
}

// Estado temporário para edição
let editorSlides = [];
let editorPromptsImagem = [];
let editorPromptsVideo = [];

function adicionarSlide() {
    const container = document.getElementById('slidesContainer');
    const index = container.children.length;
    const novoSlide = { numero: index + 1, tipo: 'CONTEXTO', texto: '' };
    
    const div = document.createElement('div');
    div.innerHTML = renderizarSlideEditor(novoSlide, index);
    container.appendChild(div.firstElementChild);
    
    atualizarContadorSlides();
}

function removerSlide(index) {
    const container = document.getElementById('slidesContainer');
    container.children[index]?.remove();
    reindexarSlides();
}

function moverSlide(index, direcao) {
    const container = document.getElementById('slidesContainer');
    const items = Array.from(container.children);
    const novoIndex = index + direcao;
    
    if (novoIndex < 0 || novoIndex >= items.length) return;
    
    const item = items[index];
    const target = items[novoIndex];
    
    if (direcao === -1) {
        container.insertBefore(item, target);
    } else {
        container.insertBefore(target, item);
    }
    
    reindexarSlides();
}

function reindexarSlides() {
    const container = document.getElementById('slidesContainer');
    Array.from(container.children).forEach((item, idx) => {
        item.dataset.index = idx;
        item.querySelector('.slide-number-badge').textContent = idx + 1;
        item.querySelector('.slide-tipo-select').setAttribute('onchange', `atualizarSlide(${idx}, 'tipo', this.value)`);
        item.querySelector('.slide-textarea').setAttribute('onchange', `atualizarSlide(${idx}, 'texto', this.value)`);
        item.querySelectorAll('.slide-action-btn')[0].setAttribute('onclick', `moverSlide(${idx}, -1)`);
        item.querySelectorAll('.slide-action-btn')[1].setAttribute('onclick', `moverSlide(${idx}, 1)`);
        item.querySelectorAll('.slide-action-btn')[2].setAttribute('onclick', `removerSlide(${idx})`);
    });
    atualizarContadorSlides();
}

// Funções auxiliares para atualização de slides e prompts
function atualizarSlide(index, campo, valor) {
    // Atualização é feita diretamente no DOM e coletada no salvar
    console.log(`Slide ${index} - ${campo}: ${valor}`);
}

function atualizarPrompt(tipo, index, campo, valor) {
    // Atualização é feita diretamente no DOM e coletada no salvar
    console.log(`Prompt ${tipo} ${index} - ${campo}: ${valor}`);
}

function atualizarContadorSlides() {
    const count = document.getElementById('slidesContainer')?.children.length || 0;
    const tab = document.querySelector('.modal-tab[data-tab="slides"] span');
    if (tab) tab.textContent = count;
}

function adicionarPrompt(tipo) {
    const container = document.getElementById(`prompts${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Container`);
    const index = container.children.length;
    const novoPrompt = { slide: '', label: '', prompt: '' };
    
    const div = document.createElement('div');
    div.innerHTML = renderizarPromptEditor(novoPrompt, index, tipo);
    container.appendChild(div.firstElementChild);
    
    atualizarContadorPrompts(tipo);
}

function removerPrompt(tipo, index) {
    const container = document.getElementById(`prompts${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Container`);
    container.children[index]?.remove();
    reindexarPrompts(tipo);
}

function reindexarPrompts(tipo) {
    const container = document.getElementById(`prompts${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Container`);
    Array.from(container.children).forEach((item, idx) => {
        item.dataset.index = idx;
        item.querySelector('.prompt-slide-input').setAttribute('onchange', `atualizarPrompt('${tipo}', ${idx}, 'slide', this.value)`);
        item.querySelector('.prompt-label-input').setAttribute('onchange', `atualizarPrompt('${tipo}', ${idx}, 'label', this.value)`);
        item.querySelector('.prompt-textarea').setAttribute('onchange', `atualizarPrompt('${tipo}', ${idx}, 'prompt', this.value)`);
        item.querySelector('.slide-action-btn.delete').setAttribute('onclick', `removerPrompt('${tipo}', ${idx})`);
    });
    atualizarContadorPrompts(tipo);
}

function atualizarContadorPrompts(tipo) {
    const container = document.getElementById(`prompts${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Container`);
    const count = container?.children.length || 0;
    document.getElementById(`countPrompts${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).textContent = count;
}

function toggleAccordion(header) {
    header.parentElement.classList.toggle('open');
}

function coletarSlides() {
    const container = document.getElementById('slidesContainer');
    return Array.from(container.children).map((item, idx) => ({
        numero: idx + 1,
        tipo: item.querySelector('.slide-tipo-select').value,
        texto: item.querySelector('.slide-textarea').value
    }));
}

function coletarPrompts(tipo) {
    const container = document.getElementById(`prompts${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Container`);
    return Array.from(container.children).map(item => ({
        slide: parseInt(item.querySelector('.prompt-slide-input').value) || 0,
        label: item.querySelector('.prompt-label-input').value,
        prompt: item.querySelector('.prompt-textarea').value
    }));
}

async function salvarEditorCompleto() {
    const form = document.getElementById('formEditorCompleto');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const slides = coletarSlides();
    const promptsImagem = coletarPrompts('imagem');
    const promptsVideo = coletarPrompts('video');
    
    const dados = {
        titulo: formData.get('titulo'),
        tipo: formData.get('tipo'),
        data_publicacao: formData.get('data_publicacao') || null,
        badge: formData.get('badge') || null,
        descricao: formData.get('descricao') || null,
        legenda: formData.get('legenda') || null,
        status: formData.get('status'),
        mes: parseInt(formData.get('mes')),
        ordem: parseInt(formData.get('ordem')) || 1,
        slides: slides,
        prompts_imagem: promptsImagem,
        prompts_video: promptsVideo
    };
    
    try {
        const { error } = await supabase.from('planejamento_conteudos').update(dados).eq('id', id);
        if (error) throw error;
        
        const idx = state.planejamento.findIndex(c => c.id === id);
        if (idx !== -1) state.planejamento[idx] = { ...state.planejamento[idx], ...dados };
        
        renderizarMeses();
        if (state.mesSelecionado) {
            renderizarFiltros(calcularStats(state.planejamento.filter(c => c.mes === state.mesSelecionado)));
            renderizarConteudosMes();
        }
        atualizarDashboard();
        fecharModal();
        showToast('Conteúdo salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao salvar', 'error');
    }
}


// =====================================================
// FASE 5: BIBLIOTECA DE CONTEÚDOS PRONTOS
// =====================================================

async function carregarBiblioteca() {
    try {
        const { data, error } = await supabase
            .from('conteudos_prontos')
            .select('*')
            .eq('empresa_id', state.empresa.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        state.conteudosProntos = data || [];
        renderizarBiblioteca();
    } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
    }
}

function renderizarBiblioteca(filtroTipo = 'todos') {
    const grid = document.getElementById('bibliotecaGrid');
    if (!grid) return;
    
    let conteudos = state.conteudosProntos;
    if (filtroTipo !== 'todos') {
        conteudos = conteudos.filter(c => c.tipo === filtroTipo);
    }
    
    if (conteudos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1;">
                <div class="empty-state" style="padding: 60px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
                    <p>Nenhum conteúdo na biblioteca</p>
                    <button class="btn-primary" style="margin-top: 20px;" onclick="abrirModalNovoConteudoPronto()">+ Adicionar Primeiro</button>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = conteudos.map(c => `
        <div class="biblioteca-card" onclick="abrirConteudoPronto('${c.id}')">
            <div class="biblioteca-thumb">
                ${c.thumbnail_url ? `<img src="${c.thumbnail_url}" alt="${c.titulo}">` : getTipoIcon(c.tipo)}
                <span class="biblioteca-tipo">${c.tipo.toUpperCase()}</span>
            </div>
            <div class="biblioteca-info">
                <div class="biblioteca-titulo">${c.titulo}</div>
                <div class="biblioteca-data">📅 ${c.data_publicacao ? formatarData(c.data_publicacao) : 'Sem data'}</div>
            </div>
        </div>
    `).join('');
}

function getTipoIcon(tipo) {
    const icons = { carrossel: '📸', reels: '🎬', static: '🖼️', stories: '📱' };
    return icons[tipo] || '📄';
}

// Setup filtros biblioteca
document.querySelectorAll('[data-tipo-biblioteca]')?.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tipo-biblioteca]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderizarBiblioteca(btn.dataset.tipoBiblioteca);
    });
});

function abrirModalNovoConteudoPronto() {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-editor';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Adicionar à Biblioteca</h2>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="formNovoConteudoPronto">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input type="text" class="form-input" name="titulo" required placeholder="Nome do conteúdo">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo</label>
                        <select class="form-select" name="tipo">
                            <option value="carrossel">📸 Carrossel</option>
                            <option value="reels">🎬 Reels</option>
                            <option value="static">🖼️ Static</option>
                            <option value="stories">📱 Stories</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Data de Publicação</label>
                    <input type="date" class="form-input" name="data_publicacao">
                </div>
                
                <div class="form-group">
                    <label class="form-label">URL da Thumbnail</label>
                    <input type="url" class="form-input" name="thumbnail_url" placeholder="https://...">
                    <p class="form-hint">Cole a URL da imagem de capa</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">URLs das Mídias (uma por linha)</label>
                    <textarea class="form-textarea" name="midia_urls" rows="5" placeholder="https://url-da-imagem-1.jpg&#10;https://url-da-imagem-2.jpg&#10;https://url-do-video.mp4"></textarea>
                    <p class="form-hint">Adicione os links das imagens ou vídeos do conteúdo</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Legenda</label>
                    <textarea class="form-textarea" name="legenda" rows="6" placeholder="Legenda publicada no Instagram..."></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-primary" onclick="salvarConteudoPronto()">💾 Salvar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function salvarConteudoPronto() {
    const form = document.getElementById('formNovoConteudoPronto');
    const formData = new FormData(form);
    
    const titulo = formData.get('titulo');
    if (!titulo?.trim()) {
        showToast('Título obrigatório', 'error');
        return;
    }
    
    const midiaUrlsText = formData.get('midia_urls') || '';
    const midiaUrls = midiaUrlsText.split('\n').filter(url => url.trim()).map(url => url.trim());
    
    const dados = {
        empresa_id: state.empresa.id,
        titulo: titulo.trim(),
        tipo: formData.get('tipo'),
        data_publicacao: formData.get('data_publicacao') || null,
        thumbnail_url: formData.get('thumbnail_url') || null,
        midia_urls: midiaUrls,
        legenda: formData.get('legenda') || null
    };
    
    try {
        const { data, error } = await supabase.from('conteudos_prontos').insert([dados]).select();
        if (error) throw error;
        
        state.conteudosProntos.unshift(data[0]);
        renderizarBiblioteca();
        fecharModal();
        showToast('Conteúdo adicionado à biblioteca!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao salvar', 'error');
    }
}

function abrirConteudoPronto(id) {
    const c = state.conteudosProntos.find(x => x.id === id);
    if (!c) return;
    
    const midias = c.midia_urls || [];
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-visualizacao';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="viz-header">
                <div class="viz-header-left">
                    <span class="viz-badge publicado">📤 Na Biblioteca</span>
                    <h2 class="viz-title">${c.titulo}</h2>
                    <div class="viz-meta">
                        <span class="viz-meta-item">${getTipoIcon(c.tipo)} <strong>${c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}</strong></span>
                        ${c.data_publicacao ? `<span class="viz-meta-item">📅 <strong>${formatarData(c.data_publicacao)}</strong></span>` : ''}
                    </div>
                </div>
                <div class="viz-stats">
                    <div class="viz-stat"><span class="viz-stat-value">${midias.length}</span><span class="viz-stat-label">Mídias</span></div>
                </div>
            </div>
            <button class="modal-close" onclick="fecharModal()" style="background: rgba(255,255,255,0.1); color: white; position: absolute; top: 25px; right: 25px;">×</button>
        </div>
        
        <div class="modal-body">
            ${midias.length > 0 ? `
            <section class="viz-section">
                <div class="viz-section-header">
                    <div class="viz-section-icon slides">🖼️</div>
                    <h3 class="viz-section-title">Mídias</h3>
                </div>
                <div class="media-grid">
                    ${midias.map((url, idx) => `
                        <div class="media-card" onclick="abrirMidia('${url}')">
                            <div class="media-thumb">
                                ${url.match(/\.(mp4|mov|webm)$/i) 
                                    ? `<video src="${url}" muted></video><span class="media-badge">🎬 Vídeo</span>`
                                    : `<img src="${url}" alt="Mídia ${idx + 1}"><span class="media-badge">🖼️ Imagem</span>`
                                }
                            </div>
                            <div class="media-info">
                                <div class="media-title">Mídia ${idx + 1}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
            ` : ''}
            
            ${c.legenda ? `
            <section class="viz-section">
                <div class="viz-section-header">
                    <div class="viz-section-icon legenda">📱</div>
                    <h3 class="viz-section-title">Legenda</h3>
                </div>
                <div class="viz-legenda-container">
                    <div class="viz-legenda-actions">
                        <button class="viz-legenda-btn" onclick="copiarTexto('${c.id}')">📋 Copiar</button>
                    </div>
                    <div class="viz-legenda-texto" id="texto-${c.id}">${c.legenda}</div>
                </div>
            </section>
            ` : ''}
        </div>
        
        <div class="modal-footer">
            <button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirConteudoPronto('${c.id}')">🗑️ Excluir</button>
            <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
            <button class="btn-primary" onclick="editarConteudoPronto('${c.id}')">✏️ Editar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function abrirMidia(url) {
    window.open(url, '_blank');
}

function copiarTexto(id) {
    const el = document.getElementById(`texto-${id}`);
    if (el) {
        navigator.clipboard.writeText(el.textContent).then(() => showToast('Copiado!', 'success'));
    }
}

function editarConteudoPronto(id) {
    const c = state.conteudosProntos.find(x => x.id === id);
    if (!c) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-editor';
    
    const midias = c.midia_urls || [];
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Editar Conteúdo</h2>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="formEditarConteudoPronto">
                <input type="hidden" name="id" value="${c.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input type="text" class="form-input" name="titulo" required value="${c.titulo}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo</label>
                        <select class="form-select" name="tipo">
                            <option value="carrossel" ${c.tipo === 'carrossel' ? 'selected' : ''}>📸 Carrossel</option>
                            <option value="reels" ${c.tipo === 'reels' ? 'selected' : ''}>🎬 Reels</option>
                            <option value="static" ${c.tipo === 'static' ? 'selected' : ''}>🖼️ Static</option>
                            <option value="stories" ${c.tipo === 'stories' ? 'selected' : ''}>📱 Stories</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Data de Publicação</label>
                    <input type="date" class="form-input" name="data_publicacao" value="${c.data_publicacao || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">URL da Thumbnail</label>
                    <input type="url" class="form-input" name="thumbnail_url" value="${c.thumbnail_url || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">URLs das Mídias (uma por linha)</label>
                    <textarea class="form-textarea" name="midia_urls" rows="5">${midias.join('\n')}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Legenda</label>
                    <textarea class="form-textarea" name="legenda" rows="6">${c.legenda || ''}</textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-primary" onclick="salvarEdicaoConteudoPronto()">💾 Salvar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function salvarEdicaoConteudoPronto() {
    const form = document.getElementById('formEditarConteudoPronto');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const midiaUrlsText = formData.get('midia_urls') || '';
    const midiaUrls = midiaUrlsText.split('\n').filter(url => url.trim()).map(url => url.trim());
    
    const dados = {
        titulo: formData.get('titulo'),
        tipo: formData.get('tipo'),
        data_publicacao: formData.get('data_publicacao') || null,
        thumbnail_url: formData.get('thumbnail_url') || null,
        midia_urls: midiaUrls,
        legenda: formData.get('legenda') || null
    };
    
    try {
        await supabase.from('conteudos_prontos').update(dados).eq('id', id);
        
        const idx = state.conteudosProntos.findIndex(c => c.id === id);
        if (idx !== -1) state.conteudosProntos[idx] = { ...state.conteudosProntos[idx], ...dados };
        
        renderizarBiblioteca();
        fecharModal();
        showToast('Atualizado!', 'success');
    } catch (error) {
        showToast('Erro ao atualizar', 'error');
    }
}

async function excluirConteudoPronto(id) {
    if (!confirm('Excluir este conteúdo da biblioteca?')) return;
    
    try {
        await supabase.from('conteudos_prontos').delete().eq('id', id);
        state.conteudosProntos = state.conteudosProntos.filter(c => c.id !== id);
        renderizarBiblioteca();
        fecharModal();
        showToast('Excluído!', 'success');
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
}

// Função para mover conteúdo do planejamento para biblioteca
async function moverParaBiblioteca(id) {
    const c = state.planejamento.find(x => x.id === id);
    if (!c) return;
    
    if (!confirm(`Mover "${c.titulo}" para a Biblioteca?`)) return;
    
    const dados = {
        empresa_id: state.empresa.id,
        titulo: c.titulo,
        tipo: c.tipo,
        data_publicacao: c.data_publicacao,
        legenda: c.legenda,
        midia_urls: [],
        thumbnail_url: null
    };
    
    try {
        const { data, error } = await supabase.from('conteudos_prontos').insert([dados]).select();
        if (error) throw error;
        
        // Atualizar status para publicado
        await supabase.from('planejamento_conteudos').update({ status: 'publicado' }).eq('id', id);
        
        const idx = state.planejamento.findIndex(x => x.id === id);
        if (idx !== -1) state.planejamento[idx].status = 'publicado';
        
        state.conteudosProntos.unshift(data[0]);
        
        renderizarMeses();
        if (state.mesSelecionado) {
            renderizarFiltros(calcularStats(state.planejamento.filter(x => x.mes === state.mesSelecionado)));
            renderizarConteudosMes();
        }
        atualizarDashboard();
        
        showToast('Movido para biblioteca!', 'success');
    } catch (error) {
        showToast('Erro ao mover', 'error');
    }
}

// Inicialização - carregar biblioteca junto com outros dados
const originalCarregarDados = carregarDados;
carregarDados = async function() {
    await originalCarregarDados();
    await carregarBiblioteca();
};

// Setup botão biblioteca
document.getElementById('btnNovoConteudoPronto')?.addEventListener('click', abrirModalNovoConteudoPronto);


// =====================================================
// FASE 6: KANBAN AVANÇADO COM FILTROS E STATS
// =====================================================

let filtroDemandasPrioridade = 'todas';

function renderizarKanbanAvancado() {
    // Stats Pills
    const urgentes = state.demandas.filter(d => d.prioridade === 'urgente' && d.status !== 'concluido').length;
    const pendentes = state.demandas.filter(d => d.status !== 'concluido').length;
    const concluidas = state.demandas.filter(d => d.status === 'concluido').length;
    const total = state.demandas.length;
    
    // Renderizar Kanban
    ['backlog', 'em_andamento', 'revisao', 'concluido'].forEach(status => {
        const coluna = document.querySelector(`.kanban-column[data-status="${status}"]`);
        if (!coluna) return;
        
        const cardsContainer = coluna.querySelector('.column-cards');
        let demandas = state.demandas.filter(d => d.status === status);
        
        // Aplicar filtro de prioridade
        if (filtroDemandasPrioridade !== 'todas') {
            demandas = demandas.filter(d => d.prioridade === filtroDemandasPrioridade);
        }
        
        coluna.querySelector('.column-count').textContent = demandas.length;
        
        if (demandas.length === 0) {
            cardsContainer.innerHTML = '<p class="empty-state" style="padding: 30px; text-align: center; font-size: 13px; color: var(--cinza-400);">Arraste demandas aqui</p>';
        } else {
            cardsContainer.innerHTML = demandas.map(d => {
                const hoje = new Date().toISOString().split('T')[0];
                const atrasada = d.data_limite && d.data_limite < hoje && d.status !== 'concluido';
                
                return `
                    <div class="demanda-card ${d.prioridade}" draggable="true" data-id="${d.id}">
                        <div class="demanda-quick-actions">
                            <button class="quick-action-btn" onclick="event.stopPropagation(); avancarDemanda('${d.id}')" title="Avançar">→</button>
                            <button class="quick-action-btn" onclick="event.stopPropagation(); excluirDemandaRapido('${d.id}')" title="Excluir">×</button>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div class="demanda-titulo">${d.titulo}</div>
                            <span class="prioridade-tag ${d.prioridade}">${d.prioridade}</span>
                        </div>
                        ${d.descricao ? `<div class="demanda-desc">${d.descricao.substring(0, 120)}${d.descricao.length > 120 ? '...' : ''}</div>` : ''}
                        <div class="demanda-footer">
                            <span class="demanda-solicitante">${d.solicitante ? '👤 ' + d.solicitante : ''}</span>
                            <span class="demanda-data ${atrasada ? 'atrasada' : ''}">${d.data_limite ? (atrasada ? '⚠️ ' : '📅 ') + formatarData(d.data_limite) : ''}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    });
    
    setupDragAndDropAvancado();
}

function setupDragAndDropAvancado() {
    document.querySelectorAll('.demanda-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.id);
            card.classList.add('dragging');
            setTimeout(() => card.style.opacity = '0.5', 0);
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            card.style.opacity = '1';
        });
        
        card.addEventListener('click', () => {
            const demanda = state.demandas.find(d => d.id === card.dataset.id);
            if (demanda) abrirModalEditarDemandaCompleto(demanda);
        });
    });
    
    document.querySelectorAll('.column-cards').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
            
            // Indicador visual de posição
            const afterElement = getDragAfterElement(column, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (dragging) {
                if (afterElement) {
                    column.insertBefore(dragging, afterElement);
                } else {
                    column.appendChild(dragging);
                }
            }
        });
        
        column.addEventListener('dragleave', (e) => {
            if (!column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            const id = e.dataTransfer.getData('text/plain');
            const novoStatus = column.parentElement.dataset.status;
            await atualizarStatusDemandaAvancado(id, novoStatus);
        });
    });
}

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll('.demanda-card:not(.dragging)')];
    
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function atualizarStatusDemandaAvancado(id, novoStatus) {
    try {
        const { error } = await supabase.from('demandas').update({ status: novoStatus }).eq('id', id);
        if (error) throw error;
        
        const d = state.demandas.find(x => x.id === id);
        if (d) d.status = novoStatus;
        
        renderizarKanbanAvancado();
        atualizarDashboard();
        
        const statusLabels = { backlog: 'Backlog', em_andamento: 'Em Andamento', revisao: 'Revisão', concluido: 'Concluído' };
        showToast(`Movido para ${statusLabels[novoStatus]}`, 'success');
    } catch (error) {
        showToast('Erro ao mover', 'error');
    }
}

async function avancarDemanda(id) {
    const d = state.demandas.find(x => x.id === id);
    if (!d) return;
    
    const statusOrder = ['backlog', 'em_andamento', 'revisao', 'concluido'];
    const idx = statusOrder.indexOf(d.status);
    if (idx < statusOrder.length - 1) {
        await atualizarStatusDemandaAvancado(id, statusOrder[idx + 1]);
    }
}

async function excluirDemandaRapido(id) {
    if (!confirm('Excluir esta demanda?')) return;
    
    try {
        await supabase.from('demandas').delete().eq('id', id);
        state.demandas = state.demandas.filter(d => d.id !== id);
        renderizarKanbanAvancado();
        atualizarDashboard();
        showToast('Demanda excluída!', 'success');
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
}

function abrirModalEditarDemandaCompleto(d) {
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    const statusLabels = { backlog: '📥 Backlog', em_andamento: '🔄 Em Andamento', revisao: '👀 Revisão', concluido: '✅ Concluído' };
    const prioridadeLabels = { baixa: '⚪ Baixa', normal: '🔵 Normal', alta: '🟠 Alta', urgente: '🔴 Urgente' };
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div>
                <span class="prioridade-tag ${d.prioridade}" style="margin-bottom: 8px; display: inline-block;">${prioridadeLabels[d.prioridade]}</span>
                <h2>${d.titulo}</h2>
                <p style="color: var(--cinza-500); font-size: 13px; margin-top: 5px;">${statusLabels[d.status]} • Criado em ${formatarData(d.created_at)}</p>
            </div>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="formEditarDemandaCompleto">
                <input type="hidden" name="id" value="${d.id}">
                
                <div class="form-group">
                    <label class="form-label">Título *</label>
                    <input type="text" class="form-input" name="titulo" required value="${d.titulo}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Descrição</label>
                    <textarea class="form-textarea" name="descricao" rows="4">${d.descricao || ''}</textarea>
                </div>
                
                <div class="form-row-3">
                    <div class="form-group">
                        <label class="form-label">Prioridade</label>
                        <select class="form-select" name="prioridade">
                            <option value="baixa" ${d.prioridade === 'baixa' ? 'selected' : ''}>⚪ Baixa</option>
                            <option value="normal" ${d.prioridade === 'normal' ? 'selected' : ''}>🔵 Normal</option>
                            <option value="alta" ${d.prioridade === 'alta' ? 'selected' : ''}>🟠 Alta</option>
                            <option value="urgente" ${d.prioridade === 'urgente' ? 'selected' : ''}>🔴 Urgente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" name="status">
                            <option value="backlog" ${d.status === 'backlog' ? 'selected' : ''}>📥 Backlog</option>
                            <option value="em_andamento" ${d.status === 'em_andamento' ? 'selected' : ''}>🔄 Em Andamento</option>
                            <option value="revisao" ${d.status === 'revisao' ? 'selected' : ''}>👀 Revisão</option>
                            <option value="concluido" ${d.status === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data Limite</label>
                        <input type="date" class="form-input" name="data_limite" value="${d.data_limite || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Solicitante</label>
                    <input type="text" class="form-input" name="solicitante" value="${d.solicitante || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações</label>
                    <textarea class="form-textarea" name="observacoes" rows="3" placeholder="Notas adicionais...">${d.observacoes || ''}</textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirDemandaModal('${d.id}')">🗑️ Excluir</button>
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-primary" onclick="salvarDemandaCompleta()">💾 Salvar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function salvarDemandaCompleta() {
    const form = document.getElementById('formEditarDemandaCompleto');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const dados = {
        titulo: formData.get('titulo'),
        descricao: formData.get('descricao') || null,
        prioridade: formData.get('prioridade'),
        status: formData.get('status'),
        data_limite: formData.get('data_limite') || null,
        solicitante: formData.get('solicitante') || null,
        observacoes: formData.get('observacoes') || null
    };
    
    try {
        await supabase.from('demandas').update(dados).eq('id', id);
        
        const idx = state.demandas.findIndex(x => x.id === id);
        if (idx !== -1) state.demandas[idx] = { ...state.demandas[idx], ...dados };
        
        renderizarKanbanAvancado();
        atualizarDashboard();
        fecharModal();
        showToast('Demanda atualizada!', 'success');
    } catch (error) {
        showToast('Erro ao salvar', 'error');
    }
}

async function excluirDemandaModal(id) {
    if (!confirm('Excluir esta demanda?')) return;
    
    try {
        await supabase.from('demandas').delete().eq('id', id);
        state.demandas = state.demandas.filter(d => d.id !== id);
        renderizarKanbanAvancado();
        atualizarDashboard();
        fecharModal();
        showToast('Demanda excluída!', 'success');
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
}

// Atualizar função de renderizar Kanban para usar a avançada
const originalRenderizarKanban = renderizarKanban;
renderizarKanban = renderizarKanbanAvancado;


// =====================================================
// FASE 7: ANOTAÇÕES E BRIEFINGS AVANÇADOS
// =====================================================

function renderizarAnotacoesAvancado() {
    const container = document.getElementById('anotacoesLista');
    if (!container) return;
    
    if (state.anotacoes.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma anotação ainda. Clique em "+ Anotação" para criar.</p>';
        return;
    }
    
    // Agrupar por categoria
    const categorias = {};
    state.anotacoes.forEach(a => {
        const cat = a.categoria || 'geral';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(a);
    });
    
    container.innerHTML = state.anotacoes.map(a => `
        <div class="anotacao-card" onclick="abrirAnotacaoCompleta('${a.id}')">
            <div class="card-titulo">${a.titulo}</div>
            <div class="card-preview">${(a.texto || 'Sem conteúdo').substring(0, 150)}${(a.texto || '').length > 150 ? '...' : ''}</div>
            <div class="card-meta">
                <span class="card-categoria ${a.categoria}">${getCategoriaLabel(a.categoria)}</span>
                <span>${formatarData(a.created_at)}</span>
            </div>
        </div>
    `).join('');
}

function getCategoriaLabel(cat) {
    const labels = {
        geral: '📝 Geral',
        estrategia: '🎯 Estratégia', 
        conteudo: '📱 Conteúdo',
        cliente: '👤 Cliente',
        tecnico: '⚙️ Técnico'
    };
    return labels[cat] || '📝 Geral';
}

function renderizarBriefingsAvancado() {
    const container = document.getElementById('briefingsLista');
    if (!container) return;
    
    if (state.briefings.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum briefing ainda. Clique em "+ Briefing" para criar.</p>';
        return;
    }
    
    container.innerHTML = state.briefings.map(b => `
        <div class="briefing-card" onclick="abrirBriefingCompleto('${b.id}')">
            <div class="card-titulo">${b.titulo_reuniao}</div>
            <div class="card-preview">${(b.resumo || b.pauta || 'Sem resumo').substring(0, 150)}${((b.resumo || b.pauta || '').length > 150) ? '...' : ''}</div>
            <div class="card-meta">
                <span>👥 ${(b.participantes || []).length} participante${(b.participantes || []).length !== 1 ? 's' : ''}</span>
                <span>${b.data_reuniao ? formatarData(b.data_reuniao) : 'Sem data'}</span>
            </div>
        </div>
    `).join('');
}

function abrirAnotacaoCompleta(id) {
    const a = state.anotacoes.find(x => x.id === id);
    if (!a) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-anotacao';
    
    modalContent.innerHTML = `
        <div class="modal-header" style="background: linear-gradient(135deg, var(--oceano) 0%, var(--oceano-light) 100%); color: white;">
            <div>
                <span class="card-categoria ${a.categoria}" style="margin-bottom: 10px; display: inline-block; background: rgba(255,255,255,0.2); color: white;">${getCategoriaLabel(a.categoria)}</span>
                <h2 style="color: white;">${a.titulo}</h2>
                <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 5px;">Criado em ${formatarData(a.created_at)}</p>
            </div>
            <button class="modal-close" onclick="fecharModal()" style="background: rgba(255,255,255,0.1); color: white;">×</button>
        </div>
        <div class="modal-body">
            <div class="anotacao-content">${a.texto || 'Sem conteúdo'}</div>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirAnotacaoCompleta('${a.id}')">🗑️ Excluir</button>
            <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
            <button class="btn-primary" onclick="editarAnotacao('${a.id}')">✏️ Editar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function editarAnotacao(id) {
    const a = state.anotacoes.find(x => x.id === id);
    if (!a) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Editar Anotação</h2>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="formEditarAnotacao">
                <input type="hidden" name="id" value="${a.id}">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label class="form-label">Título *</label>
                        <input type="text" class="form-input" name="titulo" required value="${a.titulo}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Categoria</label>
                        <select class="form-select" name="categoria">
                            <option value="geral" ${a.categoria === 'geral' ? 'selected' : ''}>📝 Geral</option>
                            <option value="estrategia" ${a.categoria === 'estrategia' ? 'selected' : ''}>🎯 Estratégia</option>
                            <option value="conteudo" ${a.categoria === 'conteudo' ? 'selected' : ''}>📱 Conteúdo</option>
                            <option value="cliente" ${a.categoria === 'cliente' ? 'selected' : ''}>👤 Cliente</option>
                            <option value="tecnico" ${a.categoria === 'tecnico' ? 'selected' : ''}>⚙️ Técnico</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Conteúdo</label>
                    <textarea class="form-textarea" name="texto" rows="15">${a.texto || ''}</textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-primary" onclick="salvarEdicaoAnotacao()">💾 Salvar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function salvarEdicaoAnotacao() {
    const form = document.getElementById('formEditarAnotacao');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const dados = {
        titulo: formData.get('titulo'),
        texto: formData.get('texto') || null,
        categoria: formData.get('categoria')
    };
    
    try {
        await supabase.from('anotacoes').update(dados).eq('id', id);
        
        const idx = state.anotacoes.findIndex(x => x.id === id);
        if (idx !== -1) state.anotacoes[idx] = { ...state.anotacoes[idx], ...dados };
        
        renderizarAnotacoesAvancado();
        fecharModal();
        showToast('Anotação atualizada!', 'success');
    } catch (error) {
        showToast('Erro ao salvar', 'error');
    }
}

async function excluirAnotacaoCompleta(id) {
    if (!confirm('Excluir esta anotação?')) return;
    
    try {
        await supabase.from('anotacoes').delete().eq('id', id);
        state.anotacoes = state.anotacoes.filter(a => a.id !== id);
        renderizarAnotacoesAvancado();
        fecharModal();
        showToast('Anotação excluída!', 'success');
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
}

function abrirBriefingCompleto(id) {
    const b = state.briefings.find(x => x.id === id);
    if (!b) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-briefing';
    
    const participantes = b.participantes || [];
    
    modalContent.innerHTML = `
        <div class="modal-header" style="background: linear-gradient(135deg, var(--floresta) 0%, #0d4d26 100%); color: white;">
            <div>
                <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 8px;">${b.data_reuniao ? formatarData(b.data_reuniao) : 'Sem data'}</p>
                <h2 style="color: white;">${b.titulo_reuniao}</h2>
                ${participantes.length > 0 ? `
                <div class="participantes-tags" style="margin-top: 12px;">
                    ${participantes.map(p => `<span class="participante-tag">${p}</span>`).join('')}
                </div>
                ` : ''}
            </div>
            <button class="modal-close" onclick="fecharModal()" style="background: rgba(255,255,255,0.1); color: white;">×</button>
        </div>
        <div class="modal-body">
            <div class="briefing-sections">
                ${b.pauta ? `
                <div class="briefing-section">
                    <div class="briefing-section-title">📋 Pauta da Reunião</div>
                    <div class="briefing-section-content">${b.pauta}</div>
                </div>
                ` : ''}
                
                ${b.resumo ? `
                <div class="briefing-section" style="background: rgba(203,160,82,0.1); border-left: 4px solid var(--gold);">
                    <div class="briefing-section-title" style="color: var(--gold-dark);">📝 Resumo / Decisões</div>
                    <div class="briefing-section-content">${b.resumo}</div>
                </div>
                ` : ''}
                
                ${b.proximos_passos ? `
                <div class="briefing-section" style="background: rgba(34,197,94,0.1); border-left: 4px solid var(--verde);">
                    <div class="briefing-section-title" style="color: var(--verde);">➡️ Próximos Passos</div>
                    <div class="briefing-section-content">${b.proximos_passos}</div>
                </div>
                ` : ''}
                
                ${!b.pauta && !b.resumo && !b.proximos_passos ? `
                <p class="empty-state">Nenhum conteúdo registrado neste briefing.</p>
                ` : ''}
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" style="color: var(--vermelho);" onclick="excluirBriefingCompleto('${b.id}')">🗑️ Excluir</button>
            <button class="btn-secondary" onclick="fecharModal()">Fechar</button>
            <button class="btn-primary" onclick="editarBriefing('${b.id}')">✏️ Editar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function editarBriefing(id) {
    const b = state.briefings.find(x => x.id === id);
    if (!b) return;
    
    const modal = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    modalContent.className = 'modal modal-editor';
    
    const participantes = b.participantes || [];
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Editar Briefing</h2>
            <button class="modal-close" onclick="fecharModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="formEditarBriefing">
                <input type="hidden" name="id" value="${b.id}">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label class="form-label">Título da Reunião *</label>
                        <input type="text" class="form-input" name="titulo_reuniao" required value="${b.titulo_reuniao}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data</label>
                        <input type="date" class="form-input" name="data_reuniao" value="${b.data_reuniao || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Participantes (separados por vírgula)</label>
                    <input type="text" class="form-input" name="participantes" value="${participantes.join(', ')}" placeholder="Ex: João, Maria, Pedro">
                </div>
                <div class="form-group">
                    <label class="form-label">Pauta</label>
                    <textarea class="form-textarea" name="pauta" rows="4" placeholder="Tópicos discutidos...">${b.pauta || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Resumo / Decisões</label>
                    <textarea class="form-textarea" name="resumo" rows="5" placeholder="Principais decisões e conclusões...">${b.resumo || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Próximos Passos</label>
                    <textarea class="form-textarea" name="proximos_passos" rows="4" placeholder="Ações a serem tomadas...">${b.proximos_passos || ''}</textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-primary" onclick="salvarEdicaoBriefing()">💾 Salvar</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

async function salvarEdicaoBriefing() {
    const form = document.getElementById('formEditarBriefing');
    const formData = new FormData(form);
    const id = formData.get('id');
    
    const participantesStr = formData.get('participantes') || '';
    const participantes = participantesStr.split(',').map(p => p.trim()).filter(p => p);
    
    const dados = {
        titulo_reuniao: formData.get('titulo_reuniao'),
        data_reuniao: formData.get('data_reuniao') || null,
        participantes: participantes,
        pauta: formData.get('pauta') || null,
        resumo: formData.get('resumo') || null,
        proximos_passos: formData.get('proximos_passos') || null
    };
    
    try {
        await supabase.from('briefings').update(dados).eq('id', id);
        
        const idx = state.briefings.findIndex(x => x.id === id);
        if (idx !== -1) state.briefings[idx] = { ...state.briefings[idx], ...dados };
        
        renderizarBriefingsAvancado();
        fecharModal();
        showToast('Briefing atualizado!', 'success');
    } catch (error) {
        showToast('Erro ao salvar', 'error');
    }
}

async function excluirBriefingCompleto(id) {
    if (!confirm('Excluir este briefing?')) return;
    
    try {
        await supabase.from('briefings').delete().eq('id', id);
        state.briefings = state.briefings.filter(b => b.id !== id);
        renderizarBriefingsAvancado();
        fecharModal();
        showToast('Briefing excluído!', 'success');
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
}

// Atualizar funções de renderização para usar as avançadas
const originalRenderizarAnotacoes = renderizarAnotacoes;
const originalRenderizarBriefings = renderizarBriefings;
renderizarAnotacoes = renderizarAnotacoesAvancado;
renderizarBriefings = renderizarBriefingsAvancado;

console.log('📦 Fase 6 & 7 carregadas!');
