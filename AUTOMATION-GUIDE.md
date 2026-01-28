# 🤖 Content Studio - Guia de Automação

## APIs Disponíveis

Após carregar o Content Studio, você tem acesso a estas APIs no console do navegador:

### 1. ClaudeAPI (API Básica)
```javascript
// Adicionar conteúdo
await ClaudeAPI.adicionarConteudo({
    titulo: 'Meu Conteúdo',
    tipo: 'carrossel',  // carrossel, reels, static, markdown
    legenda: 'Texto da legenda',
    markdown_content: '# Título\nConteúdo...'  // opcional
});

// Listar conteúdos
await ClaudeAPI.listarConteudos('carrossel');  // ou null para todos

// Obter conteúdo específico
await ClaudeAPI.obterConteudo('uuid-do-conteudo');

// Adicionar demanda
await ClaudeAPI.adicionarDemanda({
    titulo: 'Nova Demanda',
    descricao: 'Descrição',
    prioridade: 'alta',  // baixa, normal, alta
    solicitante: 'Seu Nome'
});

// Adicionar nota
await ClaudeAPI.adicionarNota({
    titulo: 'Minha Nota',
    texto: 'Conteúdo da nota'
});
```

### 2. AutomationAPI (API de Aprovação - NOVA!)
```javascript
// Adicionar conteúdo para aprovação
await AutomationAPI.adicionarParaAprovacao({
    titulo: 'Carrossel Treino Funcional',
    tipo: 'carrossel',
    legenda: 'Texto da legenda do post',
    fonte: 'claude-desktop',  // ou 'n8n'
    prioridade: 'alta'
});

// Aprovar conteúdo
await AutomationAPI.aprovarConteudo('uuid-do-conteudo');

// Solicitar ajuste
await AutomationAPI.solicitarAjuste(
    'uuid-do-conteudo',
    'Trocar a cor do texto para dourado',
    'alta'  // baixa, normal, alta
);

// Listar por status de aprovação
await AutomationAPI.listarPorAprovacao('pendente');  // pendente, aprovado, ajuste
await AutomationAPI.listarPorAprovacao();  // todos

// Estatísticas de aprovação
await AutomationAPI.getStats();
// Retorna: { total, pendentes, aprovados, ajustes }

// Ver documentação
AutomationAPI.getWebhookInfo();
```

---

## 🔄 Integração com n8n

### Método 1: Via Browser Automation (Puppeteer/Playwright)

1. **Instale o node n8n-nodes-puppeteer** ou use HTTP Request

2. **Configure o workflow:**

```
[Trigger] → [Open Browser] → [Execute Script] → [Close]
```

3. **Script de exemplo para adicionar conteúdo:**

```javascript
// No node de Execute Script
await page.goto('https://gabrielkendy.github.io/thebeat-apresentacao/');
await page.waitForSelector('.nav-link');

// Executar API
const resultado = await page.evaluate(async () => {
    // Aguardar sistema carregar
    await new Promise(r => setTimeout(r, 2000));
    
    return await AutomationAPI.adicionarParaAprovacao({
        titulo: 'Novo Post via n8n',
        tipo: 'carrossel',
        legenda: 'Legenda automatizada',
        fonte: 'n8n'
    });
});

return resultado;
```

### Método 2: Via Claude Desktop MCP

1. Abra o Content Studio no navegador
2. No Claude Desktop, peça para adicionar conteúdo usando a API

**Exemplo de prompt para Claude:**
```
Acesse o Content Studio no meu navegador e use a AutomationAPI 
para adicionar um novo conteúdo para aprovação com:
- Título: Carrossel sobre Mobilidade
- Tipo: carrossel
- Legenda: 5 exercícios de mobilidade para fazer antes do treino
```

### Método 3: Bookmarklet

Crie um favorito com este código para adicionar conteúdo rápido:

```javascript
javascript:(async()=>{const t=prompt('Título:');const l=prompt('Legenda:');if(t){const r=await AutomationAPI.adicionarParaAprovacao({titulo:t,tipo:'carrossel',legenda:l,fonte:'bookmarklet'});alert(r.message)}})();
```

---

## 📊 Status de Aprovação

| Status | Descrição | Ação Seguinte |
|--------|-----------|---------------|
| ⏳ Pendente | Aguardando revisão | Aprovar ou Pedir Ajuste |
| ✅ Aprovado | Pronto para publicação | - |
| ✏️ Ajuste | Precisa de correções | Corrigir e voltar para Pendente |

---

## 🔧 Campos do Conteúdo

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| titulo | string | ✅ | Título do conteúdo |
| tipo | string | ❌ | carrossel, reels, static, markdown |
| legenda | string | ❌ | Texto/legenda do post |
| markdown_content | string | ❌ | Conteúdo em markdown |
| midia_urls | array | ❌ | URLs das mídias |
| fonte | string | ❌ | Origem (n8n, claude-desktop, etc) |
| prioridade | string | ❌ | baixa, normal, alta |

---

## 💡 Dicas

1. **Sempre aguarde o sistema carregar** antes de chamar as APIs
2. **Use `fonte`** para identificar de onde veio o conteúdo
3. **Filtros de aprovação** estão disponíveis na aba Biblioteca
4. **Histórico de ajustes** fica salvo para cada conteúdo

---

## 🚀 Exemplo Completo - Workflow n8n

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trigger   │───▶│  Preparar   │───▶│  Browser    │───▶│  Notificar  │
│  (Webhook)  │    │    Dados    │    │   Script    │    │  (Slack)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Dados de entrada (Webhook):**
```json
{
    "titulo": "Novo Carrossel",
    "tipo": "carrossel",
    "legenda": "Texto da legenda"
}
```

**Script Browser:**
```javascript
const dados = $json;
const resultado = await AutomationAPI.adicionarParaAprovacao({
    ...dados,
    fonte: 'n8n-webhook'
});
return { sucesso: resultado.success, id: resultado.id };
```

---

Versão: 6.0 | Atualizado: Janeiro 2026
