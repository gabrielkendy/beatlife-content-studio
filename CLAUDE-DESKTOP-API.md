# Integração Claude Desktop com Content Studio

## Setup Inicial

### 1. Atualizar Banco de Dados
Execute no **Supabase SQL Editor** (https://supabase.com/dashboard):

```sql
ALTER TABLE conteudos_prontos
ADD COLUMN IF NOT EXISTS markdown_content TEXT;
```

### 2. Acessar a API
A API está disponível no console do navegador quando o Content Studio está aberto:

```javascript
// Acessar via console (F12)
window.ClaudeAPI
// ou
window.ContentStudioAPI
```

---

## Métodos Disponíveis

### 1. Adicionar Conteúdo Markdown
```javascript
await ClaudeAPI.adicionarConteudo({
    titulo: "Roteiro de Conteúdo",
    tipo: "markdown",
    conteudo: "# Meu Conteúdo\n\nTexto aqui...",
    legenda: "Descrição opcional"
});
```

### 2. Listar Conteúdos
```javascript
// Todos os conteúdos
await ClaudeAPI.listarConteudos();

// Filtrar por tipo
await ClaudeAPI.listarConteudos('markdown');
await ClaudeAPI.listarConteudos('carrossel');
```

### 3. Obter Conteúdo Específico
```javascript
await ClaudeAPI.obterConteudo('uuid-do-conteudo');
```

### 4. Adicionar Demanda
```javascript
await ClaudeAPI.adicionarDemanda({
    titulo: "Criar novo post",
    descricao: "Detalhes da demanda",
    prioridade: "alta", // baixa, normal, alta
    solicitante: "Claude Desktop"
});
```

### 5. Adicionar Nota
```javascript
await ClaudeAPI.adicionarNota({
    titulo: "Ideias para Janeiro",
    texto: "Conteúdo da nota..."
});
```

---

## Uso com Claude Desktop (MCP)

### Configuração MCP
Adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "beatlife-content-studio": {
      "command": "node",
      "args": ["path/to/mcp-server.js"],
      "env": {
        "SUPABASE_URL": "https://gpqxqykgcrpmvwxktjvp.supabase.co",
        "SUPABASE_KEY": "sua-chave-aqui"
      }
    }
  }
}
```

### Exemplo de MCP Server (Node.js)
```javascript
// mcp-server.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Adicionar conteúdo via stdin/stdout
process.stdin.on('data', async (data) => {
    const { action, payload } = JSON.parse(data);

    if (action === 'add_content') {
        const { data: result, error } = await supabase
            .from('conteudos_prontos')
            .insert([{
                empresa_id: 'seu-empresa-id',
                titulo: payload.titulo,
                tipo: 'markdown',
                markdown_content: payload.conteudo
            }])
            .select();

        process.stdout.write(JSON.stringify({ success: !error, data: result }));
    }
});
```

---

## Integração Direta via REST API

### Adicionar Conteúdo
```bash
curl -X POST "https://gpqxqykgcrpmvwxktjvp.supabase.co/rest/v1/conteudos_prontos" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "seu-uuid",
    "titulo": "Meu Documento",
    "tipo": "markdown",
    "markdown_content": "# Conteúdo\n\nTexto aqui..."
  }'
```

### Listar Conteúdos
```bash
curl "https://gpqxqykgcrpmvwxktjvp.supabase.co/rest/v1/conteudos_prontos?empresa_id=eq.seu-uuid" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY"
```

---

## Tipos de Conteúdo Suportados

| Tipo | Descrição |
|------|-----------|
| `markdown` | Documentos .md com formatação |
| `carrossel` | Posts de carrossel |
| `reels` | Vídeos curtos |
| `static` | Imagens estáticas |

---

## Credenciais

- **Supabase URL:** `https://gpqxqykgcrpmvwxktjvp.supabase.co`
- **Anon Key:** Use para operações de leitura
- **Service Key:** Use para operações de escrita

⚠️ **Nunca exponha a Service Key em código público!**
