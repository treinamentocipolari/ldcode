# LDCODE — Live Chat em Tempo Real (Node.js + Socket.io)

Sistema de chat real, embutido no próprio site, **sem abrir o WhatsApp do cliente**.
A UI flutuante do `index.html` (`#waChat` / `#waFloat`) foi mantida 100% intacta — só a
"inteligência" por trás dela mudou: agora conversa de verdade com você pelo painel.

## Arquivos entregues

| Arquivo | O que é |
|---|---|
| `server.js` | Servidor Node + Express + Socket.io (gerencia visitantes e admins) |
| `package.json` | Dependências (`express`, `socket.io`, `cors`) |
| `painel-chat.html` | Sua central de atendimento (sessões ativas + histórico + responder) |
| `app-chat-block.js` | Bloco que **substitui** a parte de chat do seu `app.js` |
| `INSTRUCOES.md` | Este guia |

---

## 1. Subir o servidor

```bash
# na pasta onde estão server.js e package.json
npm install
npm start
```

Você verá:

```
LDCODE Live Chat rodando em http://localhost:3000
Painel de atendimento: http://localhost:3000/painel-chat.html
```

O histórico fica salvo em `chat-data.json` (criado automaticamente). É só esse arquivo —
se quiser zerar tudo, apague-o.

> **Dica de hospedagem:** coloque o `server.js` na mesma pasta do site (com `index.html`,
> `styles.css`, etc.) e o servidor já serve tudo junto em `http://localhost:3000`.
> Em produção, rode atrás de um domínio com HTTPS (ex.: Railway, Render, VPS com Nginx).

---

## 2. Alterações no `index.html`

Você só precisa **adicionar UMA linha** de script, logo **antes** de `<script src="app.js"></script>`.

### Antes
```html
<script src="image-slot.js"></script>
<script src="cms.js"></script>
<script src="app.js"></script>
</body>
```

### Depois
```html
<script src="image-slot.js"></script>
<script src="cms.js"></script>
<!-- cliente Socket.io: troque a URL pelo seu servidor em produção -->
<script src="http://localhost:3000/socket.io/socket.io.js"></script>
<script src="app.js"></script>
</body>
```

> Em produção, troque `http://localhost:3000` pelo domínio do seu servidor de chat
> (o mesmo valor de `CHAT_SERVER` no app.js).

Nada mais muda no `index.html`. A marcação do `#waChat`, `#waFloat`, `#waForm`,
`#waBody`, `#waQuick` permanece igual.

---

## 3. Alterações no `app.js`

No `app.js`, localize o bloco do chat flutuante. Ele começa em:

```js
/* ---------- WhatsApp: botão flutuante arrastável + chat ---------- */
function waLink(text) { return 'https://wa.me/' + WHATSAPP + ...; }
(function () {
  ...
})();
```

e termina **logo antes** de:

```js
/* ---------- Formulário -> WhatsApp ---------- */
```

**Apague todo esse trecho** (a função `waLink`, o IIFE inteiro, incluindo o `botReply`
falso e o `qObserver`) e **cole no lugar** o conteúdo do arquivo `app-chat-block.js`
(copie tudo entre `INÍCIO DO BLOCO` e `FIM DO BLOCO`).

> O `botReply`, o `typingThen`, o handoff `__wa__` e o `MutationObserver` saem.
> A função `addMsg(html, 'in')` continua existindo e é usada para mostrar as respostas
> do atendente, exatamente como pedido. O resto do `app.js` (tema, nav, sliders, FAQ,
> formulário de lead, partículas) **não muda**.

### Configurar a URL do servidor
No topo do bloco colado há:

```js
var CHAT_SERVER = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://SEU-DOMINIO-DO-CHAT.com.br';   // <-- troque em produção
```

Em testes locais funciona sozinho. Em produção, troque a URL do `else`.

---

## 4. Como funciona o fluxo

1. **Visitante** abre o site → o chat conecta no servidor com um `sessionId` salvo no
   navegador (`localStorage`). Se ele recarregar, recebe o histórico de volta.
2. Visitante escreve e dá submit (`#waForm`) → mensagem vai pro servidor via Socket.io.
3. Você abre `painel-chat.html` → vê a lista de **Sessões Ativas** (verde = online).
4. Você clica no visitante → vê o histórico e digita a resposta.
5. A resposta chega **em tempo real** na tela dele e aparece via `addMsg(html, 'in')`,
   animada como antes. Indicadores de "digitando…" funcionam nos dois sentidos.

---

## 5. Eventos Socket.io (referência)

| Evento | Direção | Payload |
|---|---|---|
| `visitor:join` | visitante → servidor | `{ sessionId }` |
| `visitor:history` | servidor → visitante | `[ messages ]` |
| `visitor:message` | visitante → servidor **e** servidor → visitante | `{ text }` / `{ id, from, text, time }` |
| `visitor:typing` | visitante → servidor / servidor → visitante | — |
| `admin:join` | admin → servidor | — |
| `admin:sessions` | servidor → admin | `[ resumos das sessões ]` |
| `admin:open` | admin → servidor | `{ sessionId }` |
| `admin:history` | servidor → admin | `{ sessionId, name, messages }` |
| `admin:message` | admin → servidor **e** servidor → admin | `{ sessionId, text }` |
| `admin:typing` | admin → servidor | `{ sessionId }` |

---

## 6. Segurança e produção (recomendações)

- Todo texto é **sanitizado** no servidor (escapa `< > &`) antes de salvar/retransmitir.
- O painel **não tem senha** — proteja-o em produção (Basic Auth no Nginx, ou um login
  simples). Não exponha `painel-chat.html` publicamente sem proteção.
- Em produção, restrinja o `cors.origin` do `server.js` ao seu domínio em vez de `'*'`.
- Use HTTPS (wss) — navegadores bloqueiam WebSocket inseguro em páginas https.
