/* ========================================
   BEATLIFE CONTENT STUDIO v4.1
   JavaScript Limpo e Funcional
   + Markdown Support
   + Claude Desktop API
   ======================================== */

// ====================
// INICIALIZACAO
// ====================
const db = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
const storage = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.storageKey);

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STATUS = {
    planejado: { label: 'Planejado', cor: 'info' },
    em_producao: { label: 'Em Producao', cor: 'warning' },
    pronto: { label: 'Pronto', cor: 'success' },
    publicado: { label: 'Publicado', cor: 'gold' }
};

// Estado global
const state = {
    empresa: null,
    ano: new Date().getFullYear(),
    mes: null,
    planejamento: [],
    biblioteca: [],
    demandas: [],
    anotacoes: [],
    briefings: [],
    filtro: 'todos',
    currentMarkdown: null // Para o visualizador de markdown
};

// ====================
// APP PRINCIPAL
// ====================
const App = {
    // Inicializar
    async init() {
        console.log('Iniciando Content Studio v4.0...');

        // Data atual
        document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
        document.getElementById('anoDisplay').textContent = state.ano;

        // Carregar empresa
        try {
            const { data, error } = await db.from('empresas').select('*').eq('slug', 'beatlife').single();
            if (error) throw error;
            state.empresa = data;
            document.getElementById('empresaBadge').textContent = data.nome;
        } catch (e) {
            Toast.error('Erro ao conectar ao banco');
            console.error(e);
            return;
        }

        // Setup navegacao
        this.setupNav();
        this.setupFiltros();

        // Carregar dados
        await this.carregarTudo();

        Toast.success('Sistema pronto!');
    },

    // Setup navegacao
    setupNav() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;

                // Atualizar nav
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Atualizar page
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(`page-${tab}`).classList.add('active');

                // Callbacks por tab
                if (tab === 'biblioteca') this.renderBiblioteca();
                if (tab === 'demandas') this.renderKanban();
                if (tab === 'notas') this.renderNotas();
            });
        });
    },

    // Setup filtros biblioteca
    setupFiltros() {
        document.querySelectorAll('.filtro').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filtro').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.filtro = btn.dataset.filtro;
                this.renderBiblioteca();
            });
        });
    },

    // Carregar todos os dados
    async carregarTudo() {
        if (!state.empresa) return;

        try {
            const [plan, bib, dem, anot, brief] = await Promise.all([
                db.from('planejamento_conteudos').select('*').eq('empresa_id', state.empresa.id).eq('ano', state.ano).order('mes').order('ordem'),
                db.from('conteudos_prontos').select('*').eq('empresa_id', state.empresa.id).order('created_at', { ascending: false }),
                db.from('demandas').select('*').eq('empresa_id', state.empresa.id).order('created_at', { ascending: false }),
                db.from('anotacoes').select('*').eq('empresa_id', state.empresa.id).order('created_at', { ascending: false }),
                db.from('briefings').select('*').eq('empresa_id', state.empresa.id).order('data_reuniao', { ascending: false })
            ]);

            state.planejamento = plan.data || [];
            state.biblioteca = bib.data || [];
            state.demandas = dem.data || [];
            state.anotacoes = anot.data || [];
            state.briefings = brief.data || [];

            this.renderDashboard();
            this.renderMeses();
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            Toast.error('Erro ao carregar dados');
        }
    },

    // ====================
    // DASHBOARD
    // ====================
    renderDashboard() {
        const stats = {
            planejado: state.planejamento.filter(p => p.status === 'planejado').length,
            producao: state.planejamento.filter(p => p.status === 'em_producao').length,
            pronto: state.planejamento.filter(p => p.status === 'pronto').length,
            publicado: state.planejamento.filter(p => p.status === 'publicado').length
        };

        document.getElementById('statPlanejados').textContent = stats.planejado;
        document.getElementById('statProducao').textContent = stats.producao;
        document.getElementById('statProntos').textContent = stats.pronto;
        document.getElementById('statPublicados').textContent = stats.publicado;

        // Proximos conteudos
        const proximos = state.planejamento
            .filter(p => p.data_publicacao && new Date(p.data_publicacao) >= new Date())
            .sort((a, b) => new Date(a.data_publicacao) - new Date(b.data_publicacao))
            .slice(0, 5);

        const proximosEl = document.getElementById('proximosConteudos');
        if (proximos.length === 0) {
            proximosEl.innerHTML = '<p class="empty">Nenhum conteudo agendado</p>';
        } else {
            proximosEl.innerHTML = proximos.map(p => `
                <div class="conteudo-card" style="margin-bottom: 8px; padding: 12px;">
                    <div class="conteudo-info">
                        <div class="conteudo-titulo">${p.titulo}</div>
                        <div class="conteudo-meta">${this.formatarData(p.data_publicacao)}</div>
                    </div>
                    <span class="conteudo-badge badge-${p.status}">${STATUS[p.status]?.label || p.status}</span>
                </div>
            `).join('');
        }

        // Demandas urgentes
        const urgentes = state.demandas.filter(d => d.prioridade === 'alta' && d.status !== 'concluido').slice(0, 5);
        const urgentesEl = document.getElementById('demandasUrgentes');
        if (urgentes.length === 0) {
            urgentesEl.innerHTML = '<p class="empty">Nenhuma demanda urgente</p>';
        } else {
            urgentesEl.innerHTML = urgentes.map(d => `
                <div class="kanban-card prioridade-alta" style="margin-bottom: 8px;">
                    <div class="kanban-card-title">${d.titulo}</div>
                    <div class="kanban-card-meta">${d.solicitante || 'Sem solicitante'}</div>
                </div>
            `).join('');
        }
    },

    // ====================
    // PLANEJAMENTO
    // ====================
    renderMeses() {
        const grid = document.getElementById('mesesGrid');
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();

        grid.innerHTML = MESES.map((nome, idx) => {
            const conteudos = state.planejamento.filter(p => p.mes === idx + 1);
            const isAtual = idx === mesAtual && state.ano === anoAtual;

            return `
                <div class="mes-card ${isAtual ? 'atual' : ''}" onclick="App.abrirMes(${idx + 1}, '${nome}')">
                    <div class="mes-nome">${nome}</div>
                    <div class="mes-count">${conteudos.length}</div>
                    <div class="mes-label">conteudos</div>
                </div>
            `;
        }).join('');
    },

    abrirMes(mes, nome) {
        state.mes = mes;
        document.getElementById('planejamentoView').classList.add('hidden');
        document.getElementById('mesDetalhe').classList.remove('hidden');
        document.getElementById('mesTitulo').textContent = `${nome} ${state.ano}`;
        this.renderConteudosMes();
    },

    voltarMeses() {
        state.mes = null;
        document.getElementById('planejamentoView').classList.remove('hidden');
        document.getElementById('mesDetalhe').classList.add('hidden');
    },

    renderConteudosMes() {
        const lista = document.getElementById('conteudosLista');
        const conteudos = state.planejamento.filter(p => p.mes === state.mes);

        if (conteudos.length === 0) {
            lista.innerHTML = '<p class="empty">Nenhum conteudo neste mes</p>';
            return;
        }

        lista.innerHTML = conteudos.map((c, idx) => `
            <div class="conteudo-card" onclick="App.editarConteudo('${c.id}')">
                <div class="conteudo-num">${String(idx + 1).padStart(2, '0')}</div>
                <div class="conteudo-info">
                    <div class="conteudo-titulo">${c.titulo}</div>
                    <div class="conteudo-meta">${c.tipo} | ${this.formatarData(c.data_publicacao)}</div>
                </div>
                <span class="conteudo-badge badge-${c.status}">${STATUS[c.status]?.label || c.status}</span>
            </div>
        `).join('');
    },

    anoAnterior() {
        state.ano--;
        document.getElementById('anoDisplay').textContent = state.ano;
        this.carregarTudo();
    },

    anoProximo() {
        state.ano++;
        document.getElementById('anoDisplay').textContent = state.ano;
        this.carregarTudo();
    },

    // ====================
    // BIBLIOTECA
    // ====================
    renderBiblioteca() {
        const grid = document.getElementById('bibliotecaGrid');
        let items = state.biblioteca;

        if (state.filtro !== 'todos') {
            items = items.filter(i => i.tipo === state.filtro);
        }

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📁</span>
                    <h3>Biblioteca vazia</h3>
                    <p>Faca upload de imagens, videos e arquivos Markdown</p>
                    <button class="btn btn-primary" onclick="App.abrirUpload()">📤 Fazer Upload</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => {
            const midias = item.midia_urls || [];
            const thumb = item.thumbnail_url || midias[0]?.url || '';
            const isVideo = midias[0]?.type === 'video';
            const isMarkdown = item.tipo === 'markdown';

            // Determinar o clique correto
            const clickHandler = isMarkdown
                ? `App.abrirMarkdown('${item.id}')`
                : `App.verMidia('${item.id}')`;

            return `
                <div class="biblioteca-item" onclick="${clickHandler}">
                    <div class="biblioteca-thumb">
                        ${isMarkdown
                            ? '<span style="font-size:48px">📄</span>'
                            : (thumb
                                ? (isVideo ? `<video src="${thumb}"></video>` : `<img src="${thumb}" alt="${item.titulo}">`)
                                : '<span style="font-size:48px">📁</span>')}
                        <span class="biblioteca-tipo">${item.tipo?.toUpperCase() || 'OUTRO'}</span>
                    </div>
                    <div class="biblioteca-info">
                        <div class="biblioteca-titulo">${item.titulo}</div>
                        <div class="biblioteca-data">${this.formatarData(item.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ====================
    // KANBAN
    // ====================
    renderKanban() {
        const statuses = ['backlog', 'andamento', 'revisao', 'concluido'];

        statuses.forEach(status => {
            const col = document.querySelector(`.kanban-col[data-status="${status}"]`);
            const cards = col.querySelector('.kanban-cards');
            const count = col.querySelector('.count');

            const demandas = state.demandas.filter(d => d.status === status);
            count.textContent = demandas.length;

            if (demandas.length === 0) {
                cards.innerHTML = '<p class="empty" style="padding: 20px; font-size: 13px;">Nenhuma demanda</p>';
            } else {
                cards.innerHTML = demandas.map(d => `
                    <div class="kanban-card prioridade-${d.prioridade || 'normal'}"
                         draggable="true"
                         data-id="${d.id}"
                         onclick="App.editarDemanda('${d.id}')">
                        <div class="kanban-card-title">${d.titulo}</div>
                        <div class="kanban-card-meta">
                            <span>${d.solicitante || 'Sem solicitante'}</span>
                            <span>${d.prioridade || 'normal'}</span>
                        </div>
                    </div>
                `).join('');
            }

            // Drag and drop
            cards.addEventListener('dragover', e => e.preventDefault());
            cards.addEventListener('drop', async (e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (!id) return;

                try {
                    await db.from('demandas').update({ status }).eq('id', id);
                    const dem = state.demandas.find(d => d.id === id);
                    if (dem) dem.status = status;
                    this.renderKanban();
                    Toast.success('Status atualizado!');
                } catch (err) {
                    Toast.error('Erro ao atualizar');
                }
            });
        });

        // Adicionar dragstart
        document.querySelectorAll('.kanban-card[draggable="true"]').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.id);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
        });
    },

    // ====================
    // NOTAS
    // ====================
    renderNotas() {
        // Anotacoes
        const anotacoesEl = document.getElementById('anotacoesLista');
        if (state.anotacoes.length === 0) {
            anotacoesEl.innerHTML = '<p class="empty">Nenhuma anotacao</p>';
        } else {
            anotacoesEl.innerHTML = state.anotacoes.map(a => `
                <div class="nota-item" onclick="App.editarAnotacao('${a.id}')">
                    <div class="nota-titulo">${a.titulo}</div>
                    <div class="nota-texto">${(a.texto || '').substring(0, 100)}...</div>
                </div>
            `).join('');
        }

        // Briefings
        const briefingsEl = document.getElementById('briefingsLista');
        if (state.briefings.length === 0) {
            briefingsEl.innerHTML = '<p class="empty">Nenhum briefing</p>';
        } else {
            briefingsEl.innerHTML = state.briefings.map(b => `
                <div class="briefing-item" onclick="App.editarBriefing('${b.id}')">
                    <div class="briefing-titulo">${b.titulo_reuniao}</div>
                    <div class="briefing-data">${this.formatarData(b.data_reuniao)}</div>
                </div>
            `).join('');
        }
    },

    // ====================
    // MODAIS - CRUD
    // ====================
    novoConteudo() {
        Modal.open({
            title: 'Novo Conteudo',
            body: `
                <form id="formConteudo">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Tipo</label>
                            <select class="form-select" name="tipo">
                                <option value="carrossel">Carrossel</option>
                                <option value="reels">Reels</option>
                                <option value="static">Imagem</option>
                                <option value="stories">Stories</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status">
                                <option value="planejado">Planejado</option>
                                <option value="em_producao">Em Producao</option>
                                <option value="pronto">Pronto</option>
                                <option value="publicado">Publicado</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Publicacao</label>
                        <input type="date" class="form-input" name="data_publicacao">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descricao</label>
                        <textarea class="form-textarea" name="descricao"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarConteudo()">Salvar</button>
            `
        });
    },

    async salvarConteudo(id = null) {
        const form = document.getElementById('formConteudo');
        const formData = new FormData(form);

        const dados = {
            empresa_id: state.empresa.id,
            titulo: formData.get('titulo'),
            tipo: formData.get('tipo'),
            status: formData.get('status'),
            data_publicacao: formData.get('data_publicacao') || null,
            descricao: formData.get('descricao') || null,
            mes: state.mes,
            ano: state.ano
        };

        try {
            if (id) {
                await db.from('planejamento_conteudos').update(dados).eq('id', id);
            } else {
                await db.from('planejamento_conteudos').insert([dados]);
            }
            Modal.close();
            Toast.success('Conteudo salvo!');
            await this.carregarTudo();
            this.renderConteudosMes();
        } catch (e) {
            Toast.error('Erro ao salvar');
            console.error(e);
        }
    },

    async editarConteudo(id) {
        const conteudo = state.planejamento.find(c => c.id === id);
        if (!conteudo) return;

        Modal.open({
            title: 'Editar Conteudo',
            body: `
                <form id="formConteudo">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" value="${conteudo.titulo}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Tipo</label>
                            <select class="form-select" name="tipo">
                                <option value="carrossel" ${conteudo.tipo === 'carrossel' ? 'selected' : ''}>Carrossel</option>
                                <option value="reels" ${conteudo.tipo === 'reels' ? 'selected' : ''}>Reels</option>
                                <option value="static" ${conteudo.tipo === 'static' ? 'selected' : ''}>Imagem</option>
                                <option value="stories" ${conteudo.tipo === 'stories' ? 'selected' : ''}>Stories</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status">
                                <option value="planejado" ${conteudo.status === 'planejado' ? 'selected' : ''}>Planejado</option>
                                <option value="em_producao" ${conteudo.status === 'em_producao' ? 'selected' : ''}>Em Producao</option>
                                <option value="pronto" ${conteudo.status === 'pronto' ? 'selected' : ''}>Pronto</option>
                                <option value="publicado" ${conteudo.status === 'publicado' ? 'selected' : ''}>Publicado</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data de Publicacao</label>
                        <input type="date" class="form-input" name="data_publicacao" value="${conteudo.data_publicacao || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descricao</label>
                        <textarea class="form-textarea" name="descricao">${conteudo.descricao || ''}</textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-danger" onclick="App.excluirConteudo('${id}')">Excluir</button>
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarConteudo('${id}')">Salvar</button>
            `
        });
    },

    async excluirConteudo(id) {
        if (!confirm('Excluir este conteudo?')) return;
        try {
            await db.from('planejamento_conteudos').delete().eq('id', id);
            Modal.close();
            Toast.success('Conteudo excluido!');
            await this.carregarTudo();
            this.renderConteudosMes();
        } catch (e) {
            Toast.error('Erro ao excluir');
        }
    },

    // Demandas
    novaDemanda() {
        Modal.open({
            title: 'Nova Demanda',
            body: `
                <form id="formDemanda">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Prioridade</label>
                            <select class="form-select" name="prioridade">
                                <option value="baixa">Baixa</option>
                                <option value="normal" selected>Normal</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Solicitante</label>
                            <input type="text" class="form-input" name="solicitante">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descricao</label>
                        <textarea class="form-textarea" name="descricao"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarDemanda()">Salvar</button>
            `
        });
    },

    async salvarDemanda(id = null) {
        const form = document.getElementById('formDemanda');
        const formData = new FormData(form);

        const dados = {
            empresa_id: state.empresa.id,
            titulo: formData.get('titulo'),
            prioridade: formData.get('prioridade'),
            solicitante: formData.get('solicitante') || null,
            descricao: formData.get('descricao') || null,
            status: 'backlog'
        };

        try {
            if (id) {
                delete dados.status;
                await db.from('demandas').update(dados).eq('id', id);
            } else {
                await db.from('demandas').insert([dados]);
            }
            Modal.close();
            Toast.success('Demanda salva!');
            await this.carregarTudo();
            this.renderKanban();
        } catch (e) {
            Toast.error('Erro ao salvar');
            console.error(e);
        }
    },

    async editarDemanda(id) {
        const demanda = state.demandas.find(d => d.id === id);
        if (!demanda) return;

        Modal.open({
            title: 'Editar Demanda',
            body: `
                <form id="formDemanda">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" value="${demanda.titulo}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Prioridade</label>
                            <select class="form-select" name="prioridade">
                                <option value="baixa" ${demanda.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                                <option value="normal" ${demanda.prioridade === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="alta" ${demanda.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Solicitante</label>
                            <input type="text" class="form-input" name="solicitante" value="${demanda.solicitante || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descricao</label>
                        <textarea class="form-textarea" name="descricao">${demanda.descricao || ''}</textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-danger" onclick="App.excluirDemanda('${id}')">Excluir</button>
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarDemanda('${id}')">Salvar</button>
            `
        });
    },

    async excluirDemanda(id) {
        if (!confirm('Excluir esta demanda?')) return;
        try {
            await db.from('demandas').delete().eq('id', id);
            Modal.close();
            Toast.success('Demanda excluida!');
            await this.carregarTudo();
            this.renderKanban();
        } catch (e) {
            Toast.error('Erro ao excluir');
        }
    },

    // Anotacoes
    novaAnotacao() {
        Modal.open({
            title: 'Nova Anotacao',
            body: `
                <form id="formAnotacao">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Texto</label>
                        <textarea class="form-textarea" name="texto" rows="6"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarAnotacao()">Salvar</button>
            `
        });
    },

    async salvarAnotacao(id = null) {
        const form = document.getElementById('formAnotacao');
        const formData = new FormData(form);

        const dados = {
            empresa_id: state.empresa.id,
            titulo: formData.get('titulo'),
            texto: formData.get('texto') || null
        };

        try {
            if (id) {
                await db.from('anotacoes').update(dados).eq('id', id);
            } else {
                await db.from('anotacoes').insert([dados]);
            }
            Modal.close();
            Toast.success('Anotacao salva!');
            await this.carregarTudo();
            this.renderNotas();
        } catch (e) {
            Toast.error('Erro ao salvar');
        }
    },

    async editarAnotacao(id) {
        const anotacao = state.anotacoes.find(a => a.id === id);
        if (!anotacao) return;

        Modal.open({
            title: 'Editar Anotacao',
            body: `
                <form id="formAnotacao">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" value="${anotacao.titulo}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Texto</label>
                        <textarea class="form-textarea" name="texto" rows="6">${anotacao.texto || ''}</textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-danger" onclick="App.excluirAnotacao('${id}')">Excluir</button>
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarAnotacao('${id}')">Salvar</button>
            `
        });
    },

    async excluirAnotacao(id) {
        if (!confirm('Excluir esta anotacao?')) return;
        try {
            await db.from('anotacoes').delete().eq('id', id);
            Modal.close();
            Toast.success('Anotacao excluida!');
            await this.carregarTudo();
            this.renderNotas();
        } catch (e) {
            Toast.error('Erro ao excluir');
        }
    },

    // Briefings
    novoBriefing() {
        Modal.open({
            title: 'Novo Briefing',
            body: `
                <form id="formBriefing">
                    <div class="form-group">
                        <label class="form-label">Titulo da Reuniao *</label>
                        <input type="text" class="form-input" name="titulo_reuniao" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data</label>
                        <input type="date" class="form-input" name="data_reuniao">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resumo</label>
                        <textarea class="form-textarea" name="resumo" rows="4"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarBriefing()">Salvar</button>
            `
        });
    },

    async salvarBriefing(id = null) {
        const form = document.getElementById('formBriefing');
        const formData = new FormData(form);

        const dados = {
            empresa_id: state.empresa.id,
            titulo_reuniao: formData.get('titulo_reuniao'),
            data_reuniao: formData.get('data_reuniao') || null,
            resumo: formData.get('resumo') || null
        };

        try {
            if (id) {
                await db.from('briefings').update(dados).eq('id', id);
            } else {
                await db.from('briefings').insert([dados]);
            }
            Modal.close();
            Toast.success('Briefing salvo!');
            await this.carregarTudo();
            this.renderNotas();
        } catch (e) {
            Toast.error('Erro ao salvar');
        }
    },

    async editarBriefing(id) {
        const briefing = state.briefings.find(b => b.id === id);
        if (!briefing) return;

        Modal.open({
            title: 'Editar Briefing',
            body: `
                <form id="formBriefing">
                    <div class="form-group">
                        <label class="form-label">Titulo da Reuniao *</label>
                        <input type="text" class="form-input" name="titulo_reuniao" value="${briefing.titulo_reuniao}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data</label>
                        <input type="date" class="form-input" name="data_reuniao" value="${briefing.data_reuniao || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resumo</label>
                        <textarea class="form-textarea" name="resumo" rows="4">${briefing.resumo || ''}</textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-danger" onclick="App.excluirBriefing('${id}')">Excluir</button>
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="App.salvarBriefing('${id}')">Salvar</button>
            `
        });
    },

    async excluirBriefing(id) {
        if (!confirm('Excluir este briefing?')) return;
        try {
            await db.from('briefings').delete().eq('id', id);
            Modal.close();
            Toast.success('Briefing excluido!');
            await this.carregarTudo();
            this.renderNotas();
        } catch (e) {
            Toast.error('Erro ao excluir');
        }
    },

    // ====================
    // UPLOAD
    // ====================
    uploadFiles: [],

    abrirUpload() {
        this.uploadFiles = [];
        Modal.open({
            title: 'Upload de Midia',
            body: `
                <form id="formUpload">
                    <div class="form-group">
                        <label class="form-label">Titulo *</label>
                        <input type="text" class="form-input" name="titulo" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Tipo</label>
                            <select class="form-select" name="tipo" id="uploadTipo">
                                <option value="carrossel">Carrossel</option>
                                <option value="reels">Reels</option>
                                <option value="static">Imagem</option>
                                <option value="markdown">📄 Markdown</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Data</label>
                            <input type="date" class="form-input" name="data_publicacao">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Arquivos</label>
                        <div class="upload-area" id="uploadArea">
                            <div class="upload-icon">📤</div>
                            <div class="upload-title">Arraste arquivos aqui</div>
                            <div class="upload-subtitle">ou clique para selecionar</div>
                            <input type="file" id="uploadInput" multiple accept="image/*,video/*,.md,text/markdown" hidden>
                            <div class="upload-formats">
                                <span class="upload-format">JPG</span>
                                <span class="upload-format">PNG</span>
                                <span class="upload-format">MP4</span>
                                <span class="upload-format">MD</span>
                            </div>
                        </div>
                        <div class="upload-previews" id="uploadPreviews"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Legenda / Descricao</label>
                        <textarea class="form-textarea" name="legenda" rows="3"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" id="btnUpload" onclick="App.fazerUpload()">Fazer Upload</button>
            `
        });

        // Setup upload area
        const area = document.getElementById('uploadArea');
        const input = document.getElementById('uploadInput');

        area.addEventListener('click', () => input.click());
        area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
        area.addEventListener('dragleave', () => area.classList.remove('dragover'));
        area.addEventListener('drop', (e) => { e.preventDefault(); area.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
        input.addEventListener('change', () => this.handleFiles(input.files));
    },

    handleFiles(files) {
        this.uploadFiles = [...this.uploadFiles, ...Array.from(files)];
        const container = document.getElementById('uploadPreviews');

        // Auto-detectar tipo baseado nos arquivos
        const hasMarkdown = this.uploadFiles.some(f => f.name.endsWith('.md'));
        if (hasMarkdown) {
            document.getElementById('uploadTipo').value = 'markdown';
        }

        container.innerHTML = this.uploadFiles.map((file, idx) => {
            const isVideo = file.type.startsWith('video');
            const isMarkdown = file.name.endsWith('.md');
            const isImage = file.type.startsWith('image');

            if (isMarkdown) {
                return `
                    <div class="upload-preview" style="display:flex; align-items:center; justify-content:center; background:var(--bg-hover);">
                        <span style="font-size:32px;">📄</span>
                        <button class="upload-preview-remove" onclick="App.removeFile(${idx})">x</button>
                    </div>
                `;
            }

            const url = URL.createObjectURL(file);
            return `
                <div class="upload-preview">
                    ${isVideo ? `<video src="${url}"></video>` : (isImage ? `<img src="${url}">` : '<span style="font-size:32px;">📁</span>')}
                    <button class="upload-preview-remove" onclick="App.removeFile(${idx})">x</button>
                </div>
            `;
        }).join('');
    },

    removeFile(idx) {
        this.uploadFiles.splice(idx, 1);
        this.handleFiles([]);
    },

    async fazerUpload() {
        const form = document.getElementById('formUpload');
        const formData = new FormData(form);
        const titulo = formData.get('titulo');
        const tipo = formData.get('tipo');

        if (!titulo) {
            Toast.error('Preencha o titulo');
            return;
        }

        const btn = document.getElementById('btnUpload');
        btn.textContent = 'Enviando...';
        btn.disabled = true;

        try {
            const midias = [];
            let markdownContent = null;

            for (const file of this.uploadFiles) {
                const ext = file.name.split('.').pop().toLowerCase();

                // Se for markdown, ler o conteudo do arquivo
                if (ext === 'md') {
                    markdownContent = await this.readFileAsText(file);
                    midias.push({
                        type: 'markdown',
                        name: file.name,
                        content: markdownContent
                    });
                } else {
                    // Upload para o storage
                    const path = `${state.empresa.slug}/biblioteca/${Date.now()}_${Math.random().toString(36).substr(2,9)}.${ext}`;

                    const { error: uploadError } = await storage.storage.from('media').upload(path, file);
                    if (uploadError) throw uploadError;

                    const { data: urlData } = storage.storage.from('media').getPublicUrl(path);
                    midias.push({
                        url: urlData.publicUrl,
                        path,
                        type: file.type.startsWith('video') ? 'video' : 'image',
                        name: file.name
                    });
                }
            }

            const dados = {
                empresa_id: state.empresa.id,
                titulo,
                tipo,
                data_publicacao: formData.get('data_publicacao') || null,
                legenda: formData.get('legenda') || null,
                midia_urls: midias,
                thumbnail_url: midias[0]?.url || null,
                markdown_content: markdownContent
            };

            await db.from('conteudos_prontos').insert([dados]);

            Modal.close();
            Toast.success('Upload concluido!');
            await this.carregarTudo();
            this.renderBiblioteca();
        } catch (e) {
            console.error(e);
            Toast.error('Erro no upload: ' + e.message);
        }

        btn.textContent = 'Fazer Upload';
        btn.disabled = false;
    },

    // Ler arquivo como texto
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },

    verMidia(id) {
        const item = state.biblioteca.find(i => i.id === id);
        if (!item) return;

        const midias = item.midia_urls || [];

        Modal.open({
            title: item.titulo,
            body: `
                <div style="text-align: center;">
                    ${midias.length > 0 ? (
                        midias[0].type === 'video'
                            ? `<video src="${midias[0].url}" controls style="max-width: 100%; max-height: 400px;"></video>`
                            : `<img src="${midias[0].url}" style="max-width: 100%; max-height: 400px; border-radius: 8px;">`
                    ) : '<p>Sem midia</p>'}
                </div>
                ${item.legenda ? `<div style="margin-top: 20px; padding: 16px; background: var(--bg-hover); border-radius: 8px;"><p style="white-space: pre-wrap;">${item.legenda}</p></div>` : ''}
            `,
            footer: `
                <button class="btn btn-danger" onclick="App.excluirMidia('${id}')">Excluir</button>
                <button class="btn btn-secondary" onclick="Modal.close()">Fechar</button>
            `
        });
    },

    async excluirMidia(id) {
        if (!confirm('Excluir este conteudo?')) return;
        try {
            await db.from('conteudos_prontos').delete().eq('id', id);
            Modal.close();
            Toast.success('Conteudo excluido!');
            await this.carregarTudo();
            this.renderBiblioteca();
        } catch (e) {
            Toast.error('Erro ao excluir');
        }
    },

    // ====================
    // EXPORT
    // ====================
    async exportar() {
        const dados = {
            exportDate: new Date().toISOString(),
            empresa: state.empresa,
            planejamento: state.planejamento,
            biblioteca: state.biblioteca,
            demandas: state.demandas,
            anotacoes: state.anotacoes,
            briefings: state.briefings
        };

        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `beatlife-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        Toast.success('Backup exportado!');
    },

    // ====================
    // MARKDOWN VIEWER
    // ====================
    abrirMarkdown(id) {
        const item = state.biblioteca.find(i => i.id === id);
        if (!item) return;

        state.currentMarkdown = item;

        // Esconder todas as pages e mostrar a de markdown
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-markdown').classList.add('active');

        // Atualizar nav (desmarcar todos)
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        // Preencher conteudo
        document.getElementById('markdownTitulo').textContent = item.titulo;
        document.getElementById('markdownMeta').textContent = `Criado em ${this.formatarData(item.created_at)}`;

        // Renderizar markdown
        const content = item.markdown_content || item.legenda || 'Sem conteudo';
        document.getElementById('markdownContent').innerHTML = marked.parse(content);
    },

    voltarDoBiblioteca() {
        state.currentMarkdown = null;

        // Voltar para biblioteca
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-biblioteca').classList.add('active');

        // Atualizar nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector('.nav-link[data-tab="biblioteca"]').classList.add('active');

        this.renderBiblioteca();
    },

    copiarMarkdown() {
        if (!state.currentMarkdown) return;

        const content = state.currentMarkdown.markdown_content || state.currentMarkdown.legenda || '';
        navigator.clipboard.writeText(content).then(() => {
            Toast.success('Markdown copiado!');
        }).catch(() => {
            Toast.error('Erro ao copiar');
        });
    },

    async excluirMarkdownAtual() {
        if (!state.currentMarkdown) return;
        if (!confirm('Excluir este documento?')) return;

        try {
            await db.from('conteudos_prontos').delete().eq('id', state.currentMarkdown.id);
            Toast.success('Documento excluido!');
            this.voltarDoBiblioteca();
            await this.carregarTudo();
        } catch (e) {
            Toast.error('Erro ao excluir');
        }
    },

    // ====================
    // UTILS
    // ====================
    formatarData(data) {
        if (!data) return '';
        return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
    }
};

// ====================
// CLAUDE DESKTOP API
// ====================
const ClaudeAPI = {
    // Adicionar conteudo diretamente via API
    async adicionarConteudo(dados) {
        if (!state.empresa) {
            throw new Error('Sistema nao inicializado');
        }

        const { titulo, tipo, conteudo, legenda } = dados;

        if (!titulo) {
            throw new Error('Titulo e obrigatorio');
        }

        const novoConteudo = {
            empresa_id: state.empresa.id,
            titulo,
            tipo: tipo || 'markdown',
            legenda: legenda || null,
            markdown_content: conteudo || null,
            midia_urls: conteudo ? [{ type: 'markdown', content: conteudo }] : [],
            data_publicacao: null,
            thumbnail_url: null
        };

        const { data, error } = await db.from('conteudos_prontos').insert([novoConteudo]).select();
        if (error) throw error;

        // Recarregar dados
        await App.carregarTudo();
        App.renderBiblioteca();

        return { success: true, id: data[0].id, message: 'Conteudo adicionado com sucesso!' };
    },

    // Listar conteudos
    async listarConteudos(filtro = null) {
        let items = state.biblioteca;
        if (filtro) {
            items = items.filter(i => i.tipo === filtro);
        }
        return items.map(i => ({
            id: i.id,
            titulo: i.titulo,
            tipo: i.tipo,
            created_at: i.created_at,
            has_markdown: !!i.markdown_content
        }));
    },

    // Obter conteudo especifico
    async obterConteudo(id) {
        const item = state.biblioteca.find(i => i.id === id);
        if (!item) throw new Error('Conteudo nao encontrado');
        return item;
    },

    // Adicionar demanda
    async adicionarDemanda(dados) {
        if (!state.empresa) {
            throw new Error('Sistema nao inicializado');
        }

        const { titulo, descricao, prioridade, solicitante } = dados;

        if (!titulo) {
            throw new Error('Titulo e obrigatorio');
        }

        const novaDemanda = {
            empresa_id: state.empresa.id,
            titulo,
            descricao: descricao || null,
            prioridade: prioridade || 'normal',
            solicitante: solicitante || 'Claude Desktop',
            status: 'backlog'
        };

        const { data, error } = await db.from('demandas').insert([novaDemanda]).select();
        if (error) throw error;

        await App.carregarTudo();
        return { success: true, id: data[0].id, message: 'Demanda adicionada!' };
    },

    // Adicionar nota/anotacao
    async adicionarNota(dados) {
        if (!state.empresa) {
            throw new Error('Sistema nao inicializado');
        }

        const { titulo, texto } = dados;

        if (!titulo) {
            throw new Error('Titulo e obrigatorio');
        }

        const novaNota = {
            empresa_id: state.empresa.id,
            titulo,
            texto: texto || null
        };

        const { data, error } = await db.from('anotacoes').insert([novaNota]).select();
        if (error) throw error;

        await App.carregarTudo();
        return { success: true, id: data[0].id, message: 'Nota adicionada!' };
    }
};

// Expor API globalmente para acesso externo
window.ClaudeAPI = ClaudeAPI;
window.ContentStudioAPI = ClaudeAPI; // Alias

// ====================
// MODAL
// ====================
const Modal = {
    open({ title, body, footer }) {
        const modal = document.getElementById('modal');
        const box = document.getElementById('modalBox');

        box.innerHTML = `
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="Modal.close()">x</button>
            </div>
            <div class="modal-body">${body}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        `;

        modal.classList.remove('hidden');
    },

    close() {
        document.getElementById('modal').classList.add('hidden');
    }
};

// Fechar modal com ESC
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modal.close(); });

// Fechar modal clicando fora
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') Modal.close();
});

// ====================
// TOAST
// ====================
const Toast = {
    show(message, type = 'info') {
        const container = document.getElementById('toasts');
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
};

// ====================
// INICIAR
// ====================
document.addEventListener('DOMContentLoaded', () => App.init());

console.log('Content Studio v4.1 carregado!');
console.log('API disponivel: window.ClaudeAPI ou window.ContentStudioAPI');
