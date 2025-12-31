/* =====================================================
   BEATLIFE CONTENT STUDIO - TESTE COMPLETO
   Versão: 3.0
   Data: 31/12/2025
   ===================================================== */

const SUPABASE_URL = 'https://gpqxqykgcrpmvwxktjvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDk2MDAsImV4cCI6MjA1MDk4NTYwMH0.yCxhMJ0KbaoR3q7Fs1P-zN8YSPqPrH7wYl4LLrMKbLo';

// Resultados dos testes
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
    console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
}

// =====================================================
// TESTES DE ARQUIVOS
// =====================================================
async function testarArquivos() {
    console.log('\n📁 TESTANDO ARQUIVOS...\n');
    
    const arquivos = ['index.html', 'styles.css', 'app.js', 'config.js', 'database.sql', 'README.md'];
    
    for (const arquivo of arquivos) {
        try {
            const response = await fetch(arquivo);
            logTest(`Arquivo ${arquivo} existe`, response.ok);
        } catch (e) {
            logTest(`Arquivo ${arquivo} existe`, false, e.message);
        }
    }
}

// =====================================================
// TESTES DE SUPABASE CONNECTION
// =====================================================
async function testarSupabaseConnection() {
    console.log('\n🔌 TESTANDO CONEXÃO SUPABASE...\n');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/empresas?select=count`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        logTest('Conexão Supabase', response.ok);
    } catch (e) {
        logTest('Conexão Supabase', false, e.message);
    }
}

// =====================================================
// TESTES DE TABELAS
// =====================================================
async function testarTabelas() {
    console.log('\n🗃️ TESTANDO TABELAS...\n');
    
    const tabelas = ['empresas', 'planejamento_conteudos', 'conteudos_prontos', 'demandas', 'anotacoes', 'briefings'];
    
    for (const tabela of tabelas) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?select=*&limit=1`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const data = await response.json();
            logTest(`Tabela ${tabela} acessível`, response.ok && !data.error, data.error?.message);
        } catch (e) {
            logTest(`Tabela ${tabela} acessível`, false, e.message);
        }
    }
}

// =====================================================
// TESTES DE EMPRESA BEATLIFE
// =====================================================
async function testarEmpresaBeatlife() {
    console.log('\n🏢 TESTANDO EMPRESA BEATLIFE...\n');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/empresas?slug=eq.beatlife&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        
        logTest('Empresa Beat Life existe', data.length > 0);
        if (data.length > 0) {
            logTest('Empresa tem ID', !!data[0].id, data[0].id);
            logTest('Empresa tem nome', !!data[0].nome, data[0].nome);
            logTest('Empresa tem slug', data[0].slug === 'beatlife');
            return data[0];
        }
    } catch (e) {
        logTest('Empresa Beat Life existe', false, e.message);
    }
    return null;
}

// =====================================================
// TESTES DE CONTEÚDOS (CRUD)
// =====================================================
async function testarCRUDConteudos(empresaId) {
    console.log('\n📝 TESTANDO CRUD CONTEÚDOS...\n');
    
    // CREATE
    let novoConteudoId = null;
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/planejamento_conteudos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                empresa_id: empresaId,
                mes: 12,
                ano: 2025,
                titulo: 'TESTE AUTOMATIZADO - Deletar',
                tipo: 'carrossel',
                status: 'planejado',
                ordem: 99,
                descricao: 'Conteúdo de teste automatizado',
                slides: [{ numero: 1, tipo: 'HOOK', texto: 'Teste' }],
                prompts_imagem: [],
                prompts_video: []
            })
        });
        const data = await response.json();
        novoConteudoId = data[0]?.id;
        logTest('CREATE conteúdo', response.ok && novoConteudoId, novoConteudoId);
    } catch (e) {
        logTest('CREATE conteúdo', false, e.message);
    }
    
    // READ
    if (novoConteudoId) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/planejamento_conteudos?id=eq.${novoConteudoId}&select=*`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const data = await response.json();
            logTest('READ conteúdo', data.length > 0 && data[0].titulo === 'TESTE AUTOMATIZADO - Deletar');
        } catch (e) {
            logTest('READ conteúdo', false, e.message);
        }
        
        // UPDATE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/planejamento_conteudos?id=eq.${novoConteudoId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'em_producao' })
            });
            logTest('UPDATE conteúdo', response.ok);
        } catch (e) {
            logTest('UPDATE conteúdo', false, e.message);
        }
        
        // DELETE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/planejamento_conteudos?id=eq.${novoConteudoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            logTest('DELETE conteúdo', response.ok);
        } catch (e) {
            logTest('DELETE conteúdo', false, e.message);
        }
    }
}

// =====================================================
// TESTES DE DEMANDAS (CRUD)
// =====================================================
async function testarCRUDDemandas(empresaId) {
    console.log('\n📋 TESTANDO CRUD DEMANDAS...\n');
    
    let novaDemandaId = null;
    
    // CREATE
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/demandas`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                empresa_id: empresaId,
                titulo: 'TESTE DEMANDA - Deletar',
                descricao: 'Demanda de teste',
                prioridade: 'normal',
                status: 'backlog',
                solicitante: 'Sistema de Testes'
            })
        });
        const data = await response.json();
        novaDemandaId = data[0]?.id;
        logTest('CREATE demanda', response.ok && novaDemandaId);
    } catch (e) {
        logTest('CREATE demanda', false, e.message);
    }
    
    if (novaDemandaId) {
        // READ
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/demandas?id=eq.${novaDemandaId}&select=*`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const data = await response.json();
            logTest('READ demanda', data.length > 0);
        } catch (e) {
            logTest('READ demanda', false, e.message);
        }
        
        // UPDATE (mover no Kanban)
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/demandas?id=eq.${novaDemandaId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'em_andamento', prioridade: 'alta' })
            });
            logTest('UPDATE demanda (Kanban move)', response.ok);
        } catch (e) {
            logTest('UPDATE demanda (Kanban move)', false, e.message);
        }
        
        // DELETE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/demandas?id=eq.${novaDemandaId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            logTest('DELETE demanda', response.ok);
        } catch (e) {
            logTest('DELETE demanda', false, e.message);
        }
    }
}

// =====================================================
// TESTES DE ANOTAÇÕES (CRUD)
// =====================================================
async function testarCRUDAnotacoes(empresaId) {
    console.log('\n📝 TESTANDO CRUD ANOTAÇÕES...\n');
    
    let novaAnotacaoId = null;
    
    // CREATE
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/anotacoes`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                empresa_id: empresaId,
                titulo: 'TESTE ANOTAÇÃO - Deletar',
                texto: 'Texto de teste automatizado',
                categoria: 'tecnico'
            })
        });
        const data = await response.json();
        novaAnotacaoId = data[0]?.id;
        logTest('CREATE anotação', response.ok && novaAnotacaoId);
    } catch (e) {
        logTest('CREATE anotação', false, e.message);
    }
    
    if (novaAnotacaoId) {
        // UPDATE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/anotacoes?id=eq.${novaAnotacaoId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ categoria: 'estrategia' })
            });
            logTest('UPDATE anotação', response.ok);
        } catch (e) {
            logTest('UPDATE anotação', false, e.message);
        }
        
        // DELETE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/demandas?id=eq.${novaAnotacaoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            logTest('DELETE anotação', response.ok);
        } catch (e) {
            logTest('DELETE anotação', false, e.message);
        }
    }
}

// =====================================================
// TESTES DE BRIEFINGS (CRUD)
// =====================================================
async function testarCRUDBriefings(empresaId) {
    console.log('\n📋 TESTANDO CRUD BRIEFINGS...\n');
    
    let novoBriefingId = null;
    
    // CREATE
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/briefings`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                empresa_id: empresaId,
                titulo_reuniao: 'TESTE BRIEFING - Deletar',
                data_reuniao: '2025-12-31',
                participantes: ['Teste 1', 'Teste 2'],
                pauta: 'Pauta de teste',
                resumo: 'Resumo de teste',
                proximos_passos: 'Próximos passos de teste'
            })
        });
        const data = await response.json();
        novoBriefingId = data[0]?.id;
        logTest('CREATE briefing', response.ok && novoBriefingId);
    } catch (e) {
        logTest('CREATE briefing', false, e.message);
    }
    
    if (novoBriefingId) {
        // DELETE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/briefings?id=eq.${novoBriefingId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            logTest('DELETE briefing', response.ok);
        } catch (e) {
            logTest('DELETE briefing', false, e.message);
        }
    }
}

// =====================================================
// TESTES DE BIBLIOTECA (CRUD)
// =====================================================
async function testarCRUDBiblioteca(empresaId) {
    console.log('\n📚 TESTANDO CRUD BIBLIOTECA...\n');
    
    let novoConteudoId = null;
    
    // CREATE
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/conteudos_prontos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                empresa_id: empresaId,
                titulo: 'TESTE BIBLIOTECA - Deletar',
                tipo: 'reels',
                legenda: 'Legenda de teste',
                midia_urls: ['https://example.com/teste.jpg']
            })
        });
        const data = await response.json();
        novoConteudoId = data[0]?.id;
        logTest('CREATE biblioteca', response.ok && novoConteudoId);
    } catch (e) {
        logTest('CREATE biblioteca', false, e.message);
    }
    
    if (novoConteudoId) {
        // DELETE
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/conteudos_prontos?id=eq.${novoConteudoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            logTest('DELETE biblioteca', response.ok);
        } catch (e) {
            logTest('DELETE biblioteca', false, e.message);
        }
    }
}

// =====================================================
// TESTES DE CONTEÚDO OZEMPIC
// =====================================================
async function testarConteudoOzempic(empresaId) {
    console.log('\n🎯 TESTANDO CONTEÚDO OZEMPIC...\n');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/planejamento_conteudos?empresa_id=eq.${empresaId}&titulo=ilike.*ozempic*&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        
        if (data.length > 0) {
            const ozempic = data[0];
            logTest('Conteúdo Ozempic existe', true);
            logTest('Ozempic tem slides', Array.isArray(ozempic.slides) && ozempic.slides.length > 0, `${ozempic.slides?.length || 0} slides`);
            logTest('Ozempic tem prompts imagem', Array.isArray(ozempic.prompts_imagem) && ozempic.prompts_imagem.length > 0, `${ozempic.prompts_imagem?.length || 0} prompts`);
            logTest('Ozempic tem prompts video', Array.isArray(ozempic.prompts_video) && ozempic.prompts_video.length > 0, `${ozempic.prompts_video?.length || 0} prompts`);
            logTest('Ozempic tem legenda', !!ozempic.legenda);
            logTest('Ozempic mês Janeiro', ozempic.mes === 1);
            logTest('Ozempic ano 2025', ozempic.ano === 2025);
        } else {
            logTest('Conteúdo Ozempic existe', false, 'Não encontrado');
        }
    } catch (e) {
        logTest('Conteúdo Ozempic existe', false, e.message);
    }
}

// =====================================================
// TESTES DE HTML/DOM
// =====================================================
function testarDOM() {
    console.log('\n🌐 TESTANDO DOM/HTML...\n');
    
    // Elementos essenciais
    const elementos = [
        'sidebar', 'mainContent', 'tab-dashboard', 'tab-planejamento', 
        'tab-biblioteca', 'tab-demandas', 'tab-anotacoes',
        'modalOverlay', 'modalContent', 'toastContainer',
        'mesesGrid', 'mesDetalhe', 'kanbanBoard'
    ];
    
    elementos.forEach(id => {
        const el = document.getElementById(id);
        logTest(`Elemento #${id} existe`, !!el);
    });
    
    // Navegação
    const navItems = document.querySelectorAll('.nav-item');
    logTest('Nav items existem', navItems.length >= 5, `${navItems.length} items`);
    
    // Kanban columns
    const kanbanCols = document.querySelectorAll('.kanban-column');
    logTest('Kanban 4 colunas', kanbanCols.length === 4);
}

// =====================================================
// TESTES DE CSS
// =====================================================
function testarCSS() {
    console.log('\n🎨 TESTANDO CSS...\n');
    
    // Verificar se variáveis CSS existem
    const root = getComputedStyle(document.documentElement);
    
    const variaveis = ['--oceano', '--gold', '--branco', '--cinza-500', '--vermelho', '--verde'];
    variaveis.forEach(v => {
        const valor = root.getPropertyValue(v);
        logTest(`CSS var ${v}`, valor.trim().length > 0);
    });
    
    // Verificar fontes
    const body = getComputedStyle(document.body);
    logTest('Font family definida', body.fontFamily.includes('Space Grotesk') || body.fontFamily.length > 0);
}

// =====================================================
// TESTES DE FUNÇÕES JS
// =====================================================
function testarFuncoesJS() {
    console.log('\n⚡ TESTANDO FUNÇÕES JS...\n');
    
    const funcoes = [
        'carregarEmpresa', 'carregarPlanejamento', 'carregarDemandas',
        'carregarAnotacoes', 'carregarBriefings', 'renderizarMeses',
        'renderizarKanban', 'renderizarAnotacoes', 'renderizarBriefings',
        'abrirModalVisualizacao', 'abrirEditorCompleto', 'fecharModal',
        'showToast', 'formatarData', 'atualizarDashboard'
    ];
    
    funcoes.forEach(fn => {
        logTest(`Função ${fn}() existe`, typeof window[fn] === 'function');
    });
    
    // Testar formatarData
    if (typeof formatarData === 'function') {
        const resultado = formatarData('2025-12-31');
        logTest('formatarData funciona', resultado === '31/12/2025', resultado);
    }
    
    // Testar state
    logTest('State global existe', typeof state === 'object');
    logTest('State.empresa', state && 'empresa' in state);
    logTest('State.planejamento', state && Array.isArray(state.planejamento));
    logTest('State.demandas', state && Array.isArray(state.demandas));
}

// =====================================================
// TESTES DE CONSTANTES
// =====================================================
function testarConstantes() {
    console.log('\n📊 TESTANDO CONSTANTES...\n');
    
    logTest('MESES array 12 itens', typeof MESES !== 'undefined' && MESES.length === 12);
    logTest('TIPOS_ICONE objeto', typeof TIPOS_ICONE !== 'undefined' && typeof TIPOS_ICONE === 'object');
    logTest('STATUS_CONFIG objeto', typeof STATUS_CONFIG !== 'undefined' && typeof STATUS_CONFIG === 'object');
    logTest('SUPABASE_CONFIG existe', typeof SUPABASE_CONFIG !== 'undefined');
}

// =====================================================
// EXECUTAR TODOS OS TESTES
// =====================================================
async function executarTodosOsTestes() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   🧪 BEATLIFE CONTENT STUDIO - SUITE DE TESTES');
    console.log('   📅 ' + new Date().toLocaleString('pt-BR'));
    console.log('═══════════════════════════════════════════════════════');
    
    // Testes de Front-end
    testarDOM();
    testarCSS();
    testarFuncoesJS();
    testarConstantes();
    
    // Testes de Backend/Banco
    await testarSupabaseConnection();
    await testarTabelas();
    const empresa = await testarEmpresaBeatlife();
    
    if (empresa) {
        await testarCRUDConteudos(empresa.id);
        await testarCRUDDemandas(empresa.id);
        await testarCRUDAnotacoes(empresa.id);
        await testarCRUDBriefings(empresa.id);
        await testarCRUDBiblioteca(empresa.id);
        await testarConteudoOzempic(empresa.id);
    }
    
    // Relatório Final
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   📊 RELATÓRIO FINAL');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   ✅ PASSOU: ${testResults.passed}`);
    console.log(`   ❌ FALHOU: ${testResults.failed}`);
    console.log(`   📈 TAXA: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════');
    
    // Mostrar falhas
    if (testResults.failed > 0) {
        console.log('\n⚠️ TESTES QUE FALHARAM:');
        testResults.tests.filter(t => !t.passed).forEach(t => {
            console.log(`   - ${t.name}${t.details ? ': ' + t.details : ''}`);
        });
    }
    
    return testResults;
}

// Exportar para uso global
window.executarTodosOsTestes = executarTodosOsTestes;
window.testResults = testResults;

console.log('🧪 Suite de testes carregada! Execute: executarTodosOsTestes()');
