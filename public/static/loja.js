// Leticia Vaz Store — interacoes leves (menu, carrossel, produto, frete, sacola, conta). Sem dependencias.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var brl = function (v) { return 'R$' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var postJson = function (url, corpo) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, erro: 'Erro de conexão.' }; }); });
  };
  var badge = function (n) { var b = $('badge-sacola'); if (b) b.textContent = n; };

  // menu lateral
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-abrir]');
    if (a) { var d = $(a.getAttribute('data-abrir')); if (d) d.hidden = false; return; }
    if (e.target.closest('[data-fechar]')) { var dr = $('drawer'); if (dr) dr.hidden = true; }
  });

  // contador da sacola (pagina e cacheada; o numero vem da API)
  fetch('/api/sacola', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok) badge(j.qtd_total || 0); }).catch(function () {});

  // ---- frete (produto e sacola usam o mesmo desenho) ----
  var mascaraCep = function (inp) {
    inp.addEventListener('input', function () { var d = inp.value.replace(/\D/g, '').slice(0, 8); inp.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; });
    try { var salvo = localStorage.getItem('lv_cep'); if (salvo && !inp.value) inp.value = salvo; } catch (e) {}
  };
  var buscarJson = function (url, tentativas) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function (e) {
      if (tentativas > 0) return new Promise(function (ok) { setTimeout(ok, 1500); }).then(function () { return buscarJson(url, tentativas - 1); });
      throw e;
    });
  };
  var mostrarFrete = function (res, url, cep) {
    res.innerHTML = '<p class="fr-nota">Calculando…</p>';
    buscarJson(url, 1).then(function (j) {
      if (!j.ok) { res.innerHTML = '<p class="fr-erro">' + esc(j.erro || 'Não foi possível calcular.') + '</p>'; return; }
      try { localStorage.setItem('lv_cep', cep); } catch (e) {}
      res.innerHTML = j.opcoes.map(function (o) {
        return '<div class="fr-op"><span>' + esc(o.servico) + '<small>chega até ' + esc(o.chega_ate_texto) + ' (' + o.dias_uteis_total + ' dias úteis' +
          (o.dias_producao ? ', ' + o.dias_producao + ' de produção' : '') + ')</small></span><span class="' + (o.gratis ? 'fr-gratis' : '') + '">' +
          (o.gratis ? 'Grátis' : brl(o.preco)) + '</span></div>';
      }).join('') + '<p class="fr-nota">Frete grátis em compras acima de ' + brl(j.frete_gratis_acima).replace(',00', '') + ' (na opção mais barata).</p>';
    }).catch(function () { res.innerHTML = '<p class="fr-erro">Sem conexão. Tente de novo.</p>'; });
  };

  // ---- carrossel ----
  var slides = $('slides');
  if (slides) {
    var dots = Array.prototype.slice.call(document.querySelectorAll('.dot-b'));
    var atual = 0, n = dots.length;
    var ir = function (i) { atual = (i + n) % n; slides.scrollTo({ left: slides.clientWidth * atual, behavior: 'smooth' }); };
    slides.addEventListener('scroll', function () {
      var i = Math.round(slides.scrollLeft / slides.clientWidth);
      if (i !== atual) atual = i;
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }, { passive: true });
    document.querySelectorAll('[data-mover]').forEach(function (b) { b.addEventListener('click', function () { ir(atual + Number(b.getAttribute('data-mover'))); }); });
    dots.forEach(function (d) { d.addEventListener('click', function () { ir(Number(d.getAttribute('data-slide'))); }); });
    var parado = false; slides.addEventListener('pointerdown', function () { parado = true; });
    setInterval(function () { if (!parado && !document.hidden) ir(atual + 1); }, 6000);
  }

  // ---- produto: variacoes, sacola e frete ----
  var prod = document.querySelector('[data-produto]');
  if (prod) (function () {
    var produtoId = prod.getAttribute('data-produto');
    var varSel = null, cepAtual = '';
    var VARS = []; try { VARS = JSON.parse($('vars-json').textContent); } catch (e) {}
    var nGrupos = VARS.length ? VARS[0].valores.length : 0;
    var sel = [];
    for (var gi = 0; gi < nGrupos; gi++) {
      var u = []; VARS.forEach(function (v) { if (u.indexOf(v.valores[gi]) < 0) u.push(v.valores[gi]); });
      sel[gi] = u.length === 1 ? u[0] : null;
    }
    var botoes = Array.prototype.slice.call(document.querySelectorAll('.var'));
    var casa = function (v, ignorar) { for (var i = 0; i < nGrupos; i++) { if (i === ignorar) continue; if (sel[i] != null && v.valores[i] !== sel[i]) return false; } return true; };
    var res = $('frete-res'), cepIn = $('cep');
    var calcular = function (cep) { cepAtual = cep; mostrarFrete(res, '/api/frete?produto=' + produtoId + '&variante=' + (varSel || '') + '&cep=' + cep, cep); };
    var atualizar = function () {
      botoes.forEach(function (b) {
        var g = Number(b.getAttribute('data-g')), val = b.getAttribute('data-v');
        var ok = VARS.some(function (v) { return v.disp && v.valores[g] === val && casa(v, g); });
        b.classList.toggle('off', !ok); b.classList.toggle('sel', sel[g] === val);
      });
      var v = null;
      if (!nGrupos && VARS.length) v = VARS[0];
      else if (sel.every(function (x) { return x != null; })) v = VARS.filter(function (x) { return casa(x, -1); })[0] || null;
      varSel = v ? String(v.id) : null;
      if (!v) return;
      var p = Number(v.preco), de = Number(v.de || 0), nv = Math.max(1, Math.min(4, Math.floor(p / 50)));
      $('preco-prod').innerHTML = '<div class="preco">' + (de ? '<s>' + brl(de) + '</s> ' : '') + '<b>' + brl(p) + '</b></div>' +
        (nv > 1 ? '<div class="parcelas">' + nv + ' x de ' + brl(p / nv) + ' sem juros</div>' : '');
      $('prazo-info').textContent = !v.disp ? 'Esta combinação está esgotada.' :
        (Number(v.cross) === 0 ? 'Pronta entrega: sai para os Correios sem prazo de produção.' : 'Sob encomenda: ' + v.cross + ' dias úteis de produção + prazo dos Correios.');
      if (v.img) { var foto = document.querySelector('[data-img-id="' + v.img + '"]'); if (foto && foto.parentNode.scrollWidth > foto.parentNode.clientWidth) foto.parentNode.scrollTo({ left: foto.offsetLeft, behavior: 'smooth' }); }
      if (res.innerHTML && cepAtual) calcular(cepAtual);
    };
    botoes.forEach(function (b) { b.addEventListener('click', function () {
      var g = Number(b.getAttribute('data-g')), val = b.getAttribute('data-v');
      sel[g] = sel[g] === val ? null : val; atualizar();
    }); });
    atualizar();
    var add = $('btn-add'), msg = $('add-msg');
    if (add) add.addEventListener('click', function () {
      if (!varSel) {
        var faltam = []; document.querySelectorAll('.grupo').forEach(function (g, k) { if (sel[Number(g.querySelector('.var').getAttribute('data-g'))] == null) faltam.push(g.querySelector('.rot').textContent.toLowerCase()); });
        msg.className = 'add-msg erro'; msg.textContent = 'Escolha ' + (faltam.join(' e ') || 'uma opção') + '.'; return;
      }
      add.disabled = true; add.textContent = 'Adicionando…';
      postJson('/api/sacola', { acao: 'adicionar', produto_id: produtoId, variante_id: varSel, qtd: 1 }).then(function (j) {
        add.disabled = false; add.textContent = 'Adicionar à sacola';
        if (!j.ok) { msg.className = 'add-msg erro'; msg.textContent = j.erro || 'Não foi possível adicionar.'; return; }
        badge(j.qtd_total); msg.className = 'add-msg'; msg.innerHTML = 'Adicionado à sacola. <a href="/carrinho/">Ver sacola</a>';
      });
    });
    mascaraCep(cepIn);
    $('frete').addEventListener('submit', function (e) {
      e.preventDefault();
      var cep = cepIn.value.replace(/\D/g, '');
      if (cep.length !== 8) { res.innerHTML = '<p class="fr-erro">Digite um CEP com 8 números.</p>'; return; }
      calcular(cep);
    });
  })();

  // ---- sacola ----
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qtd],[data-remover]');
    if (!b || !document.querySelector('.pg-sacola')) return;
    b.disabled = true;
    var corpo = { produto_id: b.getAttribute('data-p'), variante_id: b.getAttribute('data-v') };
    if (b.hasAttribute('data-remover')) corpo.acao = 'remover'; else { corpo.acao = 'alterar'; corpo.qtd = Number(b.getAttribute('data-qtd')); }
    postJson('/api/sacola', corpo).then(function (j) { if (!j.ok && j.erro) alert(j.erro); location.reload(); });
  });
  var fs = $('frete-sacola');
  if (fs) {
    var cepS = fs.querySelector('#cep'); mascaraCep(cepS);
    fs.addEventListener('submit', function (e) {
      e.preventDefault();
      var cep = cepS.value.replace(/\D/g, ''), r = $('frete-res');
      if (cep.length !== 8) { r.innerHTML = '<p class="fr-erro">Digite um CEP com 8 números.</p>'; return; }
      mostrarFrete(r, '/api/frete-sacola?cep=' + cep, cep);
    });
  }

  // ---- conta ----
  var fe = $('form-entrar'), fc = $('form-cadastro'), cr = $('conta-res');
  var mascCpf = function (inp) { inp.addEventListener('input', function () { var d = inp.value.replace(/\D/g, '').slice(0, 11); inp.value = d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2'); }); };
  var aviso = function (txt, erro) { cr.innerHTML = '<p class="' + (erro ? 'fr-erro' : 'conta-ok') + '">' + txt + '</p>'; };
  if (fe) {
    var cpfIn = $('cpf'); mascCpf(cpfIn);
    var cel = $('c-cel'); cel.addEventListener('input', function () { var d = cel.value.replace(/\D/g, '').slice(0, 11); cel.value = d.length > 2 ? '(' + d.slice(0, 2) + ') ' + (d.length > 7 ? d.slice(2, d.length - 4) + '-' + d.slice(-4) : d.slice(2)) : d; });
    fe.addEventListener('submit', function (e) {
      e.preventDefault(); var bt = fe.querySelector('button'); bt.disabled = true;
      postJson('/api/conta/entrar', { cpf: cpfIn.value }).then(function (j) {
        bt.disabled = false;
        if (!j.ok) return aviso(esc(j.erro || 'Não foi possível continuar.'), true);
        if (j.existe) { fc.hidden = true; return aviso(j.limite ? 'Já enviamos alguns links na última hora para <b>' + esc(j.email_mascarado) + '</b>. Confira a caixa de entrada e o spam.' : 'Pronto! Enviamos um link de acesso para <b>' + esc(j.email_mascarado) + '</b>. Ele vale por 1 hora. Confira também o spam.'); }
        cr.innerHTML = ''; fc.hidden = false; $('c-nome').focus();
      });
    });
    fc.addEventListener('submit', function (e) {
      e.preventDefault(); var bt = fc.querySelector('button'); bt.disabled = true;
      postJson('/api/conta/cadastrar', { cpf: cpfIn.value, nome: $('c-nome').value, email: $('c-email').value, celular: $('c-cel').value }).then(function (j) {
        bt.disabled = false;
        if (!j.ok) return aviso(esc(j.erro || 'Não foi possível cadastrar.'), true);
        fc.hidden = true; aviso('Quase lá! Enviamos um link para <b>' + esc(j.email_mascarado) + '</b>. Clique nele para confirmar seu e-mail e criar a conta.');
      });
    });
  }
  var sair = $('btn-sair');
  if (sair) sair.addEventListener('click', function () { postJson('/api/conta/sair').then(function () { location.href = '/conta/'; }); });
})();

// ---- enderecos da conta ----
(function () {
  var f = document.getElementById('form-end'); if (!f) return;
  var $ = function (id) { return document.getElementById(id); };
  var res = $('end-res'), lista = $('lista-end');
  var post = function (corpo) { return fetch('/api/conta/enderecos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), credentials: 'same-origin' }).then(function (r) { return r.json(); }); };
  var cepIn = $('e-cep');
  cepIn.addEventListener('input', function () { var d = cepIn.value.replace(/\D/g, '').slice(0, 8); cepIn.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; if (d.length === 8) buscar(); });
  var buscar = function () {
    var d = cepIn.value.replace(/\D/g, ''); if (d.length !== 8) return;
    res.innerHTML = '<p class="fr-nota">Buscando o CEP…</p>';
    fetch('/api/cep?cep=' + d).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) { res.innerHTML = '<p class="fr-erro">' + j.erro + '</p>'; return; }
      res.innerHTML = '';
      if (j.rua) $('e-rua').value = j.rua; if (j.bairro) $('e-bairro').value = j.bairro;
      $('e-cidade').value = j.cidade; $('e-uf').value = j.uf;
      (j.rua ? $('e-numero') : $('e-rua')).focus();
    }).catch(function () { res.innerHTML = '<p class="fr-erro">Não conseguimos buscar o CEP. Preencha à mão.</p>'; });
  };
  $('e-buscar').addEventListener('click', buscar);
  var abrir = function (e) {
    f.hidden = false; res.innerHTML = '';
    $('e-id').value = e ? e.id : ''; cepIn.value = e ? e.cep.slice(0, 5) + '-' + e.cep.slice(5) : '';
    $('e-rua').value = e ? e.rua : ''; $('e-numero').value = e ? e.numero : ''; $('e-comp').value = e ? (e.complemento || '') : '';
    $('e-bairro').value = e ? e.bairro : ''; $('e-cidade').value = e ? e.cidade : ''; $('e-uf').value = e ? e.uf : '';
    if (e) $('e-dest').value = e.destinatario; $('e-principal').checked = e ? !!e.principal : false;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' }); cepIn.focus();
  };
  $('btn-novo-end').addEventListener('click', function () { abrir(null); });
  $('e-cancelar').addEventListener('click', function () { f.hidden = true; });
  var atualizar = function () { location.reload(); };
  lista.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-end-editar')) { abrir(JSON.parse(b.closest('.end').getAttribute('data-end'))); return; }
    if (b.hasAttribute('data-end-remover')) { if (!confirm('Remover este endereço?')) return; post({ acao: 'remover', id: b.getAttribute('data-end-remover') }).then(atualizar); return; }
    if (b.hasAttribute('data-end-principal')) post({ acao: 'principal', id: b.getAttribute('data-end-principal') }).then(atualizar);
  });
  f.addEventListener('submit', function (ev) {
    ev.preventDefault(); var bt = f.querySelector('.btn'); bt.disabled = true;
    post({ id: $('e-id').value || null, cep: cepIn.value, rua: $('e-rua').value, numero: $('e-numero').value, complemento: $('e-comp').value,
      bairro: $('e-bairro').value, cidade: $('e-cidade').value, uf: $('e-uf').value, destinatario: $('e-dest').value, principal: $('e-principal').checked })
      .then(function (j) { bt.disabled = false; if (!j.ok) { res.innerHTML = '<p class="fr-erro">' + j.erro + '</p>'; return; } atualizar(); })
      .catch(function () { bt.disabled = false; res.innerHTML = '<p class="fr-erro">Sem conexão. Tente de novo.</p>'; });
  });
})();
