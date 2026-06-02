/* ================= LDCODE — Painel do Site (editor de conteúdo) ================= */
(function () {
  'use strict';
  if (!window.LDCMS) { console.error('cms.js não carregou'); return; }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var SCHEMA = LDCMS.SCHEMA;

  /* ---------- tema claro/escuro ---------- */
  (function () {
    var root = document.documentElement;
    function toggle() {
      var light = root.getAttribute('data-theme') === 'light';
      if (light) { root.removeAttribute('data-theme'); try { localStorage.setItem('ldcode_theme', 'dark'); } catch (e) {} }
      else { root.setAttribute('data-theme', 'light'); try { localStorage.setItem('ldcode_theme', 'light'); } catch (e) {} }
    }
    var b = document.getElementById('themeToggle');
    if (b) b.addEventListener('click', toggle);
  })();

  /* ---------- toast ---------- */
  var toast = $('#toast'), toastT;
  function showToast(title, msg) {
    $('#toastTitle').textContent = title || 'Pronto!';
    $('#toastMsg').textContent = msg || '';
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }

  /* ---------- redução de imagem (igual ao site) ---------- */
  function fileToDataUrl(file, maxDim) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) { rej(new Error('tipo')); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { res(c.toDataURL('image/webp', 0.85)); } catch (e) { res(c.toDataURL('image/png')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('load')); };
      img.src = url;
    });
  }

  /* ---------- escapar HTML ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ================= render: sidebar + views ================= */
  var nav = $('#sbNav'), views = $('#views');

  SCHEMA.forEach(function (g, gi) {
    /* link na sidebar */
    var btn = document.createElement('button');
    btn.className = 'sb-link' + (gi === 0 ? ' active' : '');
    btn.dataset.view = g.id;
    btn.innerHTML = g.icon + '<span>' + esc(g.label) + '</span><span class="badge q" data-count="' + g.id + '" style="display:none">0</span>';
    btn.addEventListener('click', function () { goto(g.id); });
    nav.appendChild(btn);

    /* view */
    var view = document.createElement('section');
    view.className = 'view' + (gi === 0 ? ' active' : '');
    view.id = 'view-' + g.id;

    var html = '<div class="view-head"><div><h2>' + esc(g.label) + '</h2><p>' + esc(g.desc || '') + '</p></div>' +
      '<div class="right"><button class="btn btn-ghost btn-sm" data-restore="' + g.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Restaurar seção</button></div></div>';

    html += '<div class="card card-pad ed-card">';
    g.fields.forEach(function (f) { html += renderField(f); });
    html += '</div>';

    view.innerHTML = html;
    views.appendChild(view);
  });

  function renderField(f) {
    var val = LDCMS.get(f.key);
    var custom = LDCMS.isCustom(f.key);
    var dot = '<span class="ed-dot' + (custom ? ' on' : '') + '" data-dot="' + f.key + '" title="' + (custom ? 'Alterado' : 'Padrão') + '"></span>';
    if (f.type === 'image') {
      var isData = typeof val === 'string' && val.indexOf('data:') === 0;
      var hasImg = !!val;
      var prev = hasImg
        ? '<img src="' + esc(val) + '" alt="">'
        : '<span class="img-empty">sem imagem<br><small>usa o espaço reservado</small></span>';
      return '<div class="field full ed-field" data-field="' + f.key + '">' +
        '<label>' + dot + esc(f.label) + '</label>' +
        '<div class="img-row">' +
          '<div class="img-prev" data-prev="' + f.key + '">' + prev + '</div>' +
          '<div class="img-ctl">' +
            '<button class="btn btn-ghost btn-sm" data-upload="' + f.key + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Enviar imagem</button>' +
            '<button class="btn btn-ghost btn-sm" data-clearimg="' + f.key + '">Restaurar</button>' +
            '<input type="file" accept="image/*" hidden data-fileinput="' + f.key + '">' +
            (isData ? '' : '<span class="img-note">' + esc(val || '') + '</span>') +
          '</div>' +
        '</div>' +
        (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }
    if (f.type === 'textarea') {
      return '<div class="field full ed-field" data-field="' + f.key + '">' +
        '<label>' + dot + esc(f.label) + '</label>' +
        '<textarea data-input="' + f.key + '" rows="2">' + esc(val) + '</textarea>' +
        (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }
    return '<div class="field full ed-field" data-field="' + f.key + '">' +
      '<label>' + dot + esc(f.label) + '</label>' +
      '<input type="text" data-input="' + f.key + '" value="' + esc(val) + '">' +
      (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
  }

  /* ================= navegação ================= */
  var btnChat = $('#btnChatLive');
  if (btnChat) {
    btnChat.addEventListener('click', function () {
      $$('.sb-link').forEach(function (b) { b.classList.toggle('active', b === btnChat); });
      $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-chat-live'); });
      $('#pageTitle').textContent = 'Chat ao Vivo';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      closeSidebar();
    });

    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'chat_unread') {
        var b = $('#chatBadge');
        if (b) {
          b.textContent = e.data.count;
          b.style.display = e.data.count > 0 ? '' : 'none';
        }
      }
    });
  }

  function goto(id) {
    $$('.sb-link').forEach(function (b) { b.classList.toggle('active', b.dataset.view === id); });
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + id); });
    var g = SCHEMA.filter(function (x) { return x.id === id; })[0];
    $('#pageTitle').textContent = g ? g.label : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  }

  /* sidebar mobile */
  var sidebar = $('#sidebar'), sbScrim = $('#sbScrim');
  function closeSidebar() { sidebar.classList.remove('open'); sbScrim.classList.remove('show'); }
  $('#menuBtn').addEventListener('click', function () { sidebar.classList.add('open'); sbScrim.classList.add('show'); });
  sbScrim.addEventListener('click', closeSidebar);

  /* ================= edição (salva ao vivo) ================= */
  function markDot(key, on) {
    $$('[data-dot="' + key + '"]').forEach(function (d) { d.classList.toggle('on', on); d.title = on ? 'Alterado' : 'Padrão'; });
    updateBadges();
  }
  function updateBadges() {
    SCHEMA.forEach(function (g) {
      var n = g.fields.filter(function (f) { return LDCMS.isCustom(f.key); }).length;
      var b = $('.badge[data-count="' + g.id + '"]');
      if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
    });
  }

  views.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.input) {
      LDCMS.set(t.dataset.input, t.value);
      markDot(t.dataset.input, !!t.value);
    }
  });

  /* upload de imagem */
  views.addEventListener('click', function (e) {
    var up = e.target.closest('[data-upload]');
    if (up) { $('[data-fileinput="' + up.dataset.upload + '"]').click(); return; }
    var cl = e.target.closest('[data-clearimg]');
    if (cl) {
      var k = cl.dataset.clearimg;
      LDCMS.resetKey(k);
      refreshImagePrev(k);
      markDot(k, false);
      showToast('Imagem restaurada', 'Voltou para a imagem padrão.');
      return;
    }
    var rs = e.target.closest('[data-restore]');
    if (rs) { restoreSection(rs.dataset.restore); return; }
  });

  views.addEventListener('change', function (e) {
    var fi = e.target;
    if (fi.dataset && fi.dataset.fileinput) {
      var file = fi.files && fi.files[0];
      if (!file) return;
      var key = fi.dataset.fileinput;
      fileToDataUrl(file, 1400).then(function (url) {
        LDCMS.set(key, url);
        refreshImagePrev(key);
        markDot(key, true);
        showToast('Imagem atualizada', 'Será aplicada no site.');
      }).catch(function () { showToast('Ops', 'Use uma imagem PNG, JPG ou WebP.'); });
      fi.value = '';
    }
  });

  function refreshImagePrev(key) {
    var box = $('[data-prev="' + key + '"]'); if (!box) return;
    var val = LDCMS.get(key);
    box.innerHTML = val ? '<img src="' + esc(val) + '" alt="">' : '<span class="img-empty">sem imagem<br><small>usa o espaço reservado</small></span>';
    // atualiza a nota de caminho/limpa
    var note = box.parentNode.querySelector('.img-note');
    if (note) note.textContent = (typeof val === 'string' && val.indexOf('data:') !== 0) ? val : '';
  }

  function restoreSection(id) {
    var g = SCHEMA.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    g.fields.forEach(function (f) {
      LDCMS.resetKey(f.key);
      var inp = $('[data-input="' + f.key + '"]');
      if (inp) inp.value = LDCMS.get(f.key);
      if (f.type === 'image') refreshImagePrev(f.key);
      markDot(f.key, false);
    });
    showToast('Seção restaurada', 'Os textos voltaram ao original.');
  }

  /* publicar */
  $('#publishBtn').addEventListener('click', function () {
    var n = 0; SCHEMA.forEach(function (g) { g.fields.forEach(function (f) { if (LDCMS.isCustom(f.key)) n++; }); });
    showToast('Publicado!', n ? (n + ' alteração(ões) no ar. Recarregue o site para ver.') : 'Nada alterado — site no original.');
  });

  /* init */
  updateBadges();
})();
