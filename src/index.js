// Leticia Vaz Store — loja propria (Cloudflare Worker + D1). v0.1 em paralelo a Nuvemshop.
// Rotas iguais as da loja atual (/produtos/{handle}/, /{categoria}/, /{categoria}/{sub}/) pra virada sem perder Google.
import { garantirSchema, sincronizar, produtoPorHandle, produtoPorId, categoriaPorHandle, listarProdutos } from './catalogo.js';
import { cotarFrete } from './frete.js';
import { MENU, home, paginaCategoria, paginaProduto, paginaBusca, pagina404, paginaSacola, paginaEntrar, paginaConta } from './views.js';
import { COOKIE_SACOLA, lerCookie, cookie, novoId, resumo, alterar, vincularCpf } from './sacola.js';
import { COOKIE_CONTA, cpfValido, cpfMascarado, clienteLogada } from './conta.js';
import { painelPost } from './catalogo.js';
import { listar as listarEnderecos, salvar as salvarEndereco, remover as removerEndereco, tornarPrincipal } from './enderecos.js';

const VERSAO = '0.3.0';

function html(env, corpo, status, privada, extra) {
  const h = Object.assign({ 'content-type': 'text/html; charset=utf-8', 'cache-control': privada ? 'private, no-store' : 'public, max-age=60' }, extra || {});
  if (env.LOJA_NOINDEX === '1') h['x-robots-tag'] = 'noindex, nofollow';
  return new Response(corpo, { status: status || 200, headers: h });
}
function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extra || {}) });
}
const LIMPA_CONTA = COOKIE_CONTA + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
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
  // --- sacola ---
  if (path === '/api/sacola' && request.method === 'GET') {
    return json(Object.assign({ ok: true }, await resumo(env, lerCookie(request, COOKIE_SACOLA), env.FRETE_GRATIS_ACIMA)));
  }
  if (path === '/api/sacola' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    let id = lerCookie(request, COOKIE_SACOLA), extra = null;
    if (!id) { id = novoId(); extra = { 'set-cookie': cookie(COOKIE_SACOLA, id, 90) }; }
    const acao = ['adicionar', 'alterar', 'remover'].indexOf(b.acao) >= 0 ? b.acao : 'adicionar';
    const r = await alterar(env, id, null, acao, b.produto_id, b.variante_id, b.qtd);
    const res = await resumo(env, id, env.FRETE_GRATIS_ACIMA);
    return json(Object.assign({}, r, { qtd_total: res.qtd_total, subtotal: res.subtotal }), r.ok ? 200 : 400, extra);
  }
  if (path === '/api/frete-sacola' && request.method === 'GET') {
    const res = await resumo(env, lerCookie(request, COOKIE_SACOLA), env.FRETE_GRATIS_ACIMA);
    const itens = res.itens.filter((i) => i.disponivel).map((i) => ({ peso_g: i.peso_g, qtd: i.qtd, crossdocking: i.crossdocking }));
    if (!itens.length) return json({ ok: false, erro: 'Sua sacola está vazia.' }, 400);
    const r = await cotarFrete(env, url.searchParams.get('cep'), itens, res.subtotal);
    return json(r, r.ok ? 200 : 400);
  }
  // --- conta (CPF -> link no e-mail; mesma conta do LV Club) ---
  if (path === '/api/conta/entrar' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const cpf = String(b.cpf || '').replace(/\D/g, '');
    if (!cpfValido(cpf)) return json({ ok: false, erro: 'CPF inválido. Confira os números.' }, 400);
    const r = await painelPost(env, '/api/loja/conta/solicitar', { cpf, url_loja: url.origin });
    if (!r.ok) return json({ ok: false, erro: 'Não conseguimos enviar o link agora. Tente de novo em instantes.' }, 502);
    return json({ ok: true, existe: !!r.existe, email_mascarado: r.email_mascarado || null, limite: !!r.limite });
  }
  if (path === '/api/conta/cadastrar' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const cpf = String(b.cpf || '').replace(/\D/g, '');
    if (!cpfValido(cpf)) return json({ ok: false, erro: 'CPF inválido. Confira os números.' }, 400);
    const r = await painelPost(env, '/api/loja/conta/cadastrar', { cpf, nome: b.nome, email: b.email, celular: b.celular, url_loja: url.origin });
    if (r.status === 409) return json({ ok: false, erro: 'Esse CPF já tem cadastro. Use "Receber link de acesso".' }, 409);
    if (!r.ok) return json({ ok: false, erro: r.status === 400 ? 'Confira os dados: nome, e-mail e celular com DDD.' : 'Não conseguimos cadastrar agora. Tente de novo em instantes.' }, r.status === 400 ? 400 : 502);
    return json({ ok: true, email_mascarado: r.email_mascarado || null, limite: !!r.limite });
  }
  // --- enderecos (precisa estar logada) ---
  if (path === '/api/cep' && request.method === 'GET') {
    const cep = String(url.searchParams.get('cep') || '').replace(/\D/g, '');
    if (cep.length !== 8) return json({ ok: false, erro: 'Digite um CEP com 8 números.' }, 400);
    const req2 = new Request(env.DASHBOARD_URL + '/api/loja/cep?cep=' + cep, { headers: { 'X-Scheduler-Key': env.DASHBOARD_KEY || 'lvprod-9Mn4Vy3Q' } });
    const r = env.PAINEL ? await env.PAINEL.fetch(req2) : await fetch(req2);
    const j = await r.json().catch(() => ({ ok: false }));
    if (r.status === 404) return json({ ok: false, erro: 'CEP não encontrado. Confira os números.' }, 404);
    if (!j.ok) return json({ ok: false, erro: 'Não conseguimos buscar o CEP agora. Preencha o endereço à mão.' }, 502);
    return json({ ok: true, rua: j.rua, bairro: j.bairro, cidade: j.cidade, uf: j.uf });
  }
  if (path === '/api/conta/enderecos') {
    const cl = await clienteLogada(env, request);
    if (!cl) return json({ ok: false, erro: 'Entre na sua conta para salvar endereços.' }, 401);
    const cpf = cl.cliente.cpf;
    if (request.method === 'GET') return json({ ok: true, enderecos: await listarEnderecos(env, cpf) });
    if (request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      let r;
      if (b.acao === 'remover') r = await removerEndereco(env, cpf, b.id);
      else if (b.acao === 'principal') r = await tornarPrincipal(env, cpf, b.id);
      else r = await salvarEndereco(env, cpf, b);
      return json(Object.assign(r, r.ok ? { enderecos: await listarEnderecos(env, cpf) } : {}), r.ok ? 200 : 400);
    }
  }
  if (path === '/api/conta/sair' && request.method === 'POST') {
    const dev = lerCookie(request, COOKIE_CONTA);
    if (dev) { try { await painelPost(env, '/api/loja/conta/sair', { device: dev }); } catch (_) {} }
    return json({ ok: true }, 200, { 'set-cookie': LIMPA_CONTA });
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
  if (path === '/carrinho' || path === '/carrinho/') {
    const cl = lerCookie(request, COOKIE_CONTA) ? await clienteLogada(env, request) : null;
    return html(env, paginaSacola(env, await resumo(env, lerCookie(request, COOKIE_SACOLA), env.FRETE_GRATIS_ACIMA), cl), 200, true);
  }
  if (path === '/conta' || path === '/conta/') {
    const cl = await clienteLogada(env, request);
    if (!cl) return html(env, paginaEntrar(env, null), 200, true, lerCookie(request, COOKIE_CONTA) ? { 'set-cookie': LIMPA_CONTA } : null);
    cl.cpf_mascarado = cpfMascarado(cl.cliente.cpf);
    cl.enderecos = await listarEnderecos(env, cl.cliente.cpf);
    return html(env, paginaConta(env, cl), 200, true);
  }
  if (path === '/conta/entrar' || path === '/conta/entrar/') {
    const tk = (url.searchParams.get('token') || '').replace(/[^a-f0-9]/g, '');
    const r = tk ? await painelPost(env, '/api/loja/conta/confirmar', { token: tk, user_agent: request.headers.get('User-Agent') || '' }) : { ok: false, error: 'Link inválido.' };
    if (!r.ok || !r.device) return html(env, paginaEntrar(env, (r.error || 'Link inválido.') + ' Digite seu CPF para receber outro.'), 400, true);
    const d = await painelPost(env, '/api/loja/conta/dados', { device: r.device });
    if (d.ok && d.cliente) await vincularCpf(env, lerCookie(request, COOKIE_SACOLA), d.cliente.cpf);
    return new Response(null, { status: 302, headers: { location: '/conta/', 'set-cookie': cookie(COOKIE_CONTA, r.device, 180), 'cache-control': 'no-store' } });
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
      // API sempre responde JSON (o navegador mostra a mensagem em vez de "sem conexao")
      if (new URL(request.url).pathname.indexOf('/api/') === 0) return json({ ok: false, erro: 'Erro temporário. Tente de novo em instantes.' }, 500);
      return new Response('Erro temporário. Tente de novo em instantes.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  },
  async scheduled(event, env, ctx) {
    try { const r = await sincronizar(env); console.log('[cron] sync ' + JSON.stringify(r)); }
    catch (e) { console.error('[cron] sync falhou: ' + e.message); }
  },
};
