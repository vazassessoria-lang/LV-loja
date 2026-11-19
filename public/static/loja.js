// Leticia Vaz Store — interacoes leves (menu, carrossel, variacoes, frete). Sem dependencias.
(function () {
  // menu lateral
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-abrir]');
    if (a) { var d = document.getElementById(a.getAttribute('data-abrir')); if (d) d.hidden = false; return; }
    if (e.target.closest('[data-fechar]')) { var dr = document.getElementById('drawer'); if (dr) dr.hidden = true; }
  });
  // carrossel
  var slides = document.getElementById('slides');
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
  // produto: variacoes + frete
  var prod = document.querySelector('[data-produto]');
  if (!prod) return;
  var produtoId = prod.getAttribute('data-produto');
  var varSel = null, cepAtual = '';
  var brl = function (v) { return 'R$' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var VARS = []; try { VARS = JSON.parse(document.getElementById('vars-json').textContent); } catch (e) {}
  var nGrupos = VARS.length ? VARS[0].valores.length : 0;
  var sel = [];
  // grupos com um valor so: ja escolhidos
  for (var gi = 0; gi < nGrupos; gi++) {
    var u = []; VARS.forEach(function (v) { if (u.indexOf(v.valores[gi]) < 0) u.push(v.valores[gi]); });
    sel[gi] = u.length === 1 ? u[0] : null;
  }
  var botoes = Array.prototype.slice.call(document.querySelectorAll('.var'));
  var casa = function (v, ignorar) { for (var i = 0; i < nGrupos; i++) { if (i === ignorar) continue; if (sel[i] != null && v.valores[i] !== sel[i]) return false; } return true; };
  var atualizar = function () {
    botoes.forEach(function (b) {
      var g = Number(b.getAttribute('data-g')), val = b.getAttribute('data-v');
      var ok = VARS.some(function (v) { return v.disp && v.valores[g] === val && casa(v, g); });
      b.classList.toggle('off', !ok); b.classList.toggle('sel', sel[g] === val);
    });
    var v = null;
    if (sel.every(function (x) { return x != null; })) v = VARS.filter(function (x) { return casa(x, -1); })[0] || null;
    varSel = v ? String(v.id) : null;
    if (!v) return;
    var p = Number(v.preco), de = Number(v.de || 0), nv = Math.max(1, Math.min(4, Math.floor(p / 50)));
    document.getElementById('preco-prod').innerHTML = '<div class="preco">' + (de ? '<s>' + brl(de) + '</s> ' : '') + '<b>' + brl(p) + '</b></div>' +
      (nv > 1 ? '<div class="parcelas">' + nv + ' x de ' + brl(p / nv) + ' sem juros</div>' : '');
    document.getElementById('prazo-info').textContent = !v.disp ? 'Esta combinação está esgotada.' :
      (Number(v.cross) === 0 ? 'Pronta entrega: sai para os Correios sem prazo de produção.' : 'Sob encomenda: ' + v.cross + ' dias úteis de produção + prazo dos Correios.');
    if (v.img) { var foto = document.querySelector('[data-img-id="' + v.img + '"]'); if (foto && foto.parentNode.scrollWidth > foto.parentNode.clientWidth) foto.parentNode.scrollTo({ left: foto.offsetLeft, behavior: 'smooth' }); }
    if (document.getElementById('frete-res').innerHTML && cepAtual) calcular(cepAtual);
  };
  botoes.forEach(function (b) { b.addEventListener('click', function () {
    var g = Number(b.getAttribute('data-g')), val = b.getAttribute('data-v');
    sel[g] = sel[g] === val ? null : val; atualizar();
  }); });
  atualizar();
  var cepIn = document.getElementById('cep'), res = document.getElementById('frete-res');
  try { var salvo = localStorage.getItem('lv_cep'); if (salvo) cepIn.value = salvo; } catch (e) {}
  cepIn.addEventListener('input', function () { var d = cepIn.value.replace(/\D/g, '').slice(0, 8); cepIn.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; });
  var calcular = function (cep) {
    cepAtual = cep;
    res.innerHTML = '<p class="fr-nota">Calculando…</p>';
    fetch('/api/frete?produto=' + produtoId + '&variante=' + (varSel || '') + '&cep=' + cep)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) { res.innerHTML = '<p class="fr-erro">' + (j.erro || 'Não foi possível calcular.') + '</p>'; return; }
        try { localStorage.setItem('lv_cep', cep); } catch (e) {}
        res.innerHTML = j.opcoes.map(function (o) {
          return '<div class="fr-op"><span>' + o.servico + '<small>chega até ' + o.chega_ate_texto + ' (' + o.dias_uteis_total + ' dias úteis' +
            (o.dias_producao ? ', ' + o.dias_producao + ' de produção' : '') + ')</small></span><span class="' + (o.gratis ? 'fr-gratis' : '') + '">' +
            (o.gratis ? 'Grátis' : brl(o.preco)) + '</span></div>';
        }).join('') + '<p class="fr-nota">Frete grátis em compras acima de ' + brl(j.frete_gratis_acima).replace(',00', '') + ' (na opção mais barata).</p>';
      })
      .catch(function () { res.innerHTML = '<p class="fr-erro">Sem conexão. Tente de novo.</p>'; });
  };
  document.getElementById('frete').addEventListener('submit', function (e) {
    e.preventDefault();
    var cep = cepIn.value.replace(/\D/g, '');
    if (cep.length !== 8) { res.innerHTML = '<p class="fr-erro">Digite um CEP com 8 números.</p>'; return; }
    calcular(cep);
  });
})();
