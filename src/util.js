// Utilidades da loja. Fuso: America/Sao_Paulo (UTC-3, sem horario de verao desde 2019).

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function brl(v) {
  const n = Number(v) || 0;
  return 'R$' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Mesma regra da loja atual: ate 4x sem juros, parcela minima de R$ 50.
export function parcelas(preco) {
  const p = Number(preco) || 0;
  const n = Math.max(1, Math.min(4, Math.floor(p / 50)));
  return { vezes: n, valor: Math.round((p / n) * 100) / 100 };
}

export function pt(campo) {
  if (campo == null) return '';
  if (typeof campo === 'string') return campo;
  return campo.pt || campo.es || campo.en || '';
}

// Data de hoje em Brasilia (Date UTC "meia-noite" do dia BRT).
export function hojeBrt(agoraMs) {
  const d = new Date((agoraMs || Date.now()) - 3 * 3600e3);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Soma dias uteis (seg-sex). Feriados nacionais fixos tambem sao pulados.
const FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
export function somarDiasUteis(base, dias) {
  const d = new Date(base.getTime());
  let n = Math.max(0, Math.round(dias));
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    const md = d.toISOString().slice(5, 10);
    if (dow !== 0 && dow !== 6 && FERIADOS_FIXOS.indexOf(md) < 0) n--;
  }
  return d;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export function dataCurta(d) {
  return DIAS[d.getUTCDay()] + ', ' + String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
