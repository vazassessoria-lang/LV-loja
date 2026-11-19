// Leticia Vaz Store — loja propria (Cloudflare Worker + D1). v0.1 em paralelo a Nuvemshop.
// Rotas iguais as da loja atual (/produtos/{handle}/, /{categoria}/, /{categoria}/{sub}/) pra virada sem perder Google.
import { garantirSchema, sincronizar, produtoPorHandle, produtoPorId, categoriaPorHandle, listarProdutos } from './catalogo.js';
import { cotarFrete } from './frete.js';
import { MENU, home, paginaCategoria, paginaProduto, paginaBusca, pagina404, paginaSimples } from './views.js';

const VERSAO = '0.1.1';

function html(env, corpo, status) {
  const h = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' };
  if (env.LOJA_NOINDEX === '1') h['x-robots-tag'] = 'noindex, nofollow';
  return new Response(corpo, { status: status || 200, headers: h });
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function chaveOk(request, env) {
  return (request.headers.get('X-Scheduler-Key') || '') === (env.DASHBOARD_KEY || 'lvprod-9Mn4Vy3Q');
}

async function rotear(request, env, ctx) {
  const url = new URL(request.url);
  let path = url.pathname;
  if (path === '/robots.txt') {
    const corpo = env.LOJA_NOINDEX === '1' ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n';
    return new Response(corpo, { headers: { 'content-type': 'text/plain' } });
  }
  if (path === '/health') {
    let sync = null;
    try { const r = await env.DB.prepare("SELECT valor FROM loja_config WHERE chave='ultima_sync'").first(); sync = r ? JSON.parse(r.valor) : null; } catch (_) {}
    return json({ ok: true, versao: VERSAO, ultima_sync: sync });
  }
  // --- API ---
  if (path === '/api/frete' && request.method === 'GET') {
    const p = await produtoPorId(env, url.searchParams.get('produto'));
    if (!p) return json({ ok: false, erro: 'Produto não encontrado.' }, 404);
    const vid = url.searchParams.get('variante');
    const v = p.variantes.find((x) => String(x.id) === String(vid)) || p.variantes.find((x) => x.disponivel) || p.variantes[0];
    const qtd = Math.max(1, Math.min(20, parseInt(url.searchParams.get('qtd') || '1', 10)));
    const itens = [{ peso_g: v && v.peso_g, qtd, crossdocking: v ? v.crossdocking : p.crossdocking }];
    const r = await cotarFrete(env, url.searchParams.get('cep'), itens, (v ? v.preco : p.preco) * qtd);
    return json(r, r.ok ? 200 : 400);
  }
  if (path === '/api/admin/sync' && request.method === 'POST') {
    if (!chaveOk(request, env)) return json({ ok: false, erro: 'nao autorizado' }, 401);
    try { return json(Object.assign({ ok: true }, await sincronizar(env))); }
    catch (e) { return json({ ok: false, erro: String(e.message).slice(0, 400) }, 500); }
  }
  // --- paginas ---
  if (path === '/') {
    await garantirSchema(env);
    const novidades = await listarProdutos(env, { limite: 12 });
    const blocos = [];
    for (const m of MENU.filter((x) => ['blusas', 'bodies', 'calcas', 'casacos', 'macacoes', 'vestidos'].indexOf(x.h) >= 0)) {
      const c = await categoriaPorHandle(env, m.h);
      const ps = c ? await listarProdutos(env, { categoriaId: c.id, limite: 1 }) : [];
      blocos.push({ nome: m.nome, h: m.h, foto: ps[0] && ps[0].imagens[0] ? ps[0].imagens[0].src : null });
    }
    return html(env, home(env, novidades, blocos));
  }
  if (path === '/busca') {
    const q = (url.searchParams.get('q') || '').slice(0, 60);
    return html(env, paginaBusca(env, q, q ? await listarProdutos(env, { busca: q, limite: 60 }) : []));
  }
  if (path === '/carrinho' || path === '/conta') {
    return html(env, paginaSimples(env, path === '/carrinho' ? 'Sacola' : 'Minha conta', 'Em construção: esta parte da loja nova ainda não está pronta.'));
  }
  if (!path.endsWith('/')) return Response.redirect(url.origin + path + '/' + url.search, 301);
  const partes = path.split('/').filter(Boolean);
  if (partes[0] === 'produtos' && partes.length === 2) {
    const p = await produtoPorHandle(env, decodeURIComponent(partes[1]));
    return p ? html(env, paginaProduto(env, p)) : html(env, pagina404(env), 404);
  }
  if (partes.length === 1 || partes.length === 2) {
    const handle = decodeURIComponent(partes[partes.length - 1]);
    const c = await categoriaPorHandle(env, handle);
    if (c) {
      const m = MENU.find((x) => x.h === partes[0]);
      const titulo = partes.length === 1 ? (m ? m.nome : c.nome) : c.nome;
      const subs = partes.length === 1 && m ? m.subs.map((s) => [s[0], '/' + m.h + '/' + s[1] + '/']) : null;
      return html(env, paginaCategoria(env, titulo, await listarProdutos(env, { categoriaId: c.id, limite: 96, ordem: url.searchParams.get('ordem') }), path, subs));
    }
  }
  return html(env, pagina404(env), 404);
}

export default {
  async fetch(request, env, ctx) {
    try { return await rotear(request, env, ctx); }
    catch (e) {
      console.error('[loja] ' + e.message);
      return new Response('Erro temporário. Tente de novo em instantes.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  },
  async scheduled(event, env, ctx) {
    try { const r = await sincronizar(env); console.log('[cron] sync ' + JSON.stringify(r)); }
    catch (e) { console.error('[cron] sync falhou: ' + e.message); }
  },
};
