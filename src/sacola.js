// Sacola guardada no servidor (D1), presa a um cookie. Preco SEMPRE recalculado do catalogo:
// o navegador so manda produto, variacao e quantidade. Logada, a sacola leva o CPF (base pro
// "carrinho abandonado" no WhatsApp depois).
import { produtoPorId } from './catalogo.js';

export const COOKIE_SACOLA = 'lv_sacola';
const MAX_ITENS = 30;
const MAX_QTD = 10;

export async function garantirSchemaSacola(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sacolas (id TEXT PRIMARY KEY, cpf TEXT, itens TEXT,
    criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`).run();
}

export function lerCookie(request, nome) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + nome + '=([A-Za-z0-9_-]+)'));
  return m ? m[1] : null;
}

export function cookie(nome, valor, diasValidade) {
  return nome + '=' + valor + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + Math.round(diasValidade * 86400);
}

export function novoId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function carregar(env, id) {
  if (!id) return [];
  const r = await env.DB.prepare('SELECT itens FROM sacolas WHERE id=?').bind(id).first();
  try { return r ? JSON.parse(r.itens || '[]') : []; } catch (_) { return []; }
}

async function salvar(env, id, itens, cpf) {
  await env.DB.prepare(`INSERT INTO sacolas (id, cpf, itens) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET itens=excluded.itens, cpf=COALESCE(excluded.cpf, sacolas.cpf), atualizado_em=datetime('now')`)
    .bind(id, cpf || null, JSON.stringify(itens)).run();
}

export async function vincularCpf(env, id, cpf) {
  if (!id || !cpf) return;
  await garantirSchemaSacola(env);
  await env.DB.prepare("UPDATE sacolas SET cpf=?, atualizado_em=datetime('now') WHERE id=?").bind(cpf, id).run();
}

// Monta o resumo com preco/estoque atuais do catalogo.
export async function resumo(env, id, limiteGratis) {
  await garantirSchemaSacola(env);
  const brutos = await carregar(env, id);
  const itens = [];
  for (const b of brutos) {
    const p = await produtoPorId(env, b.produto_id);
    const v = p && p.variantes.find((x) => String(x.id) === String(b.variante_id));
    if (!p || !v) {
      itens.push({ produto_id: b.produto_id, variante_id: b.variante_id, qtd: b.qtd, nome: b.nome || 'Produto', disponivel: false, preco: 0, subtotal: 0, motivo: 'saiu da loja' });
      continue;
    }
    const maxQtd = v.estoque == null ? MAX_QTD : Math.min(MAX_QTD, v.estoque);
    const qtd = Math.max(1, Math.min(b.qtd, Math.max(1, maxQtd)));
    const img = (v.imagem_id && p.imagens.find((i) => i.id === v.imagem_id)) || p.imagens[0];
    itens.push({
      produto_id: p.id, variante_id: v.id, handle: p.handle, nome: p.nome,
      variante: v.valores.filter((x) => x && x.toLowerCase() !== 'nenhum').join(' · '),
      imagem: img ? img.src : null, preco: v.preco, preco_de: v.preco_de, qtd,
      disponivel: !!v.disponivel, crossdocking: v.crossdocking, peso_g: v.peso_g,
      subtotal: v.disponivel ? Math.round(v.preco * qtd * 100) / 100 : 0,
      motivo: v.disponivel ? null : 'esgotado',
    });
  }
  const validos = itens.filter((i) => i.disponivel);
  const subtotal = Math.round(validos.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  const limite = Number(limiteGratis || 599);
  return {
    itens, subtotal, qtd_total: validos.reduce((s, i) => s + i.qtd, 0),
    frete_gratis_acima: limite, falta_frete_gratis: Math.max(0, Math.round((limite - subtotal) * 100) / 100),
  };
}

export async function alterar(env, id, cpf, acao, produtoId, varianteId, qtd) {
  await garantirSchemaSacola(env);
  const itens = await carregar(env, id);
  const i = itens.findIndex((x) => String(x.variante_id) === String(varianteId));
  if (acao === 'remover') {
    if (i >= 0) itens.splice(i, 1);
  } else {
    const p = await produtoPorId(env, produtoId);
    const v = p && p.variantes.find((x) => String(x.id) === String(varianteId));
    if (!p || !v) return { ok: false, erro: 'Produto não encontrado.' };
    if (!v.disponivel) return { ok: false, erro: 'Esta opção está esgotada.' };
    const n = Math.max(1, Math.min(MAX_QTD, parseInt(qtd, 10) || 1));
    if (i >= 0) itens[i].qtd = acao === 'adicionar' ? Math.min(MAX_QTD, itens[i].qtd + n) : n;
    else {
      if (itens.length >= MAX_ITENS) return { ok: false, erro: 'A sacola está cheia.' };
      itens.push({ produto_id: p.id, variante_id: v.id, qtd: n, nome: p.nome });
    }
  }
  await salvar(env, id, itens, cpf);
  return { ok: true };
}
