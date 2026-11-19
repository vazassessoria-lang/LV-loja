// Testes da loja (sem rede): util, frete, normalizacao do catalogo e rotas com D1 falso.
// Rodar na raiz do repo: node --no-warnings tests/loja.test.mjs
import assert from 'node:assert/strict';
import { brl, parcelas, somarDiasUteis, hojeBrt, esc } from '../src/util.js';
import { montarOpcoes, pesoDosItens } from '../src/frete.js';
import { normalizarProduto, garantirSchema } from '../src/catalogo.js';
import worker from '../src/index.js';
import { d1Falso } from './d1_falso.mjs';

// util
assert.equal(brl(1234.5), 'R$1.234,50');
assert.deepEqual(parcelas(139.99), { vezes: 2, valor: 70 });      // igual a loja atual
assert.deepEqual(parcelas(169.99), { vezes: 3, valor: 56.66 });
assert.deepEqual(parcelas(259.99), { vezes: 4, valor: 65 });
assert.deepEqual(parcelas(39.9), { vezes: 1, valor: 39.9 });
assert.equal(esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
// 19/11/2026 (quinta) 22h BRT = 20/11 01h UTC -> hoje continua 19/11
assert.equal(hojeBrt(Date.parse('2026-11-20T01:00:00Z')).toISOString().slice(0, 10), '2026-11-19');
// quinta 19/11 + 3 dias uteis: 20/11 e feriado (Consciencia Negra) -> seg 23, ter 24, qua 25
assert.equal(somarDiasUteis(new Date('2026-11-19T00:00:00Z'), 3).toISOString().slice(0, 10), '2026-11-25');

// frete
assert.equal(pesoDosItens([{ peso_g: 510, qtd: 2 }, { qtd: 1 }]), 100 + 1020 + 400);
const cot = { opcoes: [{ servico: 'PAC', preco: 20.44, prazo_dias_uteis: 6 }, { servico: 'SEDEX', preco: 30.06, prazo_dias_uteis: 2 }, { servico: 'X', erro: 'falhou' }] };
const agora = Date.parse('2026-11-19T15:00:00Z');
let ops = montarOpcoes(cot, [{ crossdocking: 0 }, { crossdocking: 2 }], 300, 599, agora);
assert.deepEqual(ops.map((o) => [o.servico, o.preco, o.dias_uteis_total, o.gratis]), [['PAC', 20.44, 8, false], ['SEDEX', 30.06, 4, false]]);
ops = montarOpcoes(cot, [{ crossdocking: 0 }], 650, 599, agora);
assert.deepEqual(ops.map((o) => [o.servico, o.preco, o.dias_uteis_total, o.gratis]), [['PAC', 0, 6, true], ['SEDEX', 30.06, 2, false]]);
assert.equal(ops[1].chega_ate, '2026-11-24'); // qui 19 + 2 uteis (20 feriado) = ter 24

// normalizacao (formato real da Nuvemshop + campos bling_* do painel)
const bruto = {
  id: 9, handle: { pt: 'blusa-x' }, name: { pt: 'Blusa X' }, description: { pt: '<p>oi</p>' }, attributes: [{ pt: 'Cor' }, { pt: 'Tamanho' }],
  images: [{ id: 2, src: '//acdn/a-1024-1024.jpg', position: 2 }, { id: 1, src: 'https://acdn/b-1024-1024.jpg', position: 1 }],
  categories: [{ id: 100 }, { id: 101 }],
  variants: [
    { id: 1, price: '199.99', promotional_price: '149.99', stock_management: true, stock: 0, weight: '0.3', values: [{ pt: 'Preto' }, { pt: 'P' }], bling_saldo: 0, bling_crossdocking: 2 },
    { id: 2, price: '199.99', promotional_price: '0.00', stock_management: true, stock: 3, weight: '0.3', values: [{ pt: 'Preto' }, { pt: 'M' }], bling_saldo: null, bling_crossdocking: null },
    { id: 3, price: '219.99', promotional_price: null, stock_management: false, stock: null, weight: '', values: [{ pt: 'Rosa' }, { pt: 'M' }] },
  ],
};
const n = normalizarProduto(bruto);
assert.equal(n.handle, 'blusa-x'); assert.equal(n.nome, 'Blusa X');
assert.equal(n.imagens[0].src, 'https://acdn/b-1024-1024.jpg'); assert.equal(n.imagens[1].src, 'https://acdn/a-1024-1024.jpg');
assert.deepEqual(n.variantes.map((v) => [v.preco, v.preco_de, v.disponivel, v.crossdocking, v.peso_g]),
  [[149.99, 199.99, false, 2, 300], [199.99, null, true, 0, 300], [219.99, null, true, 2, null]]);
assert.equal(n.preco, 199.99, 'preco = menor entre as disponiveis'); assert.equal(n.disponivel, 1); assert.equal(n.crossdocking, 0);

// rotas com D1 falso
const env = { DB: d1Falso(), DASHBOARD_URL: 'https://painel.teste', LOJA_NOINDEX: '1', FRETE_GRATIS_ACIMA: '599' };
await garantirSchema(env);
const db = env.DB._db;
db.prepare("INSERT INTO categorias VALUES (100,'blusas','Blusas',0,NULL),(101,'regatas','Regatas',100,NULL)").run();
db.prepare(`INSERT INTO produtos (id, handle, nome, descricao, preco, preco_de, imagens, categorias, variantes, atributos, disponivel, crossdocking, criado_em, ativo)
  VALUES (9,'blusa-x','Blusa X','<p>oi</p>',199.99,NULL,?,?,?,?,1,0,'2026-11-01',1)`).run(JSON.stringify(n.imagens), JSON.stringify([101]), JSON.stringify(n.variantes), JSON.stringify(n.atributos));
db.prepare('INSERT INTO produto_categoria VALUES (9,101)').run();
const chamadas = [];
globalThis.fetch = async (u, o) => {
  chamadas.push({ u: String(u), h: o && o.headers });
  return new Response(JSON.stringify({ ok: true, opcoes: [{ servico: 'PAC', preco: 17.17, prazo_dias_uteis: 5 }, { servico: 'SEDEX', preco: 11.15, prazo_dias_uteis: 1 }] }), { status: 200 });
};
const get = async (p) => { const r = await worker.fetch(new Request('https://loja.teste' + p, { redirect: 'manual' }), env, {}); return [r.status, await r.text(), r.headers]; };
let [st, corpo, h] = await get('/');
assert.equal(st, 200); assert.match(corpo, /Blusa X/); assert.match(corpo, /noindex/); assert.equal(h.get('x-robots-tag'), 'noindex, nofollow');
assert.ok(!/#22c55e|#1D9E75|green/i.test(corpo), 'nunca verde');
[st, corpo] = await get('/blusas/');                      assert.equal(st, 200); assert.match(corpo, /Blusa X/); assert.match(corpo, /Ver tudo|regatas/);
[st, corpo] = await get('/blusas/regatas/');              assert.equal(st, 200); assert.match(corpo, /Blusa X/);
[st, corpo] = await get('/produtos/blusa-x/');            assert.equal(st, 200); assert.match(corpo, /"@type":"Product"/); assert.match(corpo, /data-g="1" data-v="M"/);
[st] = await get('/produtos/blusa-x');                    assert.equal(st, 301);
[st] = await get('/produtos/nao-existe/');                assert.equal(st, 404);
[st, corpo] = await get('/robots.txt');                   assert.match(corpo, /Disallow: \//);
[st, corpo] = await get('/busca?q=blusa');                assert.match(corpo, /Blusa X/);
[st, corpo] = await get('/api/frete?produto=9&variante=2&cep=01310-100');
const j = JSON.parse(corpo);
assert.equal(st, 200); assert.equal(j.opcoes[0].servico, 'SEDEX'); assert.equal(j.opcoes[0].dias_producao, 0);
assert.match(chamadas[0].u, /\/api\/loja\/frete\?cep=01310100&peso=400$/); assert.equal(chamadas[0].h['X-Scheduler-Key'], 'lvprod-9Mn4Vy3Q');
[st, corpo] = await get('/api/frete?produto=9&variante=1&cep=01310100');
assert.equal(JSON.parse(corpo).opcoes[0].dias_producao, 2, 'variante sob encomenda');
[st, corpo] = await get('/api/frete?produto=9&cep=123');  assert.equal(st, 400); assert.match(JSON.parse(corpo).erro, /8 números/);
const r = await worker.fetch(new Request('https://loja.teste/api/admin/sync', { method: 'POST' }), env, {}); assert.equal(r.status, 401);
console.log('OK - todos os testes da loja passaram');
