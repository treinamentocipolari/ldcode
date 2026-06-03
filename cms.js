/* ================= LDCODE — Motor de Conteúdo (CMS) =================
   Fonte única do conteúdo editável do site. Lê os textos/imagens salvos
   no navegador (localStorage) e aplica no site. O painel administrativo
   usa o mesmo schema para gerar os campos de edição.

   Como funciona:
   - SCHEMA: lista de grupos (seções) e campos editáveis, com os valores
     padrão (o conteúdo original do site).
   - get(key)/set(key,val): leem/gravam overrides no localStorage.
   - applyToSite(doc): aplica o conteúdo atual no DOM do site.
   - O site (index.html) inclui este script e chama applyToSite sozinho.

   Para ligar no seu backend depois: troque load()/save() por chamadas à
   sua API; o resto continua igual.
================================================================= */
(function () {
  'use strict';

  var KEY = 'ldcode_site_content_v1';

  /* ---------- ícones dos grupos (sidebar do painel) ---------- */
  var IC = {
    geral: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    hero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h16M4 12h10M4 19h7"/><path d="M16 16l5 3-5 3z" transform="translate(-1 -2)"/></svg>',
    banner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="13" y="6" width="3" height="11"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3 6.5L22 9l-5 4.8L18.5 21 12 17.3 5.5 21 7 13.8 2 9l7-0.5z"/></svg>',
    steps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><path d="M9 6h11M9 18h11M5 8v8"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.2A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
    cta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    foot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 17h6M7 4v6M5 7h4"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>'
  };

  /* ---------- helpers de schema ---------- */
  function slide(n, badge, t1, t2, lead, bp, bg) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 's' + n + '_badge', label: 'Selo (slide ' + n + ')', type: 'text', sel: '#heroSlides .hero-slide' + s + ' .hero-badge', mode: 'text', def: badge },
      { key: 's' + n + '_t1', label: 'Título — linha 1', type: 'text', sel: '#heroSlides .hero-slide' + s + ' h1 .line:nth-child(1)', mode: 'text', def: t1 },
      { key: 's' + n + '_t2', label: 'Título — linha 2 (colorida)', type: 'text', sel: '#heroSlides .hero-slide' + s + ' h1 .line:nth-child(2)', mode: 'text', def: t2 },
      { key: 's' + n + '_lead', label: 'Texto de apoio', type: 'textarea', sel: '#heroSlides .hero-slide' + s + ' p.lead', mode: 'text', def: lead },
      { key: 's' + n + '_bp', label: 'Botão principal', type: 'text', sel: '#heroSlides .hero-slide' + s + ' .hero-actions a.btn-primary', mode: 'text', def: bp },
      { key: 's' + n + '_bg', label: 'Botão secundário', type: 'text', sel: '#heroSlides .hero-slide' + s + ' .hero-actions a.btn-ghost', mode: 'text', def: bg }
    ];
  }
  function head(prefix, sel, eyebrow, hMain, hHi, desc) {
    return [
      { key: prefix + '_eyebrow', label: 'Etiqueta', type: 'text', sel: sel + ' .eyebrow', mode: 'text', def: eyebrow },
      { key: prefix + '_hmain', label: 'Título', type: 'text', sel: sel + ' .section-head h2', mode: 'h-main', def: hMain },
      { key: prefix + '_hhi', label: 'Título — parte colorida', type: 'text', sel: sel + ' .section-head h2', mode: 'h-hi', def: hHi },
      { key: prefix + '_desc', label: 'Descrição', type: 'textarea', sel: sel + ' .section-head p', mode: 'text', def: desc }
    ];
  }
  function card(sec, n, title, desc) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: sec + '_c' + n + '_t', label: 'Card ' + n + ' — título', type: 'text', sel: '#' + sec + ' .cards .card' + s + ' h3', mode: 'text', def: title },
      { key: sec + '_c' + n + '_d', label: 'Card ' + n + ' — texto', type: 'textarea', sel: '#' + sec + ' .cards .card' + s + ' > p', mode: 'text', def: desc }
    ];
  }
  function step(n, title, desc) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 'step' + n + '_t', label: 'Passo ' + n + ' — título', type: 'text', sel: '#processo .steps .step' + s + ' h4', mode: 'text', def: title },
      { key: 'step' + n + '_d', label: 'Passo ' + n + ' — texto', type: 'textarea', sel: '#processo .steps .step' + s + ' p', mode: 'text', def: desc }
    ];
  }
  function port(n, img, cat, title, desc) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 'port' + n + '_img', label: 'Exemplo ' + n + ' — imagem', type: 'image', sel: '#projetos .port-card' + s + ' .ph', mode: 'imgblock', def: '', hint: 'Tamanho ideal: 800 × 600 px (formato paisagem 4:3) · JPG, PNG ou WebP · até ~1 MB' },
      { key: 'port' + n + '_cat', label: 'Exemplo ' + n + ' — categoria', type: 'text', sel: '#projetos .port-card' + s + ' .meta .cat', mode: 'text', def: cat },
      { key: 'port' + n + '_t', label: 'Exemplo ' + n + ' — título', type: 'text', sel: '#projetos .port-card' + s + ' .meta h4', mode: 'text', def: title },
      { key: 'port' + n + '_d', label: 'Exemplo ' + n + ' — texto', type: 'textarea', sel: '#projetos .port-card' + s + ' .meta p', mode: 'text', def: desc }
    ];
  }
  function test(n, quote, name, role) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 'test' + n + '_q', label: 'Depoimento ' + n, type: 'textarea', sel: '#depoimentos .test' + s + ' > p', mode: 'text', def: quote },
      { key: 'test' + n + '_n', label: 'Nome', type: 'text', sel: '#depoimentos .test' + s + ' .who b', mode: 'text', def: name },
      { key: 'test' + n + '_r', label: 'Cargo / negócio', type: 'text', sel: '#depoimentos .test' + s + ' .who small', mode: 'text', def: role }
    ];
  }
  function faq(n, q, a) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 'faq' + n + '_q', label: 'Pergunta ' + n, type: 'text', sel: '#faq .faq-item' + s + ' .faq-q', mode: 'text', def: q },
      { key: 'faq' + n + '_a', label: 'Resposta ' + n, type: 'textarea', sel: '#faq .faq-item' + s + ' .faq-a .inner', mode: 'text', def: a }
    ];
  }
  function diff(n, title, desc) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 'diff' + n + '_t', label: 'Vantagem ' + n + ' — título', type: 'text', sel: '#diferenciais .feature-item' + s + ' h4', mode: 'text', def: title },
      { key: 'diff' + n + '_d', label: 'Vantagem ' + n + ' — texto', type: 'textarea', sel: '#diferenciais .feature-item' + s + ' p', mode: 'text', def: desc }
    ];
  }
  function mark(n, txt) {
    var s = ':nth-child(' + n + ')';
    return [
      { key: 'mark' + n + '_t', label: 'Item ' + n + ' — texto', type: 'text', sel: '#trustMarks .mark-link' + s, mode: 'text', def: txt },
      { key: 'mark' + n + '_l', label: 'Item ' + n + ' — link (site do cliente)', type: 'text', sel: '#trustMarks .mark-link' + s, mode: 'href', def: '', hint: 'Opcional. Ex: cliente.com.br · deixe vazio se não tiver link' }
    ];
  }

  /* ================= SCHEMA ================= */
  var SCHEMA = [
    {
      id: 'topo', label: 'Topo do site', icon: IC.hero,
      desc: 'O banner principal, com os 3 slides que giram automaticamente.',
      fields: [
        { key: 'heroLogo', label: 'Imagem/logo do topo', type: 'image', sel: '.hero-logo-stage img', mode: 'src', def: 'assets/logo-ldcode.png', hint: 'Tamanho ideal: 600 × 600 px (quadrada) · PNG com fundo transparente · até ~1 MB' }
      ].concat(
        slide(1, 'Atendendo novos negócios em 2026', 'Seu negócio na internet,', 'vendendo todo dia.', 'Criamos o site, a loja online e as ferramentas que fazem o seu comércio aparecer, atrair clientes e vender mais. Você cuida do negócio — a gente cuida da parte digital.', 'Quero vender mais', 'Ver como funciona'),
        slide(2, 'Loja aberta 24 horas por dia', 'Sua loja online', 'vendendo 24 horas.', 'Seus produtos no celular do cliente, com Pix, cartão e entrega. Enquanto você descansa, sua loja continua faturando — todos os dias da semana.', 'Quero minha loja online', 'Ver exemplo'),
        slide(3, 'Topo das buscas na sua região', 'Apareça no Google', 'na frente da concorrência.', 'Quando alguém procurar o que você vende na sua região, é o seu nome que aparece primeiro. Mais visitas, mais ligações e mais vendas todos os dias.', 'Quero aparecer no Google', 'Ver como')
      )
    },
    {
      id: 'tipos', label: 'Tipos de negócio', icon: IC.grid,
      desc: 'A faixa "Feito para o seu tipo de negócio". Cada item pode ter um link (ex: o site de um cliente).',
      fields: [
        { key: 'trustLabel', label: 'Texto da etiqueta', type: 'text', sel: '.trust .label', mode: 'text', def: 'Feito para o seu tipo de negócio' }
      ].concat(
        mark(1, 'Restaurantes'), mark(2, 'Lojas'), mark(3, 'Salões'),
        mark(4, 'Clínicas'), mark(5, 'Serviços'), mark(6, 'Comércio local')
      )
    },
    {
      id: 'numeros', label: 'Números', icon: IC.stats,
      desc: 'Os 4 indicadores que aparecem em destaque.',
      fields: [
        { key: 'st1_n', label: 'Número 1', type: 'text', sel: '.stats-grid .stat:nth-child(1) .num', mode: 'count', def: '120' },
        { key: 'st1_s', label: 'Sufixo 1', type: 'text', sel: '.stats-grid .stat:nth-child(1) .num', mode: 'suffix', def: '+' },
        { key: 'st1_l', label: 'Legenda 1', type: 'text', sel: '.stats-grid .stat:nth-child(1) .lbl', mode: 'text', def: 'Negócios atendidos' },
        { key: 'st2_n', label: 'Número 2', type: 'text', sel: '.stats-grid .stat:nth-child(2) .num', mode: 'count', def: '7' },
        { key: 'st2_s', label: 'Sufixo 2', type: 'text', sel: '.stats-grid .stat:nth-child(2) .num', mode: 'suffix', def: ' dias' },
        { key: 'st2_l', label: 'Legenda 2', type: 'text', sel: '.stats-grid .stat:nth-child(2) .lbl', mode: 'text', def: 'Para ficar no ar' },
        { key: 'st3_n', label: 'Número 3', type: 'text', sel: '.stats-grid .stat:nth-child(3) .num', mode: 'count', def: '98' },
        { key: 'st3_s', label: 'Sufixo 3', type: 'text', sel: '.stats-grid .stat:nth-child(3) .num', mode: 'suffix', def: '%' },
        { key: 'st3_l', label: 'Legenda 3', type: 'text', sel: '.stats-grid .stat:nth-child(3) .lbl', mode: 'text', def: 'Recomendam a gente' },
        { key: 'st4_n', label: 'Número 4', type: 'text', sel: '.stats-grid .stat:nth-child(4) .num', mode: 'count', def: '100' },
        { key: 'st4_s', label: 'Sufixo 4', type: 'text', sel: '.stats-grid .stat:nth-child(4) .num', mode: 'suffix', def: '%' },
        { key: 'st4_l', label: 'Legenda 4', type: 'text', sel: '.stats-grid .stat:nth-child(4) .lbl', mode: 'text', def: 'Entregas no prazo' }
      ]
    },
    {
      id: 'solucoes', label: 'Soluções', icon: IC.grid,
      desc: 'O título da seção e os 6 cards de serviços.',
      fields: head('sol', '#solucoes', 'O que a gente faz por você', 'Tudo o que seu negócio precisa', 'na internet', 'Sem complicação e sem termos difíceis. A gente resolve a parte digital pra você ter mais clientes e vender mais.').concat(
        card('solucoes', 1, 'Site profissional', 'Um site bonito e rápido que passa confiança e faz a sua empresa parecer grande — funcionando perfeito no celular.'),
        card('solucoes', 2, 'Loja virtual', 'Venda pela internet 24 horas por dia, com Pix, cartão e entrega. Seus produtos chegam direto no celular do cliente.'),
        card('solucoes', 3, 'Cardápio & catálogo digital', 'Todos os seus produtos em um link só, com fotos e botão de WhatsApp pra fechar o pedido na hora.'),
        card('solucoes', 4, 'Apareça no Google', 'Quando alguém procurar o que você vende na sua região, é o seu nome que aparece primeiro.'),
        card('solucoes', 5, 'Controle de pedidos', 'Organize pedidos, clientes e estoque em um só lugar — sem papel, sem caderninho e sem bagunça.'),
        card('solucoes', 6, 'Atendimento automático', 'Responda dúvidas e agende clientes no WhatsApp automaticamente — mesmo com a loja fechada.')
      )
    },
    {
      id: 'diferenciais', label: 'Diferenciais', icon: IC.star,
      desc: 'A seção "Por que a LDCODE" e a imagem ao lado.',
      fields: [
        { key: 'dif_eyebrow', label: 'Etiqueta', type: 'text', sel: '#diferenciais .eyebrow', mode: 'text', def: 'Por que a LDCODE' },
        { key: 'dif_h1', label: 'Título — linha 1', type: 'text', sel: '#diferenciais h2', mode: 'h-main-br', def: 'Você cuida do negócio.' },
        { key: 'dif_h2', label: 'Título — linha 2 (colorida)', type: 'text', sel: '#diferenciais h2', mode: 'h-hi', def: 'A gente cuida do resto.' },
        { key: 'dif_desc', label: 'Descrição', type: 'textarea', sel: '#diferenciais .feature-row > div:first-child > p', mode: 'text', def: 'Sem termos técnicos, sem enrolação e sem surpresa no preço. Você fala com gente de verdade e entende cada passo.' },
        { key: 'dif_img', label: 'Imagem do lado', type: 'image', sel: '#diferenciais .ph', mode: 'imgblock', def: '', hint: 'Tamanho ideal: 900 × 1000 px (formato retrato) · JPG, PNG ou WebP · até ~1 MB' }
      ].concat(
        diff(1, 'A gente fala a sua língua', 'Nada de palavras difíceis. Explicamos tudo de um jeito simples, do começo ao fim.'),
        diff(2, 'Pronto rápido', 'Seu site ou loja no ar em poucos dias — não em meses. Você começa a vender logo.'),
        diff(3, 'Preço combinado antes', 'Você sabe exatamente quanto vai pagar. Sem letras miúdas e sem custo escondido.'),
        diff(4, 'Suporte que atende', 'Precisou de algo? Chama no WhatsApp e a gente resolve. Você nunca fica na mão.')
      )
    },
    {
      id: 'processo', label: 'Como funciona', icon: IC.steps,
      desc: 'O título da seção e os 4 passos.',
      fields: head('proc', '#processo', 'Como funciona', 'Simples do começo', 'ao fim', 'Em 4 passos o seu negócio está na internet, pronto pra atrair clientes.').concat(
        step(1, 'Conversa', 'Você conta o que precisa. A gente escuta e sugere o melhor caminho pro seu negócio.'),
        step(2, 'Criamos', 'Montamos seu site ou loja com a cara do seu negócio e as suas cores.'),
        step(3, 'Você aprova', 'Mostramos tudo antes de publicar e ajustamos até ficar do seu jeito.'),
        step(4, 'No ar', 'Publicamos e ensinamos a usar. Pronto pra começar a vender.')
      )
    },
    {
      id: 'exemplos', label: 'Exemplos', icon: IC.grid,
      desc: 'O título da seção e os 3 exemplos de projetos (com imagem).',
      fields: head('ex', '#projetos', 'Exemplos', 'Negócios que já estão', 'online', 'Alguns tipos de negócio que ajudamos a vender mais. (Imagens de exemplo — depois colocamos as suas.)').concat(
        port(1, '', 'Restaurante', 'Cardápio digital com pedidos', 'Cliente escolhe, pede pelo WhatsApp e paga online. Sem fila e sem confusão.'),
        port(2, '', 'Loja', 'Loja virtual completa', 'Vende pela internet o dia inteiro, com Pix, cartão e entrega na cidade.'),
        port(3, '', 'Salão', 'Site com agendamento', 'As clientes marcam horário sozinhas, direto pelo celular, a qualquer hora.')
      )
    },
    {
      id: 'depoimentos', label: 'Depoimentos', icon: IC.chat,
      desc: 'O título da seção e os 3 depoimentos de clientes.',
      fields: head('dep', '#depoimentos', 'Quem já confiou', 'O que dizem nossos', 'clientes', 'Donos de negócio como você, que decidiram vender também pela internet.').concat(
        test(1, '"Agora recebo pedido pelo site e pelo WhatsApp sem parar. No primeiro mês já vendi bem mais do que esperava."', 'Marcos Lima', 'Dono de hamburgueria'),
        test(2, '"Meus clientes compram online enquanto eu durmo. Foi o melhor investimento que já fiz pra minha loja."', 'Ana Paula', 'Loja de roupas'),
        test(3, '"As clientes agendam sozinhas pelo celular. Minha agenda lota e eu nem preciso ficar presa no telefone."', 'Juliana Reis', 'Salão de beleza')
      )
    },
    {
      id: 'faq', label: 'Dúvidas (FAQ)', icon: IC.help,
      desc: 'As perguntas e respostas mais comuns.',
      fields: [
        { key: 'faq_eyebrow', label: 'Etiqueta', type: 'text', sel: '#faq .eyebrow', mode: 'text', def: 'Dúvidas comuns' },
        { key: 'faq_h', label: 'Título', type: 'text', sel: '#faq .section-head h2', mode: 'text', def: 'Perguntas que todo mundo faz' }
      ].concat(
        faq(1, 'Preciso entender de tecnologia ou de computador?', 'Não! A gente cuida de tudo pra você. Você só conta como é o seu negócio e nós resolvemos a parte digital, explicando o necessário de um jeito bem simples.'),
        faq(2, 'Tem mensalidade? Quanto custa?', 'Combinamos tudo antes de começar. Você sabe exatamente quanto vai pagar, sem surpresas e sem custo escondido. O orçamento é gratuito.'),
        faq(3, 'Quanto tempo até ficar pronto?', 'Sites e cardápios digitais costumam ficar prontos em poucos dias. Para projetos maiores, combinamos um prazo claro logo na primeira conversa.'),
        faq(4, 'Funciona bem no celular?', 'Sim! Tudo o que criamos funciona perfeitamente no celular — que é exatamente onde a maioria dos seus clientes está.'),
        faq(5, 'Vocês atendem a minha cidade?', 'Atendemos negócios do Brasil inteiro, 100% online e pelo WhatsApp. Onde você estiver, a gente consegue ajudar.')
      )
    },
    {
      id: 'contato', label: 'Chamada final', icon: IC.cta,
      desc: 'O bloco final de contato (antes do rodapé).',
      fields: [
        { key: 'cta_scarcity', label: 'Aviso de urgência', type: 'text', sel: '#contato .scarcity', mode: 'text', def: 'Só 3 vagas para novos projetos em junho' },
        { key: 'cta_hmain', label: 'Título', type: 'text', sel: '#contato .cta-box h2', mode: 'h-main', def: 'Pronto pra colocar seu negócio' },
        { key: 'cta_hhi', label: 'Título — parte colorida', type: 'text', sel: '#contato .cta-box h2', mode: 'h-hi', def: 'pra vender online?' },
        { key: 'cta_desc', label: 'Texto', type: 'textarea', sel: '#contato .cta-box > div > p', mode: 'text', def: 'Conte rapidinho sobre o seu negócio e receba uma proposta gratuita em até 24 horas. Sem compromisso — só pra você ver como é simples começar.' }
      ]
    },
    {
      id: 'rodape', label: 'Rodapé', icon: IC.foot,
      desc: 'O texto sobre a empresa e o contato no rodapé.',
      fields: [
        { key: 'foot_about', label: 'Sobre a empresa', type: 'textarea', sel: '.footer .about', mode: 'text', def: 'Colocamos o seu negócio na internet do jeito certo: site, loja online e ferramentas que trazem mais clientes e mais vendas.' },
        { key: 'foot_email', label: 'E-mail de contato', type: 'text', sel: '.footer a[href^="mailto"]', mode: 'mailto', def: 'contato@ldcode.com.br' },
        { key: 'foot_copy', label: 'Texto de rodapé (©)', type: 'text', sel: '.footer-bot span:first-child', mode: 'text', def: '© 2026 LDCODE — Projetos Digitais' }
      ]
    },
    {
      id: 'config', label: 'Configurações', icon: IC.gear,
      desc: 'O número de WhatsApp que recebe os contatos do site.',
      fields: [
        { key: 'whatsapp', label: 'WhatsApp (só números, com 55)', type: 'text', sel: '', mode: 'data', def: '5500000000000', hint: 'Ex: 5511999990000 — é pra cá que vão os formulários e o botão flutuante.' }
      ]
    }
  ];

  /* ---------- index de campos por chave ---------- */
  var FIELDS = {};
  SCHEMA.forEach(function (g) { g.fields.forEach(function (f) { FIELDS[f.key] = f; }); });

  /* ---------- store ---------- */
  function loadLocal() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var data = loadLocal();

  // Load from server
  fetch('api/cms-data.json?v=' + new Date().getTime())
    .then(function(r) { return r.json(); })
    .then(function(serverData) {
       if (serverData && Object.keys(serverData).length > 0) {
          data = serverData;
          try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
          if (document.body && document.body.hasAttribute('data-ldsite')) applyToSite(document);
       }
    }).catch(function(e) { console.log('Server config missing or empty'); });

  function save(d) { 
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} 
    fetch('api/save.php', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(d)
    }).catch(function(e) { console.log('Erro ao salvar no servidor'); });
  }

  function get(k) { return (data[k] !== undefined && data[k] !== null) ? data[k] : (FIELDS[k] ? FIELDS[k].def : ''); }
  function isCustom(k) { return data[k] !== undefined && data[k] !== null && data[k] !== ''; }
  function set(k, v) { data[k] = v; save(data); }
  function setAll(obj) { Object.keys(obj).forEach(function (k) { data[k] = obj[k]; }); save(data); }
  function resetKey(k) { delete data[k]; save(data); }
  function resetAll() { data = {}; localStorage.removeItem(KEY); }

  /* ---------- aplicar no site ---------- */
  function setText(el, val) {
    if (!el) return;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) { n.textContent = val; return; }
    }
    el.insertBefore(document.createTextNode(val), el.firstChild);
  }
  function setImgBlock(el, val) {
    if (!el) return;
    if (val) {
      el.innerHTML = '<img src="' + val + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">';
      el.style.minHeight = el.style.minHeight || '';
    }
    // sem valor: mantém o placeholder original
  }

  function applyToSite(doc) {
    doc = doc || document;
    var headings = {}; // sel -> {main, hi, br}
    SCHEMA.forEach(function (g) {
      g.fields.forEach(function (f) {
        var val = get(f.key);
        if (f.mode === 'h-main' || f.mode === 'h-hi' || f.mode === 'h-main-br') {
          headings[f.sel] = headings[f.sel] || {};
          if (f.mode === 'h-hi') headings[f.sel].hi = val;
          else { headings[f.sel].main = val; headings[f.sel].br = (f.mode === 'h-main-br'); }
          return;
        }
        if (f.mode === 'data') return; // usado por outros scripts (ex: whatsapp)
        var el = f.sel ? doc.querySelector(f.sel) : null;
        if (!el && f.mode !== 'data') {
          // image-slot pode não ter sido upgradado ainda — tenta por id
          return;
        }
        if (f.mode === 'text') setText(el, val);
        else if (f.mode === 'src') { if (val) el.setAttribute('src', val); }
        else if (f.mode === 'imgblock') setImgBlock(el, val);
        else if (f.mode === 'count') el.setAttribute('data-count', val);
        else if (f.mode === 'suffix') el.setAttribute('data-suffix', val);
        else if (f.mode === 'mailto') { el.setAttribute('href', 'mailto:' + val); setText(el, val); }
        else if (f.mode === 'href') {
          if (val && val.trim()) {
            var url = val.trim();
            if (!/^https?:\/\//i.test(url) && url.indexOf('mailto:') !== 0 && url.indexOf('/') !== 0) url = 'https://' + url;
            el.setAttribute('href', url);
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener');
          } else {
            el.removeAttribute('href');
            el.removeAttribute('target');
          }
        }
      });
    });
    // headings com parte colorida
    Object.keys(headings).forEach(function (sel) {
      var el = doc.querySelector(sel); if (!el) return;
      var h = headings[sel];
      el.textContent = '';
      el.appendChild(doc.createTextNode((h.main || '')));
      if (h.br) el.appendChild(doc.createElement('br'));
      else el.appendChild(doc.createTextNode(' '));
      var span = doc.createElement('span'); span.className = 'grad-text'; span.textContent = h.hi || '';
      el.appendChild(span);
    });
  }

  window.LDCMS = {
    SCHEMA: SCHEMA, FIELDS: FIELDS, KEY: KEY,
    get: get, set: set, setAll: setAll, isCustom: isCustom,
    resetKey: resetKey, resetAll: resetAll, applyToSite: applyToSite,
    reload: function () { data = loadLocal(); }
  };

  /* auto-aplica no site (marcado com data-ldsite no <body>) */
  if (document.body && document.body.hasAttribute('data-ldsite')) {
    applyToSite(document);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.body && document.body.hasAttribute('data-ldsite')) applyToSite(document);
    });
  }
})();
