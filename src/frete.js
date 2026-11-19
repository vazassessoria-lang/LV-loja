// Frete e prazo: Correios (preco do contrato + prazo, via painel) + prazo de producao do Bling.
// Prazo que a cliente ve = dias de producao do Bling (crossdocking: 0 pronta entrega, 2 sob encomenda)
//                          + prazo dos Correios (dias uteis). Regra escolhida pelo Alexandre em 19/11/2026.
// Frete gratis: pedido >= FRETE_GRATIS_ACIMA -> a opcao mais barata sai a R$ 0 (regra da loja atual).
import { painel } from './catalogo.js';
import { hojeBrt, somarDiasUteis, dataCurta } from './util.js';

const EMBALAGEM_G = 100;
const PESO_PADRAO_G = 400;

export function pesoDosItens(itens) {
  let g = EMBALAGEM_G;
  for (const it of itens) g += (it.peso_g || PESO_PADRAO_G) * Math.max(1, it.qtd || 1);
  return g;
}

export function montarOpcoes(cotacao, itens, subtotal, limiteGratis, agoraMs) {
  const producao = itens.length ? Math.max(...itens.map((i) => (i.crossdocking == null ? 2 : i.crossdocking))) : 2;
  const base = hojeBrt(agoraMs);
  const validas = (cotacao.opcoes || []).filter((o) => o.preco != null);
  const maisBarata = validas.reduce((a, b) => (a && a.preco <= b.preco ? a : b), null);
  const gratis = Number(subtotal) >= Number(limiteGratis || 599);
  return validas.map((o) => {
    const dias = producao + o.prazo_dias_uteis;
    const chega = somarDiasUteis(base, dias);
    return {
      servico: o.servico,
      preco: gratis && o === maisBarata ? 0 : o.preco,
      preco_correios: o.preco,
      gratis: gratis && o === maisBarata,
      dias_producao: producao,
      dias_correios: o.prazo_dias_uteis,
      dias_uteis_total: dias,
      chega_ate: chega.toISOString().slice(0, 10),
      chega_ate_texto: dataCurta(chega),
    };
  }).sort((a, b) => a.preco - b.preco || a.dias_uteis_total - b.dias_uteis_total);
}

export async function cotarFrete(env, cep, itens, subtotal) {
  const c = String(cep || '').replace(/\D/g, '');
  if (c.length !== 8) return { ok: false, erro: 'Digite um CEP com 8 números.' };
  const peso = pesoDosItens(itens);
  let cot;
  try { cot = await painel(env, '/api/loja/frete?cep=' + c + '&peso=' + peso); }
  catch (e) { return { ok: false, erro: 'Não conseguimos calcular o frete agora. Tente de novo em instantes.', detalhe: String(e.message).slice(0, 200) }; }
  const opcoes = montarOpcoes(cot, itens, subtotal, env.FRETE_GRATIS_ACIMA, Date.now());
  if (!opcoes.length) return { ok: false, erro: 'Os Correios não atendem esse CEP agora.' };
  return { ok: true, cep: c, peso_g: peso, opcoes, frete_gratis_acima: Number(env.FRETE_GRATIS_ACIMA || 599) };
}
