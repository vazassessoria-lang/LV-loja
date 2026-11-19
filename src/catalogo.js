// Catalogo: sincroniza do painel (lv-dashboard /api/loja/*) para o D1 da loja e consulta.
// Fonte: Nuvemshop (fotos, textos, variacoes, preco) + Bling (saldo/prazo de producao por SKU).
// A loja NUNCA altera preco: so le (regra: o Alexandre controla preco no Bling).
import { pt } from './util.js';

export async function garantirSchema(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY, handle TEXT, nome TEXT, descricao TEXT, preco REAL, preco_de REAL,
      imagens TEXT, categorias TEXT, variantes TEXT, atributos TEXT, disponivel INTEGER, crossdocking INTEGER,
      criado_em TEXT, atualizado_em TEXT, sincronizado_em TEXT, ativo INTEGER DEFAULT 1, seo_titulo TEXT, seo_descricao TEXT)`),
    env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_prod_handle ON produtos(handle)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_prod_criado ON produtos(ativo, criado_em)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY, handle TEXT, nome TEXT, parent INTEGER, sincronizado_em TEXT)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_cat_handle ON categorias(handle)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS produto_categoria (produto_id INTEGER, categoria_id INTEGER, PRIMARY KEY (produto_id, categoria_id))`),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS loja_config (chave TEXT PRIMARY KEY, valor TEXT)'),
  ]);
}

function chaveDashboard(env) { return env.DASHBOARD_KEY || 'lvprod-9Mn4Vy3Q'; }

export async function painel(env, caminho) {
  const r = await fetch(env.DASHBOARD_URL + caminho, {
    headers: { 'X-Scheduler-Key': chaveDashboard(env), 'User-Agent': 'Mozilla/5.0 (compatible; LV-Loja/0.1)' },
  });
  const j = await r.json().catch(() => ({ ok: false, error: 'resposta invalida (HTTP ' + r.status + ')' }));
  if (!r.ok || j.ok === false) throw new Error('painel ' + caminho.split('?')[0] + ': ' + (j.error || 'HTTP ' + r.status));
  return j;
}

// Normaliza um produto da Nuvemshop (com campos bling_* do painel) para o formato da loja.
export function normalizarProduto(p) {
  const variantes = (p.variants || []).map((v) => {
    const gerencia = !!v.stock_management;
    const estoque = gerencia ? Number(v.stock || 0) : null;
    const preco = Number(v.promotional_price || 0) > 0 ? Number(v.promotional_price) : Number(v.price || 0);
    const precoDe = Number(v.promotional_price || 0) > 0 && Number(v.price) > preco ? Number(v.price) : null;
    const temEstoque = estoque == null ? (v.bling_saldo != null && v.bling_saldo > 0) : estoque > 0;
    const cross = v.bling_crossdocking != null ? Number(v.bling_crossdocking) : (temEstoque ? 0 : 2);
    return {
      id: v.id, sku: v.sku || '', preco, preco_de: precoDe,
      estoque, disponivel: !gerencia || estoque > 0,
      peso_g: Math.round((Number(v.weight) || 0) * 1000) || null,
      valores: (v.values || []).map(pt), imagem_id: v.image_id || null,
      crossdocking: cross,
    };
  });
  const disponiveis = variantes.filter((v) => v.disponivel);
  const base = disponiveis.length ? disponiveis : variantes;
  const maisBarata = base.reduce((a, b) => (a && a.preco <= b.preco ? a : b), null);
  const imagens = (p.images || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((i) => ({ id: i.id, src: String(i.src || '').replace(/^\/\//, 'https://'), w: i.width || null, h: i.height || null }));
  return {
    id: p.id,
    handle: pt(p.handle),
    nome: pt(p.name),
    descricao: pt(p.description),
    preco: maisBarata ? maisBarata.preco : 0,
    preco_de: maisBarata ? maisBarata.preco_de : null,
    imagens,
    categorias: (p.categories || []).map((c) => c.id),
    variantes,
    atributos: (p.attributes || []).map(pt),
    disponivel: disponiveis.length > 0 ? 1 : 0,
    crossdocking: Math.min(...variantes.map((v) => v.crossdocking).concat([2])),
    criado_em: p.created_at || null,
    atualizado_em: p.updated_at || null,
    seo_titulo: pt(p.seo_title) || null,
    seo_descricao: pt(p.seo_description) || null,
  };
}

export async function sincronizar(env, opts) {
  opts = opts || {};
  await garantirSchema(env);
  const inicio = new Date().toISOString();
  const res = { categorias: 0, produtos: 0, paginas: 0, desativados: 0 };
  // categorias
  const cats = (await painel(env, '/api/loja/categorias')).categorias || [];
  const stCat = env.DB.prepare('INSERT INTO categorias (id, handle, nome, parent, sincronizado_em) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, nome=excluded.nome, parent=excluded.parent, sincronizado_em=excluded.sincronizado_em');
  for (let i = 0; i < cats.length; i += 80) {
    await env.DB.batch(cats.slice(i, i + 80).map((c) => stCat.bind(c.id, pt(c.handle), pt(c.name), c.parent || 0, inicio)));
  }
  res.categorias = cats.length;
  // produtos
  const stProd = env.DB.prepare(`INSERT INTO produtos (id, handle, nome, descricao, preco, preco_de, imagens, categorias, variantes, atributos, disponivel, crossdocking, criado_em, atualizado_em, sincronizado_em, ativo, seo_titulo, seo_descricao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, nome=excluded.nome, descricao=excluded.descricao, preco=excluded.preco, preco_de=excluded.preco_de,
      imagens=excluded.imagens, categorias=excluded.categorias, variantes=excluded.variantes, atributos=excluded.atributos, disponivel=excluded.disponivel,
      crossdocking=excluded.crossdocking, criado_em=excluded.criado_em, atualizado_em=excluded.atualizado_em, sincronizado_em=excluded.sincronizado_em, ativo=1,
      seo_titulo=excluded.seo_titulo, seo_descricao=excluded.seo_descricao`);
  const stDelPc = env.DB.prepare('DELETE FROM produto_categoria WHERE produto_id=?');
  const stPc = env.DB.prepare('INSERT OR IGNORE INTO produto_categoria (produto_id, categoria_id) VALUES (?, ?)');
  const maxPaginas = opts.maxPaginas || 40;
  for (let page = 1; page <= maxPaginas; page++) {
    const j = await painel(env, '/api/loja/catalogo?page=' + page + '&per_page=50');
    res.paginas++;
    const lote = [];
    for (const bruto of (j.produtos || [])) {
      const p = normalizarProduto(bruto);
      if (!p.handle) continue;
      lote.push(stProd.bind(p.id, p.handle, p.nome, p.descricao, p.preco, p.preco_de, JSON.stringify(p.imagens), JSON.stringify(p.categorias),
        JSON.stringify(p.variantes), JSON.stringify(p.atributos), p.disponivel, p.crossdocking, p.criado_em, p.atualizado_em, inicio, p.seo_titulo, p.seo_descricao));
      lote.push(stDelPc.bind(p.id));
      for (const c of p.categorias) lote.push(stPc.bind(p.id, c));
      res.produtos++;
    }
    if (lote.length) await env.DB.batch(lote);
    if (!j.tem_mais) { res.completo = true; break; }
  }
  // so desativa o que sumiu quando a varredura foi completa
  if (res.completo) {
    const r = await env.DB.prepare('UPDATE produtos SET ativo=0 WHERE ativo=1 AND (sincronizado_em IS NULL OR sincronizado_em < ?)').bind(inicio).run();
    res.desativados = (r.meta && r.meta.changes) || 0;
  }
  await env.DB.prepare("INSERT INTO loja_config (chave, valor) VALUES ('ultima_sync', ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor")
    .bind(JSON.stringify(Object.assign({ em: inicio }, res))).run();
  return res;
}

function lerProduto(r) {
  if (!r) return null;
  return Object.assign({}, r, {
    imagens: JSON.parse(r.imagens || '[]'), categorias: JSON.parse(r.categorias || '[]'),
    variantes: JSON.parse(r.variantes || '[]'), atributos: JSON.parse(r.atributos || '[]'),
  });
}

export async function produtoPorHandle(env, handle) {
  return lerProduto(await env.DB.prepare('SELECT * FROM produtos WHERE handle=? AND ativo=1').bind(handle).first());
}

export async function produtoPorId(env, id) {
  return lerProduto(await env.DB.prepare('SELECT * FROM produtos WHERE id=? AND ativo=1').bind(Number(id)).first());
}

export async function categoriaPorHandle(env, handle) {
  return env.DB.prepare('SELECT * FROM categorias WHERE handle=? ORDER BY parent LIMIT 1').bind(handle).first();
}

export async function listarProdutos(env, f) {
  f = f || {};
  const lim = Math.min(Number(f.limite) || 48, 200);
  const off = Math.max(0, Number(f.offset) || 0);
  const ordem = f.ordem === 'menor' ? 'p.preco ASC' : f.ordem === 'maior' ? 'p.preco DESC' : 'p.disponivel DESC, p.criado_em DESC';
  let sql, binds;
  if (f.categoriaId) {
    // categoria + subcategorias diretas
    sql = `SELECT DISTINCT p.* FROM produtos p JOIN produto_categoria pc ON pc.produto_id=p.id
      WHERE p.ativo=1 AND (pc.categoria_id=? OR pc.categoria_id IN (SELECT id FROM categorias WHERE parent=?)) ORDER BY ${ordem} LIMIT ? OFFSET ?`;
    binds = [f.categoriaId, f.categoriaId, lim, off];
  } else if (f.busca) {
    const q = '%' + String(f.busca).trim().toLowerCase() + '%';
    sql = `SELECT p.* FROM produtos p WHERE p.ativo=1 AND lower(p.nome) LIKE ? ORDER BY ${ordem} LIMIT ? OFFSET ?`;
    binds = [q, lim, off];
  } else {
    sql = `SELECT p.* FROM produtos p WHERE p.ativo=1 ORDER BY ${ordem} LIMIT ? OFFSET ?`;
    binds = [lim, off];
  }
  const rs = await env.DB.prepare(sql).bind(...binds).all();
  return (rs.results || []).map(lerProduto);
}
