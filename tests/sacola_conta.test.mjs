// Sacola e conta (CPF) com painel falso via Service Binding. Rodar: node --no-warnings tests/sacola_conta.test.mjs
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { garantirSchema, normalizarProduto } from '../src/catalogo.js';
import { cpfValido, cpfMascarado } from '../src/conta.js';
import { d1Falso } from './d1_falso.mjs';

assert.equal(cpfValido('529.982.247-25'), true); assert.equal(cpfValido('52998224726'), false);
assert.equal(cpfValido('11111111111'), false); assert.equal(cpfMascarado('52998224725'), '***.982.247-**');

// painel falso: frete + conta
const painel = { contas: { '52998224725': { nome: 'Maria Silva', email: 'maria@gmail.com' } }, tokens: {}, devices: {}, chamadas: [] };
const PAINEL = { async fetch(rq) {
  const u = new URL(rq.url); const b = rq.method === 'POST' ? await rq.json() : null; painel.chamadas.push([u.pathname, b]);
  const J = (o, st = 200) => new Response(JSON.stringify(o), { status: st });
  if (u.pathname === '/api/loja/frete') return J({ ok: true, opcoes: [{ servico: 'PAC', preco: 20, prazo_dias_uteis: 5 }, { servico: 'SEDEX', preco: 30, prazo_dias_uteis: 2 }] });
  if (u.pathname === '/api/loja/conta/solicitar') {
    const c = painel.contas[b.cpf]; if (!c) return J({ ok: true, existe: false });
    painel.tokens.aa11 = b.cpf; return J({ ok: true, existe: true, email_mascarado: 'ma***a@gmail.com' });
  }
  if (u.pathname === '/api/loja/conta/cadastrar') { if (painel.contas[b.cpf]) return J({ ok: false }, 409); painel.tokens.bb22 = b.cpf; painel.pend = b; return J({ ok: true, email_mascarado: 'an***a@gmail.com' }); }
  if (u.pathname === '/api/loja/conta/confirmar') {
    const cpf = painel.tokens[b.token]; if (!cpf) return J({ ok: false, error: 'Link inválido. Peça um novo.' }, 400);
    delete painel.tokens[b.token];
    if (!painel.contas[cpf]) painel.contas[cpf] = { nome: painel.pend.nome, email: painel.pend.email };
    return J({ ok: true, device: 'dev' + cpf });
  }
  if (u.pathname === '/api/loja/conta/dados') {
    const cpf = String(b.device || '').replace('dev', ''); const c = painel.contas[cpf];
    if (!c || painel.saiu === b.device) return J({ ok: false, error: 'sessao_invalida' }, 401);
    return J({ ok: true, cliente: { cpf, nome: c.nome, email: c.email, celular: '11999990000', pontos: 820 }, pedidos: [{ data: '2026-11-10', total: 259.99, status: 'closed', pagamento: 'paid', itens: [{ nome: 'Blusa Plissada', qtd: 1 }] }] });
  }
  if (u.pathname === '/api/loja/cep') {
    const cep = u.searchParams.get('cep');
    if (cep === '01310100') return J({ ok: true, cep, rua: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' });
    return J({ ok: false, error: 'CEP nao encontrado' }, 404);
  }
  if (u.pathname === '/api/loja/conta/sair') { painel.saiu = b.device; return J({ ok: true }); }
  return J({ ok: false }, 404);
} };
const env = { DB: d1Falso(), PAINEL, DASHBOARD_URL: 'https://painel', LOJA_NOINDEX: '1', FRETE_GRATIS_ACIMA: '599' };
await garantirSchema(env);
const n = normalizarProduto({
  id: 9, handle: { pt: 'blusa-x' }, name: { pt: 'Blusa X' }, attributes: [{ pt: 'Cor' }, { pt: 'Tamanho' }], images: [{ id: 1, src: 'https://acdn/b-1024-1024.jpg', position: 1 }], categories: [],
  variants: [
    { id: 1, price: '349.99', promotional_price: '299.99', stock_management: false, weight: '0.4', values: [{ pt: 'Preto' }, { pt: 'P' }] },
    { id: 2, price: '349.99', stock_management: true, stock: 2, weight: '0.4', values: [{ pt: 'Preto' }, { pt: 'M' }], bling_crossdocking: 0 },
    { id: 3, price: '349.99', stock_management: true, stock: 0, weight: '0.4', values: [{ pt: 'Rosa' }, { pt: 'M' }] },
  ],
});
env.DB._db.prepare(`INSERT INTO produtos (id, handle, nome, preco, imagens, categorias, variantes, atributos, disponivel, crossdocking, ativo)
  VALUES (9,'blusa-x','Blusa X',299.99,?, '[]', ?, ?, 1, 0, 1)`).run(JSON.stringify(n.imagens), JSON.stringify(n.variantes), JSON.stringify(n.atributos));

let jar = {};
const req = async (p, opt) => {
  opt = opt || {}; const h = Object.assign({}, opt.headers || {});
  const ck = Object.entries(jar).map(([k, v]) => k + '=' + v).join('; '); if (ck) h.cookie = ck;
  if (opt.body) h['content-type'] = 'application/json';
  const r = await worker.fetch(new Request('https://lv-loja.vazassessoria.workers.dev' + p, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, redirect: 'manual' }), env, {});
  const sc = r.headers.get('set-cookie'); if (sc) { const [kv] = sc.split(';'); const [k, v] = kv.split('='); if (v) jar[k] = v; else delete jar[k]; }
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (_) {}
  return { st: r.status, t, j, h: r.headers };
};

// --- sacola ---
let r = await req('/api/sacola'); assert.equal(r.j.qtd_total, 0);
r = await req('/api/sacola', { method: 'POST', body: { acao: 'adicionar', produto_id: 9, variante_id: 3 } });
assert.equal(r.st, 400); assert.match(r.j.erro, /esgotada/);
r = await req('/api/sacola', { method: 'POST', body: { acao: 'adicionar', produto_id: 9, variante_id: 1, preco: 1 } });
assert.equal(r.j.ok, true); assert.ok(jar.lv_sacola, 'criou o cookie da sacola'); assert.equal(r.j.subtotal, 299.99, 'preco do catalogo, nao do navegador');
r = await req('/api/sacola', { method: 'POST', body: { acao: 'adicionar', produto_id: 9, variante_id: 2, qtd: 5 } });
assert.equal(r.j.qtd_total, 3, 'M so tem 2 em estoque'); assert.equal(r.j.subtotal, 299.99 + 2 * 349.99);
r = await req('/api/sacola', { method: 'POST', body: { acao: 'alterar', produto_id: 9, variante_id: 1, qtd: 2 } });
assert.equal(r.j.qtd_total, 4);
r = await req('/carrinho/');
assert.equal(r.st, 200); assert.equal(r.h.get('cache-control'), 'private, no-store');
assert.match(r.t, /Blusa X/); assert.match(r.t, /Preto · P/); assert.match(r.t, /Você ganhou frete grátis/); assert.match(r.t, /Finalizar compra — em breve/);
r = await req('/api/frete-sacola?cep=01310100');
assert.equal(r.j.ok, true); assert.equal(r.j.peso_g, 100 + 4 * 400); assert.equal(r.j.opcoes[0].preco, 0, 'gratis acima de 599');
assert.equal(r.j.opcoes[0].dias_producao, 2, 'item sob encomenda manda no prazo');
r = await req('/api/sacola', { method: 'POST', body: { acao: 'remover', produto_id: 9, variante_id: 1 } });
assert.equal(r.j.qtd_total, 2);
r = await req('/api/sacola', { method: 'POST', body: { acao: 'alterar', produto_id: 9, variante_id: 2, qtd: 1 } });
assert.equal(r.j.subtotal, 349.99);
r = await req('/carrinho/'); assert.match(r.t, /Faltam <b>R\$249,01<\/b>/);
// produto mostra o botao de adicionar
r = await req('/produtos/blusa-x/'); assert.match(r.t, /id="btn-add"/); assert.match(r.t, /Adicionar à sacola/);

// --- conta ---
r = await req('/conta/'); assert.match(r.t, /form-entrar/); assert.equal(r.h.get('cache-control'), 'private, no-store');
r = await req('/api/conta/entrar', { method: 'POST', body: { cpf: '123.456.789-00' } }); assert.equal(r.st, 400); assert.match(r.j.erro, /CPF inválido/);
r = await req('/api/conta/entrar', { method: 'POST', body: { cpf: '529.982.247-25' } });
assert.equal(r.j.existe, true); assert.equal(r.j.email_mascarado, 'ma***a@gmail.com');
assert.deepEqual(painel.chamadas.at(-1), ['/api/loja/conta/solicitar', { cpf: '52998224725', url_loja: 'https://lv-loja.vazassessoria.workers.dev' }]);
r = await req('/conta/entrar/?token=ffff'); assert.equal(r.st, 400); assert.match(r.t, /Link inválido/);
r = await req('/conta/entrar/?token=aa11');
assert.equal(r.st, 302); assert.equal(r.h.get('location'), '/conta/'); assert.equal(jar.lv_conta, 'dev52998224725');
assert.equal(env.DB._db.prepare('SELECT cpf FROM sacolas').get().cpf, '52998224725', 'sacola ficou com o CPF');
r = await req('/conta/'); assert.match(r.t, /Olá, Maria!/); assert.match(r.t, /820/); assert.match(r.t, /\*\*\*\.982\.247-\*\*/); assert.match(r.t, /Blusa Plissada/);
r = await req('/carrinho/'); assert.match(r.t, /Olá, Maria!/);
// enderecos
r = await req('/api/cep?cep=01310-100'); assert.deepEqual([r.j.rua, r.j.cidade, r.j.uf], ['Avenida Paulista', 'São Paulo', 'SP']);
r = await req('/api/cep?cep=99999999'); assert.equal(r.st, 404); assert.match(r.j.erro, /não encontrado/);
r = await req('/api/conta/enderecos', { method: 'POST', body: { cep: '01310-100', rua: 'Avenida Paulista', numero: '', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', destinatario: 'Maria Silva' } });
assert.equal(r.st, 400); assert.match(r.j.erro, /número/);
r = await req('/api/conta/enderecos', { method: 'POST', body: { cep: '01310-100', rua: 'Avenida Paulista', numero: '1000', complemento: 'apto 5', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'sp', destinatario: 'Maria Silva <b>' } });
assert.equal(r.j.ok, true); assert.equal(r.j.enderecos[0].principal, 1, 'primeiro vira principal'); assert.equal(r.j.enderecos[0].uf, 'SP');
assert.equal(r.j.enderecos[0].destinatario, 'Maria Silva b', 'sem < >');
r = await req('/api/conta/enderecos', { method: 'POST', body: { cep: '13010000', rua: 'Rua Barão de Jaguara', numero: '50', bairro: 'Centro', cidade: 'Campinas', uf: 'SP', destinatario: 'Mãe da Maria', principal: true } });
assert.equal(r.j.enderecos.length, 2); assert.equal(r.j.enderecos[0].cidade, 'Campinas', 'novo principal vem primeiro'); assert.equal(r.j.enderecos[1].principal, 0);
const idSP = r.j.enderecos[1].id, idCamp = r.j.enderecos[0].id;
r = await req('/api/conta/enderecos', { method: 'POST', body: { acao: 'principal', id: idSP } }); assert.equal(r.j.enderecos[0].id, idSP);
r = await req('/api/conta/enderecos', { method: 'POST', body: { id: idCamp, cep: '13010000', rua: 'Rua Barão de Jaguara', numero: '60', bairro: 'Centro', cidade: 'Campinas', uf: 'SP', destinatario: 'Mãe da Maria' } });
assert.equal(r.j.enderecos.find((e) => e.id === idCamp).numero, '60', 'editou');
r = await req('/conta/'); assert.match(r.t, /Meus endereços/); assert.match(r.t, /Avenida Paulista, 1000 - apto 5/); assert.match(r.t, /Principal/);
r = await req('/api/conta/enderecos', { method: 'POST', body: { acao: 'remover', id: idSP } });
assert.equal(r.j.enderecos.length, 1); assert.equal(r.j.enderecos[0].principal, 1, 'removeu o principal: o outro assume');
// outra cliente nao mexe no endereco da Maria
const jarMaria = jar; jar = { lv_conta: 'dev99999999999' };
r = await req('/api/conta/enderecos', { method: 'POST', body: { acao: 'remover', id: idCamp } }); assert.equal(r.st, 401);
jar = jarMaria;
// cliente nova
r = await req('/api/conta/entrar', { method: 'POST', body: { cpf: '111.444.777-35' } }); assert.equal(r.j.existe, false);
r = await req('/api/conta/cadastrar', { method: 'POST', body: { cpf: '529.982.247-25', nome: 'X', email: 'x@x.com', celular: '11999999999' } }); assert.equal(r.st, 409);
r = await req('/api/conta/cadastrar', { method: 'POST', body: { cpf: '111.444.777-35', nome: 'Ana Souza', email: 'ana@gmail.com', celular: '(11) 98888-7777' } });
assert.equal(r.j.ok, true); assert.equal(r.j.email_mascarado, 'an***a@gmail.com');
// sair
r = await req('/api/conta/sair', { method: 'POST', body: {} }); assert.equal(r.j.ok, true); assert.equal(jar.lv_conta, undefined);
r = await req('/conta/'); assert.match(r.t, /form-entrar/);
console.log('OK - todos os testes de sacola e conta passaram');
