/* =========================================================================
   LDCODE — Bloco de chat flutuante conectado ao Socket.io (SUBSTITUI o antigo)
   -------------------------------------------------------------------------
   COMO USAR:
   No app.js, localize o bloco que começa em:

       /* ---------- WhatsApp: botão flutuante arrastável + chat ---------- *​/
       function waLink(text) { ... }
       (function () { ... })();   // <- todo este IIFE

   e termina logo ANTES de:

       /* ---------- Formulário -> WhatsApp ---------- *​/

   Apague TODO esse trecho (incluindo a função waLink e o botReply falso) e
   cole no lugar exatamente o conteúdo abaixo (entre as linhas marcadas).

   IMPORTANTE: defina a URL do servidor de chat. Em produção, troque
   CHAT_SERVER pelo domínio do seu servidor Node (ex.: 'https://chat.ldcode.com.br').
   ========================================================================= */

/* ===================== INÍCIO DO BLOCO ===================== */

/* ---------- Live Chat em tempo real (Socket.io) ---------- */
(function () {
  var fab = document.getElementById('waFloat');
  var chat = document.getElementById('waChat');
  var body = document.getElementById('waBody');
  var form = document.getElementById('waForm');
  var input = document.getElementById('waText');
  var quick = document.getElementById('waQuick');
  var closeBtn = document.getElementById('waClose');
  if (!fab || !chat) return;

  /* URL do servidor de chat. Local = mesma máquina; produção = seu domínio. */
  var CHAT_SERVER = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://SEU-DOMINIO-DO-CHAT.com.br';   // <-- troque em produção

  /* ===== arrastar o botão (idêntico ao original) ===== */
  var FAB = 60, M = 12, dragging = false, moved = false, sx, sy, ox, oy;
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function placeFab(left, top) {
    left = clamp(left, M, window.innerWidth - FAB - M);
    top = clamp(top, M, window.innerHeight - FAB - M);
    fab.style.left = left + 'px'; fab.style.top = top + 'px';
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
    positionChat();
  }
  try {
    var savedPos = JSON.parse(localStorage.getItem('ldcode_wa_pos') || 'null');
    if (savedPos && typeof savedPos.left === 'number') placeFab(savedPos.left, savedPos.top);
  } catch (e) {}

  fab.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false;
    var r = fab.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 5) { moved = true; fab.classList.add('dragging'); }
    if (moved) placeFab(ox + dx, oy + dy);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false; fab.classList.remove('dragging');
    if (moved) {
      var r = fab.getBoundingClientRect();
      try { localStorage.setItem('ldcode_wa_pos', JSON.stringify({ left: r.left, top: r.top })); } catch (e2) {}
    }
  }
  fab.addEventListener('pointerup', function (e) {
    var wasMoved = moved; endDrag();
    if (!wasMoved) toggle();
  });
  fab.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', function () {
    var r = fab.getBoundingClientRect();
    if (fab.style.left) placeFab(r.left, r.top);
    positionChat();
  });

  /* ===== posicionar o chat junto do botão (idêntico ao original) ===== */
  function positionChat() {
    if (window.innerWidth <= 480) { chat.style.left = chat.style.top = chat.style.right = chat.style.bottom = ''; return; }
    var r = fab.getBoundingClientRect();
    var cw = chat.offsetWidth || 360, chh = chat.offsetHeight || 520;
    var center = r.left + r.width / 2;
    var left = (center > window.innerWidth / 2) ? (r.right - cw) : r.left;
    left = clamp(left, M, window.innerWidth - cw - M);
    var top = r.top - chh - 12;
    if (top < M) top = Math.min(r.bottom + 12, window.innerHeight - chh - M);
    top = clamp(top, M, window.innerHeight - chh - M);
    chat.style.left = left + 'px'; chat.style.top = top + 'px';
    chat.style.right = 'auto'; chat.style.bottom = 'auto';
  }

  /* ===== abrir/fechar (idêntico ao original) ===== */
  function open() {
    chat.classList.add('open'); fab.classList.add('open');
    chat.setAttribute('aria-hidden', 'false');
    positionChat();
    setTimeout(function () { input.focus(); }, 300);
    body.scrollTop = body.scrollHeight;
  }
  function close() {
    chat.classList.remove('open'); fab.classList.remove('open');
    chat.setAttribute('aria-hidden', 'true');
  }
  function toggle() { chat.classList.contains('open') ? close() : open(); }
  closeBtn.addEventListener('click', close);

  /* ===== mensagens (addMsg/typing PRESERVADOS) ===== */
  function nowTime() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function addMsg(html, dir) {
    var m = document.createElement('div');
    m.className = 'wa-msg ' + dir;
    m.innerHTML = '<p>' + html + '</p><span class="wa-time">' + nowTime() + '</span>';
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }
  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function setQuick(options) {
    quick.innerHTML = '';
    (options || []).forEach(function (o) {
      var b = document.createElement('button'); b.textContent = o; quick.appendChild(b);
    });
    quick.style.display = (options && options.length) ? '' : 'none';
  }

  var typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'wa-typing';
    typingEl.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(typingEl);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  /* ===== Socket.io ===== */
  /* sessionId persistente: o visitante não perde a conversa ao recarregar */
  var sessionId;
  try { sessionId = localStorage.getItem('ldcode_chat_sid'); } catch (e) {}
  if (!sessionId) {
    sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem('ldcode_chat_sid', sessionId); } catch (e) {}
  }

  var socket = io(CHAT_SERVER, { transports: ['websocket', 'polling'] });
  var historyLoaded = false;

  socket.on('connect', function () {
    socket.emit('visitor:join', { sessionId: sessionId });
  });

  /* histórico salvo: recria a conversa anterior (uma única vez) */
  socket.on('visitor:history', function (messages) {
    if (historyLoaded) return;
    historyLoaded = true;
    if (messages && messages.length) {
      setQuick([]); // se já conversou antes, esconde os botões iniciais
      messages.forEach(function (m) {
        addMsg(m.text.replace(/\n/g, '<br>'), m.from === 'admin' ? 'in' : 'out');
      });
    }
  });

  /* resposta do atendente chega em tempo real */
  socket.on('visitor:message', function (m) {
    hideTyping();
    addMsg(m.text.replace(/\n/g, '<br>'), 'in');
  });

  /* atendente está digitando */
  socket.on('visitor:typing', function () {
    showTyping();
    clearTimeout(showTyping._t);
    showTyping._t = setTimeout(hideTyping, 4000);
  });

  /* ===== envio do visitante ===== */
  function handle(text) {
    text = (text || '').trim();
    if (!text) return;
    addMsg(escapeHtml(text), 'out');     // mostra imediatamente
    input.value = '';
    setQuick([]);
    socket.emit('visitor:message', { text: text });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); handle(input.value); });
  input.addEventListener('input', function () { socket.emit('visitor:typing'); });

  quick.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    handle(b.textContent);
  });
})();

/* ===================== FIM DO BLOCO ===================== */
