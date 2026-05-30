/* ================= LDCODE — interações ================= */
(function () {
  'use strict';

  /* Número do WhatsApp — vem do painel (CMS). Edite em Configurações. */
  var WHATSAPP = (window.LDCMS && window.LDCMS.get('whatsapp')) || '5500000000000';

  /* ---------- Tema claro/escuro ---------- */
  (function () {
    var root = document.documentElement;
    function apply(t) {
      if (t === 'light') root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
      var label = document.querySelector('.mobile-menu .theme-row span');
      if (label) label.textContent = (t === 'light') ? 'Tema claro' : 'Tema escuro';
    }
    var saved = 'dark';
    try { saved = localStorage.getItem('ldcode_theme') || 'dark'; } catch (e) {}
    apply(saved);
    function toggle() {
      var cur = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = cur === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem('ldcode_theme', next); } catch (e) {}
    }
    ['themeToggle', 'themeToggleM'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', toggle);
    });
  })();

  /* ---------- Nav: estado ao rolar ---------- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  var scrim = document.getElementById('scrim');
  function closeMenu() { menu.classList.remove('open'); scrim.classList.remove('show'); }
  function openMenu() { menu.classList.add('open'); scrim.classList.add('show'); }
  if (toggle) toggle.addEventListener('click', function () {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });
  if (scrim) scrim.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });

  /* ---------- Reveal ao rolar ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObs.observe(el); });

  /* ---------- Contadores ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1500, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }
  var countObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var stat = e.target.closest('.stat');
        if (stat) stat.classList.add('in');
        animateCount(e.target);
        countObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.num[data-count]').forEach(function (el) { countObs.observe(el); });

  /* ---------- FAQ ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        if (other !== item) { other.classList.remove('open'); other.querySelector('.faq-a').style.maxHeight = null; }
      });
      if (open) { item.classList.remove('open'); a.style.maxHeight = null; }
      else { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---------- WhatsApp: botão flutuante arrastável + chat ---------- */
  function waLink(text) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text); }
  (function () {
    var fab = document.getElementById('waFloat');
    var chat = document.getElementById('waChat');
    var body = document.getElementById('waBody');
    var form = document.getElementById('waForm');
    var input = document.getElementById('waText');
    var quick = document.getElementById('waQuick');
    var closeBtn = document.getElementById('waClose');
    if (!fab || !chat) return;

    /* ===== arrastar o botão ===== */
    var FAB = 60, M = 12, dragging = false, moved = false, sx, sy, ox, oy;
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function placeFab(left, top) {
      left = clamp(left, M, window.innerWidth - FAB - M);
      top = clamp(top, M, window.innerHeight - FAB - M);
      fab.style.left = left + 'px';
      fab.style.top = top + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      positionChat();
    }
    try {
      var saved = JSON.parse(localStorage.getItem('ldcode_wa_pos') || 'null');
      if (saved && typeof saved.left === 'number') placeFab(saved.left, saved.top);
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
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      fab.classList.remove('dragging');
      if (moved) {
        var r = fab.getBoundingClientRect();
        try { localStorage.setItem('ldcode_wa_pos', JSON.stringify({ left: r.left, top: r.top })); } catch (e2) {}
      }
    }
    fab.addEventListener('pointerup', function (e) {
      var wasMoved = moved;
      endDrag(e);
      if (!wasMoved) toggle();           // clique simples (não arrastou) -> abre/fecha
    });
    fab.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', function () {
      var r = fab.getBoundingClientRect();
      if (fab.style.left) placeFab(r.left, r.top);
      positionChat();
    });

    /* ===== posicionar o chat junto do botão ===== */
    function positionChat() {
      if (window.innerWidth <= 480) { chat.style.left = chat.style.top = chat.style.right = chat.style.bottom = ''; return; }
      var r = fab.getBoundingClientRect();
      var cw = chat.offsetWidth || 360, chh = chat.offsetHeight || 520;
      var center = r.left + r.width / 2;
      // horizontal: alinha o chat ao lado do botão, dentro da tela
      var left = (center > window.innerWidth / 2) ? (r.right - cw) : r.left;
      left = clamp(left, M, window.innerWidth - cw - M);
      // vertical: prefere acima do botão; se não couber, abaixo
      var top = r.top - chh - 12;
      if (top < M) top = Math.min(r.bottom + 12, window.innerHeight - chh - M);
      top = clamp(top, M, window.innerHeight - chh - M);
      chat.style.left = left + 'px';
      chat.style.top = top + 'px';
      chat.style.right = 'auto';
      chat.style.bottom = 'auto';
    }

    /* ===== abrir/fechar ===== */
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

    /* ===== mensagens ===== */
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
    function typingThen(cb, delay) {
      var t = document.createElement('div');
      t.className = 'wa-typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
      setTimeout(function () { t.remove(); cb(); }, delay || 1000);
    }
    function setQuick(options) {
      quick.innerHTML = '';
      options.forEach(function (o) {
        var b = document.createElement('button');
        b.textContent = o;
        quick.appendChild(b);
      });
      quick.style.display = options.length ? '' : 'none';
    }

    /* ===== bot: respostas que mantêm a conversa ===== */
    function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function botReply(textRaw) {
      var t = textRaw.toLowerCase();
      function has() { for (var i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) > -1) return true; return false; }

      if (has('site')) return {
        msg: 'Ótimo! Um <b>site profissional</b> deixa seu negócio com cara de grande e passa confiança. 💻<br><br>Ele costuma ficar pronto em poucos dias. Quer que eu te passe um orçamento sem compromisso?',
        quick: ['Sim, quero orçamento', 'Quanto custa?', 'Ver exemplos']
      };
      if (has('loja', 'vender online', 'e-commerce', 'ecommerce')) return {
        msg: 'Show! Com uma <b>loja online</b> você vende 24h por dia, com Pix, cartão e entrega. 🛒<br><br>Os pedidos caem direto no seu WhatsApp. Quer um orçamento?',
        quick: ['Sim, quero orçamento', 'Quanto custa?', 'Como funciona?']
      };
      if (has('google', 'aparecer', 'busca')) return {
        msg: 'Perfeito! A gente coloca seu negócio pra <b>aparecer no Google</b> quando procurarem o que você vende na sua região. 📍<br><br>Mais visitas e mais ligações todo dia. Quer saber como começar?',
        quick: ['Sim, quero começar', 'Quanto custa?']
      };
      if (has('preço', 'preco', 'valor', 'custa', 'quanto', 'orçamento', 'orcamento')) return {
        msg: 'O valor depende do que o seu negócio precisa — por isso o <b>orçamento é gratuito</b> e combinado antes, sem surpresa. 💰<br><br>Me conta: qual o seu nome e o tipo do seu negócio?',
        quick: ['Falar com atendente']
      };
      if (has('prazo', 'tempo', 'demora', 'quando')) return {
        msg: 'Sites e cardápios digitais costumam ficar prontos em <b>poucos dias</b>. ⏱️ Projetos maiores têm um prazo combinado já na primeira conversa.',
        quick: ['Quero começar', 'Falar com atendente']
      };
      if (has('atendente', 'humano', 'pessoa', 'falar com')) return {
        msg: 'Claro! Posso te encaminhar pro nosso <b>atendimento no WhatsApp</b> pra falar com uma pessoa de verdade. É só tocar no botão abaixo. 👇',
        quick: ['__wa__Abrir o WhatsApp'],
        wa: true
      };
      if (has('oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite')) return {
        msg: 'Oi! 😊 Que bom te ver por aqui. Me conta o que você procura pro seu negócio:',
        quick: ['Quero um site', 'Quero uma loja online', 'Aparecer no Google']
      };
      if (has('obrigad', 'valeu', 'show', 'ótimo', 'otimo')) return {
        msg: 'Imagina! 💚 Se quiser, posso te passar pro WhatsApp pra continuarmos com mais detalhes.',
        quick: ['__wa__Continuar no WhatsApp', 'Tenho outra dúvida'],
        wa: true
      };
      return {
        msg: 'Entendi! 👍 Pra te ajudar melhor, me conta um pouquinho mais — ou escolha uma das opções abaixo:',
        quick: ['Quero um site', 'Quero uma loja online', 'Aparecer no Google', 'Falar com atendente']
      };
    }

    function handle(text) {
      text = (text || '').trim();
      if (!text) return;
      addMsg(escapeHtml(text), 'out');
      input.value = '';
      setQuick([]);
      typingThen(function () {
        var r = botReply(text);
        addMsg(r.msg, 'in');
        setQuick(r.quick || []);
      }, 1000 + Math.random() * 600);
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); handle(input.value); });
    quick.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var label = b.textContent;
      if (label.indexOf('__wa__') === 0 || b.dataset.wa) {
        // botão de handoff: abre o WhatsApp real
        window.open(waLink('Olá! Vim pelo site da LDCODE e quero falar com um atendente.'), '_blank', 'noopener');
        return;
      }
      handle(label);
    });
    // marca botões de WhatsApp (texto com prefixo __wa__) e limpa o rótulo
    var qObserver = new MutationObserver(function () {
      [].forEach.call(quick.querySelectorAll('button'), function (b) {
        if (b.textContent.indexOf('__wa__') === 0) {
          b.dataset.wa = '1';
          b.classList.add('wa-go');
          b.textContent = b.textContent.replace('__wa__', '');
        }
      });
    });
    qObserver.observe(quick, { childList: true });
  })();

  /* ---------- Formulário -> WhatsApp ---------- */
  var form = document.getElementById('leadForm');
  if (form) {
    var msgEl = document.getElementById('formMsg');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = form.nome, whats = form.whats;
      var ok = true;
      [nome, whats].forEach(function (f) {
        if (!f.value.trim()) { f.classList.add('err'); ok = false; }
        else f.classList.remove('err');
      });
      if (!ok) { msgEl.style.color = '#ff8b8b'; msgEl.textContent = 'Preencha seu nome e WhatsApp 🙂'; return; }

      var tipo = form.tipo.value || 'não informado';
      var necessidade = form.msg.value.trim() || 'quero saber mais';
      var texto =
        'Olá! Sou ' + nome.value.trim() + '.\n' +
        'Meu WhatsApp: ' + whats.value.trim() + '\n' +
        'Tipo de negócio: ' + tipo + '\n' +
        'Preciso de: ' + necessidade + '\n\n' +
        '(Enviado pelo site da LDCODE)';

      msgEl.style.color = '#37e6a4';
      msgEl.textContent = 'Tudo certo! Abrindo o WhatsApp...';
      window.open(waLink(texto), '_blank', 'noopener');
    });
    ['nome', 'whats'].forEach(function (id) {
      form[id].addEventListener('input', function () { this.classList.remove('err'); });
    });
  }

  /* ---------- Banner rotativo (hero slider) ---------- */
  (function () {
    var container = document.getElementById('heroSlides');
    if (!container) return;
    var slides = Array.prototype.slice.call(container.querySelectorAll('.hero-slide'));
    var dotsWrap = document.getElementById('sliderDots');
    var idx = 0, timer = null, DELAY = 5500;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Slide ' + (i + 1));
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', function () { go(i, true); });
      dotsWrap.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function go(n, manual) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      if (manual) restart();
    }
    function next() { go(idx + 1); }
    function start() { timer = setInterval(next, DELAY); }
    function restart() { clearInterval(timer); start(); }

    var pv = document.getElementById('slidePrev'), nx = document.getElementById('slideNext');
    if (pv) pv.addEventListener('click', function () { go(idx - 1, true); });
    if (nx) nx.addEventListener('click', function () { go(idx + 1, true); });
    var hero = document.getElementById('topo');
    if (hero) {
      hero.addEventListener('mouseenter', function () { clearInterval(timer); });
      hero.addEventListener('mouseleave', start);
    }
    start();
  })();

  /* ---------- Banner promocional rotativo ---------- */
  (function () {
    var container = document.getElementById('promoSlides');
    if (!container) return;
    var slides = Array.prototype.slice.call(container.querySelectorAll('.promo-slide'));
    var dotsWrap = document.getElementById('promoDots');
    var idx = 0, timer = null, DELAY = 5000;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Banner ' + (i + 1));
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', function () { go(i, true); });
      dotsWrap.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function go(n, manual) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      if (manual) restart();
    }
    function next() { go(idx + 1); }
    function start() { timer = setInterval(next, DELAY); }
    function restart() { clearInterval(timer); start(); }

    var pv = document.getElementById('promoPrev'), nx = document.getElementById('promoNext');
    if (pv) pv.addEventListener('click', function () { go(idx - 1, true); });
    if (nx) nx.addEventListener('click', function () { go(idx + 1, true); });
    var sec = document.getElementById('promo');
    if (sec) {
      sec.addEventListener('mouseenter', function () { clearInterval(timer); });
      sec.addEventListener('mouseleave', start);
    }
    start();
  })();

  /* ---------- Demo do painel administrativo ---------- */
  (function () {
    var name = document.getElementById('pName');
    if (!name) return;
    var price = document.getElementById('pPrice');
    var desc = document.getElementById('pDesc');
    var pvName = document.getElementById('pvName');
    var pvPrice = document.getElementById('pvPrice');
    var pvDesc = document.getElementById('pvDesc');
    var btn = document.getElementById('publishBtn');
    var toast = document.getElementById('publishToast');

    function sync() {
      pvName.textContent = name.value || 'Nome do produto';
      var p = price.value.trim();
      pvPrice.textContent = p ? ('R$ ' + p) : 'R$ 0,00';
      pvDesc.textContent = desc.value || 'Descrição do produto.';
    }
    [name, price, desc].forEach(function (el) { el.addEventListener('input', sync); });
    sync();

    if (btn) btn.addEventListener('click', function () {
      pvName.style.color = 'var(--cyan)';
      setTimeout(function () { pvName.style.color = ''; }, 600);
      toast.classList.add('show');
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { toast.classList.remove('show'); }, 2600);
    });
  })();

  /* ---------- Hero: rede de partículas ---------- */
  var canvas = document.getElementById('hero-canvas');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, nodes = [];
    var palette = ['43,127,255', '31,208,232', '139,77,255'];

    function resize() {
      W = hero.offsetWidth; H = hero.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(70, Math.round(W * H / 18000));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          c: palette[i % palette.length], r: Math.random() * 1.6 + 0.7
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var dx = n.x - m.x, dy = n.y - m.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = 'rgba(' + n.c + ',' + (0.16 * (1 - dist / 130)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var p = nodes[k];
        ctx.fillStyle = 'rgba(' + p.c + ',0.7)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(resize, 200); });
    resize(); draw();
  }

  /* ---------- Efeitos: luz nos cards + inclinação do logo ---------- */
  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* luz que segue o cursor dentro de cada card */
    var cards = document.querySelectorAll('.card');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* leve inclinação 3D do logo do topo acompanhando o mouse */
    if (!reduce) {
      var stage = document.querySelector('.hero-logo-stage');
      var img = stage && stage.querySelector('img');
      if (stage) {
        var raf = null, tx = 0, ty = 0;
        stage.addEventListener('pointermove', function (e) {
          var r = stage.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
          var py = (e.clientY - r.top) / r.height - 0.5;
          if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            stage.style.transform = 'perspective(900px) rotateY(' + (px * 9).toFixed(2) + 'deg) rotateX(' + (-py * 9).toFixed(2) + 'deg)';
            if (img) img.style.transform = 'translate(' + (px * 14).toFixed(1) + 'px,' + (py * 14).toFixed(1) + 'px)';
          });
        });
        stage.addEventListener('pointerleave', function () {
          stage.style.transform = '';
          if (img) img.style.transform = '';
        });
      }
    }
  })();
})();
