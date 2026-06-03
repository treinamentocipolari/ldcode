/* ============================================================
   LDCODE — Servidor de Live Chat em Tempo Real
   Node.js + Express + Socket.io + CORS
   ------------------------------------------------------------
   - Diferencia VISITANTES (pessoas no site) de ADMINS (atendentes).
   - Cada visitante tem um sessionId persistente (gerado no navegador).
   - Histórico recente guardado em memória + arquivo chat-data.json,
     para o visitante não perder a conversa ao recarregar a página.
   ============================================================ */

'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

/* ----------------------- Config ----------------------- */
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'chat-data.json');
const MAX_MSGS_PER_SESSION = 100;   // limite de histórico por visitante
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 3; // limpa sessões com +3 dias sem atividade

/* --- Telegram Bot --- */
// Cole as credenciais aqui depois de criar o bot no Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8765973827:AAG1Bsq36bCENme9jDVEA7Q0_nr-q6Vwxbs';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8530466354';

function notifyTelegram(visitorName, text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const https = require('https');
  const message = `🔔 *Novo Cliente no Site!*\n\n*${visitorName}:* ${text}\n\nAbra o painel para responder: http://seusite.com/painel-admin.html`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&parse_mode=Markdown&text=${encodeURIComponent(message)}`;
  
  https.get(url, (res) => {}).on('error', (e) => {
    console.error('Erro ao notificar Telegram:', e.message);
  });
}

/* ----------------------- App / IO ---------------------- */
const app = express();
app.use(cors());
app.use(express.json());

// Serve o painel e (opcionalmente) os arquivos estáticos do site.
// Coloque server.js na MESMA pasta do index.html para servir tudo junto,
// ou ajuste o caminho abaixo conforme sua estrutura.
app.use(express.static(__dirname));

app.get('/health', (_req, res) => res.json({ ok: true, sessions: Object.keys(sessions).length }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

/* ----------------------- Estado ------------------------ */
/*
  sessions = {
    [sessionId]: {
      id, name, online, lastSeen, unread,
      socketId,                // socket atual do visitante (null se offline)
      messages: [ { id, from:'visitor'|'admin', text, time } ]
    }
  }
*/
let sessions = loadData();
const adminSockets = new Set();   // sockets de atendentes conectados

/* ----------------------- Persistência ------------------ */
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // ao subir o servidor ninguém está conectado
      Object.values(raw).forEach(s => { s.online = false; s.socketId = null; });
      return raw;
    }
  } catch (e) {
    console.error('Falha ao ler chat-data.json:', e.message);
  }
  return {};
}

let saveTimer = null;
function saveData() {
  // grava com "debounce" para não escrever a cada mensagem
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2));
    } catch (e) {
      console.error('Falha ao salvar chat-data.json:', e.message);
    }
  }, 400);
}

/* ----------------------- Helpers ----------------------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Sanitiza texto recebido (evita HTML/script injection no painel e no site).
function clean(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 2000);
}

function ensureSession(sessionId) {
  let s = sessions[sessionId];
  if (!s) {
    s = sessions[sessionId] = {
      id: sessionId,
      name: 'Visitante ' + sessionId.slice(0, 4),
      online: false,
      lastSeen: Date.now(),
      unread: 0,
      socketId: null,
      messages: []
    };
  }
  return s;
}

function pushMessage(session, from, text) {
  const msg = { id: uid(), from, text: clean(text), time: Date.now() };
  session.messages.push(msg);
  if (session.messages.length > MAX_MSGS_PER_SESSION) {
    session.messages = session.messages.slice(-MAX_MSGS_PER_SESSION);
  }
  session.lastSeen = Date.now();
  saveData();
  return msg;
}

// Resumo leve de uma sessão (sem o array inteiro de mensagens) para a lista do painel.
function summarize(s) {
  const last = s.messages[s.messages.length - 1];
  return {
    id: s.id,
    name: s.name,
    online: s.online,
    lastSeen: s.lastSeen,
    unread: s.unread,
    lastMessage: last ? last.text : '',
    lastFrom: last ? last.from : null
  };
}

function sessionList() {
  return Object.values(sessions)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map(summarize);
}

function broadcastSessions() {
  const list = sessionList();
  adminSockets.forEach(id => io.to(id).emit('admin:sessions', list));
}

// Limpeza periódica de sessões antigas.
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(sessions)) {
    if (!sessions[id].online && now - sessions[id].lastSeen > SESSION_TTL_MS) {
      delete sessions[id];
      changed = true;
    }
  }
  if (changed) { saveData(); broadcastSessions(); }
}, 1000 * 60 * 30);

/* ----------------------- Socket.io --------------------- */
io.on('connection', (socket) => {
  let role = null;          // 'visitor' | 'admin'
  let sessionId = null;     // só para visitantes

  /* ---------- VISITANTE entra ---------- */
  socket.on('visitor:join', (payload = {}) => {
    role = 'visitor';
    sessionId = String(payload.sessionId || uid());
    const s = ensureSession(sessionId);
    s.online = true;
    s.socketId = socket.id;
    s.lastSeen = Date.now();
    if (payload.name) s.name = clean(payload.name).slice(0, 60);

    socket.join('session:' + sessionId);

    // devolve o id (caso o servidor tenha gerado) + histórico salvo
    socket.emit('visitor:welcome', { sessionId, name: s.name });
    socket.emit('visitor:history', s.messages);

    broadcastSessions();
  });

  /* ---------- VISITANTE envia mensagem ---------- */
  socket.on('visitor:message', (payload = {}) => {
    if (role !== 'visitor' || !sessionId) return;
    const s = ensureSession(sessionId);
    const text = (payload.text || '').trim();
    if (!text) return;

    const msg = pushMessage(s, 'visitor', text);
    s.unread = (s.unread || 0) + 1;

    // confirma para o próprio visitante (eco) e avisa os admins
    socket.emit('visitor:sent', msg);
    adminSockets.forEach(id => io.to(id).emit('admin:message', { sessionId, message: msg }));
    
    // Notifica no Telegram
    if (adminSockets.size === 0 || s.unread === 1) {
      notifyTelegram(s.name, text);
    }

    broadcastSessions();
  });

  /* ---------- VISITANTE digitando ---------- */
  socket.on('visitor:typing', () => {
    if (role !== 'visitor' || !sessionId) return;
    adminSockets.forEach(id => io.to(id).emit('admin:typing', { sessionId }));
  });

  /* ---------- ADMIN entra ---------- */
  socket.on('admin:join', () => {
    role = 'admin';
    adminSockets.add(socket.id);
    socket.emit('admin:sessions', sessionList());
  });

  /* ---------- ADMIN abre uma conversa (pede histórico) ---------- */
  socket.on('admin:open', (payload = {}) => {
    if (role !== 'admin') return;
    const s = sessions[payload.sessionId];
    if (!s) return;
    s.unread = 0;
    socket.emit('admin:history', { sessionId: s.id, name: s.name, messages: s.messages });
    broadcastSessions();
  });

  /* ---------- ADMIN responde ---------- */
  socket.on('admin:message', (payload = {}) => {
    if (role !== 'admin') return;
    const s = sessions[payload.sessionId];
    if (!s) return;
    const text = (payload.text || '').trim();
    if (!text) return;

    const msg = pushMessage(s, 'admin', text);

    // entrega em tempo real ao visitante (se online) e ecoa para todos os admins
    io.to('session:' + s.id).emit('visitor:message', msg);
    adminSockets.forEach(id => io.to(id).emit('admin:message', { sessionId: s.id, message: msg }));
    broadcastSessions();
  });

  /* ---------- ADMIN digitando ---------- */
  socket.on('admin:typing', (payload = {}) => {
    if (role !== 'admin') return;
    io.to('session:' + payload.sessionId).emit('visitor:typing');
  });

  /* ---------- Desconexão ---------- */
  socket.on('disconnect', () => {
    if (role === 'admin') {
      adminSockets.delete(socket.id);
    } else if (role === 'visitor' && sessionId && sessions[sessionId]) {
      const s = sessions[sessionId];
      if (s.socketId === socket.id) {
        s.online = false;
        s.socketId = null;
        s.lastSeen = Date.now();
        saveData();
        broadcastSessions();
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('  LDCODE Live Chat rodando em http://localhost:' + PORT);
  console.log('  Painel de atendimento: http://localhost:' + PORT + '/painel-chat.html');
  console.log('====================================================');
});
