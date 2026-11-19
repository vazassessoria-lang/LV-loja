// Paginas da loja (HTML no servidor = o Google enxerga sem rodar JS).
// Visual proximo da loja atual (tema Recife): preto e branco, Plus Jakarta Sans, faixa preta no topo.
// Regra de marca: NUNCA verde (nem no botao de WhatsApp).
import { esc, brl, parcelas } from './util.js';
import { BANNERS } from './banners.js';

export const MENU = [
  { nome: 'Blusas', h: 'blusas', subs: [['regatas', 'regatas'], ['manga curta', 'manga-curta'], ['manga longa', 'manga-longa2'], ['tricot', 'tricot2']] },
  { nome: 'Tops', h: 'top', subs: [] },
  { nome: 'Bodies', h: 'bodies', subs: [['regatas', 'regatas2'], ['manga curta', 'manga-curta2'], ['manga longa', 'manga-longa1'], ['básicos', 'basicos1'], ['festas', 'festas3']] },
  { nome: 'Calças', h: 'calcas', subs: [['básicas', 'basicas'], ['festas', 'festas5'], ['sports', 'sports'], ['alfaiataria', 'alfaiataria1'], ['couro sintético', 'couro-sintetico1'], ['moletom', 'moletom1'], ['algodão', 'algodao'], ['jeans', 'jeans2']] },
  { nome: 'Casacos', h: 'casacos', subs: [['jaquetas', 'jaquetas1'], ['blazers', 'blazers1'], ['sobretudos', 'sobretudos'], ['pele fake', 'pele-fake'], ['couro sintético', 'couro-sintetico2'], ['alfaiataria', 'alfaiataria'], ['tricot', 'tricot']] },
  { nome: 'Macacões', h: 'macacoes', subs: [['curtos', 'curtos'], ['longos', 'longos'], ['básicos', 'basicos4'], ['festas', 'festas7'], ['sports', 'jardineiras1']] },
  { nome: 'Saias', h: 'saias', subs: [['curtas', 'curtas1'], ['midis', 'midis1'], ['longas', 'longas1']] },
  { nome: 'Shorts', h: 'shorts', subs: [['shorts saia', 'shorts-saia'], ['básicos', 'basicos2'], ['festas', 'festas4'], ['sports', 'sports4'], ['couro sintético', 'couro-sintetico']] },
  { nome: 'Vestidos', h: 'vestidos', subs: [['curtos', 'curtos2'], ['midis', 'midis2'], ['longos', 'longos2'], ['básicos', 'basicos3'], ['festas', 'festas6']] },
  { nome: 'Sports', h: 'lv-sports', subs: [['croppeds e tops', 'croppeds-e-tops'], ['calças', 'calcas1'], ['macacões', 'macacoes1'], ['shorts', 'shorts1'], ['bags', 'bags']] },
  { nome: 'Beachwear', h: 'beachwear', subs: [['biquínis', 'biquinis'], ['saídas de praia', 'saidas-de-praia'], ['acessórios de praia', 'acessorios-de-praia']] },
  { nome: 'Pijamas', h: 'pijamas', subs: [] },
];

const WHATS = '5511995290000';
const ICONE = {
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  busca: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  conta: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  sacola: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  whats: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.5 3.9 1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
};

function adbar(env) {
  const t = 'frete grátis acima de ' + brl(env.FRETE_GRATIS_ACIMA || 599).replace(',00', '');
  const itens = Array(8).fill('<span>' + esc(t) + '</span><span class="dot">.</span>').join('');
  return '<div class="adbar" aria-label="' + esc(t) + '"><div class="adbar-track">' + itens + itens + '</div></div>';
}

function menuDrawer() {
  const itens = MENU.map((m) => {
    if (!m.subs.length) return '<li><a href="/' + m.h + '/">' + esc(m.nome) + '</a></li>';
    return '<li><details><summary>' + esc(m.nome) + '</summary><ul><li><a href="/' + m.h + '/">Ver tudo em ' + esc(m.nome) + '</a></li>' +
      m.subs.map((s) => '<li><a href="/' + m.h + '/' + s[1] + '/">' + esc(s[0]) + '</a></li>').join('') + '</ul></details></li>';
  }).join('');
  return '<div class="drawer" id="drawer" hidden><div class="drawer-bg" data-fechar></div><nav class="drawer-painel" aria-label="Departamentos">' +
    '<button class="drawer-x" data-fechar aria-label="Fechar">✕</button><ul class="drawer-lista">' + itens + '</ul></nav></div>';
}

export function layout(env, o) {
  const titulo = o.titulo ? o.titulo + ' | Leticia Vaz Store' : 'Leticia Vaz Store | Moda Feminina';
  const noindex = env.LOJA_NOINDEX === '1';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
${o.descricao ? '<meta name="description" content="' + esc(o.descricao) + '">' : ''}
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
${o.canonical ? '<link rel="canonical" href="' + esc(o.canonical) + '">' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/loja.css?v=1">
<link rel="icon" href="/static/logo.webp">
${o.head || ''}
</head><body>
${noindex ? '<div class="aviso-teste">Loja nova em teste — os pedidos continuam pela loja atual</div>' : ''}
${adbar(env)}
<header class="topo">
  <div class="topo-esq">
    <button class="ico" data-abrir="drawer" aria-label="Menu">${ICONE.menu}</button>
    <form action="/busca" class="busca"><button class="ico" aria-label="Buscar">${ICONE.busca}</button><input name="q" placeholder="Buscar" aria-label="Buscar produtos" value="${esc(o.busca || '')}"></form>
  </div>
  <a class="logo" href="/"><img src="/static/logo.webp" alt="Leticia Vaz Store" width="200" height="45"></a>
  <div class="topo-dir"><span class="feito">Feito no Brasil</span>
    <a class="ico" href="/conta" aria-label="Minha conta">${ICONE.conta}</a>
    <a class="ico sacola" href="/carrinho" aria-label="Sacola">${ICONE.sacola}<span class="badge" id="badge-sacola">0</span></a></div>
</header>
<nav class="nav-desk" aria-label="Departamentos">${MENU.map((m) => '<a href="/' + m.h + '/">' + esc(m.nome) + '</a>').join('')}</nav>
${menuDrawer()}
<main>${o.corpo}</main>
<footer class="rodape">
  <div class="rodape-col"><img src="/static/logo.webp" alt="Leticia Vaz Store" width="160" height="36" class="logo-rodape">
    <p>Fale com a Leticia Vaz Store! Atendimento por e-mail ou WhatsApp para dúvidas sobre pedidos, trocas, devoluções e disponibilidade de produtos. Respondemos em até 24h.</p></div>
  <div class="rodape-col"><h4>Departamentos</h4>${MENU.slice(0, 8).map((m) => '<a href="/' + m.h + '/">' + esc(m.nome) + '</a>').join('')}</div>
  <div class="rodape-col"><h4>Entre em contato</h4><a href="https://wa.me/${WHATS}">WhatsApp (11) 99529-0000</a><a href="mailto:vendas@lvstore.com.br">vendas@lvstore.com.br</a><a href="https://instagram.com/lvstore">@lvstore</a>
    <p class="endereco">Rua Advogado Zeferino Vasconcellos, 483 Galpão 2 Lavapés – Bragança Paulista, SP 12903-010</p></div>
</footer>
<p class="copyright">Nicole Riccio Vaz Ltda · CNPJ 22.766.280/0001-86</p>
<a class="whats" href="https://wa.me/${WHATS}" aria-label="WhatsApp">${ICONE.whats}</a>
<script src="/static/loja.js?v=1" defer></script>
</body></html>`;
}

function img(src, larg) {
  // Nuvemshop gera tamanhos 240/320/480/640 (-L-0) e o grande -1024-1024 (o -1024-0 NAO existe: 403)
  if (larg >= 1024) return String(src || '');
  return String(src || '').replace(/-1024-1024\.(webp|png|jpg|jpeg)$/i, '-' + larg + '-0.$1');
}

export function precoHtml(p) {
  const par = parcelas(p.preco);
  return '<div class="preco">' + (p.preco_de ? '<s>' + brl(p.preco_de) + '</s> ' : '') + '<b>' + brl(p.preco) + '</b></div>' +
    (par.vezes > 1 ? '<div class="parcelas">' + par.vezes + ' x de ' + brl(par.valor) + ' sem juros</div>' : '');
}

export function card(p) {
  const im = p.imagens[0], im2 = p.imagens[1];
  const desc = p.preco_de ? '<span class="selo">-' + brl(p.preco_de - p.preco).replace('R$', '') + '</span>' : '';
  return '<a class="card" href="/produtos/' + esc(p.handle) + '/">' +
    '<div class="card-foto">' + desc +
    (im ? '<img loading="lazy" src="' + esc(img(im.src, 480)) + '" alt="' + esc(p.nome) + '" width="480" height="720">' : '') +
    (im2 ? '<img loading="lazy" class="foto2" src="' + esc(img(im2.src, 480)) + '" alt="" width="480" height="720">' : '') +
    (!p.disponivel ? '<span class="esgotado">Esgotado</span>' : '') + '</div>' +
    '<div class="card-nome">' + esc(p.nome) + '</div>' + precoHtml(p) + '</a>';
}

export function grade(produtos) {
  if (!produtos.length) return '<p class="vazio">Nenhum produto por aqui ainda.</p>';
  return '<div class="grade">' + produtos.map(card).join('') + '</div>';
}

export function home(env, novidades, blocos) {
  const tiles = blocos.map((b) => '<a class="tile" href="/' + b.h + '/">' +
    (b.foto ? '<img loading="lazy" src="' + esc(img(b.foto, 640)) + '" alt="' + esc(b.nome) + '">' : '') +
    '<span><b>' + esc(b.nome) + '</b><u>Shop now</u></span></a>').join('');
  const slides = BANNERS.map((b, n) => '<picture class="slide"><source media="(max-width: 767px)" srcset="' + esc(b.mobile) + '">' +
    '<img src="' + esc(b.desktop) + '" alt="Leticia Vaz Store - destaque ' + (n + 1) + '" width="1920" height="660"' + (n ? ' loading="lazy"' : ' fetchpriority="high"') + '></picture>').join('');
  const dots = BANNERS.map((b, n) => '<button class="dot-b' + (n ? '' : ' on') + '" data-slide="' + n + '" aria-label="Banner ' + (n + 1) + '"></button>').join('');
  const corpo = '<section class="carrossel" aria-label="Destaques"><div class="slides" id="slides">' + slides + '</div>' +
    '<button class="seta seta-e" data-mover="-1" aria-label="Anterior">‹</button><button class="seta seta-d" data-mover="1" aria-label="Próximo">›</button>' +
    '<div class="dots">' + dots + '</div></section>' +
    '<h1 class="sr">Leticia Vaz Store | Moda Feminina</h1>' +
    '<section id="novidades"><h2 class="titulo-sec">New</h2>' + grade(novidades) + '</section>' +
    '<div class="faixa">' + adbar(env).replace('class="adbar"', 'class="adbar faixa-meio"') + '</div>' +
    '<section class="tiles">' + tiles + '</section>';
  return layout(env, { corpo, descricao: 'Moda feminina feita no Brasil: blusas, bodies, calças, vestidos e muito mais.' });
}

export function paginaCategoria(env, titulo, produtos, caminho, sub) {
  const subs = sub && sub.length ? '<div class="subcats">' + sub.map((s) => '<a href="' + esc(s[1]) + '">' + esc(s[0]) + '</a>').join('') + '</div>' : '';
  const corpo = '<div class="cab-cat"><nav class="migalha"><a href="/">Início</a> / ' + esc(titulo) + '</nav><h1>' + esc(titulo) + '</h1>' + subs + '</div>' + grade(produtos);
  return layout(env, { titulo, corpo, canonical: 'https://www.leticiavazstore.com.br' + caminho });
}

export function paginaBusca(env, q, produtos) {
  const corpo = '<div class="cab-cat"><h1>Busca: ' + esc(q) + '</h1><p>' + produtos.length + ' produto(s)</p></div>' + grade(produtos);
  return layout(env, { titulo: 'Busca', corpo, busca: q });
}

export function paginaProduto(env, p) {
  const fotos = p.imagens.map((i, n) => '<img ' + (n ? 'loading="lazy" ' : '') + 'src="' + esc(img(i.src, 1024)) + '" alt="' + esc(p.nome) + ' - foto ' + (n + 1) + '" width="1024" height="1536" data-img-id="' + esc(i.id) + '">').join('');
  // Variacoes por atributo (ex.: Cor / Tamanho), como na loja atual. Grupo com um valor so fica escondido.
  const grupos = p.atributos.map((nome, i) => {
    const vals = [];
    for (const v of p.variantes) { const x = v.valores[i]; if (x != null && vals.indexOf(x) < 0) vals.push(x); }
    return { nome: nome || 'Opção', i, vals };
  });
  const varsJson = p.variantes.map((v) => ({ id: v.id, valores: v.valores, preco: v.preco, de: v.preco_de, cross: v.crossdocking, disp: v.disponivel, img: v.imagem_id }));
  const gruposHtml = grupos.filter((g) => g.vals.length > 1).map((g) => '<div class="grupo"><div class="rot">' + esc(g.nome) + '</div><div class="vars">' +
    g.vals.map((x) => '<button type="button" class="var" data-g="' + g.i + '" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div></div>').join('');
  const prontaAlguma = p.variantes.some((v) => v.disponivel && v.crossdocking === 0);
  const prazoInfo = prontaAlguma ? 'Pronta entrega nas variações marcadas; as demais são produzidas sob encomenda em 2 dias úteis.' : 'Peça produzida sob encomenda: 2 dias úteis de produção + prazo dos Correios.';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.nome, image: p.imagens.slice(0, 5).map((i) => i.src),
    sku: String(p.id), brand: { '@type': 'Brand', name: 'Leticia Vaz Store' },
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price: Number(p.preco).toFixed(2), availability: p.disponivel ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: 'https://www.leticiavazstore.com.br/produtos/' + p.handle + '/' },
  };
  const corpo = `<div class="produto" data-produto="${esc(p.id)}">
  <div class="galeria">${fotos}</div>
  <div class="info">
    <nav class="migalha"><a href="/">Início</a> / ${esc(p.nome)}</nav>
    <h1>${esc(p.nome)}</h1>
    <div id="preco-prod">${precoHtml(p)}</div>
    ${gruposHtml}
    <script type="application/json" id="vars-json">${JSON.stringify(varsJson).replace(/</g, '\\u003c')}</script>
    <p class="prazo-info" id="prazo-info">${esc(prazoInfo)}</p>
    <button class="btn btn-comprar" disabled title="Checkout em construção">Comprar — em breve</button>
    <p class="teste-obs">Loja nova em teste: para comprar agora, use <a href="https://www.leticiavazstore.com.br/produtos/${esc(p.handle)}/">a loja atual</a>.</p>
    <form class="frete" id="frete" autocomplete="on">
      <label for="cep">Calcular frete e prazo</label>
      <div class="frete-linha"><input id="cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9"><button class="btn-sec">Calcular</button></div>
      <a class="nao-sei" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener">Não sei meu CEP</a>
      <div id="frete-res" aria-live="polite"></div>
    </form>
    <div class="descricao">${p.descricao || ''}</div>
  </div>
</div>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  return layout(env, {
    titulo: p.seo_titulo || p.nome, descricao: p.seo_descricao || '', corpo,
    canonical: 'https://www.leticiavazstore.com.br/produtos/' + p.handle + '/',
  });
}

export function pagina404(env) {
  return layout(env, { titulo: 'Página não encontrada', corpo: '<div class="cab-cat"><h1>Página não encontrada</h1><p><a href="/">Voltar para o início</a></p></div>' });
}

export function paginaSimples(env, titulo, texto) {
  return layout(env, { titulo, corpo: '<div class="cab-cat"><h1>' + esc(titulo) + '</h1><p>' + esc(texto) + '</p></div>' });
}
